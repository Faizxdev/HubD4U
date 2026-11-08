"use client";
import { useEffect, useState } from "react";

export default function StreamChooser({
  provider,
  infoLink,
  title,
}: {
  provider: string;
  infoLink: string;
  title?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const q = encodeURIComponent(infoLink);
        const p = encodeURIComponent(provider);
        // Use fast stream API for quicker response
        const [resSeries, resMovie] = await Promise.allSettled([
          fetch(`/api/stream-fast?provider=${p}&type=series&link=${q}`),
          fetch(`/api/stream-fast?provider=${p}&type=movie&link=${q}`),
        ]);
        const seriesJson =
          resSeries.status === "fulfilled"
            ? await resSeries.value.json().catch(() => ({}))
            : {};
        const movieJson =
          resMovie.status === "fulfilled"
            ? await resMovie.value.json().catch(() => ({}))
            : {};
        const arrA = Array.isArray(seriesJson?.data) ? seriesJson.data : [];
        const arrB = Array.isArray(movieJson?.data) ? movieJson.data : [];
        // Merge unique by link
        const seen = new Set<string>();
        const merged = [...arrA, ...arrB].filter((s: any) => {
          const key = s?.link || "";
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (!mounted) return;
        setStreams(merged);
        if (merged.length === 0) {
          const err = seriesJson?.error || movieJson?.error;
          if (err) setError(err);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load streams");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [provider, infoLink]);

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const downloadFile = (stream: any) => {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(stream.link)}${
      stream.headers?.Referer
        ? `&referer=${encodeURIComponent(stream.headers.Referer)}`
        : ""
    }&download=true`;

    const a = document.createElement("a");
    a.href = proxyUrl;
    a.download = `${title || "download"}.${stream.type || "mp4"}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading)
    return <div className="text-xs text-gray-400 mt-2">Loading streams…</div>;
  if (error)
    return <div className="text-xs text-red-400 mt-2">{error}</div>;
  if (!streams.length)
    return <div className="text-xs text-gray-400 mt-2">No streams found.</div>;

  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {streams.map((s, i) => {
        const isHls = s.link?.toLowerCase().includes(".m3u8");
        const isMp4 = /\.(mp4|m4v|mkv|webm|avi)$/i.test(s.link || "");

        return (
          <div
            key={`${s.server || s.type || "s"}-${i}`}
            className="flex items-center gap-1"
          >
            {/* Play Button */}
            <a
              href={`/player?provider=${encodeURIComponent(provider)}&type=${encodeURIComponent(s.type || "movie")}&link=${encodeURIComponent(s.link)}`}
              className="text-xs bg-white text-black rounded-l px-2 py-1 hover:bg-gray-200 transition-colors"
            >
              {s.server || s.type || `Stream ${i + 1}`}
            </a>

            {/* Download/Copy Button */}
            {isMp4 ? (
              <button
                onClick={() => downloadFile(s)}
                className="text-xs bg-teal-500 text-white rounded-r px-2 py-1 hover:bg-teal-600 transition-colors"
                title="Download"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => copyToClipboard(s.link)}
                className={`text-xs rounded-r px-2 py-1 transition-colors ${
                  copiedLink === s.link
                    ? "bg-green-500 text-white"
                    : "bg-gray-600 text-white hover:bg-gray-500"
                }`}
                title={isHls ? "Copy HLS link" : "Copy link"}
              >
                {copiedLink === s.link ? (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}


