import { ShieldAlert, CheckCircle2 } from 'lucide-react';

// Shows the Phase 6 advisory exactly as returned. Nothing is generated in React.
export default function AdvisoryCard({ advisory, context }) {
  if (!advisory) return null;
  const tags = [context?.crop, context?.growth_stage].filter(Boolean).join(' · ');
  return (
    <div className="w-full rounded-3xl border border-amber-200/70 bg-gradient-to-b from-amber-50/80 to-white/80 p-5 shadow-sm">
      <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
        <ShieldAlert size={14} /> Phase 6 agricultural advisory{tags ? ` · ${tags}` : ''}
      </span>
      {advisory.title && <h4 className="mt-3 text-lg font-bold text-[#0f1b3d]">{advisory.title}</h4>}
      {advisory.primary_action && <p className="mt-1.5 leading-relaxed text-slate-700">{advisory.primary_action}</p>}
      {advisory.supporting_actions?.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {advisory.supporting_actions.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-cyan-600" /> {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
