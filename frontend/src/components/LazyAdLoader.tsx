import { useEffect, useState } from 'react';

interface LazyAdLoaderProps {
  adKey: string;
  width: number;
  height: number;
  onLoad?: () => void;
}

export default function LazyAdLoader({ adKey, width, height, onLoad }: LazyAdLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load ad only after component mounts (user navigated here)
    const isMobile = /iPhone|iPad|Android|webOS|BlackBerry/i.test(navigator.userAgent);

    // Only show ads on mobile after navigation
    if (!isMobile) {
      setIsLoaded(false);
      return;
    }

    // Delay ad loading by 1 second to ensure app is interactive
    const timer = setTimeout(() => {
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
      (window as any).atOptions = atOptions;

      // Load the invoke script
      const script = document.createElement('script');
      script.src = `https://www.highrevenueformat.com/${adKey}/invoke.js`;
      script.async = true;
      script.onerror = () => console.debug(`Ad failed to load: ${adKey}`);

      const container = document.getElementById(`ad-container-${adKey}`);
      if (container) {
        container.appendChild(script);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [adKey, width, height, onLoad]);

  if (!isLoaded) return null;

  return (
    <div
      id={`ad-container-${adKey}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%',
        margin: '10px auto',
        textAlign: 'center'
      }}
    />
  );
}
