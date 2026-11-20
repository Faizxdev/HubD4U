"use client";
import { useEffect, useRef } from "react";

export default function NativeBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Avoid duplicate script insertion
    if (containerRef.current.querySelector("script[data-native-ad]")) return;

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.setAttribute("data-native-ad", "true");
    script.src = "https://bancadeltempoidea.org/21/73235938cdb5b716e9e684e04dadcecf";
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8">
      <div className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider mb-2 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
        Recommended Content
      </div>
      <div className="w-full rounded-xl overflow-hidden bg-[#12141c] border border-white/5 p-3 sm:p-4 shadow-xl">
        <div
          id="container-73235938cdb5b716e9e684e04dadcecf"
          ref={containerRef}
          className="w-full min-h-[100px]"
        >
          {/* Static script tag for SSR crawler verification */}
          <script
            async
            data-cfasync="false"
            src="https://bancadeltempoidea.org/21/73235938cdb5b716e9e684e04dadcecf"
          />
        </div>
      </div>
    </div>
  );
}
