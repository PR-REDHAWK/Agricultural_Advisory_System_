import React, { useState, useEffect } from "react";
import { AlertTriangle, Calendar, Sprout, Droplets, ShieldAlert, Sparkles, ChevronDown, ChevronUp, Filter, Volume2, VolumeX, MapPin } from "lucide-react";
import clsx from "clsx";
import { useLanguage } from "../../context/LanguageContext";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";
import SearchableSelect from "../common/SearchableSelect";
import { getApiUrl } from "../../api/config";

export default function AdvisoryPage({
  states = [],
  districts = [],
  selectedStateId,
  selectedDistrictId,
  onStateChange,
  onDistrictChange,
  selectedRegion,
  liveForecast
}) {
  const { language, setLanguage, t } = useLanguage();
  const { speak, stop, isSpeaking } = useTextToSpeech();

  const [liveAdvisories, setLiveAdvisories] = useState([]);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Interactive Scenario & Crop/Stage Filter States
  const [activeScenario, setActiveScenario] = useState("LIVE");
  const [crop, setCrop] = useState("Rice");
  const [stage, setStage] = useState("Sowing");
  const [availableCrops, setAvailableCrops] = useState([
    "Rice", "Wheat", "Maize", "Cotton", "Soybean", "Sugarcane", "Gram", "Tur (Pigeon Pea)", "Groundnut", "Mustard", "Bajra", "Jowar", "Potato", "Onion"
  ]);

  const allStages = [
    "Sowing",
    "Germination / Establishment",
    "Vegetative",
    "Flowering",
    "Grain/Fruit Development",
    "Harvest"
  ];

  const [currentForecast, setCurrentForecast] = useState(liveForecast);

  useEffect(() => {
    setCurrentForecast(liveForecast);
  }, [liveForecast]);

  useEffect(() => {
    fetch(getApiUrl('/api/v1/advisories'))
      .then(res => res.json())
      .then(data => setLiveAdvisories(data))
      .catch(err => console.error(err));
  }, []);

  // Derive Location Name
  const selectedState = states.find((s) => String(s.id) === String(selectedStateId));
  const selectedDistrict = districts.find((d) => String(d.id) === String(selectedDistrictId));

  const locationName = selectedDistrict 
    ? `${selectedDistrict.name}, ${selectedState ? selectedState.name : ""}` 
    : (selectedState ? selectedState.name : (liveForecast?.metadata?.resolved_state || "Uttar Pradesh"));

  // Dynamic Crop fetch for selected State from Kaggle state-crop dataset
  useEffect(() => {
    const stateName = selectedState ? selectedState.name : "Uttar Pradesh";
    fetch(getApiUrl(`/api/v1/crops?state=${encodeURIComponent(stateName)}`))
      .then(res => res.json())
      .then(data => {
        if (data.crops && data.crops.length > 0) {
          setAvailableCrops(data.crops);
        }
      })
      .catch(err => console.error("Failed to load state crops:", err));
  }, [selectedStateId]);

  // Real-time API query when location, crop, growth stage, or language changes
  useEffect(() => {
    const stateName = selectedState ? selectedState.name : "Uttar Pradesh";
    fetch(getApiUrl(`/api/v1/forecast/live?state=${encodeURIComponent(stateName)}&prediction_date=2024-06-15&crop_name=${encodeURIComponent(crop)}&growth_stage=${encodeURIComponent(stage)}&soil_moisture_pct=25.0&lang=${encodeURIComponent(language)}`))
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "SUCCESS") {
          setCurrentForecast(data);
        }
      })
      .catch((err) => console.error("Error updating crop-stage forecast:", err));
  }, [selectedStateId, selectedDistrictId, crop, stage, language]);

  // Format crop options for SearchableSelect
  const cropSelectOptions = availableCrops.map((c) => ({
    id: c,
    name: t(`crop_${c.toLowerCase().replace(/[^a-z0-9]/g, "_")}`, c)
  }));

  // Filter alerts by region if applicable
  const filteredAdvisories = selectedRegion && selectedRegion.id
    ? liveAdvisories.filter(adv => !adv.region_id || adv.region_id === selectedRegion.id)
    : liveAdvisories;
  const displayedAdvisoriesList = filteredAdvisories.length > 0 ? filteredAdvisories : liveAdvisories;

  const maxAlertCap = 3;
  const displayedAdvisories = showAllAlerts ? displayedAdvisoriesList : displayedAdvisoriesList.slice(0, maxAlertCap);

  const activeAdv = currentForecast?.advisory;

  const isHi = (language === "hi");
  const cropDisplay = t(`crop_${crop.toLowerCase().replace(/[^a-z0-9]/g, "_")}`, crop);
  const stageDisplay = t(`stage_${stage.toLowerCase().replace(/[^a-z0-9]/g, "_")}`, stage);
  const sLower = stage.toLowerCase();

  // Dynamic Scenario specifics logic with dynamic Crop + Growth Stage intelligence
  const getScenarioContent = () => {
    if (activeScenario === "FALSE_ONSET") {
      let act = "";
      if (sLower.includes("sow") || sLower.includes("establis") || sLower.includes("germina")) {
        act = isHi 
          ? `केवल शुरुआती बारिश के आधार पर ${cropDisplay} की ${stageDisplay} कार्य न करें। निरंतर नमी बनने तक बारिश-आधारित बुआई टालें या सिंचाई व्यवस्था रखें।`
          : `Avoid relying solely on initial monsoon rain for ${crop} (${stage}). Delay rain-dependent sowing until sustained moisture settles, or ensure backup irrigation.`;
      } else if (sLower.includes("flower") || sLower.includes("fruit") || sLower.includes("grain")) {
        act = isHi
          ? `शुरुआती बारिश के बाद सूखा काल संभावित है। अत्यंत संवेदनशील ${stageDisplay} अवस्था पर ${cropDisplay} के लिए जीवनरक्षक सूक्ष्म-सिंचाई तैयार रखें।`
          : `Initial monsoon rain will be followed by an early dry spell. Prepare life-saving micro-irrigation for ${crop} at critical ${stage} stage.`;
      } else if (sLower.includes("harvest")) {
        act = isHi
          ? `शुरुआती बारिश के बाद सूखा काल आ सकता है। ${cropDisplay} की कटाई के लिए बारिश के अंतराल का उपयोग करें और तिरपाल तैयार रखें।`
          : `Initial rainfall may be followed by a dry spell. Utilize rain breaks for ${crop} harvesting, keeping tarpaulins ready for sudden early showers.`;
      } else {
        act = isHi
          ? `शुरुआती बारिश के बाद लंबा सूखा आ सकता है। नमी स्थिर होने तक ${cropDisplay} (${stageDisplay}) पर अधिक उर्वरक न डालें।`
          : `Initial rainfall may be followed by a prolonged dry spell. Avoid heavy fertilizer top-dressing on ${crop} (${stage}) until moisture settles.`;
      }

      return {
        badge: isHi ? "झूठे-आगमन की चेतावनी" : "FALSE-ONSET ALERT",
        badgeColor: "border-rose-500 bg-gradient-to-r from-rose-500/10 to-transparent",
        title: isHi ? "⚠️ झूठे-आगमन (False-Onset) का जोखिम" : "⚠️ False-Onset Risk Warning",
        reason: isHi 
          ? `मानसून का आगमन संभावित है, लेकिन अगले 14 दिनों में सूखा काल का जोखिम उच्च है (${cropDisplay} - ${stageDisplay})।`
          : `Monsoon onset appears likely for ${crop} (${stage}), but break-spell risk remains high over the next 14 days.`,
        action: act,
        breakProb: "85%",
        soilMoist: "22%",
        confidence: isHi ? "अत्यधिक उच्च" : "VERY HIGH"
      };
    } else if (activeScenario === "HEAVY_RAIN") {
      let act = "";
      if (sLower.includes("sow") || sLower.includes("establis") || sLower.includes("germina")) {
        act = isHi
          ? `जलजमाव से बीज/पौध सड़न रोकने के लिए ${cropDisplay} की ${stageDisplay} उठी हुई क्यारियों/नालियों पर करें और जल निकासी दुरुस्त रखें।`
          : `Postpone ${crop} ${stage.toLowerCase()} in low fields. Clear drainage channels to prevent seed/seedling rot.`;
      } else if (sLower.includes("flower") || sLower.includes("fruit") || sLower.includes("grain") || sLower.includes("vegetat")) {
        act = isHi
          ? `जलभराव व फसल नुकसान से बचने के लिए ${cropDisplay} (${stageDisplay}) के खेत की जल निकासी नाली साफ करें।`
          : `Check and clear field drainage systems for ${crop} (${stage}) to prevent waterlogging, root rot, and flower drop.`;
      } else if (sLower.includes("harvest")) {
        act = isHi
          ? `बारिश रुकने तक ${cropDisplay} की कटाई स्थगित रखें। कटी हुई फसल को तिरपाल से ढककर सुरक्षित स्थान पर रखें।`
          : `Postpone ${crop} harvesting until rain clears. Cover harvested crop bundles in field with heavy tarpaulins.`;
      } else {
        act = isHi
          ? `जलभराव रोकने के लिए ${cropDisplay} (${stageDisplay}) के खेत की जल निकासी नालियों की जांच करें।`
          : `Inspect field drainage furrows for ${crop} (${stage}) to prevent waterlogging.`;
      }

      return {
        badge: isHi ? "भारी बारिश की चेतावनी" : "HEAVY RAIN ALERT",
        badgeColor: "border-amber-500 bg-gradient-to-r from-amber-500/10 to-transparent",
        title: isHi ? "⚡ भारी बारिश की चेतावनी" : "⚡ High Heavy Rainfall Alert",
        reason: isHi
          ? `अगले 7-14 दिनों में ${cropDisplay} के खेतों के लिए भारी बारिश की संभावना उच्च है।`
          : `Heavy rainfall event probability is high over the next 7-14 days for ${crop} fields.`,
        action: act,
        breakProb: "12%",
        soilMoist: "68%",
        confidence: isHi ? "उच्च" : "HIGH"
      };
    } else if (activeScenario === "BREAK_SPELL") {
      let act = "";
      if (sLower.includes("sow") || sLower.includes("establis") || sLower.includes("germina")) {
        act = isHi
          ? `आसन्न सूखा काल के कारण ${cropDisplay} की ${stageDisplay} टालें। पूरक सिंचाई या ड्रिप का विकल्प तैयार रखें।`
          : `Delay rain-dependent ${crop} ${stage.toLowerCase()} due to imminent dry spell. Prepare supplemental irrigation alternatives.`;
      } else if (sLower.includes("flower") || sLower.includes("fruit") || sLower.includes("grain")) {
        act = isHi
          ? `अत्यंत संवेदनशील अवस्था: उपज क्षति और फूल/दाना झड़ने से रोकने के लिए ${cropDisplay} (${stageDisplay}) में सिंचाई करें।`
          : `CRITICAL STAGE: Provide protective irrigation for ${crop} during ${stage} to prevent flower drop and yield loss.`;
      } else if (sLower.includes("harvest")) {
        act = isHi
          ? `मौसम शुष्क और कटाई के लिए अनुकूल है। ${cropDisplay} की कटाई और गहाई शीघ्र पूरी करें।`
          : `Weather conditions are dry and favorable for harvesting. Complete ${crop} harvesting and threshing early.`;
      } else {
        act = isHi
          ? `मृदा नमी संरक्षण हेतु ${cropDisplay} (${stageDisplay}) में निराई-गुड़ाई करें और धूल मल्च बनाएं।`
          : `Execute intercultural weeding and shallow hoeing in ${crop} (${stage}) to create dust mulch and conserve root-zone soil moisture.`;
      }

      return {
        badge: isHi ? "उच्च सूखा काल जोखिम" : "HIGH DRY-SPELL RISK",
        badgeColor: "border-orange-500 bg-gradient-to-r from-orange-500/10 to-transparent",
        title: isHi ? "🟠 उच्च सूखा काल (Break-Spell) जोखिम" : "🟠 High Dry-Spell Risk",
        reason: isHi
          ? `अगले 7–14 दिनों में ${cropDisplay} (${stageDisplay}) के लिए लंबा सूखा काल संभावित है।`
          : `A prolonged dry spell is likely over the next 7–14 days for ${crop} (${stage}).`,
        action: act,
        breakProb: "95%",
        soilMoist: "18%",
        confidence: isHi ? "अत्यधिक उच्च" : "VERY HIGH"
      };
    } else { // LIVE PIPELINE DEFAULT (DYNAMIC LOCATION & CROP & STAGE BASED FROM API)
      const liveBreakProb = currentForecast?.probabilities?.break_spell?.['14d'] !== undefined
        ? `${Math.round(currentForecast.probabilities.break_spell['14d'])}%`
        : "71%";

      const liveSoilMoist = currentForecast?.metadata?.soil_moisture_pct !== undefined
        ? `${currentForecast.metadata.soil_moisture_pct}%`
        : "25%";

      const liveConfidence = currentForecast?.metadata?.is_direct_match
        ? (isHi ? "अत्यधिक उच्च (प्रत्यक्ष)" : "VERY HIGH (DIRECT)")
        : (isHi ? "उच्च (क्षेत्रीय)" : "HIGH (REGIONAL)");

      const rawTitle = activeAdv?.title || `ADVISORY FOR ${crop.toUpperCase()} (${stage.toUpperCase()})`;
      const rawAction = activeAdv?.primary_action || `Adjust field practices for ${crop} (${stage}) based on monsoon outlook.`;

      return {
        badge: `${activeAdv?.risk_level || "ACTION"} REQUIRED`,
        badgeColor: activeAdv?.risk_level === "HIGH" || activeAdv?.risk_level === "VERY_HIGH"
          ? "border-rose-500 bg-gradient-to-r from-rose-500/10 to-transparent"
          : "border-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent",
        title: rawTitle,
        reason: activeAdv?.reasoning || `Dynamic evaluation for ${crop} at ${stage} stage in ${locationName}.`,
        action: rawAction,
        breakProb: liveBreakProb,
        soilMoist: liveSoilMoist,
        confidence: liveConfidence
      };
    }
  };

  const activeContent = getScenarioContent();

  // Dynamic Timeline steps tailored to growth stage
  const getTimelineSteps = () => {
    if (sLower.includes("sow") || sLower.includes("establis") || sLower.includes("germina")) {
      return {
        today: isHi ? `खेत तैयारी व नमी जांच (${cropDisplay})` : `Inspect ${crop} seedbed moisture`,
        d3: isHi ? `बुआई कार्य योजना (${stageDisplay})` : `Schedule ${crop} ${stage.toLowerCase()} window`,
        d7: isHi ? `अंकुरण व पौध वृद्धि निगरानी` : `Monitor seedling emergence`,
        d14: isHi ? `शुरुआती सिंचाई व खरपतवार जांच` : `Assess early establishment`
      };
    } else if (sLower.includes("flower") || sLower.includes("fruit") || sLower.includes("grain")) {
      return {
        today: isHi ? `अत्यंत महत्वपूर्ण: नमी तनाव जांच` : `CRITICAL: Inspect ${crop} moisture stress`,
        d3: isHi ? `जीवनरक्षक सिंचाई / पर्णीय छिड़काव` : `Apply micro-irrigation / foliar spray`,
        d7: isHi ? `पुष्पन व परागण संरक्षण` : `Protect flower & grain retention`,
        d14: isHi ? `दाना / फल बनने की समीक्षा` : `Evaluate grain/fruit development`
      };
    } else if (sLower.includes("harvest")) {
      return {
        today: isHi ? `अनाज नमी व मौसम पूर्वावलोकन` : `Assess ${crop} grain maturity & rain risk`,
        d3: isHi ? `कटाई व गहाई (threshing)` : `Execute harvesting & threshing`,
        d7: isHi ? `धूप में सुखाना (<12% नमी)` : `Sun-dry harvested produce`,
        d14: isHi ? `सुरक्षित भंडारण व परिवहन` : `Safe moisture-proof storage`
      };
    } else { // VEGETATIVE
      return {
        today: isHi ? `खेत निरीक्षण व नालियां साफ करना` : `Inspect ${crop} canopy & drainage furrows`,
        d3: isHi ? `निराई-गुड़ाई व धूल मल्चिंग` : `Execute intercultural weeding & mulching`,
        d7: isHi ? `उर्वरक top-dressing / सिंचाई` : `Nutrient top-dressing & irrigation check`,
        d14: isHi ? `वानस्पतिक वृद्धि मूल्यांकन` : `Assess vegetative vigor & pest watch`
      };
    }
  };

  const timelineSteps = getTimelineSteps();

  const handlePlayVoice = () => {
    if (isSpeaking) {
      stop();
      return;
    }
    const textToSpeak = `${locationName}. ${cropDisplay}, ${stageDisplay}. ${activeContent.title}. ${activeContent.action}`;
    speak(textToSpeak, language);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Language Switcher */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <div className="font-mono text-[11.5px] tracking-[.16em] text-teal-500 uppercase mb-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_10px_#0891b2] animate-pulse"></span>
            {t("farmer_support", "Farmer Decision Support")}
          </div>
          <h1 className="font-display font-semibold text-[27px] tracking-[-0.01em] text-text-hi uppercase">
            {t("advisory_page_title", "AGRICULTURAL ADVISORY SYSTEM")}
          </h1>
          <p className="text-text-mid text-[14px]">
            {t("subtitle", "Translate climate predictions into actionable farming decisions.")}
          </p>
        </div>

        {/* Language & Audio Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayVoice}
            className={clsx(
              "font-mono text-[11px] font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 cursor-pointer transition-all duration-200",
              isSpeaking 
                ? "bg-rose-500/20 text-rose-600 border-rose-500/30 animate-pulse" 
                : "bg-glass-fill border-glass-borderSoft text-text-hi hover:scale-105 active:scale-95"
            )}
            title={isSpeaking ? t("stop_voice", "Stop Audio") : t("listen_advisory", "Listen to Advisory")}
          >
            {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} className="text-violet-500 animate-bounce" />}
            <span>{isSpeaking ? t("stop_voice", "Stop") : t("listen_advisory", "Listen")}</span>
          </button>

          <div className="bg-glass-fill border border-glass-borderSoft p-1 rounded-full flex gap-1.5">
            <button 
              onClick={() => setLanguage("en")}
              className={clsx(
                "font-mono text-[10.5px] px-3.5 py-1 rounded-full cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95",
                language === "en" ? "bg-text-hi text-white font-semibold" : "text-text-mid hover:text-text-hi"
              )}
            >
              English
            </button>
            <button 
              onClick={() => setLanguage("hi")}
              className={clsx(
                "font-mono text-[10.5px] px-3.5 py-1 rounded-full cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95",
                language === "hi" ? "bg-text-hi text-white font-semibold" : "text-text-mid hover:text-text-hi"
              )}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Location, Crop, Stage & Climate Scenario Bar */}
      <div className="glass-panel p-4 flex flex-col gap-4">
        {/* Row 1: Interactive Location Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-glass-borderSoft">
          <div className="flex items-center gap-2 text-violet-500 font-mono text-[11px] uppercase tracking-[.08em] font-semibold">
            <MapPin size={15} className="shrink-0" />
            <span>{t("select_location_label", "Select Location:")}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap flex-1 max-w-xl">
            {/* State Select */}
            <div className="w-48">
              <SearchableSelect
                options={states}
                value={selectedStateId}
                onChange={onStateChange}
                placeholder={t("select_state", "Select State")}
              />
            </div>
            {/* District Select */}
            <div className="w-48">
              <SearchableSelect
                options={districts}
                value={selectedDistrictId}
                onChange={onDistrictChange}
                placeholder={t("select_district", "Select District")}
              />
            </div>
          </div>

          <div className="bg-teal-500/10 border border-teal-500/20 text-teal-600 px-3 py-1 rounded-full font-mono text-[11px] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
            <span>{t("active_region", "Active Region:")} {locationName}</span>
          </div>
        </div>

        {/* Row 2: Dynamic Crop & Stage Selectors */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-glass-borderSoft">
          {/* Dynamic Crop Selection Section */}
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[320px]">
            <div className="flex items-center gap-1.5 text-teal-500 font-mono text-[10.5px] uppercase tracking-[.06em] font-semibold">
              <Sprout size={15} className="shrink-0" />
              <span>{t("select_crop_label", "Crop:")}</span>
            </div>

            {/* Quick Pills for top popular crops in selected state */}
            <div className="flex gap-1.5 flex-wrap">
              {availableCrops.slice(0, 5).map((c) => (
                <button
                  key={c}
                  onClick={() => setCrop(c)}
                  className={clsx(
                    "font-mono text-[10.5px] px-3 py-1 rounded-full border cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95",
                    crop === c
                      ? "bg-teal-500 text-white font-semibold border-transparent shadow-sm"
                      : "bg-glass-fill2 border-glass-borderSoft text-text-mid hover:text-text-hi"
                  )}
                >
                  {t(`crop_${c.toLowerCase().replace(/[^a-z0-9]/g, "_")}`, c)}
                </button>
              ))}
            </div>

            {/* Searchable Select for ALL crops in state */}
            <div className="w-52">
              <SearchableSelect
                options={cropSelectOptions}
                value={crop}
                onChange={(val) => setCrop(val)}
                placeholder={`Search ${availableCrops.length}+ crops...`}
              />
            </div>
          </div>

          {/* Growth Stage Selector (All 6 Stages) */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] text-text-lo uppercase tracking-[.06em]">
              {t("select_stage_label", "Stage:")}
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {allStages.map((s) => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  className={clsx(
                    "font-mono text-[10.5px] px-3 py-1 rounded-full border cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95",
                    stage === s
                      ? "bg-violet-500 text-white font-semibold border-transparent shadow-sm"
                      : "bg-glass-fill2 border-glass-borderSoft text-text-mid hover:text-text-hi"
                  )}
                >
                  {t(`stage_${s.toLowerCase().replace(/[^a-z0-9]/g, "_")}`, s)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Scenario Simulator */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-amber-500 shrink-0" />
          <span className="font-mono text-[10.5px] text-text-lo uppercase tracking-[.06em]">
            {t("scenario_sim_label", "Simulate Climate Risk Scenario:")}
          </span>
          <div className="flex gap-2 flex-wrap font-mono text-[10.5px]">
            {[
              { id: "LIVE", label: `LIVE PIPELINE (${crop.toUpperCase()} - ${locationName.toUpperCase()})` },
              { id: "FALSE_ONSET", label: "FALSE-ONSET RISK" },
              { id: "BREAK_SPELL", label: "HIGH DRY-SPELL RISK" },
              { id: "HEAVY_RAIN", label: "HEAVY RAINFALL ALERT" }
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => setActiveScenario(sc.id)}
                className={clsx(
                  "px-3 py-1 rounded-full border cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95",
                  activeScenario === sc.id 
                    ? "bg-violet-500 text-white font-semibold border-transparent shadow-sm" 
                    : "bg-glass-fill2 border-glass-borderSoft text-text-mid hover:text-text-hi"
                )}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Highlighted Card & Dynamic Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-stretch">
        
        {/* Left Side: Highlighted Decision Card & Grid details */}
        <div className="flex flex-col gap-6">
          {/* Main Action Required Highlight */}
          <div className={clsx("glass-panel p-6 border-l-4 relative overflow-hidden flex flex-col justify-between transition-all duration-300", activeContent.badgeColor)}>
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none"></div>
            
            <div>
              <div className="font-mono text-[10px] tracking-[.14em] text-amber-600 font-semibold mb-3 flex items-center gap-1.5 uppercase">
                <AlertTriangle size={14} />
                {activeContent.badge}
              </div>
              <h2 className="font-display font-bold text-[22px] text-text-hi tracking-wide mb-3 leading-tight uppercase animate-fadeIn" key={`title-${activeScenario}-${crop}-${stage}-${language}`}>
                {activeContent.title}
              </h2>
              <p className="text-[14px] text-text-mid leading-relaxed mb-6 animate-fadeIn" key={`action-${activeScenario}-${crop}-${stage}-${language}`}>
                {activeContent.action}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-5 border-t border-glass-borderSoft">
              <AdvisorySpec label={isHi ? "स्थान" : "Location"} val={locationName} highlight />
              <AdvisorySpec label={isHi ? "फसल" : "Crop"} val={cropDisplay} highlight />
              <AdvisorySpec label={isHi ? "अवस्था" : "Stage"} val={stageDisplay} />
              <AdvisorySpec label={isHi ? "सूखा संभावना" : "Break Prob."} val={activeContent.breakProb} />
              <AdvisorySpec label={isHi ? "मृदा नमी" : "Soil Moisture"} val={activeContent.soilMoist} />
            </div>
          </div>

          {/* Live API Advisories — Capped at top 3 items */}
          {displayedAdvisoriesList.length > 0 && (
            <div className="flex flex-col gap-3 mt-1 mb-1">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] tracking-widest text-violet-500 uppercase">
                  {t("liveAlerts", "LIVE DATABASE ALERTS FOR")} {locationName.toUpperCase()} ({displayedAdvisories.length} OF {displayedAdvisoriesList.length})
                </span>
                {displayedAdvisoriesList.length > maxAlertCap && (
                  <button
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                    className="font-mono text-[10.5px] text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{showAllAlerts ? t("showLess", "Show Less") : `${t("showMore", "Show More Alerts")} (${displayedAdvisoriesList.length - maxAlertCap}+)`}</span>
                    {showAllAlerts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>

              {displayedAdvisories.map(adv => (
                <div key={adv.id} className="glass-panel p-4 border-l-4 border-rose-500 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full uppercase">{adv.advisory_type} - {adv.crop}</span>
                      <span className="font-mono text-[9px] bg-teal-500/10 text-teal-600 px-2 py-0.5 rounded-full uppercase">📍 {locationName}</span>
                    </div>
                    <span className="font-mono text-[9px] text-text-lo">{new Date(adv.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-display font-semibold text-text-hi text-[15px]">{adv.title}</h4>
                  <p className="text-[13px] text-text-mid leading-relaxed">{adv.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Sub advisory crop grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SubAdvisoryCard 
              icon={<Sprout size={16} />} 
              title={isHi ? `${cropDisplay} (${stageDisplay}) प्रबंधन` : `Manage ${crop} (${stage})`} 
              desc={activeContent.action} 
              type={isHi ? "फसल प्रबंधन" : "CROP MANAGEMENT"} 
            />
            <SubAdvisoryCard 
              icon={<Droplets size={16} />} 
              title={isHi ? "सिंचाई रणनीति" : "Monitor Irrigation"} 
              desc={isHi ? `${cropDisplay} (${stageDisplay}) हेतु मृदा नमी ${activeContent.soilMoist} है। अवस्था के अनुसार सिंचाई की योजना बनाएं।` : `Soil moisture is at ${activeContent.soilMoist}. Adjust irrigation for ${crop} (${stage}).`} 
              type={isHi ? "सिंचाई" : "IRRIGATION"} 
            />
            <SubAdvisoryCard 
              icon={<ShieldAlert size={16} />} 
              title={isHi ? "जल निकासी व्यवस्था" : "Prepare Drainage"} 
              desc={isHi ? `${cropDisplay} के खेतों में जलभराव व जड़ सड़न रोकने के लिए जल निकासी नालियां साफ रखें।` : `Clear field boundary furrows for ${crop} to prevent standing water root rot during ${stage}.`} 
              type={isHi ? "जल निकासी" : "DRAINAGE"} 
            />
            <SubAdvisoryCard 
              icon={<Sparkles size={16} />} 
              title={isHi ? "फसल तनाव निगरानी" : "Monitor Crop Stress"} 
              desc={isHi ? `${stageDisplay} अवस्था पर ${cropDisplay} के खेतों में नमी व कीट/रोग तनाव की नियमित जांच करें।` : `Inspect ${crop} fields during ${stage} for moisture & thermal stress or disease risks.`} 
              type={isHi ? "फसल स्वास्थ्य" : "CROP HEALTH"} 
            />
          </div>
        </div>

        {/* Right Side: Interactive Decision Timeline */}
        <div className="glass-panel p-5.5 flex flex-col justify-between min-h-100">
          <div>
            <span className="panel-label">
              {isHi 
                ? `कृषि निर्णय समय-रेखा (${cropDisplay} · ${stageDisplay} · ${locationName})` 
                : `Advisory Decision Timeline (${crop} · ${stage} · ${locationName})`}
            </span>
            
            <div className="relative mt-8 ml-2 flex flex-col gap-8">
              {/* Vertical line connector */}
              <div className="absolute left-2.25 top-2 bottom-2 w-0.5 bg-linear-to-b from-violet-500 via-teal-500 to-rose-400"></div>

              <TimelineStep step={isHi ? "आज" : "TODAY"} desc={timelineSteps.today} color="bg-violet-500" />
              <TimelineStep step={isHi ? "अगले 3 दिन" : "NEXT 3 DAYS"} desc={timelineSteps.d3} color="bg-teal-500" />
              <TimelineStep step={isHi ? "अगले 7 दिन" : "NEXT 7 DAYS"} desc={timelineSteps.d7} color="bg-amber-500" />
              <TimelineStep step={isHi ? "अगले 14 दिन" : "NEXT 14 DAYS"} desc={timelineSteps.d14} color="bg-rose-500" />
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-glass-borderSoft text-center text-text-lo text-[11px] font-mono leading-relaxed">
            {isHi 
              ? `* ${locationName} में ${cropDisplay} (${stageDisplay}) हेतु वैश्विक ENSO मॉडल, क्षेत्रीय मौसम और कृषि नियमों द्वारा संकलित सलाह।` 
              : `* advisories compiled by combining global ENSO models, regional weather, and stage rules for ${crop} (${stage}) in ${locationName}.`}
          </div>
        </div>

      </div>
    </div>
  );
}

function AdvisorySpec({ label, val, highlight }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] text-text-lo tracking-[.06em] uppercase">{label}</span>
      <span className={clsx(
        "font-display text-[14px] font-semibold text-text-hi",
        highlight && "text-teal-600 font-bold"
      )}>
        {val}
      </span>
    </div>
  );
}

function SubAdvisoryCard({ icon, title, desc, type }) {
  return (
    <div className="glass-panel p-5 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="w-8 h-8 rounded-lg bg-[rgba(139,124,246,0.18)] text-violet-500 flex items-center justify-center">
          {icon}
        </div>
        <span className="font-mono text-[9px] tracking-[.08em] uppercase text-text-lo">{type}</span>
      </div>
      <div>
        <h4 className="font-display text-[14.5px] font-semibold text-text-hi mb-1">{title}</h4>
        <p className="text-[12.5px] text-text-mid leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function TimelineStep({ step, desc, color }) {
  return (
    <div className="flex gap-4 relative z-10">
      <div className={`w-5 h-5 rounded-full ${color} border-4 border-white flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.1)]`}></div>
      <div className="flex flex-col">
        <span className="font-mono text-[9.5px] text-text-lo uppercase tracking-[.08em] leading-none mb-1">{step}</span>
        <span className="font-display text-[13.5px] font-semibold text-text-hi">{desc}</span>
      </div>
    </div>
  );
}
