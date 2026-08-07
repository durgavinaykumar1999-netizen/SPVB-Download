/**
 * Device Fingerprinting for Session Security
 * Ensures one session = one device only
 */

export interface DeviceFingerprint {
  userAgent: string;
  timezone: string;
  language: string;
  screenResolution: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  fingerprint: string;
}

export function generateDeviceFingerprint(): DeviceFingerprint {
  // Collect device information
  const userAgent = navigator.userAgent;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const platform = navigator.platform;
  const hardwareConcurrency = navigator.hardwareConcurrency || 0;
  // deviceMemory is not universally supported, use optional chaining
  const deviceMemory = (navigator as any).deviceMemory || 0;

  // Create fingerprint string from all collected data
  const fingerprintData = `${userAgent}|${timezone}|${language}|${screenResolution}|${platform}|${hardwareConcurrency}|${deviceMemory}`;

  // Simple hash function (for browser-side, using base64 as identifier)
  const fingerprint = btoa(fingerprintData).slice(0, 32);

  return {
    userAgent,
    timezone,
    language,
    screenResolution,
    platform,
    hardwareConcurrency,
    deviceMemory,
    fingerprint,
  };
}

export function getStoredFingerprint(): DeviceFingerprint | null {
  try {
    const stored = sessionStorage.getItem('spvb_device_fingerprint');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse stored fingerprint:', e);
  }
  return null;
}

export function storeFingerprint(fingerprint: DeviceFingerprint): void {
  try {
    sessionStorage.setItem('spvb_device_fingerprint', JSON.stringify(fingerprint));
  } catch (e) {
    console.error('Failed to store fingerprint:', e);
  }
}

export function validateDeviceFingerprint(current: DeviceFingerprint, stored: DeviceFingerprint): boolean {
  // Check if device fingerprint matches
  return current.fingerprint === stored.fingerprint;
}

export function getDeviceFingerprintHeader(): string {
  const fingerprint = getStoredFingerprint();
  return fingerprint?.fingerprint || '';
}
