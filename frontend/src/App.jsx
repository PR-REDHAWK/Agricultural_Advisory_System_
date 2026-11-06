import React, { useState, useEffect } from 'react';
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import HeroStatus from "./components/dashboard/HeroStatus";
import RiskMap from "./components/dashboard/RiskMap";
import KPIStrip from "./components/dashboard/KPIStrip";
import ForecastOutlook from "./components/dashboard/ForecastOutlook";
import AdvisoryCard from "./components/dashboard/AdvisoryCard";
import AdvisoryFeed from "./components/dashboard/AdvisoryFeed";
import DeliveryChannels from "./components/dashboard/DeliveryChannels";
import { LanguageProvider } from "./context/LanguageContext";
import VoiceComposerCard from "./components/dashboard/VoiceComposerCard";
import VoiceAssistantPage from "./components/pages/VoiceAssistantPage";

import { getApiUrl } from "./api/config";

// Import Sidebar pages
import MapPage from "./components/pages/MapPage";
import DataSourcesPage from "./components/pages/DataSourcesPage";
import ModelPage from "./components/pages/ModelPage";
import AdvisoryPage from "./components/pages/AdvisoryPage";
import SettingsPage from "./components/pages/SettingsPage";

function AppContent() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [regions, setRegions] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveForecast, setLiveForecast] = useState(null);
  const [voiceMode, setVoiceMode] = useState("voice");
  const [voiceText, setVoiceText] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voiceElapsed, setVoiceElapsed] = useState(0);
  const [voiceInitialQuestion, setVoiceInitialQuestion] = useState("");

  // Fetch live geographical context from database
  useEffect(() => {
    fetch(getApiUrl("/api/v1/regions"))
      .then((res) => res.json())
      .then((data) => {
        setRegions(data);
        const states = data.filter((r) => r.level === "State");
        if (states.length > 0) {
          setSelectedStateId(states[0].id);
          const districts = data.filter((r) => r.level === "District" && r.parent_id === states[0].id);
          if (districts.length > 0) {
            setSelectedDistrictId(districts[0].id);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load regions globally in App.jsx", err);
        setLoading(false);
      });
  }, []);

  // Fetch live forecast from Phase 7 Production Inference Pipeline whenever state/district selection changes
  useEffect(() => {
    const states = regions.filter((r) => r.level === "State");
    const selectedState = states.find((s) => s.id === selectedStateId);
    const stateName = selectedState ? selectedState.name : "Uttar Pradesh";

    fetch(getApiUrl(`/api/v1/forecast/live?state=${encodeURIComponent(stateName)}&prediction_date=2024-06-15&crop_name=Rice&growth_stage=Sowing&soil_moisture_pct=25.0`))
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "SUCCESS") {
          setLiveForecast(data);
        }
      })
      .catch((err) => console.error("Error fetching live forecast:", err));
  }, [selectedStateId, selectedDistrictId, regions]);

  const handleStateChange = (stateId) => {
    setSelectedStateId(Number(stateId));
    const firstDistrict = regions.find((r) => r.level === "District" && r.parent_id === Number(stateId));
    if (firstDistrict) {
      setSelectedDistrictId(firstDistrict.id);
    } else {
      setSelectedDistrictId(null);
    }
  };

  const handleDistrictChange = (districtId) => {
    setSelectedDistrictId(Number(districtId));
  };

  // Derive selection scopes
  const states = regions.filter((r) => r.level === "State");
  const selectedState = states.find((s) => s.id === selectedStateId) || null;
  const districts = regions.filter((r) => r.level === "State" ? false : r.parent_id === selectedStateId);
  const selectedDistrict = regions.find((d) => d.id === selectedDistrictId) || null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[500px]">
          <div className="font-mono text-violet-500 animate-pulse">Loading live geographical intelligence...</div>
        </div>
      );
    }

    switch (currentPage) {
      case "dashboard":
        return (
          <>
            <Topbar 
              states={states}
              districts={districts}
              selectedStateId={selectedStateId}
              selectedDistrictId={selectedDistrictId}
              onStateChange={handleStateChange}
              onDistrictChange={handleDistrictChange}
            />
            {/* HERO ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-[22px] items-stretch">
              <HeroStatus selectedRegion={selectedDistrict || selectedState} liveForecast={liveForecast} />
              <RiskMap selectedRegion={selectedDistrict || selectedState} />
            </div>
            
            {/* KPI STRIP */}
            <KPIStrip selectedRegion={selectedDistrict || selectedState} liveForecast={liveForecast} />

            {/* MONSOON AI ASSISTANT */}
            <section className="w-full grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6 items-center">

              {/* LEFT: Introduction */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-mono tracking-[0.15em] text-slate-500">
                    CONVERSATIONAL AGRICULTURAL INTELLIGENCE
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-[#0f1b3d]">
                  Monsoon AI Assistant
                </h2>

                <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                  Your personal agricultural intelligence assistant.
                  Ask about rainfall forecasts, crop conditions and
                  agricultural advisories in Hindi or Hinglish.
                </p>

                <div className="flex flex-wrap gap-2 mt-1">
                  {["Weather Forecast", "Crop Advisory", "Rainfall Risk"].map(item => (
                    <span
                      key={item}
                      className="px-3 py-1.5 rounded-full border border-blue-100
                      bg-white/60 text-[11px] text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* RIGHT: Voice Console */}
              <div className="w-full flex justify-end">
                <VoiceComposerCard
                  mode={voiceMode}
                  onModeChange={setVoiceMode}
                  status={voiceStatus}
                  elapsed={voiceElapsed}
                  maxSeconds={30}
                  value={voiceText}
                  onValueChange={setVoiceText}
                  onMicClick={() => setCurrentPage("voice-assistant")}
                  onSend={() => {
                    setCurrentPage("voice-assistant");
                  }}
                  languageLabel="हिंदी · hi-IN"
                  className="w-full max-w-none"
                />
              </div>

            </section>
            
            {/* FORECAST & ADVISORY ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-[22px] items-stretch">
              <div className="flex flex-col gap-[22px]">
                <AdvisoryCard liveForecast={liveForecast} />
                <ForecastOutlook liveForecast={liveForecast} />
              </div>
              <div className="flex flex-col gap-[22px]">
                <AdvisoryFeed />
                <DeliveryChannels />
              </div>
            </div>
          </>
        );
      case "voice-assistant":
        return <VoiceAssistantPage />;
      case "map":
        return (
          <MapPage 
            selectedStateId={selectedStateId}
            selectedDistrictId={selectedDistrictId}
            onStateChange={handleStateChange}
            onDistrictChange={handleDistrictChange}
          />
        );
      case "data-sources":
        return <DataSourcesPage />;
      case "model":
        return <ModelPage />;
      case "advisory":
        return (
          <AdvisoryPage 
            states={states}
            districts={districts}
            selectedStateId={selectedStateId}
            selectedDistrictId={selectedDistrictId}
            onStateChange={handleStateChange}
            onDistrictChange={handleDistrictChange}
            selectedRegion={selectedDistrict || selectedState}
            liveForecast={liveForecast}
          />
        );
      case "settings":
        return (
          <SettingsPage 
            states={states}
            districts={districts}
            selectedStateId={selectedStateId}
            selectedDistrictId={selectedDistrictId}
            onStateChange={handleStateChange}
            onDistrictChange={handleDistrictChange}
          />
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
      
      <div className="flex flex-col md:flex-row min-h-screen relative z-10">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        
        <main className="flex-1 flex flex-col px-4 py-4 md:px-[34px] md:py-[26px] pb-24 md:pb-[60px] gap-[22px] max-w-[1400px] mx-auto w-full">
          {renderContent()}
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
