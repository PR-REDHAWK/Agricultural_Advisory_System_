import React from "react";
import {
  LayoutDashboard,
  Map as MapIcon,
  Database,
  Brain,
  Wind,
  Settings,
  MessageCircle
} from "lucide-react";
import clsx from "clsx";
import { useLanguage } from "../../context/LanguageContext";

export default function Sidebar({ currentPage, onPageChange }) {
  const { t } = useLanguage();

  return (
    <aside className="w-full md:w-[84px] h-[68px] md:h-auto bg-glass-fill border-t md:border-t-0 md:border-r border-glass-borderSoft backdrop-blur-[30px] saturate-[140%] flex flex-row md:flex-col items-center justify-between md:justify-start py-2 md:py-[22px] px-6 md:px-0 gap-4 md:gap-[34px] fixed md:relative bottom-0 md:top-0 left-0 right-0 md:right-auto z-50 shrink-0">
      <div className="hidden md:flex w-[38px] h-[38px] rounded-[11px] bg-gradient-to-br from-violet-500 to-violet-soft items-center justify-center font-display font-bold text-[15px] text-white shadow-[0_6px_18px_rgba(139,124,246,0.45)] hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer">
        M
      </div>
      
      <div className="flex flex-row md:flex-col gap-1.5 flex-1 items-center justify-around md:justify-start mt-0 md:mt-3 w-full">
        <NavItem 
          icon={<LayoutDashboard size={19} />} 
          active={currentPage === "dashboard"} 
          title={t("nav_dashboard", "Dashboard")} 
          onClick={() => onPageChange("dashboard")}
        />
        <NavItem
          icon={<MessageCircle size={19} />}
          active={currentPage === "voice-assistant"}
          title="Voice Assistant"
          onClick={() => onPageChange("voice-assistant")}
        />
        <NavItem 
          icon={<MapIcon size={19} />} 
          active={currentPage === "map"} 
          title={t("nav_map", "Map")} 
          onClick={() => onPageChange("map")}
        />
        <NavItem 
          icon={<Database size={19} />} 
          active={currentPage === "data-sources"} 
          title={t("nav_datasources", "Data Sources")} 
          onClick={() => onPageChange("data-sources")}
        />
        <NavItem 
          icon={<Brain size={19} />} 
          active={currentPage === "model"} 
          title={t("nav_model", "Model")} 
          onClick={() => onPageChange("model")}
        />
        <NavItem 
          icon={<Wind size={19} />} 
          active={currentPage === "advisory"} 
          title={t("nav_advisory", "Advisory")} 
          onClick={() => onPageChange("advisory")}
        />
        <NavItem 
          icon={<Settings size={19} />} 
          active={currentPage === "settings"} 
          title={t("nav_settings", "Settings")} 
          onClick={() => onPageChange("settings")}
        />
      </div>
      
      <div className="hidden md:block w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-[#1b9e91] border-2 border-white/20 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"></div>
    </aside>
  );
}

function NavItem({ icon, active, title, onClick }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={clsx(
        "w-[44px] h-[44px] rounded-[13px] flex items-center justify-center cursor-pointer transition-all duration-200 relative transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50",
        active 
          ? "bg-gradient-to-br from-[rgba(139,124,246,0.35)] to-[rgba(108,92,231,0.18)] border border-[rgba(139,124,246,0.4)] text-white font-semibold"
          : "text-text-lo hover:bg-glass-fill2 hover:text-text-hi"
      )}
    >
      {active && (
        <div className="absolute top-[-8px] md:top-1/2 left-1/2 md:left-[-13px] -translate-x-1/2 md:translate-x-0 md:-translate-y-1/2 w-[18px] md:w-[3px] h-[3px] md:h-[18px] rounded-[3px] bg-violet-500"></div>
      )}
      {icon}
    </button>
  );
}
