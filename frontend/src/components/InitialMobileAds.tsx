import { useEffect, useState } from 'react';

export default function InitialMobileAds() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const mobile = /iPhone|iPad|Android|webOS|BlackBerry/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  // Show on mobile HOME page
  if (!isMobile) return null;

  return (
    <div
      style={{
        width: '100%',
        background: '#0B1220',
        padding: '15px 10px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(37, 99, 235, 0.2)',
        marginBottom: '20px'
      }}
    >
      {/* Ad 1: 320x50 */}
      <div style={{ margin: '10px 0', minHeight: '60px' }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.atOptions = {
                'key': '1029ff22b684cfa96772119d5a4a7e73',
                'format': 'iframe',
                'height': 50,
                'width': 320,
                'params': {}
              };
            `
          }}
        />
        <script src="https://www.highrevenueformat.com/1029ff22b684cfa96772119d5a4a7e73/invoke.js" async={true} />
      </div>

      {/* Ad 2: 300x250 */}
      <div style={{ margin: '10px 0', minHeight: '260px' }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.atOptions = {
                'key': 'a37057b57277f779aa7eb6c39d0ca6d0',
                'format': 'iframe',
                'height': 250,
                'width': 300,
                'params': {}
              };
            `
          }}
        />
        <script src="https://www.highrevenueformat.com/a37057b57277f779aa7eb6c39d0ca6d0/invoke.js" async={true} />
      </div>

      {/* Ad 3: 468x60 */}
      <div style={{ margin: '10px 0', minHeight: '70px', width: '100%' }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.atOptions = {
                'key': 'c51f0a9e64d78d55f75a4ccd8eedc96c',
                'format': 'iframe',
                'height': 60,
                'width': 468,
                'params': {}
              };
            `
          }}
        />
        <script src="https://www.highrevenueformat.com/c51f0a9e64d78d55f75a4ccd8eedc96c/invoke.js" async={true} />
      </div>

      {/* Ad 4: 160x300 */}
      <div style={{ margin: '10px 0', minHeight: '310px' }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.atOptions = {
                'key': '8266d43ddb40fa7f697b88ce1986a7c1',
                'format': 'iframe',
                'height': 300,
                'width': 160,
                'params': {}
              };
            `
          }}
        />
        <script src="https://www.highrevenueformat.com/8266d43ddb40fa7f697b88ce1986a7c1/invoke.js" async={true} />
      </div>
    </div>
  );
}
