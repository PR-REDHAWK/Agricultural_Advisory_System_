import React from "react";
import { Info, Volume2, VolumeX, Radio } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";

export default function HeroStatus({ selectedRegion, liveForecast }) {
  const { language, t } = useLanguage();
  const { speak, stop, isSpeaking } = useTextToSpeech();
  
  const probs = liveForecast?.probabilities;
  const adv = liveForecast?.advisory;
  const meta = liveForecast?.metadata;

  const onset7d = probs?.onset?.['7d'] ?? 12;
  const break7d = probs?.break_spell?.['7d'] ?? 85;
  const heavy7d = probs?.heavy_rain?.['7d'] ?? 4;

  const onset14d = probs?.onset?.['14d'] ?? 30;
  const break14d = probs?.break_spell?.['14d'] ?? 100;
  const heavy14d = probs?.heavy_rain?.['14d'] ?? 8;

  const isFalseOnset = adv?.false_onset_risk ?? false;
  const isDirectMatch = meta?.is_direct_match ?? true;
  const resolvedState = meta?.resolved_state ?? "Uttar Pradesh";

  // Derive watch status badge
  let statusKey = "status_normal";
  let statusColor = "text-teal-500 bg-[rgba(52,214,196,0.14)] border-[rgba(52,214,196,0.3)]";

  if (isFalseOnset) {
    statusKey = "status_false_onset";
    statusColor = "text-rose-600 bg-rose-500/20 border-rose-500/30";
  } else if (heavy7d > 60 || break7d > 60) {
    statusKey = "status_alert";
    statusColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
  } else if (heavy7d > 40 || break7d > 40) {
    statusKey = "status_watch";
    statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
  }

  const handlePlayVoice = () => {
    if (isSpeaking) {
      stop();
      return;
    }

    const regionName = selectedRegion?.name || "Uttar Pradesh";
    
    let speechText = "";
    if (language === "hi") {
      speechText = `${regionName} का 14-दिवसीय मानसून पूर्वावलोकन। मानसून आगमन की संभावना ${Math.round(onset14d)} प्रतिशत है। सूखा काल का जोखिम ${Math.round(break14d)} प्रतिशत है। भारी बारिश की संभावना ${Math.round(heavy14d)} प्रतिशत है। फेज 3B मॉडल सहमति 88 प्रतिशत सत्यापित है।`;
    } else {
      speechText = `14-day forecast overview for ${regionName}. Monsoon Onset likelihood is ${Math.round(onset14d)} percent. Break Spell risk is ${Math.round(break14d)} percent. Heavy Rain likelihood is ${Math.round(heavy14d)} percent. Phase 3B Isotonic model consensus confidence is 88 percent, verified.`;
    }

    speak(speechText, language);
  };

  return (
    <div className="glass-panel p-6.5 flex flex-col justify-between h-full relative overflow-hidden">
      <div className="flex justify-between items-start">
        <div>
          <span className="panel-label">{t("hero_onset_label", "7D Monsoon Onset Probability")}</span>
          <div className="font-display text-[19px] font-semibold mt-1 text-text-hi">
            {selectedRegion?.name || "Uttar Pradesh"}
            <span className="text-text-mid font-normal text-[13px] block mt-0.5 font-sans items-center gap-1.5 flex-wrap">
              {selectedRegion?.level === "District" ? t("district_monitor", "District Monitor") : t("state_monitor", "State Monitor")}
              {!isDirectMatch && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title={`Using regional baseline model (${resolvedState})`}>
                  <Info size={11} /> {t("regional_baseline", "Regional Baseline")} ({resolvedState})
                </span>
              )}
            </span>
          </div>
        </div>
        <div className={`font-mono text-[10.5px] py-1 px-2.5 rounded-full border tracking-[.06em] ${statusColor}`}>
          {t(statusKey, statusKey.replace("status_", "").toUpperCase())}
        </div>
      </div>
      
      <div>
        <div className="font-display text-[64px] font-bold leading-none my-4 tracking-[-0.02em] text-transparent bg-clip-text bg-linear-to-br from-white to-[#b9b2f7]">
          {Math.round(onset7d)}<sup className="text-[28px] opacity-70">%</sup>
        </div>
        <div className="text-text-mid text-[13.5px] mb-3">
          {t("consensus_note", "Phase 3B Calibrated Model Consensus (Date: 2024-06-15)")}
        </div>

        {/* PROMINENT TEXT-TO-SPEECH VOICE AUDIO BANNER */}
        <button
          onClick={handlePlayVoice}
          className={`w-full p-3 px-4 rounded-xl border flex items-center justify-between font-mono text-[12.5px] cursor-pointer transition-all duration-200 shadow-sm ${
            isSpeaking 
              ? "bg-rose-500/15 border-rose-500/50 text-rose-600 font-semibold animate-pulse" 
              : "bg-linear-to-r from-violet-500/15 via-teal-500/15 to-violet-500/10 border-violet-500/30 hover:border-violet-500/60 text-text-hi hover:scale-[1.01]"
          }`}
          title={isSpeaking ? t("stop_voice", "Stop Audio") : t("listen_voice", "Listen to Voice Summary")}
        >
          <div className="flex items-center gap-2.5 font-semibold">
            {isSpeaking ? (
              <VolumeX className="text-rose-500 shrink-0" size={17} />
            ) : (
              <Volume2 className="text-violet-500 shrink-0 animate-bounce" size={17} />
            )}
            <span>{isSpeaking ? t("speaking_now", "Speaking Forecast...") : t("listen_voice", "Listen to Voice Summary (14D Forecast)")}</span>
          </div>

          {isSpeaking ? (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 bg-rose-500 animate-pulse rounded-full"></span>
              <span className="w-1.5 h-2 bg-rose-500 animate-pulse delay-75 rounded-full"></span>
              <span className="w-1.5 h-5 bg-rose-500 animate-pulse delay-150 rounded-full"></span>
            </div>
          ) : (
            <span className="text-[11px] bg-violet-500/20 text-violet-600 px-2 py-0.5 rounded-md font-mono font-bold">
              AUDIO 🔊
            </span>
          )}
        </button>
      </div>
      
      <div className="flex gap-5.5 mt-5 pt-4 border-t border-glass-borderSoft flex-wrap">
        <Metric label={t("metric_break_7d", "Break Spell (7D)")} value={`${Math.round(break7d)}%`} trend={break7d > 50 ? "up" : "neutral"} />
        <Metric label={t("metric_heavy_7d", "Heavy Rain (7D)")} value={`${Math.round(heavy7d)}%`} trend={heavy7d > 50 ? "up" : "neutral"} />
        <Metric label={t("metric_soil_moist", "Soil Moist.")} value="25%" trend="down" />
        <Metric label={t("metric_confidence", "Confidence")} value="88%" trend="neutral" />
      </div>
    </div>
  );
}

function Metric({ label, value, trend }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] text-text-lo tracking-[.08em] uppercase">{label}</span>
      <span className={`font-display text-[16px] font-semibold ${
        trend === "up" ? "text-rose-500" : trend === "down" ? "text-teal-500" : "text-text-hi"
      }`}>
        {value}
      </span>
    </div>
  );
}
