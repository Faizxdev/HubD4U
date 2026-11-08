"use client";
import { useEffect, useMemo, useRef, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Hls from 'hls.js';

// Extend HTMLVideoElement to include audioTracks (not in standard TypeScript types)
declare global {
  interface HTMLVideoElement {
    audioTracks?: AudioTrackList;
  }
  interface AudioTrackList {
    length: number;
    [index: number]: AudioTrack;
    onchange?: () => void;
    onaddtrack?: () => void;
  }
  interface AudioTrack {
    id: string;
    kind: string;
    label: string;
    language: string;
    enabled: boolean;
  }
}

// Premium Icons as components
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

const VolumeHighIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

const VolumeMuteIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);

const FullscreenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
  </svg>
);

const ExitFullscreenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
);

const RewindIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12.5 3C17.15 3 21.08 6.03 22.47 10.22L20.1 11C19.05 7.81 16.04 5.5 12.5 5.5C10.54 5.5 8.77 6.22 7.38 7.38L10 10H3V3L5.6 5.6C7.45 4 9.85 3 12.5 3M10 12V22H8V14H6V12H10M18 14V20C18 21.11 17.11 22 16 22H14C12.9 22 12 21.1 12 20V14C12 12.9 12.9 12 14 12H16C17.11 12 18 12.9 18 14M14 14V20H16V14H14Z" />
  </svg>
);

const ForwardIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M11.5 3C6.85 3 2.92 6.03 1.53 10.22L3.9 11C4.95 7.81 7.96 5.5 11.5 5.5C13.46 5.5 15.23 6.22 16.62 7.38L14 10H21V3L18.4 5.6C16.55 4 14.15 3 11.5 3M10 12V22H8V14H6V12H10M18 14V20C18 21.11 17.11 22 16 22H14C12.9 22 12 21.1 12 20V14C12 12.9 12.9 12 14 12H16C17.11 12 18 12.9 18 14M14 14V20H16V14H14Z" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SubtitleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"/>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// New Icons for Vega features
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
);

const UnlockIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/>
  </svg>
);

const ResizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const PipIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
  </svg>
);

const NextIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
  </svg>
);

// Resize modes like Vega
type ResizeMode = 'contain' | 'cover' | 'fill' | 'none';
const RESIZE_MODES: { value: ResizeMode; label: string }[] = [
  { value: 'contain', label: 'Fit' },
  { value: 'cover', label: 'Cover' },
  { value: 'fill', label: 'Stretch' },
  { value: 'none', label: 'None' },
];

function PlayerContent() {
  const searchParams = useSearchParams();
  const link = searchParams.get('link') || '';
  const providerParam = searchParams.get('provider') || '';
  const type = searchParams.get('type') || 'movie';
  const title = searchParams.get('title') || 'Now Playing';
  
  // Episode data for next episode feature
  const episodeList = searchParams.get('episodeList') ? JSON.parse(decodeURIComponent(searchParams.get('episodeList') || '[]')) : [];
  const currentEpisodeIndex = parseInt(searchParams.get('episodeIndex') || '0', 10);
  const infoUrl = searchParams.get('infoUrl') || '';
  const poster = searchParams.get('poster') || '';

  const provider = useMemo(() => {
    if (providerParam) return providerParam;
    try {
      const host = new URL(link).host;
      if (/vegamovies/i.test(host)) return 'vega';
      if (/hdhub4u/i.test(host)) return 'hdhub4u';
    } catch {}
    return 'vega';
  }, [providerParam, link]);

  // State
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [showClickToPlay, setShowClickToPlay] = useState(false);
  const [levels, setLevels] = useState<{ index: number; label: string; height?: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number | 'auto'>('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [settingsPanel, setSettingsPanel] = useState<'main' | 'quality' | 'speed' | 'audio' | 'subtitles' | 'server'>('main');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [seekAmount, setSeekAmount] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // NEW: Vega-inspired features
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockButton, setShowUnlockButton] = useState(false);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('contain');
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPip, setIsPip] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  
  // Audio tracks state (with type and title like Vega)
  const [audioTracks, setAudioTracks] = useState<{ index: number; label: string; language: string; type?: string; title?: string }[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(0);
  
  // Subtitle state
  const [subtitleTracks, setSubtitleTracks] = useState<{ index: number; label: string; language: string }[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1);
  const [externalSubtitles, setExternalSubtitles] = useState<{ label: string; src: string }[]>([]);
  
  // Subtitle search state
  const [showSubtitleSearch, setShowSubtitleSearch] = useState(false);
  const [subtitleSearchQuery, setSubtitleSearchQuery] = useState(title);
  const [subtitleSearchResults, setSubtitleSearchResults] = useState<any[]>([]);
  const [subtitleSearchLoading, setSubtitleSearchLoading] = useState(false);
  const [subtitleLanguage, setSubtitleLanguage] = useState('eng');
  const [autoSubtitleLoaded, setAutoSubtitleLoaded] = useState(false);
  const [isBlackScreenDetected, setIsBlackScreenDetected] = useState(false);
  const [isAudioCodecStall, setIsAudioCodecStall] = useState(false);
  const [usingDirectStream, setUsingDirectStream] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const doubleTapTimeoutRef = useRef<any>(null);
  const lastTapRef = useRef<number>(0);
  const unlockTimeoutRef = useRef<any>(null);
  const progressSaveRef = useRef<any>(null);
  const fallbackAttemptedRef = useRef<boolean>(false);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const streamsRef = useRef(streams);
  streamsRef.current = streams;

  // Reliable Back Navigation (Browser history or fallback destination)
  const handleBackNavigation = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
        window.history.back();
        return;
      }
      if (infoUrl && provider) {
        window.location.href = `/info?provider=${encodeURIComponent(provider)}&url=${encodeURIComponent(infoUrl)}`;
        return;
      }
      window.location.href = '/';
    }
  }, [infoUrl, provider]);

  const tryNextStream = useCallback(() => {
    if (streamsRef.current.length <= 1) {
      setError('Playback unavailable on current server. Please select another source or download directly.');
      return;
    }
    setCurrentIndex((prev) => (prev + 1) % streamsRef.current.length);
  }, []);


  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Toast message helper (like Vega)
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  // Watch History - Load saved progress on mount
  useEffect(() => {
    if (!link) return;
    try {
      const historyKey = `watch_${btoa(link).slice(0, 32)}`;
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.position && data.position > 10) {
          setWatchProgress(data.position);
        }
      }
    } catch (e) {
      console.error('[WATCH_HISTORY] Load error:', e);
    }
  }, [link]);

  // Watch History - Save progress periodically
  useEffect(() => {
    if (!link || !duration) return;
    
    const saveProgress = () => {
      if (currentTime < 10) return; // Don't save if just started
      try {
        const historyKey = `watch_${btoa(link).slice(0, 32)}`;
        const data = {
          position: currentTime,
          duration: duration,
          title: title,
          poster: poster,
          link: link,
          provider: provider,
          type: type,
          updatedAt: Date.now(),
        };
        localStorage.setItem(historyKey, JSON.stringify(data));
        
        // Also save to continue watching list
        const continueKey = 'continue_watching';
        const continueList = JSON.parse(localStorage.getItem(continueKey) || '[]');
        const existingIndex = continueList.findIndex((item: any) => item.link === link);
        if (existingIndex >= 0) {
          continueList[existingIndex] = data;
        } else {
          continueList.unshift(data);
        }
        // Keep only last 20 items
        localStorage.setItem(continueKey, JSON.stringify(continueList.slice(0, 20)));
      } catch (e) {
        console.error('[WATCH_HISTORY] Save error:', e);
      }
    };

    // Save every 10 seconds
    progressSaveRef.current = setInterval(saveProgress, 10000);
    
    // Also save on unmount
    return () => {
      if (progressSaveRef.current) clearInterval(progressSaveRef.current);
      saveProgress();
    };
  }, [link, currentTime, duration, title, poster, provider, type]);

  // Resume from saved position
  useEffect(() => {
    if (watchProgress > 0 && videoRef.current && duration > 0) {
      // Only resume if we haven't already and position is valid
      if (videoRef.current.currentTime < 5 && watchProgress < duration - 30) {
        videoRef.current.currentTime = watchProgress;
        showToast(`Resumed from ${formatTime(watchProgress)}`);
        setWatchProgress(0); // Reset so we don't keep resuming
      }
    }
  }, [watchProgress, duration, showToast]);

  // Next Episode detection (>80% watched like Vega)
  useEffect(() => {
    if (!duration || episodeList.length <= 1) return;
    const progress = currentTime / duration;
    const hasNextEpisode = currentEpisodeIndex < episodeList.length - 1;
    
    if (progress >= 0.8 && hasNextEpisode && !showNextEpisode) {
      setShowNextEpisode(true);
    } else if (progress < 0.8 && showNextEpisode) {
      setShowNextEpisode(false);
    }
  }, [currentTime, duration, episodeList.length, currentEpisodeIndex, showNextEpisode]);

  // PIP change handler
  useEffect(() => {
    const handlePipChange = () => {
      setIsPip(document.pictureInPictureElement !== null);
    };
    document.addEventListener('enterpictureinpicture', handlePipChange);
    document.addEventListener('leavepictureinpicture', handlePipChange);
    return () => {
      document.removeEventListener('enterpictureinpicture', handlePipChange);
      document.removeEventListener('leavepictureinpicture', handlePipChange);
    };
  }, []);

  // Audio-playing-but-video-not-playing (Black Screen) Watchdog & Auto-Recovery
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) {
      setIsBlackScreenDetected(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!video || video.paused) return;

      // Check if audio has played for 2.5 seconds but video dimensions or decoded frames are missing
      const hasProgressed = video.currentTime > 2.5;
      const noDimensions = video.videoWidth === 0 || video.videoHeight === 0;
      const decodedFrames = (video as any).webkitDecodedFrameCount;
      const zeroFrames = decodedFrames !== undefined && decodedFrames === 0;

      if (hasProgressed && (noDimensions || zeroFrames)) {
        console.warn('[PLAYER] Black screen detected: audio is playing but video frames are not rendering (unsupported HEVC 10-bit codec)');
        setIsBlackScreenDetected(true);
        showToast('Audio playing without video. Recovering with alternate server...');
        
        // Auto-switch to next server if available
        if (streamsRef.current.length > 1) {
          tryNextStream();
        } else if (!fallbackAttemptedRef.current) {
          fallbackAttemptedRef.current = true;
          const raw = streamsRef.current[currentIndexRef.current]?.link;
          const ref = streamsRef.current[currentIndexRef.current]?.headers?.Referer;
          if (raw && videoRef.current) {
            videoRef.current.src = `/api/stream-fallback?url=${encodeURIComponent(raw)}${ref ? `&referer=${encodeURIComponent(ref)}` : ''}`;
            videoRef.current.play().catch(() => {});
          }
        }
      } else {
        setIsBlackScreenDetected(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, currentTime, showToast, tryNextStream]);

  // MKV & AC-3 Audio Codec Stall Watchdog:
  // If an MKV stream is buffering at currentTime 0 for > 4s, the browser HTML5 engine
  // cannot decode the embedded multi-channel AC-3/E-AC-3/DTS audio track.
  useEffect(() => {
    const video = videoRef.current;
    const curStream = streams[currentIndex];
    if (!video || !curStream) return;

    const isMkv = (curStream.link || '').toLowerCase().includes('.mkv') || curStream.type === 'mkv';
    if (!isMkv) {
      setIsAudioCodecStall(false);
      return;
    }

    const stallTimer = setTimeout(() => {
      const isStalled = video.currentTime === 0 && (video.readyState <= 2 || buffering);
      if (isStalled) {
        console.warn('[PLAYER] MKV audio codec stall detected (AC-3/Dolby audio unsupported by browser).');
        
        // Auto-switch to next server if available
        if (streams.length > 1 && currentIndex < streams.length - 1) {
          showToast('MKV audio format buffering. Auto-switching server...');
          tryNextStream();
        } else {
          setIsAudioCodecStall(true);
        }
      }
    }, 4500);

    return () => clearTimeout(stallTimer);
  }, [currentIndex, streams, buffering, tryNextStream, showToast]);

  // Toggle PIP
  const togglePip = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        showToast('Exited Picture-in-Picture');
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
        showToast('Picture-in-Picture enabled');
      }
    } catch (e) {
      console.error('[PIP] Error:', e);
      showToast('PIP not supported');
    }
  }, [showToast]);

  // Toggle player lock (like Vega)
  const toggleLock = useCallback(() => {
    setIsLocked(prev => {
      const newState = !prev;
      showToast(newState ? 'Player locked' : 'Player unlocked');
      return newState;
    });
    setShowUnlockButton(false);
  }, [showToast]);

  // Handle locked screen tap (show unlock button briefly)
  const handleLockedTap = useCallback(() => {
    if (!isLocked) return;
    setShowUnlockButton(true);
    if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
    unlockTimeoutRef.current = setTimeout(() => {
      setShowUnlockButton(false);
    }, 3000);
  }, [isLocked]);

  // Cycle resize mode (like Vega)
  const cycleResizeMode = useCallback(() => {
    setResizeMode(prev => {
      const currentIndex = RESIZE_MODES.findIndex(m => m.value === prev);
      const nextIndex = (currentIndex + 1) % RESIZE_MODES.length;
      const next = RESIZE_MODES[nextIndex];
      showToast(`Resize: ${next.label}`);
      return next.value;
    });
  }, [showToast]);

  // Go to next episode
  const goToNextEpisode = useCallback(() => {
    if (currentEpisodeIndex >= episodeList.length - 1) return;
    const nextEpisode = episodeList[currentEpisodeIndex + 1];
    if (nextEpisode?.link) {
      const params = new URLSearchParams({
        link: nextEpisode.link,
        provider: provider,
        type: type,
        title: nextEpisode.title || title,
        episodeIndex: String(currentEpisodeIndex + 1),
        episodeList: encodeURIComponent(JSON.stringify(episodeList)),
        infoUrl: infoUrl,
        poster: poster,
      });
      window.location.href = `/player?${params.toString()}`;
    }
  }, [currentEpisodeIndex, episodeList, provider, type, title, infoUrl, poster]);

  // Current quality label
  const currentQualityLabel = useMemo(() => {
    if (currentLevel === 'auto') return 'Auto';
    const level = levels.find(l => l.index === currentLevel);
    return level?.label || 'Auto';
  }, [currentLevel, levels]);

  // Load streams - use fast API for quicker response
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!link) return;
      setLoading(true);
      setError(null);
      try {
        // Use fast stream API for quicker response
        const res = await fetch(`/api/stream-fast?provider=${provider}&type=${type}&link=${encodeURIComponent(link)}`);
        const json = await res.json();
        if (!mounted) return;
        
        // Log timing for debugging
        if (json.timing) {
          console.log(`[PLAYER] Stream fetch took ${json.timing}ms`);
        }
        
        setStreams(Array.isArray(json?.data) ? json.data : []);
        if ((!json?.data || json?.data?.length === 0) && json?.error) {
          setError(json.error);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [provider, link, type]);

  // Fetch audio tracks from backend when stream changes (strictly non-blocking)
  useEffect(() => {
    const streamUrl = streams[currentIndex]?.link;
    if (!streamUrl) return;
    
    // Only fetch for MKV/MP4 files (not HLS which handles tracks differently)
    const isMkvOrMp4 = /\.(mkv|mp4|m4v|webm)/i.test(streamUrl);
    if (!isMkvOrMp4) return;
    
    let mounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    
    // Language code to name mapping
    const langNames: Record<string, string> = {
      'hin': 'Hindi', 'eng': 'English', 'jpn': 'Japanese', 'chi': 'Chinese',
      'kor': 'Korean', 'tam': 'Tamil', 'tel': 'Telugu', 'spa': 'Spanish',
      'fra': 'French', 'deu': 'German', 'por': 'Portuguese', 'rus': 'Russian',
      'ara': 'Arabic', 'ita': 'Italian', 'und': 'Unknown', 'mul': 'Multiple',
      'org': 'Original', 'aac': 'AAC', 'ac3': 'AC3', 'eac3': 'E-AC3',
      'dts': 'DTS', 'flac': 'FLAC', 'opus': 'Opus', 'mp3': 'MP3',
    };
    
    async function fetchAudioTracks() {
      try {
        const res = await fetch(`/api/audio-tracks?url=${encodeURIComponent(streamUrl)}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const json = await res.json();
        
        if (!mounted) return;
        
        if (json.success && json.tracks && json.tracks.length > 0) {
          const tracks = json.tracks.map((t: any, i: number) => {
            const langCode = t.language?.toLowerCase() || 'und';
            const langName = langNames[langCode] || t.title || `Track ${i + 1}`;
            const codecName = langNames[t.codec?.toLowerCase()] || t.codec?.toUpperCase() || '';
            return {
              index: i,
              label: langName,
              language: langCode,
              type: codecName,
              title: t.title || langName,
              isDefault: t.default || i === 0,
            };
          });
          setAudioTracks(tracks);
          if (tracks.length > 1) {
            showToast(`${tracks.length} audio tracks detected`);
          }
        }
      } catch {
        // Silently catch aborts/network timeouts - never stall the video player
      }
    }
    
    fetchAudioTracks();
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [streams, currentIndex, showToast]);

  // Intelligent stream ranking for fast, immediate startup:
  // 1. HLS (.m3u8) - starts instantly, adaptive bitrate
  // 2. Pixeldrain Direct (fast multi-gigabit CDN with CORS and Range seeking)
  // 3. MP4 / M4V files (100% universal hardware video & AAC audio decoder support)
  // 4. Cloudflare / Workers / FastDL
  // 5. Direct MKV
  // 6. Slow filehosts (MegaUp, etc.)
  const bestInitialIndex = useMemo(() => {
    if (!streams || streams.length === 0) return 0;
    
    // Check 1: HLS
    const hlsIdx = streams.findIndex(s => s.link?.includes('.m3u8') || s.type === 'm3u8');
    if (hlsIdx >= 0) return hlsIdx;

    // Check 2: Pixeldrain direct
    const pixelIdx = streams.findIndex(s => s.link?.includes('pixeldrain.com/api/file/'));
    if (pixelIdx >= 0) return pixelIdx;

    // Check 3: Direct MP4 / M4V / WebM
    const mp4Idx = streams.findIndex(s => {
      const u = (s.link || '').toLowerCase();
      const t = (s.type || '').toLowerCase();
      return t === 'mp4' || u.endsWith('.mp4') || u.includes('.mp4?') || u.includes('cloudflarestorage') || u.includes('fastdl');
    });
    if (mp4Idx >= 0) return mp4Idx;

    // Check 4: Any non-megaup stream
    const fastCdnIdx = streams.findIndex(s => !s.link?.includes('megaup'));
    if (fastCdnIdx >= 0) return fastCdnIdx;

    return 0;
  }, [streams]);

  useEffect(() => {
    setCurrentIndex(bestInitialIndex);
    setIsAudioCodecStall(false);
  }, [bestInitialIndex]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;

    const handlers = {
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      loadedmetadata: () => setDuration(video.duration || 0),
      waiting: () => setBuffering(true),
      canplay: () => setBuffering(false),
      playing: () => setBuffering(false),
      timeupdate: () => {
        setCurrentTime(video.currentTime || 0);
        if (video.buffered.length > 0) {
          setBuffered(video.buffered.end(video.buffered.length - 1));
        }
      },
      volumechange: () => {
        setVolume(video.volume);
        setMuted(video.muted);
      },
      ratechange: () => setPlaybackRate(video.playbackRate),
      error: () => {
        const curIdx = currentIndexRef.current;
        const curStreams = streamsRef.current;
        const stream = curStreams[curIdx];
        const raw = stream?.link;
        const ref = stream?.headers?.Referer;

        console.warn('[PLAYER] Playback error on stream index', curIdx, raw);

        if (!fallbackAttemptedRef.current && raw) {
          fallbackAttemptedRef.current = true;
          showToast('Buffering stream via fallback proxy...');
          if (videoRef.current) {
            videoRef.current.src = `/api/stream-fallback?url=${encodeURIComponent(raw)}${ref ? `&referer=${encodeURIComponent(ref)}` : ''}`;
            videoRef.current.play().catch(() => {});
          }
          return;
        }

        if (curStreams.length > 1) {
          showToast('Switching to next server...');
          setCurrentIndex((prev) => (prev + 1) % curStreams.length);
        } else {
          setError('Playback unavailable on current server. Please select another source or download directly.');
        }
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      video.addEventListener(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        video.removeEventListener(event, handler);
      });
    };
  }, [showToast]);

  // Auto-hide controls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const show = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !showSettings) setShowControls(false);
      }, 3500);
    };

    container.addEventListener('mousemove', show);
    container.addEventListener('touchstart', show, { passive: true });
    show();

    return () => {
      container.removeEventListener('mousemove', show);
      container.removeEventListener('touchstart', show);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showSettings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 10, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(video.volume + 0.1, 1);
          video.muted = false;
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(video.volume - 0.1, 0);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          video.muted = !video.muted;
          break;
        case 'Escape':
          setShowSettings(false);
          break;
        case 'p':
          e.preventDefault();
          togglePip();
          break;
        case 'r':
          e.preventDefault();
          cycleResizeMode();
          break;
        case 'n':
          e.preventDefault();
          if (showNextEpisode) goToNextEpisode();
          break;
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          e.preventDefault();
          video.currentTime = (parseInt(e.key) / 10) * video.duration;
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fullscreen change handler
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Load video source
  useEffect(() => {
    const video = videoRef.current;
    const raw = streams[currentIndex]?.link;
    const ref = streams[currentIndex]?.headers?.Referer;

    if (!video || !raw) return;

    fallbackAttemptedRef.current = false;
    setError(null);

    const toProxy = (u: string) => `/api/proxy?url=${encodeURIComponent(u)}${ref ? `&referer=${encodeURIComponent(ref)}` : ''}`;
    const isHls = raw.toLowerCase().includes('.m3u8');
    const isMp4 = /\.(mp4|m4v|webm)$/i.test(raw);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
      setLevels([]);
      setCurrentLevel('auto');
    }

    const attemptAutoplay = () => {
      setShowClickToPlay(false);
      video.play().catch(() => setShowClickToPlay(true));
    };

    if (Hls.isSupported() && isHls) {
      class ProxyLoader extends (Hls as any).DefaultConfig.loader {
        load(context: any, config: any, callbacks: any) {
          if (context?.url) context.url = toProxy(context.url);
          super.load(context, config, callbacks);
        }
      }

      // Optimized HLS config for low-end PCs and fast startup
      const hls = new Hls({
        maxBufferLength: 20,              // 20s buffer (lightweight on memory)
        maxMaxBufferLength: 60,           // 1 min max buffer (prevents heap bloat)
        maxBufferSize: 30 * 1000 * 1000,  // 30MB max memory buffer
        maxBufferHole: 0.5,
        
        startLevel: -1,                   // Auto select best quality
        autoStartLoad: true,
        startPosition: -1,
        
        lowLatencyMode: false,
        backBufferLength: 15,             // Keep 15s back buffer
        
        enableWorker: true,               // Web worker decoding
        
        manifestLoadingTimeOut: 8000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 8000,
        levelLoadingMaxRetry: 3,
        fragLoadingTimeOut: 15000,
        fragLoadingMaxRetry: 3,
        
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.9,
        abrBandWidthUpFactor: 0.7,
        
        loader: ProxyLoader as any,
      });

      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(raw));
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels.map((l, i) => ({
          index: i,
          label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}kbps`,
          height: l.height,
        })));
        attemptAutoplay();
      });
      
      // Audio tracks detection with deduplication (like Vega's processAudioTracks)
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        const rawTracks = hls.audioTracks.map((t, i) => ({
          index: i,
          label: t.name || t.lang || `Track ${i + 1}`,
          language: t.lang || 'unknown',
          // Additional info for display
          type: t.audioCodec || '',
          title: t.name || '',
        }));
        
        // Deduplicate tracks by type-title-language key (like Vega)
        const uniqueMap = new Map();
        const uniqueTracks = rawTracks.filter(track => {
          const key = `${track.type}-${track.title}-${track.language}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, true);
            return true;
          }
          return false;
        });
        
        setAudioTracks(uniqueTracks);
        
        // Auto-select last used audio track from cache (like Vega)
        try {
          const lastAudioTrack = localStorage.getItem('lastAudioTrack');
          if (lastAudioTrack) {
            const matchingTrack = uniqueTracks.find(t => t.language === lastAudioTrack);
            if (matchingTrack) {
              hls.audioTrack = matchingTrack.index;
              setCurrentAudioTrack(matchingTrack.index);
            }
          }
        } catch {}
      });
      
      // Subtitle tracks detection
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        const tracks = hls.subtitleTracks.map((t, i) => ({
          index: i,
          label: t.name || t.lang || `Subtitle ${i + 1}`,
          language: t.lang || 'unknown',
        }));
        setSubtitleTracks(tracks);
      });
      
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else tryNextStream();
        }
      });


      return () => hls.destroy();
    } else {
      // Direct vs Proxy intelligent delivery for MP4 & MKV:
      // Known CORS CDNs (Pixeldrain direct API, Cloudflare R2, Akamai) can be played directly
      // This eliminates Vercel serverless proxy limits and 60s timeouts
      const canPlayDirect = !ref && (
        raw.includes('pixeldrain.com/api/file/') ||
        raw.includes('cloudflarestorage.com') ||
        raw.includes('workers.dev')
      );

      // Detect audio tracks from MP4/MKV files using HTML5 audioTracks API
      const detectAudioTracks = () => {
        if (video.audioTracks && video.audioTracks.length > 0) {
          const tracks = Array.from(video.audioTracks).map((t: any, i: number) => ({
            index: i,
            label: t.label || t.language || `Track ${i + 1}`,
            language: t.language || 'unknown',
            type: t.kind || '',
            title: t.label || '',
          }));
          console.log('[AUDIO] Detected MP4/MKV audio tracks:', tracks);
          setAudioTracks(tracks);
          
          // Auto-select last used audio track
          try {
            const lastAudioTrack = localStorage.getItem('lastAudioTrack');
            if (lastAudioTrack) {
              const matchingTrack = tracks.find(t => t.language === lastAudioTrack);
              if (matchingTrack && video.audioTracks) {
                // Disable all tracks first
                for (let i = 0; i < video.audioTracks.length; i++) {
                  (video.audioTracks[i] as any).enabled = false;
                }
                // Enable the matching track
                (video.audioTracks[matchingTrack.index] as any).enabled = true;
                setCurrentAudioTrack(matchingTrack.index);
              }
            }
          } catch {}
        }
      };
      
      // Try to detect audio tracks after metadata is loaded
      video.addEventListener('loadedmetadata', detectAudioTracks);
      setTimeout(detectAudioTracks, 1000);

      if (canPlayDirect) {
        setUsingDirectStream(true);
        video.src = raw;
        video.onerror = () => {
          console.warn('[PLAYER] Direct connection blocked, switching to proxy route');
          setUsingDirectStream(false);
          video.src = toProxy(raw);
          attemptAutoplay();
        };
        attemptAutoplay();
      } else {
        setUsingDirectStream(false);
        video.src = toProxy(raw);
        attemptAutoplay();
      }
    }
  }, [streams, currentIndex, tryNextStream, showToast]);

  // Quality change
  useEffect(() => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = currentLevel === 'auto' ? -1 : currentLevel;
  }, [currentLevel]);

  // Audio track change - handles HLS and native audioTracks API
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // For HLS streams - this works!
    if (hlsRef.current && hlsRef.current.audioTracks.length > 0) {
      hlsRef.current.audioTrack = currentAudioTrack;
      console.log('[AUDIO] HLS switched to track:', currentAudioTrack);
      showToast(`Audio: ${audioTracks[currentAudioTrack]?.label || 'Track ' + (currentAudioTrack + 1)}`);
    }
    
    // For MP4 files with native audioTracks API (limited browser support)
    if (video.audioTracks && video.audioTracks.length > 1) {
      for (let i = 0; i < video.audioTracks.length; i++) {
        (video.audioTracks[i] as any).enabled = i === currentAudioTrack;
      }
      console.log('[AUDIO] Native switched to track:', currentAudioTrack);
      showToast(`Audio: ${audioTracks[currentAudioTrack]?.label || 'Track ' + (currentAudioTrack + 1)}`);
    }
  }, [currentAudioTrack, audioTracks, showToast]);

  // Subtitle track change
  useEffect(() => {
    if (!hlsRef.current) return;
    hlsRef.current.subtitleTrack = currentSubtitle;
  }, [currentSubtitle]);

  // Auto-search and load subtitles when video starts
  useEffect(() => {
    if (autoSubtitleLoaded || !title || loading || streams.length === 0) return;
    
    const autoLoadSubtitle = async () => {
      try {
        // Clean up title for better search results
        const cleanTitle = title
          .replace(/\s*\(?\d{4}\)?$/, '') // Remove year
          .replace(/\s*-\s*Season\s*\d+.*$/i, '') // Remove season info
          .replace(/\s*S\d+E\d+.*$/i, '') // Remove S01E01 format
          .replace(/\s*\[.*?\]/g, '') // Remove brackets content
          .replace(/\s*\(.*?\)/g, '') // Remove parentheses content
          .trim();
        
        if (!cleanTitle) return;
        
        console.log('[SUBTITLE] Auto-searching for:', cleanTitle);
        
        const query = encodeURIComponent(cleanTitle.toLowerCase());
        const url = `https://rest.opensubtitles.org/search/query-${query}/sublanguageid-eng`;
        
        const res = await fetch(url, {
          headers: {
            'X-User-Agent': 'VLSub 0.10.2',
          },
        });
        
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          // Find the best match (highest download count)
          const sortedResults = data.sort((a, b) => 
            parseInt(b.SubDownloadsCnt || '0') - parseInt(a.SubDownloadsCnt || '0')
          );
          
          const bestMatch = sortedResults[0];
          console.log('[SUBTITLE] Auto-loading:', bestMatch.SubFileName);
          
          // Auto-load the best subtitle
          const subUrl = bestMatch.SubDownloadLink?.replace('.gz', '') || '';
          if (subUrl && videoRef.current) {
            const video = videoRef.current;
            
            // Remove existing tracks first
            const existingTracks = video.querySelectorAll('track');
            existingTracks.forEach(t => t.remove());
            
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = `${bestMatch.LanguageName || 'English'} (Auto)`;
            track.srclang = bestMatch.ISO639 || 'en';
            track.src = `/api/subtitle?url=${encodeURIComponent(subUrl)}`;
            track.default = true;
            
            // Add load event to enable track after it's ready
            track.addEventListener('load', () => {
              console.log('[SUBTITLE] Auto-track loaded successfully');
              if (video.textTracks.length > 0) {
                video.textTracks[0].mode = 'showing';
              }
            });
            
            video.appendChild(track);
            
            // Also try to enable after a delay (fallback)
            setTimeout(() => {
              if (video.textTracks.length > 0 && video.textTracks[0].mode !== 'showing') {
                video.textTracks[0].mode = 'showing';
              }
            }, 1000);
            
            setExternalSubtitles([{ label: track.label, src: subUrl }]);
          }
        }
      } catch (e) {
        console.error('[SUBTITLE] Auto-search error:', e);
      } finally {
        setAutoSubtitleLoaded(true);
      }
    };
    
    // Delay auto-search to let video load first
    const timer = setTimeout(autoLoadSubtitle, 2000);
    return () => clearTimeout(timer);
  }, [title, loading, streams.length, autoSubtitleLoaded]);

  // Search subtitles from OpenSubtitles
  const searchSubtitles = useCallback(async () => {
    if (!subtitleSearchQuery.trim()) return;
    
    setSubtitleSearchLoading(true);
    setSubtitleSearchResults([]);
    
    try {
      const query = encodeURIComponent(subtitleSearchQuery.toLowerCase());
      const isImdbId = subtitleSearchQuery.startsWith('tt');
      const searchType = isImdbId ? 'imdbid' : 'query';
      
      const url = `https://rest.opensubtitles.org/search/${searchType}-${query}/sublanguageid-${subtitleLanguage}`;
      
      const res = await fetch(url, {
        headers: {
          'X-User-Agent': 'VLSub 0.10.2',
        },
      });
      
      const data = await res.json();
      setSubtitleSearchResults(Array.isArray(data) ? data.slice(0, 20) : []);
    } catch (e) {
      console.error('Subtitle search error:', e);
      setSubtitleSearchResults([]);
    } finally {
      setSubtitleSearchLoading(false);
    }
  }, [subtitleSearchQuery, subtitleLanguage]);

  // Add external subtitle to video
  const addExternalSubtitle = useCallback((subtitle: any) => {
    const subUrl = subtitle.SubDownloadLink?.replace('.gz', '') || '';
    if (!subUrl) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    // Remove existing tracks first
    const existingTracks = video.querySelectorAll('track');
    existingTracks.forEach(t => t.remove());
    
    // Create a new track element
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = `${subtitle.LanguageName} - ${subtitle.MovieReleaseName || subtitle.SubFileName}`;
    track.srclang = subtitle.ISO639 || 'en';
    track.src = `/api/subtitle?url=${encodeURIComponent(subUrl)}`;
    track.default = true;
    
    // Add load event to enable track after it's ready
    track.addEventListener('load', () => {
      console.log('[SUBTITLE] Track loaded successfully');
      if (video.textTracks.length > 0) {
        video.textTracks[0].mode = 'showing';
      }
    });
    
    track.addEventListener('error', (e) => {
      console.error('[SUBTITLE] Track load error:', e);
    });
    
    video.appendChild(track);
    
    // Also try to enable immediately (for cached subtitles)
    setTimeout(() => {
      if (video.textTracks.length > 0 && video.textTracks[0].mode !== 'showing') {
        video.textTracks[0].mode = 'showing';
      }
    }, 100);
    
    setExternalSubtitles([{ label: track.label, src: subUrl }]);
    setShowSubtitleSearch(false);
  }, []);

  // Player controls
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, video.duration));
  }, []);

  const formatTime = useCallback((t: number) => {
    if (!isFinite(t) || t < 0) return '0:00';
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Progress bar handlers
  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(percent * duration);
    setHoverPosition(percent * 100);
  }, [duration]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  }, [duration, seek]);

  // Double tap to seek (mobile)
  const handleDoubleTap = useCallback((side: 'left' | 'right') => {
    const video = videoRef.current;
    if (!video) return;
    
    const amount = side === 'left' ? -10 : 10;
    video.currentTime = Math.max(0, Math.min(video.currentTime + amount, video.duration));
    
    setDoubleTapSide(side);
    setSeekAmount(prev => prev + Math.abs(amount));
    
    if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
    doubleTapTimeoutRef.current = setTimeout(() => {
      setDoubleTapSide(null);
      setSeekAmount(0);
    }, 800);
  }, []);

  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isMobile) {
      togglePlay();
      return;
    }

    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const side = x < rect.width / 2 ? 'left' : 'right';

    if (now - lastTapRef.current < 300) {
      handleDoubleTap(side);
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  }, [isMobile, togglePlay, handleDoubleTap]);

  // Process streams for download (use already loaded streams)
  const processedDownloadLinks = useMemo(() => {
    return streams.map((stream: any) => {
      const isHls = stream.link?.toLowerCase().includes('.m3u8');
      const isMp4 = /\.(mp4|m4v|mkv|webm|avi)$/i.test(stream.link || '');
      
      // Determine file type
      let fileType = 'unknown';
      if (isHls) fileType = 'm3u8';
      else if (isMp4) {
        const match = stream.link?.match(/\.(mp4|m4v|mkv|webm|avi)$/i);
        fileType = match ? match[1].toLowerCase() : 'mp4';
      } else {
        fileType = 'mp4'; // Default to mp4 for unknown
      }

      // Generate proxy URL for download
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(stream.link)}${
        stream.headers?.Referer ? `&referer=${encodeURIComponent(stream.headers.Referer)}` : ''
      }&download=true`;

      return {
        server: stream.server || 'Unknown',
        quality: stream.quality || '',
        link: stream.link,
        proxyLink: proxyUrl,
        type: fileType,
        isDirectDownload: !isHls,
        isHls: isHls,
        headers: stream.headers,
      };
    });
  }, [streams]);

  // Open download modal
  const openDownloadModal = useCallback(() => {
    setShowDownloadModal(true);
  }, []);

  // Copy link to clipboard
  const copyToClipboard = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }, []);

  // Download file
  const downloadFile = useCallback((url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);


  return (
    <div className="min-h-screen bg-[#0f1014] text-white flex flex-col">
      {/* Subtitle Styling */}
      <style jsx global>{`
        video::cue {
          background-color: rgba(15, 16, 20, 0.85);
          color: white;
          font-size: 1.15em;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding: 0.25em 0.6em;
          border-radius: 6px;
        }
        video::cue-region {
          background: transparent;
        }
      `}</style>
      {/* Player Container */}
      <div
        ref={containerRef}
        className={`player-container relative bg-black select-none ${
          isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video w-full max-h-[85vh]'
        }`}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full bg-black"
          style={{ objectFit: resizeMode }}
          playsInline
          crossOrigin="anonymous"
          onClick={isLocked ? handleLockedTap : handleVideoClick}
        />

        {/* Persistent Quick Back Button (Always accessible on hover or mobile tap) */}
        {!isLocked && (
          <button
            onClick={handleBackNavigation}
            title="Return to previous page or title details"
            className={`absolute top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#12151c]/85 hover:bg-[#12151c] text-white border border-white/15 backdrop-blur-md text-xs font-semibold transition-all shadow-lg active:scale-95 ${
              showControls ? 'opacity-100' : 'opacity-0 hover:opacity-100 sm:opacity-50 sm:hover:opacity-100'
            }`}
          >
            <div className="w-3.5 h-3.5">
              <BackIcon />
            </div>
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        {/* Black Screen / Unsupported Codec Recovery Banner */}
        {isBlackScreenDetected && (
          <div className="absolute top-16 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#12151c]/95 border border-amber-500/40 backdrop-blur-xl shadow-2xl flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0 animate-ping" />
                <div className="min-w-0">
                  <p className="text-white font-semibold text-xs sm:text-sm">Audio playing without video?</p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                    The video stream uses a codec (such as HEVC 10-bit) unsupported by your browser decoder.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                {streams.length > 1 && (
                  <button
                    onClick={() => {
                      setIsBlackScreenDetected(false);
                      tryNextStream();
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all active:scale-95"
                  >
                    Switch Server
                  </button>
                )}
                <button
                  onClick={openDownloadModal}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all active:scale-95 border border-white/10"
                >
                  Download for VLC
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MKV Audio Codec Stall Recovery Banner */}
        {isAudioCodecStall && (
          <div className="absolute top-16 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#12151c]/95 border border-amber-500/40 backdrop-blur-xl shadow-2xl flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0 animate-ping" />
                <div className="min-w-0">
                  <p className="text-white font-semibold text-xs sm:text-sm">MKV Buffering (Audio Codec)</p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                    This file is an MKV with multi-channel AC-3/Dolby audio that browser video players cannot decode. Switch to a fast server or download to play in VLC.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                {streams.length > 1 && (
                  <button
                    onClick={() => {
                      setIsAudioCodecStall(false);
                      tryNextStream();
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all active:scale-95"
                  >
                    Switch Server
                  </button>
                )}
                <button
                  onClick={openDownloadModal}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all active:scale-95 border border-white/10"
                >
                  Direct Download
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player Lock Overlay */}
        {isLocked && (
          <div 
            className="absolute inset-0 z-40"
            onClick={handleLockedTap}
          >
            {/* Unlock button (shows briefly on tap) */}
            {showUnlockButton && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-200">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLock(); }}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#12151c]/90 backdrop-blur-xl border border-white/20 shadow-2xl"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                    <div className="w-8 h-8 text-blue-400">
                      <UnlockIcon />
                    </div>
                  </div>
                  <span className="text-white font-medium">Tap to Unlock</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Toast Message */}
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-5 py-2.5 rounded-full bg-[#12151c]/95 backdrop-blur-xl border border-white/15 shadow-xl">
              <span className="text-white font-medium text-xs sm:text-sm">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Lock Indicator (shows in corner when locked) */}
        {isLocked && !showUnlockButton && (
          <div className="absolute top-4 right-4 z-30 animate-in fade-in duration-300">
            <div className="w-10 h-10 rounded-full bg-[#12151c]/80 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
              <div className="w-5 h-5 text-blue-400">
                <LockIcon />
              </div>
            </div>
          </div>
        )}

        {/* Double Tap Seek Indicator */}
        {doubleTapSide && (
          <div className={`absolute top-1/2 -translate-y-1/2 ${doubleTapSide === 'left' ? 'left-[15%]' : 'right-[15%]'} pointer-events-none`}>
            <div className="flex flex-col items-center animate-pulse">
              <div className={`w-14 h-14 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center ${doubleTapSide === 'left' ? 'animate-[rippleLeft_0.5s_ease-out]' : 'animate-[rippleRight_0.5s_ease-out]'}`}>
                <div className={`w-7 h-7 text-white ${doubleTapSide === 'left' ? 'rotate-180' : ''}`}>
                  <ForwardIcon />
                </div>
              </div>
              <span className="text-white text-xs font-semibold mt-2">{seekAmount}s</span>
            </div>
          </div>
        )}

        {/* Cinema Loading Overlay */}
        {(loading || buffering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm z-30">
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-white/15"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 text-white/80">
                    <PlayIcon />
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-white font-medium text-sm tracking-wide">
                  {loading ? 'Connecting Stream...' : 'Buffering...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Click to Play Overlay */}
        {showClickToPlay && !loading && (
          <button
            onClick={() => {
              setShowClickToPlay(false);
              videoRef.current?.play();
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm z-20 group"
          >
            <div className="relative">
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-all duration-300">
                <div className="w-10 h-10 md:w-12 md:h-12 text-white ml-1">
                  <PlayIcon />
                </div>
              </div>
            </div>
            <span className="absolute bottom-[20%] text-white text-xs font-semibold tracking-wide bg-[#12151c]/90 px-4 py-1.5 rounded-full border border-white/15 backdrop-blur-md">Click to Play</span>
          </button>
        )}

        {/* Controls Overlay */}
        <div
          className={`absolute inset-0 flex flex-col justify-between transition-all duration-500 ${
            showControls && !isLocked ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Top Gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none"></div>
          
          {/* Bottom Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none"></div>

          {/* Top Bar */}
          <div className="relative z-10 p-4 md:p-6 flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={handleBackNavigation}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#12151c]/80 hover:bg-[#12151c] text-white border border-white/15 backdrop-blur-md text-xs font-semibold transition-all shadow-md active:scale-95 group"
            >
              <div className="w-4 h-4 text-white">
                <BackIcon />
              </div>
              <span>Back</span>
            </button>

            {/* Title & Quality Badge */}
            <div className="flex items-center gap-2.5">
              <h1 className="hidden md:block text-white font-semibold text-base truncate max-w-md">
                {title}
              </h1>
              {levels.length > 0 && !loading && (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#16181f]/90 backdrop-blur-md text-xs font-semibold text-[#8f98b2] border border-white/10">
                    {currentQualityLabel}
                  </span>
                  {parseInt(currentQualityLabel) >= 1080 && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-[10px] font-bold text-blue-400">
                      HD
                    </span>
                  )}
                  {parseInt(currentQualityLabel) >= 2160 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-400">
                      4K
                    </span>
                  )}
                </div>
              )}
              
              {/* Lock Button */}
              <button
                onClick={toggleLock}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isLocked ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#12151c]/80 backdrop-blur-md border border-white/10 hover:bg-white/15 text-white'
                }`}
                title={isLocked ? 'Unlock Player' : 'Lock Player'}
              >
                <div className="w-5 h-5">
                  {isLocked ? <LockIcon /> : <UnlockIcon />}
                </div>
              </button>
              
              {/* Resize Mode Button */}
              <button
                onClick={cycleResizeMode}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#12151c]/80 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all duration-300"
                title={`Resize: ${RESIZE_MODES.find(m => m.value === resizeMode)?.label}`}
              >
                <div className="w-5 h-5 text-white">
                  <ResizeIcon />
                </div>
              </button>
              
              {/* PIP Button */}
              {document.pictureInPictureEnabled && (
                <button
                  onClick={togglePip}
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isPip ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#12151c]/80 backdrop-blur-md border border-white/10 hover:bg-white/15 text-white'
                  }`}
                  title="Picture-in-Picture"
                >
                  <div className="w-5 h-5">
                    <PipIcon />
                  </div>
                </button>
              )}
              
              {/* Download Button */}
              <button
                onClick={openDownloadModal}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#12151c]/80 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all duration-300"
                title="Download"
              >
                <div className="w-5 h-5 text-white">
                  <DownloadIcon />
                </div>
              </button>
            </div>
          </div>

          {/* Center Play Button (for paused state) */}
          {!isPlaying && !loading && !showClickToPlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                <div className="w-10 h-10 md:w-12 md:h-12 text-white ml-1">
                  <PlayIcon />
                </div>
              </div>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="relative z-10 p-4 md:p-6 space-y-4">
            {/* Progress Bar */}
            <div
              ref={progressRef}
              className="group relative h-2 md:h-2.5 cursor-pointer py-1"
              onMouseMove={handleProgressHover}
              onMouseLeave={() => setHoverTime(null)}
              onClick={handleProgressClick}
            >
              {/* Track Background */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 md:h-2 bg-white/20 rounded-full overflow-hidden">
                {/* Buffered */}
                <div
                  className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-150"
                  style={{ width: `${(buffered / duration) * 100}%` }}
                />
                {/* Watched Progress */}
                <div
                  className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-75"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              
              {/* Hover Preview */}
              {hoverTime !== null && (
                <div
                  className="absolute bottom-full mb-3 -translate-x-1/2 pointer-events-none"
                  style={{ left: `${hoverPosition}%` }}
                >
                  <div className="px-3 py-1.5 rounded-lg bg-[#12151c]/95 border border-white/15 backdrop-blur-md text-white text-xs font-semibold shadow-2xl">
                    {formatTime(hoverTime)}
                  </div>
                </div>
              )}
              
              {/* Scrubber Handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all duration-150"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 7px)` }}
              />
              
              {/* Expanded hit area */}
              <div className="absolute -inset-y-3 inset-x-0"></div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-2 md:gap-3">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 md:w-13 md:h-13 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                >
                  <div className="w-6 h-6 md:w-7 md:h-7 text-white">
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </div>
                </button>

                {/* Rewind 10s */}
                <button
                  onClick={() => seek(currentTime - 10)}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full hover:bg-white/10 flex items-center justify-center transition-all duration-200 active:scale-90"
                >
                  <div className="w-6 h-6 md:w-7 md:h-7 text-white">
                    <RewindIcon />
                  </div>
                </button>

                {/* Forward 10s */}
                <button
                  onClick={() => seek(currentTime + 10)}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full hover:bg-white/10 flex items-center justify-center transition-all duration-200 active:scale-90"
                >
                  <div className="w-6 h-6 md:w-7 md:h-7 text-white">
                    <ForwardIcon />
                  </div>
                </button>

                {/* Volume Control */}
                <div
                  className="relative flex items-center"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    onClick={toggleMute}
                    className="w-10 h-10 md:w-11 md:h-11 rounded-full hover:bg-white/10 flex items-center justify-center transition-all duration-200"
                  >
                    <div className="w-5 h-5 md:w-6 md:h-6 text-white">
                      {muted || volume === 0 ? <VolumeMuteIcon /> : <VolumeHighIcon />}
                    </div>
                  </button>
                  
                  {/* Volume Slider */}
                  <div className={`hidden md:flex items-center overflow-hidden transition-all duration-300 ${showVolumeSlider ? 'w-24 ml-2' : 'w-0'}`}>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={muted ? 0 : volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (videoRef.current) {
                          videoRef.current.volume = v;
                          videoRef.current.muted = v === 0;
                        }
                      }}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md"
                    />
                  </div>
                </div>

                {/* Time Display */}
                <div className="hidden sm:flex items-center gap-1.5 text-white text-xs font-semibold tracking-wide">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-[#8f98b2]">/</span>
                  <span className="text-[#8f98b2]">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2 md:gap-3">
                {/* Next Episode Button (shows when >80% watched) */}
                {showNextEpisode && episodeList.length > 1 && (
                  <button
                    onClick={goToNextEpisode}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-md transition-all animate-in slide-in-from-right duration-300 active:scale-95"
                  >
                    <span>Next Episode</span>
                    <div className="w-4 h-4">
                      <NextIcon />
                    </div>
                  </button>
                )}

                {/* Quick Server Selector Pill */}
                {streams.length > 1 && (
                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setSettingsPanel('server');
                    }}
                    title="Switch Streaming Server"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 text-xs font-semibold text-white transition-all"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="max-w-[85px] sm:max-w-[120px] truncate">{streams[currentIndex]?.server || `Server ${currentIndex + 1}`}</span>
                    <span className="text-[10px] text-white/50">{currentIndex + 1}/{streams.length}</span>
                  </button>
                )}
                
                {/* Settings Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSettings(!showSettings);
                      setSettingsPanel('main');
                    }}
                    className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-300 ${showSettings ? 'bg-white/20 text-white rotate-45' : 'hover:bg-white/10 text-white'}`}
                  >
                    <div className="w-5 h-5 md:w-6 md:h-6">
                      <SettingsIcon />
                    </div>
                  </button>

                  {/* Settings Panel */}
                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-3 w-64 md:w-72 bg-[#16181f]/98 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/15 animate-in slide-in-from-bottom-2 duration-200">
                      {settingsPanel === 'main' && (
                        <div className="p-2">
                          <button
                            onClick={() => setSettingsPanel('quality')}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <span className="text-white font-medium">Quality</span>
                            <div className="flex items-center gap-2 text-white/60">
                              <span className="text-sm">{currentQualityLabel}</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                          <button
                            onClick={() => setSettingsPanel('speed')}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <span className="text-white font-medium">Playback Speed</span>
                            <div className="flex items-center gap-2 text-white/60">
                              <span className="text-sm">{playbackRate === 1 ? 'Normal' : `${playbackRate}x`}</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                          {/* Resize Mode Option */}
                          <button
                            onClick={cycleResizeMode}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <span className="text-white font-medium">Resize Mode</span>
                            <div className="flex items-center gap-2 text-white/60">
                              <span className="text-sm">{RESIZE_MODES.find(m => m.value === resizeMode)?.label}</span>
                              <div className="w-4 h-4"><ResizeIcon /></div>
                            </div>
                          </button>
                          {/* Audio Track Option */}
                          <button
                            onClick={() => setSettingsPanel('audio')}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <span className="text-white font-medium">Audio</span>
                            <div className="flex items-center gap-2 text-white/60">
                              <span className="text-sm">
                                {audioTracks.length > 0 
                                  ? (audioTracks[currentAudioTrack]?.label || `Track ${currentAudioTrack + 1}`) 
                                  : 'Default'}
                              </span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                          {/* Subtitles Option */}
                          <button
                            onClick={() => setSettingsPanel('subtitles')}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <span className="text-white font-medium">Subtitles</span>
                            <div className="flex items-center gap-2 text-white/60">
                              <span className="text-sm">
                                {externalSubtitles.length > 0 
                                  ? externalSubtitles[0].label.includes('(Auto)') ? 'Auto' : externalSubtitles[0].label.split(' - ')[0]
                                  : currentSubtitle === -1 
                                    ? 'Off' 
                                    : subtitleTracks[currentSubtitle]?.label || 'On'}
                              </span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                          {/* Server Selection Option */}
                          {streams.length > 1 && (
                            <button
                              onClick={() => setSettingsPanel('server')}
                              className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                            >
                              <span className="text-white font-medium">Server</span>
                              <div className="flex items-center gap-2 text-white/60">
                                <span className="text-sm">{streams[currentIndex]?.server || `Server ${currentIndex + 1}`}</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </button>
                          )}
                        </div>
                      )}

                      {settingsPanel === 'quality' && (
                        <div>
                          <button
                            onClick={() => setSettingsPanel('main')}
                            className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="text-white font-medium">Quality</span>
                          </button>
                          <div className="p-2 max-h-64 overflow-y-auto">
                            <button
                              onClick={() => { setCurrentLevel('auto'); setShowSettings(false); }}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${currentLevel === 'auto' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold' : 'hover:bg-white/10 text-white'}`}
                            >
                              <span className="font-medium">Auto</span>
                              {currentLevel === 'auto' && <div className="w-5 h-5 text-blue-400"><CheckIcon /></div>}
                            </button>
                            {levels.sort((a, b) => (b.height || 0) - (a.height || 0)).map((l) => (
                              <button
                                key={l.index}
                                onClick={() => { setCurrentLevel(l.index); setShowSettings(false); }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${currentLevel === l.index ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold' : 'hover:bg-white/10 text-white'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{l.label}</span>
                                  {(l.height || 0) >= 1080 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-400 rounded">HD</span>
                                  )}
                                  {(l.height || 0) >= 2160 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded">4K</span>
                                  )}
                                </div>
                                {currentLevel === l.index && <div className="w-5 h-5 text-blue-400"><CheckIcon /></div>}
                              </button>
                            ))}
                            {levels.length === 0 && (
                              <p className="px-4 py-6 text-center text-[#8f98b2] text-sm">No quality options available</p>
                            )}
                          </div>
                        </div>
                      )}

                      {settingsPanel === 'speed' && (
                        <div>
                          <button
                            onClick={() => setSettingsPanel('main')}
                            className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="text-white font-medium">Playback Speed</span>
                          </button>
                          <div className="p-2">
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                              <button
                                key={rate}
                                onClick={() => {
                                  if (videoRef.current) videoRef.current.playbackRate = rate;
                                  setShowSettings(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${playbackRate === rate ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold' : 'hover:bg-white/10 text-white'}`}
                              >
                                <span className="font-medium">{rate === 1 ? 'Normal' : `${rate}x`}</span>
                                {playbackRate === rate && <div className="w-5 h-5 text-blue-400"><CheckIcon /></div>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Audio Track Panel */}
                      {settingsPanel === 'audio' && (
                        <div>
                          <button
                            onClick={() => setSettingsPanel('main')}
                            className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="text-white font-medium">Audio Track</span>
                          </button>
                          <div className="p-2 max-h-64 overflow-y-auto">
                            {/* Default track when no audio tracks detected */}
                            {audioTracks.length === 0 && (
                              <button
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">Default</span>
                                  <span className="text-xs text-blue-400/70">
                                    {loading ? 'Detecting tracks...' : 'Original audio'}
                                  </span>
                                </div>
                                <div className="w-5 h-5 text-blue-400"><CheckIcon /></div>
                              </button>
                            )}
                            {/* Audio tracks list */}
                            {audioTracks.map((track) => (
                              <button
                                key={track.index}
                                onClick={() => {
                                  setCurrentAudioTrack(track.index);
                                  try {
                                    localStorage.setItem('lastAudioTrack', track.language || '');
                                  } catch {}
                                  showToast(`Audio: ${track.label}`);
                                  setShowSettings(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors mb-1 ${
                                  currentAudioTrack === track.index 
                                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold' 
                                    : 'hover:bg-white/10 text-white'
                                }`}
                              >
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="font-semibold text-base">
                                    {track.label}
                                    {currentAudioTrack === track.index && <span className="ml-2 text-xs text-emerald-400">● Playing</span>}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className={currentAudioTrack === track.index ? 'text-blue-400/80' : 'text-[#8f98b2]'}>
                                      Track {track.index + 1}
                                    </span>
                                    {track.type && (
                                      <span className="text-white/40">• {track.type}</span>
                                    )}
                                  </div>
                                </div>
                                {currentAudioTrack === track.index && <div className="w-5 h-5 text-blue-400"><CheckIcon /></div>}
                              </button>
                            ))}
                            {/* Note about audio switching */}
                            {audioTracks.length > 1 && (
                              <div className="px-4 py-2 mt-2 bg-blue-500/10 border border-blue-500/25 rounded-lg">
                                <p className="text-xs text-blue-400/90">
                                  💡 Audio track switching works for HLS streams. For MKV files, the browser plays the default track.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Subtitles Panel */}
                      {settingsPanel === 'subtitles' && (
                        <div>
                          <button
                            onClick={() => setSettingsPanel('main')}
                            className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="text-white font-medium">Subtitles</span>
                          </button>
                          <div className="p-2 max-h-64 overflow-y-auto">
                            {/* Off option */}
                            <button
                              onClick={() => {
                                setCurrentSubtitle(-1);
                                // Also hide external subtitles
                                const video = videoRef.current;
                                if (video && video.textTracks.length > 0) {
                                  for (let i = 0; i < video.textTracks.length; i++) {
                                    video.textTracks[i].mode = 'hidden';
                                  }
                                }
                                // Clear external subtitles state
                                setExternalSubtitles([]);
                                setShowSettings(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${currentSubtitle === -1 && externalSubtitles.length === 0 ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold' : 'hover:bg-white/10 text-white'}`}
                            >
                              <span className="font-medium">Off</span>
                              {currentSubtitle === -1 && externalSubtitles.length === 0 && <div className="w-5 h-5 text-blue-400"><CheckIcon /></div>}
                            </button>
                            {/* External/Auto-loaded subtitles */}
                            {externalSubtitles.map((sub, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  const video = videoRef.current;
                                  if (video && video.textTracks.length > idx) {
                                    video.textTracks[idx].mode = 'showing';
                                  }
                                  setShowSettings(false);
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{sub.label}</span>
                                  <span className="text-xs text-blue-400/70">OpenSubtitles</span>
                                </div>
                                <div className="w-5 h-5 text-blue-400"><CheckIcon /></div>
                              </button>
                            ))}
                            {/* Embedded subtitles */}
                            {subtitleTracks.map((track) => (
                              <button
                                key={track.index}
                                onClick={() => { setCurrentSubtitle(track.index); setShowSettings(false); }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${currentSubtitle === track.index ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold' : 'hover:bg-white/10 text-white'}`}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{track.label}</span>
                                  <span className="text-xs text-[#8f98b2]">{track.language}</span>
                                </div>
                                {currentSubtitle === track.index && <div className="w-5 h-5 text-blue-400"><CheckIcon /></div>}
                              </button>
                            ))}
                            {/* Search online subtitles */}
                            <button
                              onClick={() => { setShowSettings(false); setShowSubtitleSearch(true); }}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-blue-400 transition-colors mt-2 border-t border-white/10"
                            >
                              <div className="w-5 h-5"><SearchIcon /></div>
                              <span className="font-medium">Search Different Subtitles</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Server Selection Panel */}
                      {settingsPanel === 'server' && (
                        <div>
                          <button
                            onClick={() => setSettingsPanel('main')}
                            className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="text-white font-medium">Server</span>
                          </button>
                          <div className="p-2 max-h-64 overflow-y-auto">
                            {streams.map((stream, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setCurrentIndex(idx);
                                  setShowSettings(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${currentIndex === idx ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold' : 'hover:bg-white/10 text-white'}`}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-medium capitalize">{stream.server || `Server ${idx + 1}`}</span>
                                  <span className="text-xs text-[#8f98b2]">
                                    {stream.quality ? `${stream.quality}p` : stream.type?.toUpperCase() || 'Unknown'}
                                  </span>
                                </div>
                                {currentIndex === idx && <div className="w-5 h-5 text-blue-400"><CheckIcon /></div>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-all duration-300"
                >
                  <div className="w-5 h-5 md:w-6 md:h-6 text-white">
                    {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Stream Details & Sources Hub (When not fullscreen) */}
      {!isFullscreen && (
        <div className="flex-1 bg-[#090a0e] p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Title & Quick Actions Row */}
            <div className="bg-[#12151c] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                {poster && (
                  <img
                    src={poster}
                    alt={title}
                    className="w-14 sm:w-16 aspect-[2/3] object-cover rounded-xl border border-white/10 shadow-md shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                      {provider}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 capitalize">
                      {type}
                    </span>
                    {usingDirectStream && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-400">
                        ⚡ Direct CDN
                      </span>
                    )}
                    {levels.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-bold text-white">
                        {currentQualityLabel}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight truncate">
                    {title}
                  </h2>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
                <button
                  onClick={openDownloadModal}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm"
                >
                  <div className="w-4 h-4 text-blue-400">
                    <DownloadIcon />
                  </div>
                  <span>Downloads</span>
                </button>

                {infoUrl && (
                  <button
                    onClick={() => window.location.href = `/info?provider=${encodeURIComponent(provider)}&url=${encodeURIComponent(infoUrl)}`}
                    className="px-4 py-2.5 rounded-xl bg-[#12151c] hover:bg-white/10 active:scale-95 border border-white/10 text-slate-400 hover:text-white font-semibold text-xs sm:text-sm transition-all"
                  >
                    Details Page
                  </button>
                )}
              </div>
            </div>

            {/* Available Server Sources */}
            {streams.length > 0 && (
              <div className="bg-[#12151c] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <h3 className="text-white font-bold text-base sm:text-lg">Streaming Servers</h3>
                  </div>
                  <span className="text-slate-400 text-xs font-medium">
                    {streams.length} available
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5 sm:gap-3">
                  {streams.map((s, i) => {
                    const isHls = s.link?.toLowerCase().includes('.m3u8');
                    const isMp4 = /\.(mp4|m4v|webm)$/i.test(s.link || '');
                    const isActive = i === currentIndex;
                    
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setIsBlackScreenDetected(false);
                          setCurrentIndex(i);
                        }}
                        className={`group relative px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 active:scale-95 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md border border-blue-500'
                            : 'bg-[#090a0e] text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{s.server || `Server ${i + 1}`}</span>
                          {isHls && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${isActive ? 'bg-black/30 text-white' : 'bg-blue-500/20 text-blue-400'}`}>
                              HLS
                            </span>
                          )}
                          {isMp4 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${isActive ? 'bg-black/30 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              MP4
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Episodes Switcher (for TV Series with episodeList) */}
            {episodeList.length > 0 && (
              <div className="bg-[#12151c] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <h3 className="text-white font-bold text-base sm:text-lg">Episodes</h3>
                  </div>
                  <span className="text-slate-400 text-xs font-medium">
                    {episodeList.length} Episodes Available
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {episodeList.map((ep: any, epIdx: number) => {
                    const isCurrent = epIdx === currentEpisodeIndex;
                    const epParams = new URLSearchParams({
                      link: ep.link || link,
                      provider: provider,
                      type: type,
                      title: ep.title ? `${title.split(' - ')[0]} - ${ep.title}` : title,
                      episodeIndex: String(epIdx),
                      episodeList: encodeURIComponent(JSON.stringify(episodeList)),
                      infoUrl: infoUrl,
                      poster: poster,
                    });

                    return (
                      <button
                        key={epIdx}
                        onClick={() => {
                          window.location.href = `/player?${epParams.toString()}`;
                        }}
                        className={`p-3 rounded-xl border transition-all text-center group flex flex-col justify-center min-h-[58px] ${
                          isCurrent
                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-sm'
                            : 'bg-[#090a0e] border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className={`text-xs font-bold truncate ${isCurrent ? 'text-blue-400' : 'text-slate-200 group-hover:text-white'}`}>
                          {ep.title || `Episode ${epIdx + 1}`}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          {isCurrent ? 'Now Playing' : 'Switch Episode'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && streams.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="max-w-md w-full">
            <div className="bg-[#12151c] rounded-3xl p-8 border border-white/10 text-center shadow-2xl">
              {/* Error Icon */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Unable to Play Stream</h3>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">{error}</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    fetch(`/api/stream-fast?provider=${provider}&type=${type}&link=${encodeURIComponent(link)}&nocache=true`)
                      .then(res => res.json())
                      .then(json => {
                        setStreams(Array.isArray(json?.data) ? json.data : []);
                        if ((!json?.data || json?.data?.length === 0) && json?.error) {
                          setError(json.error);
                        }
                      })
                      .catch(e => setError(e?.message || 'Failed to load'))
                      .finally(() => setLoading(false));
                  }}
                  className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-md active:scale-95"
                >
                  Try Again
                </button>
                <button
                  onClick={handleBackNavigation}
                  className="w-full py-3.5 px-6 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-200 border border-white/10 active:scale-95"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Time Display (when controls hidden) */}
      {isMobile && !showControls && isPlaying && (
        <div className="fixed bottom-4 left-4 right-4 flex justify-center pointer-events-none z-40">
          <div className="px-4 py-2 rounded-full bg-[#12151c]/90 border border-white/10 backdrop-blur-md text-white text-xs font-semibold shadow-lg">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#12151c] rounded-2xl border border-white/15 shadow-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <div className="w-5 h-5 text-blue-400">
                    <DownloadIcon />
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Download Streams</h3>
                  <p className="text-slate-400 text-xs truncate max-w-[220px]">{title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white"
              >
                <div className="w-5 h-5">
                  <CloseIcon />
                </div>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="mt-4 text-slate-400 text-sm font-medium">Loading streams...</p>
                </div>
              ) : processedDownloadLinks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <div className="w-8 h-8 text-white/30">
                      <DownloadIcon />
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">No download links available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {processedDownloadLinks.map((dl, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-[#090a0e] border border-white/10 hover:border-white/20 transition-colors shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-sm">{dl.server}</span>
                          {dl.quality && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 text-[10px] font-bold">
                              {dl.quality}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            dl.isHls 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {dl.type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {dl.isDirectDownload && (
                          <button
                            onClick={() => downloadFile(dl.proxyLink, `${title.replace(/[^a-zA-Z0-9]/g, '_')}.${dl.type}`)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all active:scale-95 shadow-sm"
                          >
                            <div className="w-4 h-4">
                              <DownloadIcon />
                            </div>
                            Download
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(dl.link)}
                          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold transition-all ${
                            copiedLink === dl.link
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                          } ${dl.isDirectDownload ? '' : 'flex-1'}`}
                        >
                          <div className="w-4 h-4">
                            {copiedLink === dl.link ? <CheckIcon /> : <CopyIcon />}
                          </div>
                          {copiedLink === dl.link ? 'Copied!' : 'Copy Link'}
                        </button>
                      </div>

                      {dl.isHls && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          HLS streams require an external downloader (IDM, JDownloader, etc.)
                        </p>
                      )}
                    </div>
                  ))}

                  {/* External Downloader Tip */}
                  <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 text-xs leading-relaxed">
                      <strong>Tip:</strong> For best results, copy the link and paste into an external downloader like IDM, 1DM, JDownloader, or Free Download Manager.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subtitle Search Modal */}
      {showSubtitleSearch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#12151c] rounded-2xl border border-white/15 shadow-2xl max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <div className="w-5 h-5 text-blue-400">
                    <SubtitleIcon />
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Search Subtitles</h3>
                  <p className="text-slate-400 text-xs">OpenSubtitles.org</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubtitleSearch(false)}
                className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white"
              >
                <div className="w-5 h-5">
                  <CloseIcon />
                </div>
              </button>
            </div>

            {/* Search Form */}
            <div className="p-4 sm:p-5 border-b border-white/10">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={subtitleSearchQuery}
                  onChange={(e) => setSubtitleSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchSubtitles()}
                  placeholder="Movie name or IMDB ID (tt1234567)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#090a0e] border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-blue-500 text-sm"
                />
                <select
                  value={subtitleLanguage}
                  onChange={(e) => setSubtitleLanguage(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-[#090a0e] border border-white/15 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="eng">English</option>
                  <option value="spa">Spanish</option>
                  <option value="fre">French</option>
                  <option value="ger">German</option>
                  <option value="ita">Italian</option>
                  <option value="por">Portuguese</option>
                  <option value="rus">Russian</option>
                  <option value="ara">Arabic</option>
                  <option value="hin">Hindi</option>
                  <option value="jpn">Japanese</option>
                  <option value="kor">Korean</option>
                  <option value="chi">Chinese</option>
                  <option value="tur">Turkish</option>
                  <option value="pol">Polish</option>
                  <option value="dut">Dutch</option>
                  <option value="ind">Indonesian</option>
                  <option value="vie">Vietnamese</option>
                </select>
                <button
                  onClick={searchSubtitles}
                  disabled={subtitleSearchLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50 active:scale-95 shadow-md"
                >
                  {subtitleSearchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="p-4 sm:p-5 overflow-y-auto max-h-[50vh]">
              {subtitleSearchLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="mt-4 text-slate-400 text-sm font-medium">Searching subtitles...</p>
                </div>
              ) : subtitleSearchResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <div className="w-8 h-8 text-white/30">
                      <SubtitleIcon />
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">Search for subtitles above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {subtitleSearchResults.map((sub, i) => (
                    <button
                      key={sub.IDSubtitleFile || i}
                      onClick={() => addExternalSubtitle(sub)}
                      className="w-full p-4 rounded-xl bg-[#090a0e] hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/40 transition-all text-left group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-bold uppercase">
                              {sub.SubLanguageID}
                            </span>
                            {sub.SeriesSeason && sub.SeriesEpisode && (
                              <span className="text-slate-400 text-xs font-semibold">
                                S{sub.SeriesSeason}E{sub.SeriesEpisode}
                              </span>
                            )}
                          </div>
                          <p className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors truncate">
                            {sub.MovieName}
                          </p>
                          <p className="text-slate-400 text-xs truncate mt-0.5">
                            {sub.SubFileName || sub.InfoReleaseGroup}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-slate-500 text-xs font-medium">{sub.SubDownloadsCnt} downloads</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090a0e] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
          </div>
          <p className="mt-4 text-slate-400 font-semibold text-sm">Loading player...</p>
        </div>
      </div>
    }>
      <PlayerContent />
    </Suspense>
  );
}
