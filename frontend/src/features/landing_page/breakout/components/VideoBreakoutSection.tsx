import React, { useRef, useEffect } from 'react';

interface VideoBreakoutSectionProps {
  /** Optional custom video path or local file path */
  videoSrc?: string;
  onOpenBooking?: () => void;
}

// When exported to your local IDE, simply place your video in the public/ folder
// named 'commercial.mp4' (or 'video.mp4') or update the path below!
export const LOCAL_COMMERCIAL_VIDEO_PATH = '/commercial.mp4';
export const FALLBACK_PREVIEW_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export const VideoBreakoutSection: React.FC<VideoBreakoutSectionProps> = ({
  videoSrc = LOCAL_COMMERCIAL_VIDEO_PATH,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play the video when the user scrolls to this exact part of the page
  useEffect(() => {
    const videoEl = videoRef.current;
    const containerEl = containerRef.current;
    if (!videoEl || !containerEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Reached this section -> start playing smoothly
            videoEl.play().catch(() => {
              // Browser autoplay policy fallback (muted is required and enabled)
            });
          } else {
            // Scrolled away -> pause to save resources
            videoEl.pause();
          }
        });
      },
      {
        threshold: 0.25, // Triggers when at least 25% of the video section is in view
      }
    );

    observer.observe(containerEl);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      id="combine-video"
      className="relative w-full h-screen min-h-screen bg-black overflow-hidden flex items-center justify-center p-0 m-0 border-none select-none"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="w-full h-full object-cover block"
      >
        {/* Primary local file source when you place your video in public/commercial.mp4 */}
        <source src={videoSrc} type="video/mp4" />
        {/* Additional default local filename variations */}
        <source src="/video.mp4" type="video/mp4" />
        {/* Online sample preview for live editor preview */}
        <source src={FALLBACK_PREVIEW_VIDEO} type="video/mp4" />
      </video>
    </section>
  );
};
