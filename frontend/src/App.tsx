import { useState, useEffect } from 'react';
import './App.css';

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
  const [sessionId, setSessionId] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('best');
  const [loading, setLoading] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [message, setMessage] = useState<string>('');
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const savedSessionId = localStorage.getItem('spvb_session_id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      setMessage('✅ Session restored from last visit');
    } else {
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

  const createSession = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/session`);
      const data = await res.json();
      if (data.success) {
        setSessionId(data.session_id);
        localStorage.setItem('spvb_session_id', data.session_id);
        setMessage('✅ New session created successfully');
      }
    } catch (error) {
      setMessage(`❌ Failed to create session: ${error}`);
    }
  };

  const fetchMetadata = async () => {
    if (!url || !sessionId) {
      setMessage('❌ Please enter a URL and have an active session');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, session_id: sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setMetadata(data.metadata);
        setSelectedQuality(data.metadata.qualities[0]?.value?.toString() || 'best');
        setMessage(`✅ Metadata loaded: ${data.metadata.title}`);
      } else {
        setMessage(`❌ ${data.message || 'Failed to fetch metadata'}`);
      }
    } catch (error) {
      setMessage(`❌ Error fetching metadata: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const startDownload = async () => {
    if (!url || !sessionId) {
      setMessage('❌ Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          session_id: sessionId,
          quality: selectedQuality,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ Download started!`);
        fetchDownloads();
      } else {
        setMessage(`❌ ${data.message || 'Failed to start download'}`);
      }
    } catch (error) {
      setMessage(`❌ Error starting download: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloads = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${apiUrl}/api/downloads?session_id=${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setDownloads(data.downloads);
      }
    } catch (error) {
      console.error('Failed to fetch downloads:', error);
    }
  };

  const downloadFile = async (downloadId: string) => {
    try {
      setMessage(`⏳ Processing download...`);
      setDownloadingIds(new Set([...downloadingIds, downloadId]));

      const res = await fetch(
        `${apiUrl}/api/download/${downloadId}/stream?session_id=${sessionId}`
      );

      if (!res.ok) {
        throw new Error(`Download failed: ${res.statusText}`);
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

      setDownloadedIds(new Set([...downloadedIds, downloadId]));
      setMessage(`✅ Download complete! Check your Downloads folder.`);
    } catch (error) {
      console.error('Failed to download file:', error);
      setMessage(`❌ Download error: ${error}`);
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(downloadId);
        return newSet;
      });
    }
  };

  const endSession = async () => {
    try {
      setMessage(`⏳ Ending session and cleaning up...`);

      const res = await fetch(
        `${apiUrl}/api/session/end?session_id=${sessionId}`,
        { method: 'POST' }
      );

      const data = await res.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setSessionId('');
        setUrl('');
        setMetadata(null);
        setDownloads([]);
        setDownloadedIds(new Set());
        setDownloadingIds(new Set());
        localStorage.removeItem('spvb_session_id');

        // Create a new session
        setTimeout(() => createSession(), 1000);
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      setMessage(`❌ Error ending session: ${error}`);
    }
  };

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
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            <span className="message-icon">{message.includes('✅') ? '✓' : '✕'}</span>
            {message}
          </div>
        )}

        <div className="card session-card">
          <div className="session-header">
            <div className="session-status">
              <div className="status-dot"></div>
              <span>Session Active</span>
            </div>
            <code className="session-id">{sessionId?.substring(0, 12)}...</code>
          </div>
          <div className="session-actions">
            <button onClick={createSession} className="btn btn-secondary">
              <span className="btn-icon">↻</span>
              New Session
            </button>
            <button onClick={endSession} className="btn btn-end-session">
              <span className="btn-icon">✕</span>
              End & Cleanup
            </button>
          </div>
        </div>

        <div className="card input-card">
          <div className="input-group">
            <input
              type="text"
              placeholder="Paste your video URL here..."
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
              {loading ? 'Scanning...' : 'Get Info'}
            </button>
          </div>
        </div>

        {metadata && (
          <div className="card metadata-card">
            <div className="metadata-header">
              <div className="platform-badge">{metadata.platform.toUpperCase()}</div>
            </div>
            <div className="metadata-content">
              {metadata.thumbnail && (
                <div className="thumbnail-container">
                  <img
                    src={metadata.thumbnail}
                    alt={metadata.title}
                    className="thumbnail"
                  />
                  <div className="duration-badge">
                    {Math.floor(metadata.duration / 60)}m
                  </div>
                </div>
              )}
              <div className="metadata-info">
                <h2>{metadata.title}</h2>
                {metadata.uploader && (
                  <p className="uploader">
                    <span className="uploader-icon">👤</span> {metadata.uploader}
                  </p>
                )}

                {metadata.is_age_restricted && (
                  <div className="warning-badge">
                    <span className="warning-icon">⚠</span> Age-Restricted Content
                  </div>
                )}

                <div className="quality-section">
                  <label className="quality-label">Select Quality</label>
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
                  className="btn btn-download-large"
                >
                  <span className="btn-icon">⬇</span>
                  {loading ? 'Initiating Download...' : 'Start Download'}
                </button>
              </div>
            </div>
          </div>
        )}

        {downloads.length > 0 && (
          <div className="card downloads-card">
            <div className="downloads-header">
              <h3>📥 Download Queue</h3>
              <span className="download-count">{downloads.length}</span>
            </div>
            <div className="downloads-list">
              {downloads.map((d) => (
                <div
                  key={d.download_id}
                  className={`download-item download-${d.status}`}
                >
                  <div className="download-header">
                    <div className="download-status-badge">
                      {d.status === 'completed' && '✓ Completed'}
                      {d.status === 'downloading' && '⟳ Downloading'}
                      {d.status === 'queued' && '⋯ Queued'}
                      {d.status === 'failed' && '✕ Failed'}
                    </div>
                    <code className="download-id">
                      {d.download_id.substring(0, 8)}
                    </code>
                  </div>

                  {d.progress > 0 && d.status === 'downloading' && (
                    <div className="progress-section">
                      <div className="progress-bar-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${d.progress}%` }}
                          >
                            <span className="progress-text">{d.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {d.error && (
                    <div className="error-message">
                      <span className="error-icon">⚠</span> {d.error}
                    </div>
                  )}

                  {d.status === 'completed' && (
                    <div className="download-actions">
                      {downloadingIds.has(d.download_id) ? (
                        <div className="downloading-indicator">
                          <div className="spinner"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => downloadFile(d.download_id)}
                          className="btn btn-download-action"
                        >
                          <span className="btn-icon">⬇</span>
                          {downloadedIds.has(d.download_id) ? 'Retry Download' : 'Download Now'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="footer">
          <div className="footer-content">
            <p>🔐 All downloads are session-based and private</p>
            <p>⏱ Sessions auto-cleanup after 30 minutes</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
