import { Sparkles, HelpCircle, AlertTriangle } from 'lucide-react';
import ForecastSummaryCard from './ForecastSummaryCard';
import AdvisoryCard from './AdvisoryCard';
import AudioPlayer from './AudioPlayer';

const time = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const LABEL = 'flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600';

export default function ChatMessage({ message, audioEnabled, loadAudio, isLatest }) {
  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-white">{message.text}</div>
        <span className="font-mono text-[11px] text-slate-500">{time(message.at)}</span>
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={15} className="shrink-0" /> {message.error}
          {message.onRetry && (
            <button type="button" onClick={message.onRetry} className="font-semibold text-blue-600 underline">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const d = message.data;
  const clarify = d.requires_clarification;
  const text = clarify ? d.clarification_prompt : d.answer;

  return (
    <div className="flex flex-col items-start gap-3">
      <div
        className={`flex w-full max-w-full flex-col gap-2 rounded-2xl rounded-bl-md border px-4 py-3 ${
          clarify ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200/80 bg-white'
        }`}
      >
        <span className={LABEL}>
          {clarify ? (
            <>
              <HelpCircle size={13} /> Need a detail
            </>
          ) : (
            <>
              <Sparkles size={13} /> Monsoon assistant
            </>
          )}
        </span>
        <p className="leading-relaxed text-[#0f1b3d]">{text}</p>
        {clarify && <p className="text-sm text-slate-600">Type or record the missing detail above, then send again.</p>}
        {audioEnabled && isLatest && !clarify && text && <AudioPlayer loadAudio={() => loadAudio(text)} />}
      </div>
      {!clarify && <ForecastSummaryCard context={d.extracted_context} forecast={d.forecast_context} />}
      {!clarify && <AdvisoryCard context={d.extracted_context} advisory={d.advisory} />}
      <span className="font-mono text-[11px] text-slate-500">{time(message.at)}</span>
    </div>
  );
}
