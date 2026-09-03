import { useState, useEffect } from 'react';

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

// Ad Container that loads scripts
const AdContainer = ({
  key,
  height,
  width,
  atOptionsKey,
  invokeScript
}: {
  key?: string,
  height: number,
  width: number,
  atOptionsKey?: string,
  invokeScript: string
}) => {
  useEffect(() => {
    // Load the ad script
    const script = document.createElement('script');
    script.src = invokeScript;
    script.async = true;
    script.defer = true;

    const container = document.getElementById(`ad-${key}`);
    if (container) {
      container.appendChild(script);
    }

    // Set atOptions if needed
    if (atOptionsKey) {
      (window as any).atOptions = {
        'key': atOptionsKey,
        'format': 'iframe',
        'height': height,
        'width': width,
        'params': {}
      };
    }

    return () => {
      if (container && script.parentNode === container) {
        container.removeChild(script);
      }
    };
  }, [key, height, width, atOptionsKey, invokeScript]);

  return (
    <div
      id={`ad-${key}`}
      className="ad-container"
      style={{
        minHeight: `${height}px`,
        minWidth: `${width}px`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    ></div>
  );
};

// Banner ads (clickable, opens in new tab)
const BannerAd728 = () => (
  <AdContainer
    key="banner-728"
    height={90}
    width={728}
    atOptionsKey="e00807f9355f6f59d09b4cb9632b1930"
    invokeScript="https://www.highrevenueformat.com/e00807f9355f6f59d09b4cb9632b1930/invoke.js"
  />
);

const BannerAd468 = () => (
  <AdContainer
    key="banner-468"
    height={60}
    width={468}
    atOptionsKey="c51f0a9e64d78d55f75a4ccd8eedc96c"
    invokeScript="https://www.highrevenueformat.com/c51f0a9e64d78d55f75a4ccd8eedc96c/invoke.js"
  />
);

const BannerAd320 = () => (
  <AdContainer
    key="banner-320"
    height={50}
    width={320}
    atOptionsKey="1029ff22b684cfa96772119d5a4a7e73"
    invokeScript="https://www.highrevenueformat.com/1029ff22b684cfa96772119d5a4a7e73/invoke.js"
  />
);

// Rectangle ads
const RectAd300 = () => (
  <AdContainer
    key="rect-300"
    height={250}
    width={300}
    atOptionsKey="a37057b57277f779aa7eb6c39d0ca6d0"
    invokeScript="https://www.highrevenueformat.com/a37057b57277f779aa7eb6c39d0ca6d0/invoke.js"
  />
);

// Sidebar ads
const SidebarAd160 = () => (
  <AdContainer
    key="sidebar-160"
    height={300}
    width={160}
    atOptionsKey="8266d43ddb40fa7f697b88ce1986a7c1"
    invokeScript="https://www.highrevenueformat.com/8266d43ddb40fa7f697b88ce1986a7c1/invoke.js"
  />
);

const SidebarAd600 = () => (
  <AdContainer
    key="sidebar-600"
    height={600}
    width={160}
    atOptionsKey="569093e60d83db368a64b41564e536e7"
    invokeScript="https://www.highrevenueformat.com/569093e60d83db368a64b41564e536e7/invoke.js"
  />
);

// Profitableratecpmnetwork ads
const PrnBannerAd = () => (
  <AdContainer
    key="prn-banner"
    height={90}
    width={728}
    invokeScript="https://pl31124194.profitableratecpmnetwork.com/95/d8/cf/95d8cf0051e91631d54da7bc56ecbca1.js"
  />
);

const PrnInlineAd = () => (
  <div className="ad-container" id="ad-prn-inline" style={{ minHeight: '250px', cursor: 'pointer' }}>
    <script async data-cfasync="false" src="https://pl31124195.profitableratecpmnetwork.com/0221bc3a4d9d8690c9c87b8d892de725/invoke.js"></script>
  </div>
);

const PrnSidebarAd = () => (
  <AdContainer
    key="prn-sidebar"
    height={300}
    width={160}
    invokeScript="https://pl31124197.profitableratecpmnetwork.com/ed/81/a6/ed81a612a8e2f2946bf640986f3a2b90.js"
  />
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

// Small banner ads for games list and inline placements
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
