import { useState } from 'react';

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

// Banner ads (clickable, opens in new tab)
const BannerAd728 = () => (
  <div className="ad-container ad-banner-728">
    <div
      data-ad-link="https://www.highrevenueformat.com"
      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '90px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <script>
        {`atOptions = {
          'key' : 'e00807f9355f6f59d09b4cb9632b1930',
          'format' : 'iframe',
          'height' : 90,
          'width' : 728,
          'params' : {}
        };`}
      </script>
      <script src="https://www.highrevenueformat.com/e00807f9355f6f59d09b4cb9632b1930/invoke.js"></script>
    </div>
  </div>
);

const BannerAd468 = () => (
  <div className="ad-container ad-banner-468">
    <div
      data-ad-link="https://www.highrevenueformat.com"
      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <script>
        {`atOptions = {
          'key' : 'c51f0a9e64d78d55f75a4ccd8eedc96c',
          'format' : 'iframe',
          'height' : 60,
          'width' : 468,
          'params' : {}
        };`}
      </script>
      <script src="https://www.highrevenueformat.com/c51f0a9e64d78d55f75a4ccd8eedc96c/invoke.js"></script>
    </div>
  </div>
);

const BannerAd320 = () => (
  <div className="ad-container ad-banner-320">
    <div
      data-ad-link="https://www.highrevenueformat.com"
      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <script>
        {`atOptions = {
          'key' : '1029ff22b684cfa96772119d5a4a7e73',
          'format' : 'iframe',
          'height' : 50,
          'width' : 320,
          'params' : {}
        };`}
      </script>
      <script src="https://www.highrevenueformat.com/1029ff22b684cfa96772119d5a4a7e73/invoke.js"></script>
    </div>
  </div>
);

// Rectangle ads
const RectAd300 = () => (
  <div className="ad-container ad-rect-300">
    <div
      data-ad-link="https://www.highrevenueformat.com"
      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '250px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <script>
        {`atOptions = {
          'key' : 'a37057b57277f779aa7eb6c39d0ca6d0',
          'format' : 'iframe',
          'height' : 250,
          'width' : 300,
          'params' : {}
        };`}
      </script>
      <script src="https://www.highrevenueformat.com/a37057b57277f779aa7eb6c39d0ca6d0/invoke.js"></script>
    </div>
  </div>
);

// Sidebar ads
const SidebarAd160 = () => (
  <div className="ad-container ad-sidebar-160">
    <div
      data-ad-link="https://www.highrevenueformat.com"
      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <script>
        {`atOptions = {
          'key' : '8266d43ddb40fa7f697b88ce1986a7c1',
          'format' : 'iframe',
          'height' : 300,
          'width' : 160,
          'params' : {}
        };`}
      </script>
      <script src="https://www.highrevenueformat.com/8266d43ddb40fa7f697b88ce1986a7c1/invoke.js"></script>
    </div>
  </div>
);

const SidebarAd600 = () => (
  <div className="ad-container ad-sidebar-600">
    <div
      data-ad-link="https://www.highrevenueformat.com"
      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '600px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <script>
        {`atOptions = {
          'key' : '569093e60d83db368a64b41564e536e7',
          'format' : 'iframe',
          'height' : 600,
          'width' : 160,
          'params' : {}
        };`}
      </script>
      <script src="https://www.highrevenueformat.com/569093e60d83db368a64b41564e536e7/invoke.js"></script>
    </div>
  </div>
);

// Profitableratecpmnetwork ads
const PrnBannerAd = () => (
  <div className="ad-container ad-prn-banner">
    <div data-ad-link="https://www.profitableratecpmnetwork.com" style={{ cursor: 'pointer', minHeight: '90px' }}>
      <script src="https://pl31124194.profitableratecpmnetwork.com/95/d8/cf/95d8cf0051e91631d54da7bc56ecbca1.js"></script>
    </div>
  </div>
);

const PrnInlineAd = () => (
  <div className="ad-container ad-prn-inline">
    <div id="container-0221bc3a4d9d8690c9c87b8d892de725" data-ad-link="https://www.profitableratecpmnetwork.com" style={{ cursor: 'pointer', minHeight: '250px' }}></div>
    <script async data-cfasync="false" src="https://pl31124195.profitableratecpmnetwork.com/0221bc3a4d9d8690c9c87b8d892de725/invoke.js"></script>
  </div>
);

const PrnSidebarAd = () => (
  <div className="ad-container ad-prn-sidebar">
    <div data-ad-link="https://www.profitableratecpmnetwork.com" style={{ cursor: 'pointer', minHeight: '300px' }}>
      <script src="https://pl31124197.profitableratecpmnetwork.com/ed/81/a6/ed81a612a8e2f2946bf640986f3a2b90.js"></script>
    </div>
  </div>
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
    <CloseableAd><BannerAd728 /></CloseableAd>
    <CloseableAd><BannerAd468 /></CloseableAd>
  </div>
);
