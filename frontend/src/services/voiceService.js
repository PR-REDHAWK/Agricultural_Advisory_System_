// Voice API client. If your app already has an Axios instance (base URL + auth), swap `request()`
// to use it: multipart for transcribe, JSON for ask, responseType 'blob' for speak.
// Gnani credentials live ONLY on the backend. Nothing here calls Gnani.
import { MOCK_ASK, MOCK_CLARIFY, MOCK_TRANSCRIPT } from './voiceMock';

const BASE = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK = import.meta.env.VITE_VOICE_MOCK === 'true'; // dev only
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class VoiceApiError extends Error {
  constructor(message, { status, kind } = {}) {
    super(message);
    this.status = status;
    this.kind = kind; // 'network' | 'server' | 'invalid'
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api/v1/voice/${path}`, { credentials: 'include', ...options });
  } catch {
    throw new VoiceApiError('Network error. Check your connection and retry.', { kind: 'network' });
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.clone().json();
      detail = body.detail || body.message || '';
    } catch {
      /* non-JSON error body */
    }
    throw new VoiceApiError(detail || `Request failed (${res.status})`, {
      status: res.status,
      kind: res.status >= 500 ? 'server' : 'invalid',
    });
  }
  return res;
}

function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

export async function convertBlobToWav(blob) {
  if (blob.type === 'audio/wav' || blob.type === 'audio/x-wav') {
    return blob;
  }
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return blob;

    const audioCtx = new AudioCtx();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    // Resample & downmix to 16kHz mono (optimal for Gnani Prisma STT)
    const targetSampleRate = 16000;
    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      1,
      Math.ceil(decoded.duration * targetSampleRate),
      targetSampleRate
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    const resampled = await offlineCtx.startRendering();
    const monoData = resampled.getChannelData(0);

    const wavBuffer = encodeWAV(monoData, targetSampleRate);
    audioCtx.close().catch(() => {});
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } catch (err) {
    console.warn('WAV conversion fallback to original blob:', err);
    return blob;
  }
}

export async function transcribeAudio(blob, language = 'hi-IN') {
  if (USE_MOCK) {
    await sleep(900);
    return MOCK_TRANSCRIPT;
  }
  // Convert browser recording (webm/mp4/ogg) to 16kHz mono WAV for Gnani Prisma v2.5 STT
  const wavBlob = await convertBlobToWav(blob);
  const form = new FormData();
  form.append('file', wavBlob, 'recording.wav');
  form.append('language', language);
  const res = await request('transcribe', { method: 'POST', body: form });
  return res.json(); // { transcript, language, duration }
}

export async function askQuestion({ question, conversationId, language, location, crop, growthStage }) {
  if (USE_MOCK) {
    await sleep(900);
    return /kaun|which|कौन/i.test(question)
      ? MOCK_CLARIFY
      : { ...MOCK_ASK, conversation_id: conversationId || MOCK_ASK.conversation_id };
  }
  const res = await request('ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      conversation_id: conversationId || null,
      language,
      location: location || null,
      crop: crop || null,
      growth_stage: growthStage || null,
    }),
  });
  return res.json();
}

export async function speak({ text, language = 'hi-IN', voice }) {
  if (USE_MOCK) throw new VoiceApiError('Audio is not available in mock mode.', { kind: 'server' });
  const res = await request('speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, voice }),
  });
  return res.blob(); // audio/wav
}
