import React, { useState, useEffect } from 'react';
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

  // Create session on mount
  useEffect(() => {
    createSession();
  }, []);

  // Poll downloads
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
        setMessage('✅ Session created');
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
        setMessage(`✅ Download started: ${data.download_id}`);
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

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🎬 SPVB - Social Media Video Downloader</h1>
          <p>Download videos from YouTube, Instagram, Facebook, TikTok, Twitter</p>
        </header>

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="session-info">
          <p>
            Session ID: <code>{sessionId?.substring(0, 8)}...</code>
          </p>
          <button onClick={createSession} className="btn-secondary">
            New Session
          </button>
        </div>

        <div className="input-section">
          <input
            type="text"
            placeholder="Paste video URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input-url"
            onKeyPress={(e) => e.key === 'Enter' && fetchMetadata()}
          />
          <button
            onClick={fetchMetadata}
            disabled={loading || !url}
            className="btn-primary"
          >
            {loading ? 'Loading...' : 'Get Info'}
          </button>
        </div>

        {metadata && (
          <div className="metadata-section">
            <div className="metadata-content">
              {metadata.thumbnail && (
                <img
                  src={metadata.thumbnail}
                  alt={metadata.title}
                  className="thumbnail"
                />
              )}
              <div className="metadata-info">
                <h2>{metadata.title}</h2>
                <p>Duration: {Math.floor(metadata.duration / 60)} minutes</p>
                {metadata.uploader && <p>Uploader: {metadata.uploader}</p>}
                <p>Platform: {metadata.platform.toUpperCase()}</p>

                <div className="quality-section">
                  <label>Select Quality:</label>
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
                  className="btn-download"
                >
                  {loading ? 'Downloading...' : '⬇️ Download Video'}
                </button>
              </div>
            </div>
          </div>
        )}

        {downloads.length > 0 && (
          <div className="downloads-section">
            <h3>📥 Downloads ({downloads.length})</h3>
            <div className="downloads-list">
              {downloads.map((d) => (
                <div key={d.download_id} className={`download-item ${d.status}`}>
                  <div className="download-id">
                    ID: {d.download_id.substring(0, 8)}...
                  </div>
                  <div className="download-status">
                    Status: <strong>{d.status.toUpperCase()}</strong>
                  </div>
                  {d.progress > 0 && (
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${d.progress}%` }}
                      />
                    </div>
                  )}
                  {d.error && <div className="error-text">❌ {d.error}</div>}
                  {d.status === 'completed' && (
                    <>
                      <div className="success-text">✅ Ready for download</div>
                      {downloadingIds.has(d.download_id) ? (
                        <div className="downloading-indicator">
                          <div className="spinner"></div>
                          <span>Processing download...</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => downloadFile(d.download_id)}
                          className="btn-download-item"
                        >
                          {downloadedIds.has(d.download_id) ? '🔄 Retry Download' : '⬇️ Download to Local'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="footer">
          <p>
            Backend API: <code>{apiUrl}</code>
          </p>
          <p>All downloads are session-based • Auto-cleanup after 30 minutes</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
