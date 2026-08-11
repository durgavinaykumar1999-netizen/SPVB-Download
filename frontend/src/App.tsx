import { useState, useEffect, useCallback, useRef } from 'react';
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

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', color: '#FF0000', icon: '▶' },
  { id: 'instagram', name: 'Instagram', color: '#E1306C', icon: '◎' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: 'f' },
  { id: 'tiktok', name: 'TikTok', color: '#000000', icon: '♪' },
  { id: 'twitter', name: 'X', color: '#FFFFFF', icon: '𝕏' },
];

const extractYouTubeCookies = (): string | null => {
  try {
    const cookies = document.cookie.split('; ');
    if (cookies.length === 0) return null;
    const authCookieNames = ['SIDCC', 'SSID', 'APISID', 'SAPISID', 'LOGIN_INFO', '__Secure-1PSID'];
    let netscapeFormat = '# Netscape HTTP Cookie File\n';
    let hasAuthCookie = false;
    cookies.forEach((cookie) => {
      const [name, value] = cookie.split('=', 2);
      if (name && value && authCookieNames.some(authName => name.includes(authName))) {
        hasAuthCookie = true;
        netscapeFormat += `.youtube.com\tTRUE\t/\tTRUE\t9999999999\t${name}\t${value}\n`;
      }
    });
    return hasAuthCookie ? netscapeFormat : null;
  } catch (e) {
    return null;
  }
};

const detectPlatform = (url: string): string | null => {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('instagram.com')) return 'Instagram';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'Facebook';
  if (u.includes('tiktok.com')) return 'TikTok';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'X (Twitter)';
  return null;
};

const isValidUrl = (str: string): boolean => {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

function useToasts() {
  const [toasts, setToasts] = useState<any[]>([]);
  const push = useCallback((msg: string, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  return { toasts, push };
}

function App() {
  const apiUrl = process.env.REACT_APP_API_URL || 'https://spvb-download-backend.onrender.com';
  const { toasts, push } = useToasts();

  const [sessionId, setSessionId] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('best');
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [userCookies, setUserCookies] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'download' | 'history'>('download');
  const [phase, setPhase] = useState<'idle' | 'loading' | 'result' | 'error'>('idle');
  const [downloadState, setDownloadState] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const metadataCacheRef = useRef<{ [key: string]: Metadata }>({});

  const apiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
    return fetch(url, options);
  };

  const createSession = useCallback(async () => {
    try {
      const res = await apiCall(`${apiUrl}/api/session`);
      const data = await res.json();
      if (data.success) {
        setSessionId(data.session_id);
        localStorage.setItem('spvb_session_id', data.session_id);
        push('✅ Session created');
      }
    } catch (error) {
      push(`❌ Session failed: ${error}`, 'error');
    }
  }, [apiUrl, push]);

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
    } else {
      createSession();
    }

    const cookies = extractYouTubeCookies();
    if (cookies) {
      setUserCookies(cookies);
    }
  }, [createSession]);

  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      fetchDownloads();
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId, fetchDownloads]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!url) {
      setValidation(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      if (!isValidUrl(url)) {
        setValidation('invalid');
        return;
      }
      const platform = detectPlatform(url);
      setValidation(platform ? 'valid' : 'unsupported');
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [url]);

  const fetchMetadata = async () => {
    if (!url || !sessionId) {
      push('❌ Please enter a URL', 'error');
      return;
    }
    if (metadataCacheRef.current[url]) {
      setMetadata(metadataCacheRef.current[url]);
      setSelectedQuality(metadataCacheRef.current[url].qualities[0]?.value?.toString() || 'best');
      setPhase('result');
      push('✅ Loaded from cache');
      return;
    }
    setPhase('loading');
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
        metadataCacheRef.current[url] = data.metadata;
        setMetadata(data.metadata);
        setSelectedQuality(data.metadata.qualities[0]?.value?.toString() || 'best');
        setPhase('result');
        push('✅ Video information retrieved.');
      } else {
        setPhase('error');
        push(`❌ ${data.message || 'Failed'}`, 'error');
      }
    } catch (error) {
      setPhase('error');
      push(`❌ Error: ${error}`, 'error');
    }
  };

  const startDownload = async () => {
    if (!url || !sessionId) {
      push('❌ Please enter URL', 'error');
      return;
    }

    setDownloadState('preparing');
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
        push('⏳ Downloading...');
        fetchDownloads();
      } else {
        push(`❌ ${data.message || 'Failed'}`, 'error');
        setDownloadState(null);
      }
    } catch (error) {
      push(`❌ Error: ${error}`, 'error');
      setDownloadState(null);
    }
  };

  const redownloadFromHistory = async (item: HistoryItem) => {
    try {
      const download = downloads.find(d => d.download_id === item.id);
      if (download) {
        const res = await apiCall(`${apiUrl}/api/download/${item.id}/stream?session_id=${sessionId}`);
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `video-${item.id.substring(0, 8)}.mp4`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(link);
        }, 100);
        push('✅ Download complete!');
      }
    } catch (error) {
      push(`❌ Download failed: ${error}`, 'error');
    }
  };

  const deleteFromHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('spvb_download_history', JSON.stringify(newHistory));
    push('✅ Removed from history');
  };


  const handlePaste = async () => {
    if (url) {
      setUrl('');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      push('✅ URL pasted');
    } catch {
      push('❌ Unable to access clipboard', 'error');
    }
  };

  const msg = {
    empty: { t: 'Please enter a video URL.', c: 'var(--danger)' },
    invalid: { t: 'Please enter a valid URL.', c: 'var(--danger)' },
    unsupported: { t: 'This platform is currently not supported.', c: 'var(--warning)' },
    valid: { t: '✓ URL recognized', c: 'var(--success)' },
  }[validation || ''] || null;

  return (
    <div className="app">
      <div className="bg-grid"></div>
      <div className="bg-blob blob1"></div>
      <div className="bg-blob blob2"></div>

      <ToastStack toasts={toasts} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <header className="header">
          <div className="logo-section">
            <img src="logo.png" alt="SPVB" className="logo-img" />
            <span className="logo-text">SPVB</span>
          </div>
          <nav>
            <button className="nav-btn">
              <span>?</span> How it works
            </button>
            <div className="profile-avatar">D</div>
          </nav>
        </header>

        <section className="hero-section">
          <h1>
            <span className="gradient-text">SPVB</span> Downloader
          </h1>
          <p>Download and process videos from your favorite platforms with speed and security.</p>
          <PlatformBadges />
        </section>

        {sessionId && (
          <section className="main-content">

            <div className="tabs-container">
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
            </div>

            {activeTab === 'download' ? (
              <div className="download-section">
                <DownloaderCard
                  url={url}
                  setUrl={setUrl}
                  validation={validation}
                  msg={msg}
                  loading={phase === 'loading'}
                  onGetInfo={fetchMetadata}
                  onPaste={handlePaste}
                />

                {phase === 'idle' && <EmptyState />}
                {phase === 'error' && <ErrorCard onRetry={() => setPhase('idle')} />}
                {phase === 'result' && metadata && (
                  <ResultCard
                    data={metadata}
                    selectedQuality={selectedQuality}
                    setSelectedQuality={setSelectedQuality}
                    onDownload={startDownload}
                    downloadState={downloadState}
                  />
                )}
              </div>
            ) : (
              <HistorySection history={history} onRedownload={redownloadFromHistory} onDelete={deleteFromHistory} />
            )}
          </section>
        )}

        <Features />
        <Footer />
      </div>
    </div>
  );
}


function PlatformBadges() {
  return (
    <div className="platform-badges">
      {PLATFORMS.map(p => (
        <div key={p.id} className="badge">
          <span style={{ color: p.color === '#FFFFFF' ? 'white' : p.color }}>{p.icon}</span>
          {p.name}
        </div>
      ))}
      <button className="badge more-btn">⋯ More</button>
    </div>
  );
}


function DownloaderCard({ url, setUrl, validation, msg, loading, onGetInfo, onPaste }: any) {
  return (
    <div className="downloader-card">
      <div className="input-wrapper">
        <span className="input-icon">🔗</span>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onGetInfo()}
          placeholder="Paste video URL here..."
          className="url-input"
          style={{
            borderColor:
              validation === 'invalid' || validation === 'empty'
                ? 'rgba(239,68,68,0.5)'
                : validation === 'valid'
                ? 'rgba(34,197,94,0.5)'
                : validation === 'unsupported'
                ? 'rgba(245,158,11,0.5)'
                : 'var(--border)',
          }}
        />
        <button onClick={onPaste} className="paste-btn">
          {url ? 'Clear' : 'Paste'}
        </button>
      </div>
      <button onClick={onGetInfo} disabled={loading} className="btn-primary">
        {loading ? (
          <>
            <span className="spinner"></span>Analyzing…
          </>
        ) : (
          <>🔍 Get Info</>
        )}
      </button>
      {msg && <div style={{ color: msg.c, marginTop: 10 }}>{msg.t}</div>}
      {loading && <div className="scan-bar"></div>}
    </div>
  );
}

function ResultCard({ data, selectedQuality, setSelectedQuality, onDownload, downloadState }: any) {
  return (
    <div className="result-card">
      <div className="thumbnail-area">
        {data.thumbnail ? (
          <img src={data.thumbnail} alt={data.title} />
        ) : (
          <div className="thumbnail-placeholder">🎞️</div>
        )}
        <div className="play-button">▶</div>
        <span className="duration">{Math.floor(data.duration / 60)}:00</span>
      </div>

      <div className="result-content">
        <h3>{data.title}</h3>
        <div className="metadata-tags">
          <span>📺 {data.platform}</span>
          <span>⏱ {Math.floor(data.duration / 60)}m</span>
          <span>👤 {data.uploader || 'Unknown'}</span>
        </div>

        <div className="quality-section">
          <label>Available Qualities</label>
          <div className="quality-buttons">
            {data.qualities.map((q: Quality) => (
              <button
                key={q.value}
                onClick={() => setSelectedQuality(q.value)}
                className={`quality-btn ${selectedQuality === q.value ? 'active' : ''}`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onDownload} disabled={downloadState?.startsWith('downloading') || downloadState === 'preparing'} className="btn-download">
          {downloadState === 'preparing' ? (
            <>
              <span className="spinner"></span>⏳ Preparing…
            </>
          ) : downloadState?.startsWith('downloading') ? (
            <>
              <span className="spinner"></span>⬇️ {downloadState.split('_')[1] || '0'}%
            </>
          ) : downloadState === 'complete' ? (
            <>✅ Complete</>
          ) : (
            <>⬇️ Download {selectedQuality}p</>
          )}
        </button>

        {downloadState === 'downloading' && <div className="progress-bar"></div>}
      </div>
    </div>
  );
}

function ErrorCard({ onRetry }: any) {
  return (
    <div className="error-card">
      <div style={{ fontSize: 30, marginBottom: 10 }}>⚠</div>
      <h3>Unable to process this URL</h3>
      <p>We couldn't retrieve information from this link. Please check the URL and try again.</p>
      <button onClick={onRetry} className="btn-secondary">Try Again</button>
    </div>
  );
}

function HistorySection({ history, onRedownload, onDelete }: any) {
  return (
    <div className="history-grid">
      {history.length === 0 ? (
        <div className="empty-history">
          <p>📭 No downloads yet</p>
        </div>
      ) : (
        history.map((item: HistoryItem) => (
          <div key={item.id} className="history-card">
            {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="history-thumbnail" />}
            <div className="history-info">
              <h4>{item.title}</h4>
              <p className="platform">{item.platform}</p>
              <p className="quality">Quality: {item.quality}p</p>
              <div className="history-actions">
                <button onClick={() => onRedownload(item)} className="btn-small">⬇️ Redownload</button>
                <button onClick={() => onDelete(item.id)} className="btn-small danger">🗑️</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 22, marginBottom: 8 }}>↓</div>
      <p>Paste a video URL to get started</p>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
        You can analyze supported video links without creating an account.
      </p>
    </div>
  );
}

function Features() {
  const feats = [
    { icon: '🛡', title: 'Secure & Private', sub: '100% safe, no data stored' },
    { icon: '⚡', title: 'Lightning Fast', sub: 'Optimized for speed' },
    { icon: '🌐', title: 'Multi Platform', sub: 'Support 100+ sites' },
    { icon: '♥', title: 'User Friendly', sub: 'Simple & easy to use' },
  ];

  return (
    <div className="features-section">
      {feats.map(f => (
        <div key={f.title} className="feature-item">
          <div className="feature-icon">{f.icon}</div>
          <div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-sub">{f.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>🔒 Session-based · Temporary processing · Auto cleanup · No login required</p>
      <p>
        © 2026 SPVB Downloader. All rights reserved. ·
        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</button> ·
        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</button> ·
        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', textDecoration: 'underline' }}>Contact Us</button>
      </p>
    </footer>
  );
}

function ToastStack({ toasts }: any) {
  return (
    <div className="toast-stack">
      {toasts.map((t: any) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === 'error' ? '⚠' : '✓'}</span>{t.msg}
        </div>
      ))}
    </div>
  );
}

export default App;
