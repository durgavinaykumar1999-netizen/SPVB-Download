import { useEffect, useRef, useState } from 'react';

interface LazyAdLoaderProps {
  adKey: string;
  width: number;
  height: number;
  onLoad?: () => void;
}

export default function LazyAdLoader({ adKey, width, height, onLoad }: LazyAdLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Only show ads on mobile after navigation
    const isMobile = /iPhone|iPad|Android|webOS|BlackBerry/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Delay ad loading by 1 second to ensure app is interactive
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container || container.dataset.adInjected === 'true') return;
      container.dataset.adInjected = 'true';
      setIsLoaded(true);
      onLoad?.();

      // Load highrevenueformat ad script
      const atOptions = {
        key: adKey,
        format: 'iframe',
        height: height,
        width: width,
        params: {}
      };

      // Store globally for ad script access
      (window as any).atAsyncContainers = (window as any).atAsyncContainers || {};
      (window as any).atAsyncContainers[adKey] = [container.id];
      (window as any).atOptions = atOptions;

      const script = document.createElement('script');
      script.src = `https://www.highrevenueformat.com/${adKey}/invoke.js`;
      script.async = true;
      script.onerror = () => console.debug(`Ad failed to load: ${adKey}`);

      container.appendChild(script);
    }, 1000);

    return () => clearTimeout(timer);
  }, [adKey, width, height, onLoad]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%',
        margin: '10px auto',
        textAlign: 'center',
        position: 'relative',
        background: 'linear-gradient(135deg, #1a3a52 0%, #0f2a40 100%)',
        border: '1px solid rgba(100, 150, 200, 0.3)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      {isLoaded ? null : (
        <span
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
            pointerEvents: 'none'
          }}
        >
          Advertisement
        </span>
      )}
    </div>
  );
}