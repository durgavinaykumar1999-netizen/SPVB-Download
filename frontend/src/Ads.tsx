import { useState } from 'react';
import { useEffect } from 'react';
import { AdPlaceholder } from './AdPlaceholder';

function CloseableAd({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="ad-close-wrap">
      <button
        className="ad-close-btn"
        onClick={() => setHidden(true)}
        aria-label="Close ad"
        title="Close ad"
      >
        ✕
      </button>
      {children}
    </div>
  );
}

// Simple ad placeholders (no external CORS issues)
const BannerAd728 = () => (
  <AdPlaceholder width={728} height={90} type="banner" />
);

const BannerAd468 = () => (
  <AdPlaceholder width={468} height={60} type="banner" />
);

const BannerAd320 = () => (
  <AdPlaceholder width={320} height={50} type="banner" />
);

const RectAd300 = () => (
  <AdPlaceholder width={300} height={250} type="inline" />
);

const SidebarAd160 = () => (
  <AdPlaceholder width={160} height={300} type="sidebar" />
);

const SidebarAd600 = () => (
  <AdPlaceholder width={160} height={600} type="sidebar" />
);

const PrnBannerAd = () => (
  <AdPlaceholder width={728} height={90} type="banner" />
);

const PrnInlineAd = () => (
  <AdPlaceholder width={300} height={250} type="inline" />
);

const PrnSidebarAd = () => (
  <AdPlaceholder width={160} height={300} type="sidebar" />
);

// Export ad components
export const AdHeader = () => (
  <header className="ads-header">
    <CloseableAd><BannerAd728 /></CloseableAd>
    <CloseableAd><BannerAd468 /></CloseableAd>
    <CloseableAd><PrnBannerAd /></CloseableAd>
  </header>
);

export const AdSidebar = () => (
  <div className="ads-sidebar">
    <CloseableAd><SidebarAd160 /></CloseableAd>
    <CloseableAd><SidebarAd600 /></CloseableAd>
    <CloseableAd><PrnSidebarAd /></CloseableAd>
  </div>
);

export const AdInline = () => (
  <div className="ads-row ads-inline">
    <CloseableAd><RectAd300 /></CloseableAd>
    <CloseableAd><PrnInlineAd /></CloseableAd>
  </div>
);

export const AdMobile = () => (
  <div className="ads-mobile">
    <CloseableAd><BannerAd320 /></CloseableAd>
  </div>
);

export const AdGameBanner = () => (
  <div className="game-ad-banner">
    <CloseableAd><BannerAd468 /></CloseableAd>
    <CloseableAd><BannerAd320 /></CloseableAd>
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
