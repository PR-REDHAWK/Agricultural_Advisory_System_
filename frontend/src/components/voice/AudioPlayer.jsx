import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';

const SPEEDS = [0.8, 1.0, 1.2];

/**
 * Plays the WAV from /speak. `loadAudio` returns a Blob promise.
 * A TTS failure never hides the written answer; it shows a retry instead.
 */
export default function AudioPlayer({ loadAudio, autoPlay = true }) {
  const audioRef = useRef(null);
  const urlRef = useRef(null);
  const aliveRef = useRef(true);
  const speedRef = useRef(1.0);
  const [state, setState] = useState('loading'); // loading | ready | playing | paused | error
  const [speed, setSpeed] = useState(1.0);
  const [errMsg, setErrMsg] = useState('');

  const revoke = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };

  const load = async () => {
    setState('loading');
    setErrMsg('');
    revoke();
    try {
      const blob = await loadAudio();
      if (!aliveRef.current) return;
      urlRef.current = URL.createObjectURL(blob);
      const el = audioRef.current;
      el.src = urlRef.current;
      el.playbackRate = speedRef.current;
      setState('ready');
      if (autoPlay) el.play().catch(() => {}); // autoplay may be blocked; user can press play
    } catch (e) {
      if (!aliveRef.current) return;
      setErrMsg(e?.message || 'Audio unavailable.');
      setState('error');
    }
  };

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => {
      aliveRef.current = false;
      audioRef.current?.pause();
      revoke(); // free the temporary object URL
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fail = () => {
    setErrMsg('Playback failed.');
    setState('error');
  };
  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(fail);
    else el.pause();
  };
  const replay = () => {
    const el = audioRef.current;
    el.currentTime = 0;
    el.play().catch(fail);
  };
  const changeSpeed = (s) => {
    speedRef.current = s;
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const iconBtn =
    'grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-blue-600 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500';

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <audio
        ref={audioRef}
        onPlay={() => setState('playing')}
        onPause={() => setState((s) => (s === 'playing' ? 'paused' : s))}
        onEnded={() => setState('ready')}
        onError={() => urlRef.current && fail()}
      />
      {state === 'loading' && (
        <span className="flex items-center gap-1.5 text-sm text-slate-600">
          <Loader2 size={14} className="animate-spin" /> Preparing audio…
        </span>
      )}
      {state === 'error' && (
        <span className="flex flex-wrap items-center gap-1.5 text-sm text-red-700">
          <AlertTriangle size={14} /> {errMsg} The written answer is still shown.
          <button type="button" onClick={load} className="font-semibold text-blue-600 underline">
            Retry audio
          </button>
        </span>
      )}
      {['ready', 'playing', 'paused'].includes(state) && (
        <>
          <button type="button" onClick={toggle} aria-label={state === 'playing' ? 'Pause' : 'Play'} className={iconBtn}>
            {state === 'playing' ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" onClick={replay} aria-label="Replay" className={iconBtn}>
            <RotateCcw size={15} />
          </button>
          {state === 'playing' && (
            <span className="flex h-4 items-center gap-0.5 motion-reduce:hidden" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <i key={i} className="block w-0.5 animate-pulse rounded bg-blue-600" style={{ height: 6 + ((i * 5) % 10), animationDelay: `${i * 90}ms` }} />
              ))}
            </span>
          )}
          <div role="group" aria-label="Playback speed" className="ml-auto flex gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeSpeed(s)}
                aria-pressed={speed === s}
                className={`rounded-full border px-3 py-1 font-mono text-xs font-semibold transition ${
                  speed === s ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-[#0f1b3d]'
                }`}
              >
                {s.toFixed(1)}×
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
