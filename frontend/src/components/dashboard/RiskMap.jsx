import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function RiskMap({ selectedRegion }) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize the Leaflet map container
  useEffect(() => {
    if (mapContainerRef.current && !leafletMapRef.current) {
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
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update center, zoom, and glow marker whenever selected location changes
  useEffect(() => {
    if (!leafletMapRef.current || !selectedRegion || !selectedRegion.lat || !selectedRegion.lng) return;

    const map = leafletMapRef.current;

    // Clear previous marker instance
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Pan map to the newly selected region
    const zoomLevel = selectedRegion.level === "District" ? 8 : 6;
    map.setView([selectedRegion.lat, selectedRegion.lng], zoomLevel, { animate: true });

    // Derive risk color based on forecasts
    let riskColor = "#10b981"; // Low (emerald)
    const latestForecast = selectedRegion.forecasts && selectedRegion.forecasts.length > 0 ? selectedRegion.forecasts[0] : null;
    const heavyRain = latestForecast ? Math.round(latestForecast.heavy_rain_prob * 100) : 0;
    
    if (heavyRain > 75) riskColor = "#ef4444"; // Extreme (rose)
    else if (heavyRain > 50) riskColor = "#fb923c"; // High (orange)
    else if (heavyRain > 25) riskColor = "#f59e0b"; // Moderate (amber)

    // Plot a pulsing glowing circle marker
    markerRef.current = L.circleMarker([selectedRegion.lat, selectedRegion.lng], {
      radius: 12,
      fillColor: riskColor,
      color: "#8b5cf6", // Highlight with violet border
      weight: 3,
      fillOpacity: 0.9,
    }).addTo(map);

    // Open automatic station info tooltip
    markerRef.current.bindTooltip(`
      <div style="font-family: monospace; font-size: 11px; padding: 2px;">
        <strong>${selectedRegion.name} Station</strong><br/>
        Telemetry Sync Active
      </div>
    `, { direction: 'top', offset: [0, -5] }).openTooltip();

  }, [selectedRegion]);

  return (
    <div className="glass-panel p-[22px] flex flex-col gap-3.5 h-full min-h-[350px]">
      <div className="flex justify-between items-center">
        <span className="panel-label">Geospatial Radar · Selected Location Station</span>
        <div className="font-mono text-[10.5px] text-text-mid bg-glass-fill border border-glass-borderSoft rounded-full px-3 py-1 font-semibold">
          {selectedRegion?.name || "India Overview"}
        </div>
      </div>
      
      {/* Map visualizer container */}
      <div className="flex-1 rounded-[16px] relative overflow-hidden border border-glass-borderSoft min-h-[250px] bg-[#f8fbff]">
        <div ref={mapContainerRef} className="w-full h-full absolute inset-0" style={{ zIndex: 0 }}></div>
      </div>

      <div className="flex gap-4 font-mono text-[10px] text-text-lo items-center justify-between">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ backgroundColor: "#10b981" }}></i> Low Risk</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f59e0b" }}></i> Moderate</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ backgroundColor: "#fb923c" }}></i> High</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }}></i> Extreme</span>
        </div>
        <div className="text-[9.5px]">Live telemetry sync</div>
      </div>
    </div>
  );
}
