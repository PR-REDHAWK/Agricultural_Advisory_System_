import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "../../context/LanguageContext";
import { getApiUrl } from "../../api/config";

export default function MapPage({
  selectedStateId,
  selectedDistrictId,
  onStateChange,
  onDistrictChange
}) {
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = useState("7D");
  const [overlay, setOverlay] = useState("ONSET");
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef({});

  // Derive active selected region from props
  const selectedRegion = regions.find(r => r.id === selectedDistrictId) || 
                         regions.find(r => r.id === selectedStateId) || 
                         null;

  // 1. Fetch live data from FastAPI backend
  useEffect(() => {
    fetch(getApiUrl('/api/v1/regions'))
      .then(res => res.json())
      .then(data => {
        const formattedRegions = data.map((r) => {
          const latestForecast = r.forecasts && r.forecasts.length > 0 ? r.forecasts[0] : {};
          
          const onset = Math.round((latestForecast.onset_prob || 0) * 100);
          const breakRisk = Math.round((latestForecast.break_spell_risk || 0) * 100);
          const heavyRain = Math.round((latestForecast.heavy_rain_prob || 0) * 100);

          let risk = "LOW";
          let color = "#10b981"; // Emerald-500
          if (heavyRain > 75) { risk = "EXTREME"; color = "#ef4444"; } // Rose-500
          else if (heavyRain > 50) { risk = "HIGH"; color = "#fb923c"; } // Orange-400
          else if (heavyRain > 25) { risk = "MODERATE"; color = "#f59e0b"; } // Amber-500

          return {
            id: r.id,
            name: r.name,
            level: r.level,
            parent_id: r.parent_id,
            parent: r.level === "District" ? "District" : "State",
            lat: r.lat,
            lng: r.lng,
            onset,
            breakRisk,
            heavyRain,
            risk,
            color
          };
        });
        
        setRegions(formattedRegions);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch regions", err);
        setLoading(false);
      });
  }, []);

  // 2. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!loading && mapContainerRef.current && !leafletMapRef.current) {
      leafletMapRef.current = L.map(mapContainerRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(leafletMapRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(leafletMapRef.current);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [loading]);

  // 3. Update Markers & Pan Map on Selected Region Change
  useEffect(() => {
    if (!leafletMapRef.current || regions.length === 0) return;

    const map = leafletMapRef.current;

    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    regions.forEach(region => {
      if (!region.lat || !region.lng) return;

      let displayVal = 0;
      if (overlay === "ONSET") displayVal = region.onset;
      else if (overlay === "BREAK SPELL") displayVal = region.breakRisk;
      else displayVal = region.heavyRain;

      const isSelected = selectedRegion?.id === region.id;

      const marker = L.circleMarker([region.lat, region.lng], {
        radius: isSelected ? 12 : 8,
        fillColor: region.color,
        color: isSelected ? "#8b5cf6" : "#ffffff",
        weight: isSelected ? 3 : 1.5,
        fillOpacity: isSelected ? 0.95 : 0.75,
      }).addTo(map);

      marker.bindTooltip(`
        <div style="font-family: monospace; font-size: 11px; padding: 2px;">
          <strong>${region.name}</strong> (${region.parent})<br/>
          ${overlay}: ${displayVal}%
        </div>
      `, { direction: 'top', offset: [0, -5] });

      marker.on('click', () => {
        if (region.level === "District") {
          onStateChange(region.parent_id);
          onDistrictChange(region.id);
        } else {
          onStateChange(region.id);
        }
      });

      markersRef.current[region.id] = marker;
    });

    if (selectedRegion && selectedRegion.lat && selectedRegion.lng) {
      map.setView([selectedRegion.lat, selectedRegion.lng], 6, { animate: true });
    }

  }, [regions, overlay, selectedRegion, onStateChange, onDistrictChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="font-mono text-violet-500 animate-pulse">Loading live geographical intelligence...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="font-mono text-[11.5px] tracking-[.16em] text-teal-500 uppercase mb-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_10px_#0891b2] animate-pulse"></span>
          Geospatial Radar
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-display font-semibold text-[27px] tracking-[-0.01em] text-text-hi">
              {t("map_page_title", "MONSOON RISK MAP")}
            </h1>
            <p className="text-text-mid text-[14px]">{t("map_page_desc", "Zoom, pan, and hover circles to analyze climate risk anomalies")}</p>
          </div>
          <div className="bg-glass-fill border border-glass-borderSoft backdrop-blur-[20px] rounded-full py-2 px-4.5 text-[13.5px] text-text-hi font-medium">
            Live OpenStreetMap Feed
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-stretch">
        
        {/* Map Container */}
        <div className="glass-panel p-5 flex flex-col gap-4 min-h-[500px]">
          {/* Controls */}
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex gap-1.5">
              {["7D", "14D", "21D", "30D"].map((tStr) => (
                <button
                  key={tStr}
                  onClick={() => setTimeframe(tStr)}
                  className={clsx(
                    "font-mono text-[10.5px] px-3.5 py-1.5 rounded-full border tracking-[.04em] cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50",
                    timeframe === tStr 
                      ? "bg-gradient-to-br from-violet-500 to-violet-soft text-white border-transparent shadow-[0_2px_8px_rgba(139,124,246,0.2)]" 
                      : "bg-glass-fill2 border-glass-borderSoft text-text-mid hover:text-text-hi"
                  )}
                >
                  {tStr}
                </button>
              ))}
            </div>
            
            <div className="flex gap-1.5">
              {["ONSET", "BREAK SPELL", "HEAVY RAIN"].map((o) => (
                <button
                  key={o}
                  onClick={() => setOverlay(o)}
                  className={clsx(
                    "font-mono text-[10.5px] px-3.5 py-1.5 rounded-full border tracking-[.04em] cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                    overlay === o 
                      ? "bg-gradient-to-br from-teal-500 to-teal-500/80 text-white border-transparent shadow-[0_2px_8px_rgba(8,145,178,0.2)]" 
                      : "bg-glass-fill2 border-glass-borderSoft text-text-mid hover:text-text-hi"
                  )}
                >
                  {o === "ONSET" ? t("area_onset", "ONSET") : o === "BREAK SPELL" ? t("area_break", "BREAK SPELL") : t("metric_heavy_7d", "HEAVY RAIN")}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Map Visual */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-[400px] rounded-[16px] border border-glass-borderSoft bg-[#f8fbff] relative" 
            style={{ zIndex: 0 }}
          ></div>

          {/* Map Legend */}
          <div className="flex gap-4 font-mono text-[10px] text-text-lo justify-between items-center flex-wrap">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ backgroundColor: "#10b981" }}></i> {t("risk_low", "Low Risk")}</span>
              <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f59e0b" }}></i> {t("risk_moderate", "Moderate")}</span>
              <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ backgroundColor: "#fb923c" }}></i> {t("risk_high", "High")}</span>
              <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }}></i> Extreme</span>
            </div>
            <div className="text-[9.5px]">Click or hover nodes to inspect block-level advisories</div>
          </div>
        </div>

        {/* Selected Info Panel */}
        {selectedRegion && (
          <div className="glass-panel p-5 flex flex-col justify-between">
            <div>
              <span className="panel-label">Selected Region</span>
              <h3 className="font-display font-semibold text-[20px] text-text-hi mt-1">
                {selectedRegion.name}
              </h3>
              <span className="text-text-mid text-[12.5px] font-sans block mb-5">
                {selectedRegion.parent} Info
              </span>

              <div className="flex flex-col gap-4.5 border-t border-glass-borderSoft pt-5">
                <RegionMetric label={t("hero_onset_label", "Onset Likelihood")} val={`${selectedRegion.onset}%`} />
                <RegionMetric label={t("kpi_break_label", "Break spell Risk")} val={`${selectedRegion.breakRisk}%`} />
                <RegionMetric label={t("kpi_heavy_label", "Heavy Rain Prob.")} val={`${selectedRegion.heavyRain}%`} />
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-glass-borderSoft">
              <div className="font-mono text-[9px] text-text-lo tracking-[.08em] uppercase mb-1.5">Risk Level</div>
              <div className={clsx(
                "font-display text-[15px] font-bold py-2 px-3 rounded-xl inline-block text-center w-full",
                selectedRegion.risk === "LOW" && "bg-teal-500/10 text-teal-600 border border-teal-500/20",
                selectedRegion.risk === "MODERATE" && "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                selectedRegion.risk === "HIGH" && "bg-orange-500/10 text-orange-600 border border-orange-500/20",
                selectedRegion.risk === "EXTREME" && "bg-rose-500/10 text-rose-600 border border-rose-500/20"
              )}>
                {selectedRegion.risk} RISK
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function RegionMetric({ label, val }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-text-mid text-[13px]">{label}</span>
      <span className="font-mono text-[14px] font-semibold text-text-hi">{val}</span>
    </div>
  );
}
