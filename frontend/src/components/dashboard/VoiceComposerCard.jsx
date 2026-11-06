import { useId } from 'react';
import { Mic, Square, Send, Loader2, SlidersHorizontal, MessageSquareText } from 'lucide-react';

/**
 * VoiceComposerCard: reusable voice / text input card (React + Tailwind).
 *
 * Fully controlled and presentational: it owns no recording, API or routing logic,
 * so the same card can sit on the Voice Assistant page, the dashboard, a drawer, etc.
 *
 * Props
 *  mode            'voice' | 'text'                       current input mode
 *  onModeChange    (mode) => void
 *  status          'idle' | 'requesting' | 'recording' | 'processing'
 *  elapsed         seconds recorded so far                 (shows timer while recording)
 *  maxSeconds      recording limit, default 30
 *  level           optional 0..1 live mic amplitude; when omitted the wave animates on its own
 *  onMicClick      () => void                              start / stop recording
 *  onSettingsClick () => void                              opens language / voice settings (omit to hide)
 *  languageLabel   e.g. "हिंदी · hi-IN"                    small chip in the wave panel
 *  value           text-mode value
 *  onValueChange   (string) => void
 *  onSend          () => void                              text-mode send
 *  error           string | null                           inline error under the wave
 *  disabled        boolean
 *  className       extra classes for the outer card
 */
export default function VoiceComposerCard({
  mode = 'voice',
  onModeChange,
  status = 'idle',
  elapsed = 0,
  maxSeconds = 30,
  level,
  onMicClick,
  onSettingsClick,
  languageLabel,
  value = '',
  onValueChange,
  onSend,
  error = null,
  disabled = false,
  className = '',
}) {
  const textId = useId();
  const recording = status === 'recording';
  const requesting = status === 'requesting';
  const processing = status === 'processing';
  const busy = requesting || processing;
  const textMode = mode === 'text';
  const canSend = value.trim().length > 0 && !disabled;

  const statusLabel = recording
    ? 'Recording'
    : requesting
    ? 'Waiting for mic'
    : processing
    ? 'Processing'
    : textMode
    ? 'Text mode'
    : 'Ready';

  return (
    <div
      className={`w-full max-w-xl rounded-4xl border border-slate-200/70 bg-white/70 p-3 shadow-[0_18px_50px_-18px_rgba(47,91,234,0.25)] backdrop-blur-xl ${className}`}
    >
      {/* Wave / text panel */}
      <div className="relative h-44 overflow-hidden rounded-3xl border border-slate-200/70 bg-linear-to-b from-sky-50/90 to-white bg-[radial-gradient(circle,rgba(47,91,234,0.2)_1px,transparent_1.5px)] bg-size-[22px_22px]">
        {/* Panel header */}
        <div className="pointer-events-none absolute inset-x-4 top-3 z-10 flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          <span className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                recording ? 'animate-pulse bg-red-500' : busy ? 'animate-pulse bg-amber-500' : 'bg-slate-400'
              }`}
            />
            {statusLabel}
          </span>
          {recording ? (
            <span aria-live="off">
              {fmt(elapsed)} <span className="text-slate-500">/ {fmt(maxSeconds)}</span>
            </span>
          ) : (
            languageLabel && (
              <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 normal-case tracking-normal">
                {languageLabel}
              </span>
            )
          )}
        </div>

        {textMode ? (
          <>
            <label htmlFor={textId} className="sr-only">
              Type your question
            </label>
            <textarea
              id={textId}
              value={value}
              onChange={(e) => onValueChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && canSend) {
                  e.preventDefault();
                  onSend?.();
                }
              }}
              disabled={disabled}
              placeholder="Apna sawal likhein…"
              className="absolute inset-0 h-full w-full resize-none bg-transparent px-5 pb-4 pt-10 text-[15px] leading-relaxed text-[#0f1b3d] placeholder:text-slate-500 focus:outline-none"
            />
          </>
        ) : (
          <Wave active={recording || processing} level={recording ? level : undefined} />
        )}

        {error && (
          <p
            role="alert"
            className="absolute inset-x-4 bottom-3 z-10 rounded-xl border border-red-200 bg-red-50/95 px-3 py-1.5 text-xs font-medium text-red-700"
          >
            {error}
          </p>
        )}
      </div>

      {/* Control bar */}
      <div className="mt-3 flex items-center justify-between gap-3 px-1 pb-1">
        {onSettingsClick ? (
          <button
            type="button"
            onClick={onSettingsClick}
            disabled={disabled || recording}
            aria-label="Voice settings"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-600 transition hover:bg-white hover:text-blue-600 focus-visible:outline focus-visible:outline-blue-500 disabled:opacity-50"
          >
            <SlidersHorizontal size={18} />
          </button>
        ) : (
          <span className="h-12 w-12 shrink-0" aria-hidden="true" />
        )}

        {/* Voice / Text segmented control */}
        <div
          role="group"
          aria-label="Input mode"
          className="flex rounded-full border border-slate-200/80 bg-slate-100/80 p-1"
        >
          <SegButton
            active={!textMode}
            onClick={() => onModeChange?.('voice')}
            disabled={disabled || recording}
            icon={<Mic size={16} />}
            label="Voice"
          />
          <SegButton
            active={textMode}
            onClick={() => onModeChange?.('text')}
            disabled={disabled || recording}
            icon={<MessageSquareText size={16} />}
            label="Text"
          />
        </div>

        {/* Primary action: gradient-border mic (voice) or send (text) */}
        <div className="relative shrink-0">
          {recording && (
            <span className="absolute inset-0 animate-ping rounded-2xl bg-red-400/40 motion-reduce:hidden" aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={textMode ? onSend : onMicClick}
            disabled={disabled || busy || (textMode && !canSend)}
            aria-label={textMode ? 'Send question' : recording ? 'Stop recording' : 'Start recording'}
            className={`relative grid h-12 w-12 place-items-center rounded-2xl border-2 border-transparent transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 ${
              recording
                ? 'text-white [background:linear-gradient(135deg,#ef4444,#f97316)_padding-box,linear-gradient(135deg,#ef4444,#f97316)_border-box]'
                : 'text-blue-600 [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(135deg,#2f5bea,#7c5cf0,#1fa3c4)_border-box] hover:text-violet-600'
            }`}
          >
            {busy ? (
              <Loader2 size={20} className="animate-spin" />
            ) : textMode ? (
              <Send size={18} />
            ) : recording ? (
              <Square size={16} fill="currentColor" />
            ) : (
              <Mic size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SegButton({ active, icon, label, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...rest}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-blue-500 disabled:opacity-50 ${
        active ? 'bg-white text-[#0f1b3d] shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-[#0f1b3d]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Layered translucent wave (decorative). Animates on its own, or follows `level` (0..1).
function Wave({ active, level }) {
  const live = typeof level === 'number';
  const amp = live ? Math.max(0.08, Math.min(1, level)) : active ? 1 : 0.08;
  const anim = (dur, values) =>
    active && !live ? (
      <animateTransform attributeName="transform" type="scale" values={values} dur={dur} repeatCount="indefinite" />
    ) : null;

  return (
    <svg
      viewBox="0 -75 520 150"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pt-6 transition-opacity"
    >
      <line x1="0" y1="0" x2="520" y2="0" className="stroke-blue-600/30" strokeWidth="1" />
      <g transform={`scale(1 ${amp})`}>
        {anim('1.7s', '1 0.35;1 1;1 0.5;1 0.9;1 0.35')}
        <path
          className="fill-violet-500/25"
          d="M20 0 C80 0 110 -45 160 -45 C210 -45 220 0 270 0 C320 0 340 -55 390 -55 C440 -55 450 0 500 0 C450 0 440 55 390 55 C340 55 320 0 270 0 C220 0 210 45 160 45 C110 45 80 0 20 0Z"
        />
      </g>
      <g transform={`scale(1 ${amp})`}>
        {anim('1.3s', '1 1;1 0.4;1 0.85;1 0.3;1 1')}
        <path
          className="fill-blue-600/30"
          d="M60 0 C110 0 130 -28 175 -28 C220 -28 235 0 280 0 C325 0 345 -34 385 -34 C425 -34 435 0 470 0 C435 0 425 34 385 34 C345 34 325 0 280 0 C235 0 220 28 175 28 C130 28 110 0 60 0Z"
        />
      </g>
      <g transform={`scale(1 ${amp})`}>
        {anim('2.1s', '1 0.6;1 1;1 0.3;1 0.8;1 0.6')}
        <path
          className="fill-cyan-500/40"
          d="M130 0 C165 0 185 -17 220 -17 C255 -17 265 0 300 0 C335 0 350 -21 380 -21 C410 -21 420 0 450 0 C420 0 410 21 380 21 C350 21 335 0 300 0 C265 0 255 17 220 17 C185 17 165 0 130 0Z"
        />
      </g>
    </svg>
  );
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
