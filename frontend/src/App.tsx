import { useState, useEffect } from 'react';
import './App.css';
import {
  generateDeviceFingerprint,
  getStoredFingerprint,
  storeFingerprint,
  getDeviceFingerprintHeader,
} from './deviceFingerprint';

interface Quality {
  label: string;
  value: number | string;
}

interface Metadata {
  title: string;
  duration: number;
  thumbnail: string;
  uploader?: string;
  qualities: Quality[];
  platform: string;
  is_age_restricted?: boolean;
}

interface Download {
  download_id: string;
  status: string;
  progress: number;
  filename?: string;
  error?: string;
}

function App() {
  const apiUrl = process.env.REACT_APP_API_URL || 'https://spvb-download-backend.onrender.com';

  // Helper to add device fingerprint to all requests
  const apiCall = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const deviceFingerprint = getDeviceFingerprintHeader();
    const headers = {
      ...(options.headers || {}),
      'X-Device-Fingerprint': deviceFingerprint,
    };
    return fetch(url, { ...options, headers });
  };
  const [sessionId, setSessionId] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('best');
  const [loading, setLoading] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [message, setMessage] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [autoDownloadCompleted, setAutoDownloadCompleted] = useState<Set<string>>(new Set());
  const [hiddenDownloadIds, setHiddenDownloadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const savedSessionId = localStorage.getItem('spvb_session_id');
    const savedHiddenIds = localStorage.getItem('spvb_hidden_downloads');

    // Generate device fingerprint
    const currentFingerprint = generateDeviceFingerprint();
    const storedFingerprint = getStoredFingerprint();

    if (savedHiddenIds) {
      try {
        setHiddenDownloadIds(new Set(JSON.parse(savedHiddenIds)));
      } catch (e) {
        console.error('Failed to parse hidden downloads:', e);
      }
    }

    if (savedSessionId) {
      // Verify device fingerprint matches
      if (storedFingerprint && currentFingerprint.fingerprint !== storedFingerprint.fingerprint) {
        // Device mismatch - clear session and create new one
        setMessage('⚠️ Session started on different device - creating new session');
        localStorage.removeItem('spvb_session_id');
        localStorage.removeItem('spvb_hidden_downloads');
        sessionStorage.removeItem('spvb_device_fingerprint');

        // Generate and store new fingerprint
        storeFingerprint(currentFingerprint);
        createSession();
      } else {
        setSessionId(savedSessionId);
        setMessage('✅ Session restored');

        // Ensure fingerprint is stored
        if (!storedFingerprint) {
          storeFingerprint(currentFingerprint);
        }
      }
    } else {
      // Generate and store device fingerprint for new session
      storeFingerprint(currentFingerprint);
      createSession();
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      fetchDownloads();
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Auto-download when download completes
  useEffect(() => {
    downloads.forEach((d) => {
      if (
        d.status === 'completed' &&
        !autoDownloadCompleted.has(d.download_id)
      ) {
        setAutoDownloadCompleted(
          new Set([...autoDownloadCompleted, d.download_id])
        );

        // Hide this download from view and save to localStorage
        const newHiddenIds = new Set([...hiddenDownloadIds, d.download_id]);
        setHiddenDownloadIds(newHiddenIds);
        localStorage.setItem('spvb_hidden_downloads', JSON.stringify([...newHiddenIds]));

        triggerAutoDownload(d.download_id);
      }
    });
  }, [downloads, autoDownloadCompleted, hiddenDownloadIds]);

  const createSession = async () => {
    try {
      const res = await apiCall(`${apiUrl}/api/session`);
      const data = await res.json();

      if (res.status === 401) {
        setMessage('🔒 Session blocked - different device detected');
        localStorage.removeItem('spvb_session_id');
        return;
      }

      if (data.success) {
        setSessionId(data.session_id);
        localStorage.setItem('spvb_session_id', data.session_id);
        setMessage('✅ Ready');
      }
    } catch (error) {
      setMessage(`❌ Session failed: ${error}`);
    }
  };

  const fetchMetadata = async () => {
    if (!url || !sessionId) {
      setMessage('❌ Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const res = await apiCall(`${apiUrl}/api/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, session_id: sessionId }),
      });

      if (res.status === 401) {
        setMessage('🔒 Session expired - device changed');
        localStorage.removeItem('spvb_session_id');
        setSessionId('');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setMetadata(data.metadata);
        setSelectedQuality(data.metadata.qualities[0]?.value?.toString() || 'best');
        setMessage(`✅ Ready`);
      } else {
        setMessage(`❌ ${data.message || 'Failed'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const startDownload = async () => {
    if (!url || !sessionId) {
      setMessage('❌ Please enter URL');
      return;
    }

    setLoading(true);
    try {
      const res = await apiCall(`${apiUrl}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          session_id: sessionId,
          quality: selectedQuality,
        }),
      });

      if (res.status === 401) {
        setMessage('🔒 Session expired - device changed');
        localStorage.removeItem('spvb_session_id');
        setSessionId('');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setMessage(`⏳ Downloading...`);
        fetchDownloads();
      } else {
        setMessage(`❌ ${data.message || 'Failed'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloads = async () => {
    if (!sessionId) return;
    try {
      const res = await apiCall(`${apiUrl}/api/downloads?session_id=${sessionId}`);

      if (res.status === 401) {
        setMessage('🔒 Session expired - device changed');
        localStorage.removeItem('spvb_session_id');
        setSessionId('');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setDownloads(data.downloads);
      }
    } catch (error) {
      console.error('Failed to fetch downloads:', error);
    }
  };

  const triggerAutoDownload = async (downloadId: string) => {
    try {
      const res = await apiCall(
        `${apiUrl}/api/download/${downloadId}/stream?session_id=${sessionId}`
      );

      if (res.status === 401) {
        setMessage('🔒 Session expired - device changed');
        localStorage.removeItem('spvb_session_id');
        setSessionId('');
        return;
      }

      if (!res.ok) {
        throw new Error(`Download failed`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-${downloadId.substring(0, 8)}.mp4`;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);

      setMessage(`✅ Download complete!`);
    } catch (error) {
      console.error('Auto-download failed:', error);
    }
  };

  const endSession = async () => {
    try {
      setMessage(`🔄 Ending session...`);

      const res = await apiCall(
        `${apiUrl}/api/session/end?session_id=${sessionId}`,
        { method: 'POST' }
      );

      const data = await res.json();
      if (data.success) {
        setMessage(`✅ Session ended`);
        setSessionId('');
        setUrl('');
        setMetadata(null);
        setDownloads([]);
        setShowHistory(false);
        setHiddenDownloadIds(new Set());
        setAutoDownloadCompleted(new Set());
        localStorage.removeItem('spvb_session_id');
        localStorage.removeItem('spvb_hidden_downloads');
        sessionStorage.removeItem('spvb_device_fingerprint');

        setTimeout(() => createSession(), 1000);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    }
  };

  // Filter out hidden downloads (completed downloads that user has already seen)
  const activeDownloads = downloads.filter(
    (d) => d.status !== 'completed' && !hiddenDownloadIds.has(d.download_id)
  );

  // Show completed downloads only in history modal
  const completedDownloads = downloads.filter((d) => d.status === 'completed');

  return (
    <div className="app">
      <div className="background-animation"></div>

      <div className="container">
        <header className="header">
          <div className="header-content">
            <img src="/logo.png" alt="SPVB Logo" className="logo-icon" />
            <h1>SPVB Downloader</h1>
            <p>Download videos from YouTube, Instagram, Facebook, TikTok, Twitter & More</p>
          </div>
        </header>

        {message && (
          <div className={`message ${message.includes('✅') || message.includes('⏳') ? 'success' : 'error'}`}>
            <span className="message-icon">{message.includes('❌') ? '✕' : '✓'}</span>
            {message}
          </div>
        )}

        <div className="session-controls">
          <div className="session-info">
            <div className="session-status">
              <div className="status-dot"></div>
              <span>Active</span>
            </div>
            <code>{sessionId?.substring(0, 10)}...</code>
          </div>
          <div className="session-actions">
            {completedDownloads.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`btn btn-small ${showHistory ? 'btn-active' : ''}`}
              >
                📋 History ({completedDownloads.length})
              </button>
            )}
            <button onClick={createSession} className="btn btn-small">
              ↻ New
            </button>
            <button onClick={endSession} className="btn btn-small btn-danger">
              ✕ End
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">
          {/* INPUT & METADATA */}
          <div className="input-section">
            <div className="card input-card">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Paste video URL here..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="input-url"
                  onKeyDown={(e) => e.key === 'Enter' && fetchMetadata()}
                />
                <button
                  onClick={fetchMetadata}
                  disabled={loading || !url}
                  className="btn btn-primary"
                >
                  <span className="btn-icon">🔍</span>
                  Get Info
                </button>
              </div>
            </div>

            {metadata && (
              <div className="card metadata-card">
                <div className="metadata-container">
                  {metadata.thumbnail && (
                    <div className="thumbnail-container">
                      <img
                        src={metadata.thumbnail}
                        alt={metadata.title}
                        className="thumbnail"
                      />
                      <div className="overlay">
                        <div className="platform-badge">
                          {metadata.platform.toUpperCase()}
                        </div>
                        <div className="duration-badge">
                          ⏱ {Math.floor(metadata.duration / 60)}m
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="metadata-details">
                    <h2 className="video-title">{metadata.title}</h2>

                    {metadata.uploader && (
                      <p className="uploader">
                        <span>👤</span> {metadata.uploader}
                      </p>
                    )}

                    {metadata.is_age_restricted && (
                      <div className="warning">
                        <span>⚠</span> Age-Restricted
                      </div>
                    )}

                    <div className="quality-group">
                      <label>Quality</label>
                      <select
                        value={selectedQuality}
                        onChange={(e) => setSelectedQuality(e.target.value)}
                        className="quality-select"
                      >
                        {metadata.qualities.map((q, idx) => (
                          <option key={idx} value={q.value}>
                            {q.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={startDownload}
                      disabled={loading}
                      className="btn btn-download"
                    >
                      <span className="btn-icon">⬇</span>
                      {loading ? 'Processing...' : 'Start Download'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ACTIVE DOWNLOADS */}
            {activeDownloads.length > 0 && (
              <div className="card progress-card">
                <h3>📥 Downloading ({activeDownloads.length})</h3>
                <div className="progress-list">
                  {activeDownloads.map((d) => (
                    <div key={d.download_id} className="progress-item">
                      <div className="progress-info">
                        <span className="status-badge">⟳ {d.status.toUpperCase()}</span>
                        <span className="progress-percent">{d.progress}%</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${d.progress}%` }} />
                        </div>
                      </div>
                      {d.error && <p className="error-text">❌ {d.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* HISTORY MODAL */}
          {showHistory && completedDownloads.length > 0 && (
            <div className="history-modal">
              <div className="history-backdrop" onClick={() => setShowHistory(false)}></div>
              <div className="history-panel">
                <div className="history-header">
                  <h3>✓ Download History</h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="btn-close"
                  >
                    ✕
                  </button>
                </div>

                <div className="history-list">
                  {completedDownloads.map((d) => (
                    <div key={d.download_id} className="history-item">
                      <div className="checkmark">✓</div>
                      <div className="history-details">
                        <p className="history-id">ID: {d.download_id.substring(0, 8)}</p>
                        <p className="history-status">Completed</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowHistory(false)}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '15px' }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="footer">
        <p>🔐 Session-based • Auto-cleanup after 30 minutes • No login required</p>
      </footer>
    </div>
  );
}

export default App;
