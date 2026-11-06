import { useId } from 'react';
import { Send, RotateCcw } from 'lucide-react';

// Shown after /transcribe. The farmer reviews and can correct before anything is sent to /ask.
export default function TranscriptEditor({ value, onChange, onSend, onRerecord, sending }) {
  const id = useId();
  const empty = !value.trim();
  return (
    <div className="w-full max-w-xl rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl">
      <label htmlFor={id} className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
        Review transcript · edit if needed
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={sending}
        placeholder="Transcript will appear here"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !empty && !sending) onSend();
        }}
        className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-[#0f1b3d] focus:outline focus:outline-2 focus:outline-blue-400 disabled:opacity-60"
      />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onRerecord}
          disabled={sending}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0f1b3d] transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCcw size={15} /> Record again
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={empty || sending}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={15} /> {sending ? 'Asking…' : 'Ask'}
        </button>
      </div>
    </div>
  );
}
