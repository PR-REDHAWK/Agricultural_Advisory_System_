import { useCallback, useEffect, useRef, useState } from 'react';

export const MAX_SECONDS = 30;
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/**
 * MediaRecorder hook.
 * status: idle | requesting | recording | recorded | error
 * Mic permission is requested only when start() is called. Auto-stops at MAX_SECONDS.
 * `level` (0..1) is a live amplitude for waveform visuals.
 */
export function useVoiceRecorder({ onComplete } = {}) {
  const [status, setStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const startedAtRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const supported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close?.().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const startMeter = useCallback((stream) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
        setLevel(Math.min(1, (peak / 128) * 2.2));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* meter is cosmetic; recording continues without it */
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!supported) {
      setStatus('error');
      setError({ code: 'unsupported', message: 'Recording is not supported in this browser. Use Text mode.' });
      return;
    }
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m));
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onerror = () => {
        cleanup();
        setStatus('error');
        setError({ code: 'recorder', message: 'Recording failed. Please try again.' });
      };
      rec.onstop = () => {
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        cleanup();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || mimeType || 'audio/webm' });
        if (blob.size === 0 || seconds < 0.5) {
          setStatus('error');
          setError({ code: 'empty', message: 'Nothing was recorded. Hold the mic closer and try again.' });
          return;
        }
        setStatus('recorded');
        onCompleteRef.current?.(blob, Math.min(seconds, MAX_SECONDS));
      };
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setElapsed(0);
      rec.start();
      setStatus('recording');
      startMeter(stream);
      timerRef.current = setInterval(() => {
        const s = (Date.now() - startedAtRef.current) / 1000;
        setElapsed(Math.min(s, MAX_SECONDS));
        if (s >= MAX_SECONDS) stop(); // enforce 30s limit
      }, 200);
    } catch (err) {
      cleanup();
      setStatus('error');
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      const missing = err?.name === 'NotFoundError';
      setError({
        code: denied ? 'denied' : missing ? 'no-device' : 'unknown',
        message: denied
          ? 'Microphone permission was denied. Allow it in browser settings, or use Text mode.'
          : missing
          ? 'No microphone found on this device.'
          : 'Could not start recording. Please try again.',
      });
    }
  }, [supported, cleanup, stop, startMeter]);

  const reset = useCallback(() => {
    setStatus('idle');
    setElapsed(0);
    setError(null);
  }, []);

  useEffect(
    () => () => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      cleanup();
    },
    [cleanup]
  );

  return { status, elapsed, level, error, supported, start, stop, reset };
}
