"use client";
import { useEffect, useRef } from "react";

export default function Banner728x90() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bannerRef.current && !bannerRef.current.querySelector("iframe")) {
      bannerRef.current.innerHTML = "";

      const iframe = document.createElement("iframe");
      iframe.width = "728";
      iframe.height = "90";
      iframe.style.border = "none";
      iframe.style.overflow = "hidden";
      iframe.scrolling = "no";
      iframe.title = "Advertisement";

      const iframeHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                background: transparent;
                overflow: hidden;
              }
            </style>
          </head>
          <body>
            <script type="text/javascript">
              atOptions = {
                'key' : 'e8251d20015cb0ece8c301ab69ea6b60',
                'format' : 'iframe',
                'height' : 90,
                'width' : 728,
                'params' : {}
              };
            </script>
            <script type="text/javascript" src="//www.highperformanceformat.com/e8251d20015cb0ece8c301ab69ea6b60/invoke.js"></script>
          </body>
        </html>
      `;
      iframe.srcdoc = iframeHtml;
      bannerRef.current.appendChild(iframe);
    }
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center my-6 px-4">
      <div className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider mb-1.5 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/60" />
        Sponsored
      </div>
      <div className="overflow-x-auto max-w-full flex justify-center rounded-lg bg-black/40 border border-white/5 p-1.5 shadow-lg">
        <div
          ref={bannerRef}
          className="w-[728px] h-[90px] flex items-center justify-center"
        />
      </div>
    </div>
  );
}
