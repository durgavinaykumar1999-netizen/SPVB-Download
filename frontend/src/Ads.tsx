import { useEffect, useRef, useState } from 'react';

// Highrevenueformat ad keys (same keys previously loaded in public/index.html)
const ADS: Record<string, { key: string; width: number; height: number }> = {
  banner728: { key: 'e00807f9355f6f59d09b4cb9632b1930', width: 728, height: 90 },
  banner468: { key: 'c51f0a9e64d78d55f75a4ccd8eedc96c', width: 468, height: 60 },
  rect300: { key: 'a37057b57277f779aa7eb6c39d0ca6d0', width: 300, height: 250 },
  sidebar160: { key: '8266d43ddb40fa7f697b88ce1986a7c1', width: 160, height: 300 },
  sidebar600: { key: '569093e60d83db368a64b41564e536e7', width: 160, height: 600 },
  banner320: { key: '1029ff22b684cfa96772119d5a4a7e73', width: 320, height: 50 }
};

// Load one vendor script at a time - the script reads the global `atOptions`,
// so each slot must finish before the next one sets it (mirrors the old index.html approach).
const pending: Array<{ key: string; width: number; height: number; container: HTMLElement }> = [];
let processing = false;

function processQueue() {
  if (processing) return;
  processing = true;

  const item = pending.shift();
  if (!item) {
    processing = false;
    return;
  }

  const { key, width, height, container } = item;
  const containerId = container.id;
  // Register the container so the vendor script knows where to mount the ad
  (window as any).atAsyncContainers = (window as any).atAsyncContainers || {};
  (window as any).atAsyncContainers[key] = [containerId];
  (window as any).atOptions = {
    key,
    format: 'iframe',
    height,
    width,
    params: {}
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.highrevenueformat.com/${key}/invoke.js`;
  container.appendChild(script);

  // Wrap up when the script finishes (or times out) and load the next slot
  const done = () => {
    setTimeout(processQueue, 300);
  };
  script.onload = done;
  script.onerror = () => {
    setTimeout(processQueue, 300);
  };
  setTimeout(done, 3000);
}

// Real live ad slot - loads the actual ad network creative into this container
function LiveAdSlot({
  adKey,
  width,
  height,
  label
}: {
  adKey: string;
  width: number;
  height: number;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Avoid double injection into the same container (e.g. React re-renders)
    if (container.dataset.adInjected === 'true') return;
    container.dataset.adInjected = 'true';

    pending.push({ key: adKey, width, height, container });
    processQueue();
  }, [adKey, width, height]);

  return (
    <div
      className="ad-live-slot"
      style={{
        width: `${width}px`,
        maxWidth: '100%',
        minWidth: `${width}px`,
        minHeight: `${height}px`,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a3a52 0%, #0f2a40 100%)',
        border: '1px solid rgba(100, 150, 200, 0.3)',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
      }}
      title="Advertisement"
    >
      {/* Label stays behind the ad so an empty fill still looks intentional */}
      <span
        className="ad-slot-label"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'rgba(100, 150, 200, 0.45)',
          fontWeight: '500',
          letterSpacing: '1px',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        {label}
      </span>
      <div
        id={`ad-container-${adKey}`}
        ref={containerRef}
        className="ad-slot-target"
        style={{ position: 'relative', zIndex: 1 }}
      />
    </div>
  );
}

// Closeable ad wrapper with optional close button
function CloseableAd({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="ad-close-wrap" style={{ position: 'relative' }}>
      <button
        className="ad-close-btn"
        onClick={() => setHidden(true)}
        aria-label="Close ad"
        title="Close ad"
        style={{
          opacity: 0.7,
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
      >
        ✕
      </button>
      {children}
    </div>
  );
}

// Live ads from highrevenueformat.com - each slot loads a real ad unit
const makeSlot = (ad: { key: string; width: number; height: number }) => {
  const Slot = () => <LiveAdSlot adKey={ad.key} width={ad.width} height={ad.height} label="Advertisement" />;
  Slot.displayName = `Slot_${ad.key.slice(0, 8)}`;
  return Slot;
};

const BannerAd728 = makeSlot(ADS.banner728);
const BannerAd468 = makeSlot(ADS.banner468);
const BannerAd320 = makeSlot(ADS.banner320);
const RectAd300 = makeSlot(ADS.rect300);
const SidebarAd160 = makeSlot(ADS.sidebar160);
const SidebarAd600 = makeSlot(ADS.sidebar600);

// Export ad components - only essential ads
export const AdHeader = () => (
  <header className="ads-header">
    <CloseableAd><BannerAd728 /></CloseableAd>
    <CloseableAd><BannerAd468 /></CloseableAd>
  </header>
);

export const AdSidebar = () => (
  <div className="ads-sidebar">
    <CloseableAd><SidebarAd160 /></CloseableAd>
    <CloseableAd><SidebarAd600 /></CloseableAd>
  </div>
);

export const AdInline = () => (
  <div className="ads-row ads-inline">
    <CloseableAd><RectAd300 /></CloseableAd>
  </div>
);

export const AdMobile = () => (
  <div className="ads-mobile">
    <CloseableAd><BannerAd320 /></CloseableAd>
  </div>
);

// Games are streamed via game-player.html which already loads its own 468/728 ads,
// so the in-app banner stays a styled placeholder to avoid double impressions.
export const AdGameBanner = () => (
  <div className="game-ad-banner">
    <div
      className="ad-live-slot"
      style={{
        width: '468px',
        maxWidth: '100%',
        minWidth: '468px',
        minHeight: '60px',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a3a52 0%, #0f2a40 100%)',
        border: '1px solid rgba(100, 150, 200, 0.3)',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
      }}
      title="Advertisement"
    >
      <span
        className="ad-slot-label"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'rgba(100, 150, 200, 0.45)',
          fontWeight: '500',
          letterSpacing: '1px',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        Advertisement
      </span>
    </div>
  </div>
);

export const SmallBannerAd = () => (
  <div style={{ width: '100%', maxWidth: '468px', margin: '12px auto' }}>
    <CloseableAd><BannerAd468 /></CloseableAd>
  </div>
);

export const MobileBannerAd = () => (
  <div style={{ width: '100%', maxWidth: '320px', margin: '12px auto' }}>
    <CloseableAd><BannerAd320 /></CloseableAd>
  </div>
);