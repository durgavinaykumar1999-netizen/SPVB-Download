export interface Fingerprint {
  fingerprint: string;
  device: string;
  browser: string;
  os: string;
  screen: string;
  language: string;
  languages: string;
  timezone: string;
  platform: string;
  referrer: string;
  page: string;
  user_agent: string;
}

function hashString(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return 'fp-' + Math.abs(h).toString(36);
}

function detectDeviceType(ua: string): 'desktop' | 'mobile' | 'tablet' {
  const u = ua.toLowerCase();
  if (/ipad|tablet/.test(u)) return 'tablet';
  if (/iphone|ipod|android|mobile/.test(u)) return 'mobile';
  return 'desktop';
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/crios|chrome/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Unknown';
}

function detectOS(ua: string): string {
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

export function getFingerprint(): Fingerprint {
  const ua = navigator.userAgent || '';
  const scr = window.screen;
  const size = `${scr.width}x${scr.height}`;
  return {
    fingerprint: hashString(
      [
        ua,
        navigator.platform || '',
        navigator.language || '',
        (navigator.languages || []).join(','),
        Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        size,
        String(new Date().getTimezoneOffset())
      ].join('|')
    ),
    device: detectDeviceType(ua),
    browser: detectBrowser(ua),
    os: detectOS(ua),
    screen: size,
    language: navigator.language || '',
    languages: (navigator.languages || []).slice(0, 5).join(','),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    platform: navigator.platform || '',
    referrer: document.referrer || '',
    page: window.location.pathname || '/',
    user_agent: ua,
  };
}

export function fingerprintQuery(): string {
  const fp = getFingerprint();
  const params = new URLSearchParams();
  Object.entries(fp).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  return params.toString();
}