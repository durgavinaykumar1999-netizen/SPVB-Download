import { useState, useEffect, useCallback } from 'react';
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
  url?: string;
  quality?: string;
  metadata?: Metadata;
}

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  platform: string;
  quality: string;
  downloadedAt: number;
  metadata?: Metadata;
}

const extractYouTubeCookies = (): string | null => {
  try {
    const cookies = document.cookie.split('; ');
    if (cookies.length === 0) return null;

    const authCookieNames = ['SIDCC', 'SSID', 'APISID', 'SAPISID', 'LOGIN_INFO', '__Secure-1PSID', '__Secure-1PSIDTS', '__Secure-3PSID', '__Secure-3PSIDTS', 'SameSite', 'VISITOR_INFO1_LIVE'];

    let netscapeFormat = '# Netscape HTTP Cookie File\n';
    let hasAuthCookie = false;

    cookies.forEach((cookie) => {
      const [name, value] = cookie.split('=', 2);
      if (name && value) {
        if (authCookieNames.some(authName => name.includes(authName))) {
          hasAuthCookie = true;
          netscapeFormat += `.youtube.com\tTRUE\t/\tTRUE\t9999999999\t${name}\t${value}\n`;
        }
      }
    });

    return hasAuthCookie ? netscapeFormat : null;
  } catch (e) {
    console.warn('Could not extract YouTube cookies:', e);
    return null;
  }
};

function App() {
  const apiUrl = process.env.REACT_APP_API_URL || 'https://spvb-download-backend.onrender.com';

  const apiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
    return fetch(url, options);
  };

  // State Management
  const [sessionId, setSessionId] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('best');
  const [loading, setLoading] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [message, setMessage] = useState<string>('');
  const [userCookies, setUserCookies] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'download' | 'history'>('download');

  const createSession = useCallback(async () => {
    try {
      const res = await apiCall(`${apiUrl}/api/session`);
      const data = await res.json();
      if (data.success) {
        setSessionId(data.session_id);
        localStorage.setItem('spvb_session_id', data.session_id);
        setMessage('✅ Ready');
      }
    } catch (error) {
      setMessage(`❌ Session failed: ${error}`);
    }
  }, [apiUrl]);

  const fetchDownloads = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await apiCall(`${apiUrl}/api/downloads?session_id=${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setDownloads(data.downloads);
      }
    } catch (error) {
      console.error('Failed to fetch downloads:', error);
    }
  }, [sessionId, apiUrl]);

  const triggerAutoDownload = useCallback(async (downloadId: string) => {
    try {
      const res = await apiCall(`${apiUrl}/api/download/${downloadId}/stream?session_id=${sessionId}`);
      if (!res.ok) throw new Error('Download failed');

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
    } catch (error) {
      console.error('Auto-download failed:', error);
    }
  }, [sessionId, apiUrl]);

  // Initialize Session & Load History
  useEffect(() => {
    const savedSessionId = localStorage.getItem('spvb_session_id');
    const savedHistory = localStorage.getItem('spvb_download_history');

    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }

    if (savedSessionId) {
      setSessionId(savedSessionId);
      setMessage('✅ Session restored');
    } else {
      createSession();
    }

    const cookies = extractYouTubeCookies();
    if (cookies) {
      setUserCookies(cookies);
    }
  }, [createSession]);

  // Poll Downloads
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      fetchDownloads();
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId, fetchDownloads]);

  // Auto-Download Completed Videos
  useEffect(() => {
    downloads.forEach((d) => {
      if (d.status === 'completed') {
        const existsInHistory = history.some(h => h.id === d.download_id);
        if (!existsInHistory) {
          // Add to history instead of auto-downloading
          const newHistoryItem: HistoryItem = {
            id: d.download_id,
            url: d.url || url,
            title: metadata?.title || 'Video',
            thumbnail: metadata?.thumbnail || '',
            platform: metadata?.platform || 'Unknown',
            quality: selectedQuality,
            downloadedAt: Date.now(),
            metadata: metadata || undefined
          };
          const newHistory = [newHistoryItem, ...history];
          setHistory(newHistory);
          localStorage.setItem('spvb_download_history', JSON.stringify(newHistory));
          setMessage('✅ Download completed! Check history to download file.');
        }
      }
    });
  }, [downloads, history, metadata, selectedQuality, url]);

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
        body: JSON.stringify({
          url,
          session_id: sessionId,
          user_cookies: userCookies,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMetadata(data.metadata);
        setSelectedQuality(data.metadata.qualities[0]?.value?.toString() || 'best');
        setMessage('✅ Ready to download');
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
          user_cookies: userCookies,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage('⏳ Downloading...');
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

  const redownloadFromHistory = async (item: HistoryItem) => {
    // Download file from history
    try {
      const download = downloads.find(d => d.download_id === item.id);
      if (download) {
        await triggerAutoDownload(item.id);
      }
    } catch (error) {
      setMessage(`❌ Download failed: ${error}`);
    }
  };

  const deleteFromHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('spvb_download_history', JSON.stringify(newHistory));
    setMessage('✅ Removed from history');
  };

  const endSession = async () => {
    try {
      await apiCall(`${apiUrl}/api/session/end?session_id=${sessionId}`, { method: 'POST' });
      setSessionId('');
      setUrl('');
      setMetadata(null);
      setDownloads([]);
      localStorage.removeItem('spvb_session_id');
      setTimeout(() => createSession(), 1000);
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    }
  };

  const activeDownloads = downloads.filter(d => d.status !== 'completed');

  return (
    <div className="app">
      <div className="background-animation"></div>

      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <h1>📥 SPVB Downloader</h1>
            <p>Download from YouTube, Instagram, Facebook, TikTok, Twitter & More</p>
          </div>
        </header>

        {/* Message */}
        {message && (
          <div className={`message ${message.includes('✅') || message.includes('⏳') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'download' ? 'active' : ''}`}
            onClick={() => setActiveTab('download')}
          >
            ⬇️ Download
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 History ({history.length})
          </button>
          <button
            className={`tab session-btn`}
            onClick={endSession}
          >
            🔄 New Session
          </button>
        </div>

        {/* Download Tab */}
        {activeTab === 'download' && (
          <div className="download-section">
            {/* URL Input */}
            <div className="card input-card">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Paste video URL..."
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
                  🔍 Get Info
                </button>
              </div>
            </div>

            {/* Metadata Display */}
            {metadata && (
              <div className="card metadata-card">
                <div className="metadata-grid">
                  {metadata.thumbnail && (
                    <img src={metadata.thumbnail} alt={metadata.title} className="thumbnail" />
                  )}
                  <div className="metadata-info">
                    <h2>{metadata.title}</h2>
                    <div className="metadata-details">
                      <p>👤 {metadata.uploader || 'Unknown'}</p>
                      <p>⏱️ {Math.floor(metadata.duration / 60)} minutes</p>
                      <p>📺 {metadata.platform}</p>
                      {metadata.is_age_restricted && <p className="warning">⚠️ Age Restricted</p>}
                    </div>

                    {/* Quality Selection */}
                    <div className="quality-group">
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
                      className="btn btn-download"
                    >
                      {loading ? '⏳ Processing...' : '⬇️ Download'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active Downloads */}
            {activeDownloads.length > 0 && (
              <div className="card downloads-card">
                <h3>📥 Downloading ({activeDownloads.length})</h3>
                <div className="downloads-list">
                  {activeDownloads.map((d) => (
                    <div key={d.download_id} className="download-item">
                      <div className="progress-info">
                        <span className="status">{d.status.toUpperCase()}</span>
                        <span className="percentage">{d.progress}%</span>
                      </div>
                      <div className="progress-bar-wrapper">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${d.progress}%` }} />
                        </div>
                      </div>
                      {d.error && <p className="error">❌ {d.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="history-section">
            {history.length === 0 ? (
              <div className="empty-state">
                <p>📭 No downloads yet</p>
              </div>
            ) : (
              <div className="history-grid">
                {history.map((item) => (
                  <div key={item.id} className="history-card">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt={item.title} className="history-thumbnail" />
                    )}
                    <div className="history-content">
                      <h4>{item.title}</h4>
                      <p className="platform">{item.platform}</p>
                      <p className="quality">Quality: {item.quality}p</p>
                      <p className="time">
                        {new Date(item.downloadedAt).toLocaleDateString()}
                      </p>
                      <div className="history-actions">
                        <button
                          onClick={() => redownloadFromHistory(item)}
                          className="btn btn-small btn-secondary"
                        >
                          ⬇️ Redownload
                        </button>
                        <button
                          onClick={() => deleteFromHistory(item.id)}
                          className="btn btn-small btn-danger"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="footer">
        <p>✨ Download • History • Re-download • No login required ✨</p>
      </footer>
    </div>
  );
}

export default App;
