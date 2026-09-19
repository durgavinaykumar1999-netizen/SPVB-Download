import { useEffect, useRef } from 'react';

interface AdBannerProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
}

export default function AdBanner({ adKey, width, height, className = '' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Generate unique container ID
    const containerId = `ad-container-${adKey}-${Math.random().toString(36).substr(2, 9)}`;
    container.id = containerId;

    // Register container with ad network
    (window as any).atAsyncContainers = (window as any).atAsyncContainers || {};
    (window as any).atAsyncContainers[adKey] = [containerId];

    // Set up ad options
    (window as any).atOptions = {
      key: adKey,
      format: 'iframe',
      height: height,
      width: width,
      params: {}
    };

    // Load the ad script
    const script = document.createElement('script');
    script.src = `https://www.highrevenueformat.com/${adKey}/invoke.js`;
    script.async = true;
    script.onerror = () => console.debug(`Ad failed to load: ${adKey}`);
    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [adKey, width, height]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        textAlign: 'center',
        minHeight: `${height}px`,
        minWidth: `${width}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '10px auto'
      }}
    />
  );
}
