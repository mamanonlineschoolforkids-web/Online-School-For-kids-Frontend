import { useEffect, useRef, useState } from "react";

// Minimal wrapper around the YouTube IFrame Player API — loads the API script
// once, extracts the video ID from a full YouTube URL, and exposes play state /
// current time via callbacks so it can drive the same timeline used for uploads.

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return apiLoadPromise;
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

interface YoutubePlayerProps {
  url: string;
  playing: boolean;
  seekRequest: { time: number; token: number } | null;
  onReady: (durationSeconds: number) => void;
  onTimeUpdate: (currentSeconds: number) => void;
  onPlayStateChange: (playing: boolean) => void;
}

export function YoutubePlayer({
  url, playing, seekRequest, onReady, onTimeUpdate, onPlayStateChange,
}: YoutubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const [ready, setReady] = useState(false);

  const videoId = extractVideoId(url);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    let destroyed = false;

    loadYoutubeApi().then(() => {
      if (destroyed || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            setReady(true);
            onReady(playerRef.current.getDuration());
            pollRef.current = setInterval(() => {
              if (playerRef.current?.getCurrentTime) {
                onTimeUpdate(playerRef.current.getCurrentTime());
              }
            }, 500);
          },
          onStateChange: (e: any) => {
            // 1 = playing, 2 = paused, 0 = ended
            onPlayStateChange(e.data === 1);
          },
        },
      });
    });

    return () => {
      destroyed = true;
      clearInterval(pollRef.current);
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Drive play/pause from parent state
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    if (playing) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [playing, ready]);

  // Handle external seek requests (e.g. clicking the timeline)
  useEffect(() => {
    if (!ready || !playerRef.current || !seekRequest) return;
    playerRef.current.seekTo(seekRequest.time, true);
    onTimeUpdate(seekRequest.time);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRequest?.token, ready]);

  if (!videoId) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
        Could not load this YouTube video.
      </div>
    );
  }

  return <div ref={containerRef} className="w-full aspect-video rounded-lg overflow-hidden bg-black" />;
}