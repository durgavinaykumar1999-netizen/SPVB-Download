import { useEffect, useRef } from 'react';

interface AdUnitProps {
  atOptions?: string;
  srcs?: string[];
  containerId?: string;
  className?: string;
}

function AdUnit({ atOptions, srcs, containerId, className }: AdUnitProps) {
  const injected = useRef(false);

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

  return <div className={className} id={containerId}></div>;
}

export default AdUnit;
