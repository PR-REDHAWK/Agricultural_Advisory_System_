// Renders ONLY what the backend returned. Missing => "Unavailable". A real 0 => "0%".
const hasNum = (v) => typeof v === 'number' && Number.isFinite(v);
// Accepts 0-1 or 0-100 (confirm final scale with backend); 1.0 is read as 100%.
const toPct = (v) => (hasNum(v) ? (v <= 1 ? v * 100 : v) : null);

const RISK_STYLES = {
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  moderate: 'bg-blue-50 text-blue-700 ring-blue-200',
  high: 'bg-amber-50 text-amber-800 ring-amber-200',
  severe: 'bg-red-50 text-red-700 ring-red-200',
  unknown: 'bg-slate-100 text-slate-600 ring-slate-200',
};
const RISK_MAP = {
  low: 'low', moderate: 'moderate', medium: 'moderate', high: 'high', elevated: 'high',
  'very high': 'severe', extreme: 'severe', severe: 'severe',
};

const BAR = { blue: 'bg-blue-600', red: 'bg-red-500', amber: 'bg-amber-500' };

function Metric({ label, value, tone }) {
  const p = toPct(value);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</span>
      {p === null ? (
        <strong className="text-sm font-semibold text-slate-500">Unavailable</strong>
      ) : (
        <strong className="text-2xl font-bold text-[#0f1b3d]">{Math.round(p)}%</strong>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70">
        <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${p === null ? 0 : Math.min(100, p)}%` }} />
      </div>
    </div>
  );
}

export default function ForecastSummaryCard({ context, forecast }) {
  if (!forecast) return null;
  const { onset_probability, break_spell_probability, heavy_rain_probability, risk_level, event_type, match } = forecast;
  const risk = RISK_MAP[String(risk_level || '').toLowerCase()] || 'unknown';
  const conf = toPct(match?.confidence);

  return (
    <div className="w-full rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          {context?.forecast_horizon ? `${context.forecast_horizon} forecast` : 'Forecast'}
          {context?.location ? ` · ${context.location}` : ''}
        </span>
        {risk_level && (
          <span className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest ring-1 ${RISK_STYLES[risk]}`}>
            {String(risk_level)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Monsoon onset" value={onset_probability} tone="blue" />
        <Metric label="Break spell" value={break_spell_probability} tone="red" />
        <Metric label="Heavy rain" value={heavy_rain_probability} tone="amber" />
      </div>
      {(event_type || match?.station || conf !== null) && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-slate-600">
          {event_type && <span>Event: {event_type}</span>}
          {match?.station && <span>Station: {match.station}</span>}
          {conf !== null && <span>Match confidence: {Math.round(conf)}%</span>}
        </div>
      )}
    </div>
  );
}
