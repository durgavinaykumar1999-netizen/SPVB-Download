import { useEffect, useRef } from 'react';

// Mobile ads component - shows ads in the middle of content area
export default function InitialMobileAds() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if mobile
    const isMobile = /iPhone|iPad|Android|webOS|BlackBerry/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Load ads when component mounts
    const container = containerRef.current;
    if (!container) return;

    // Load 320x50 mobile banner ad
    const adKey = '1029ff22b684cfa96772119d5a4a7e73';
    (window as any).atOptions = {
      'key': adKey,
      'format': 'iframe',
      'height': 50,
      'width': 320,
      'params': {}
    };

    const script = document.createElement('script');
    script.src = `https://www.highrevenueformat.com/${adKey}/invoke.js`;
    script.async = true;
    container.appendChild(script);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: '15px auto',
        padding: '10px',
        textAlign: 'center',
        background: 'transparent',
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    />
  );
}
