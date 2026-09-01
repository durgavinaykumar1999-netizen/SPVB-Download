import { useEffect, useRef } from 'react';

interface AdUnitProps {
  atOptions?: string;
  srcs?: string[];
  containerId?: string;
  className?: string;
}

function AdUnit({ atOptions, srcs, containerId, className }: AdUnitProps) {
  const injected = useRef(false);
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (injected.current) return;
    injected.current = true;

    const head = document.head;

    if (atOptions) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.innerHTML = `atOptions = ${atOptions};`;
      head.appendChild(script);
    }

    if (srcs) {
      srcs.forEach(src => {
        if (document.querySelector(`script[src="${src}"]`)) return;
        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.async = true;
        s.src = src;
        head.appendChild(s);
      });
    }
  }, [atOptions, srcs]);

  useEffect(() => {
    if (!adContainerRef.current) return;

    const container = adContainerRef.current;

    const handleAdClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement | null;

      if (link && link.href && !link.classList.contains('ad-close-btn')) {
        e.preventDefault();
        e.stopPropagation();
        window.open(link.href, '_blank', 'noopener,noreferrer');
      }
    };

    const processLinks = () => {
      const links = container.querySelectorAll('a[href]');
      links.forEach((link: Element) => {
        const anchor = link as HTMLAnchorElement;
        if (!anchor.hasAttribute('data-new-tab-processed')) {
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          anchor.setAttribute('data-new-tab-processed', 'true');
        }
      });
    };

    processLinks();

    const observer = new MutationObserver(() => {
      processLinks();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href']
    });

    container.addEventListener('click', handleAdClick, true);

    return () => {
      observer.disconnect();
      container.removeEventListener('click', handleAdClick, true);
    };
  }, []);

  return <div className={className} id={containerId} ref={adContainerRef}></div>;
}

export default AdUnit;
