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

export async function transcribeAudio(blob, language = 'hi-IN') {
  if (USE_MOCK) {
    await sleep(900);
    return MOCK_TRANSCRIPT;
  }
  // Browsers record webm/opus (Chrome, Firefox) or mp4 (Safari), not WAV. Confirm accepted types with backend.
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  const form = new FormData();
  form.append('file', blob, `recording.${ext}`); // confirm multipart field name with backend
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
