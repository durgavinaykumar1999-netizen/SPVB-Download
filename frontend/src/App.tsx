import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import ScrollingNotice from './ScrollingNotice';
import { AdHeader, AdSidebar, AdInline, AdMobile, AdGameBanner } from './Ads';

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
  { id: 'instagram', name: 'Instagram', color: '#E1306C', icon: '◎' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: 'f' },
  { id: 'tiktok', name: 'TikTok', color: '#000000', icon: '♪' },
  { id: 'twitter', name: 'X', color: '#FFFFFF', icon: '𝕏' },
];

const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .substring(0, 200);
};

const detectPlatform = (url: string): string | null => {
  const u = url.toLowerCase();
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
  const [selectedQuality, setSelectedQuality] = useState<string | number>('best');
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'download' | 'history'>('download');
  const [phase, setPhase] = useState<'idle' | 'loading' | 'result' | 'error'>('idle');
  const [downloadState, setDownloadState] = useState<string | null>(null);
  const [completedDownload, setCompletedDownload] = useState<Download | null>(null);
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

const manualDownload = useCallback(async () => {
    if (!sessionId || !completedDownload) return;
    push('⬇️ Downloading video...');
    try {
      const res = await apiCall(`${apiUrl}/api/download/${completedDownload.download_id}/auto-download?session_id=${sessionId}`);
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const title = completedDownload.metadata?.title || metadata?.title || 'video';
      link.download = `${sanitizeFilename(title)}.mp4`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
      push('✅ Video downloaded!');
    } catch (error) {
      push(`❌ Download failed: ${error}`, 'error');
    }
  }, [apiUrl, sessionId, push, completedDownload]);

  useEffect(() => {
    if (downloads.length > 0) {
      const latestDownload = downloads[downloads.length - 1];
      if (latestDownload.status === 'downloading') {
        const progress = latestDownload.progress || 0;
        setDownloadState(`downloading_${progress}`);
      } else if (latestDownload.status === 'completed') {
        setDownloadState('complete');
        setCompletedDownload(latestDownload);

        // Save to history
        const historyItem: HistoryItem = {
          id: latestDownload.download_id,
          url: url || '',
          title: metadata?.title || 'Unknown Video',
          thumbnail: metadata?.thumbnail || '',
          platform: metadata?.platform || 'Unknown',
          quality: typeof selectedQuality === 'number' ? `${selectedQuality}p` : selectedQuality,
          downloadedAt: Date.now(),
          metadata: metadata || undefined,
        };
        setHistory(prev => {
          if (prev.some(h => h.id === latestDownload.download_id)) return prev;
          const updated = [historyItem, ...prev];
          localStorage.setItem('spvb_download_history', JSON.stringify(updated));
          return updated;
        });
      } else if (latestDownload.status === 'error') {
        setDownloadState(null);
        push(`❌ Download error: ${latestDownload.error}`, 'error');
      }
    }
  }, [downloads, push, url, metadata, selectedQuality]);

  const startDownload = async () => {
    if (!url || !sessionId) {
      push('❌ Please enter URL', 'error');
      return;
    }

    setDownloadState('preparing');
    setCompletedDownload(null);
    try {
      const qualityStr = typeof selectedQuality === 'number' ? `${selectedQuality}p` : selectedQuality;
      const res = await apiCall(`${apiUrl}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          session_id: sessionId,
          quality: qualityStr,
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

  const handleDownload = () => {
    if (downloadState === 'complete' && completedDownload) {
      manualDownload();
    } else {
      startDownload();
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
        link.download = `${sanitizeFilename(item.title)}.mp4`;
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

  const isGameRoute = window.location.pathname.startsWith('/play/');
  if (isGameRoute) {
    return <GamePage />;
  }

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
            <a href="/play/gta-vc" className="nav-btn games-btn" style={{ textDecoration: 'none' }}>
              <span>🎮</span> Games
            </a>
            <button className="nav-btn">
              <span>?</span> How it works
            </button>
            <div className="profile-avatar">D</div>
          </nav>
        </header>

        <AdHeader />

        <section className="hero-section">
          <h1>
            <span className="gradient-text">SPVB</span> Downloader
          </h1>
          <p>Download and process videos from your favorite platforms with speed and security.</p>
          <PlatformBadges />
          <LivePlayers />
        </section>

        {sessionId && (
          <>
          <section className="main-content">
            <div className="content-layout">
            <div className="content-main">

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
                    onDownload={handleDownload}
                    downloadState={downloadState}
                  />
                )}
              </div>
            ) : (
              <HistorySection history={history} onRedownload={redownloadFromHistory} onDelete={deleteFromHistory} />
            )}

            <AdInline />
            </div>
            <aside className="content-sidebar">
              <AdSidebar />
            </aside>
            </div>
          </section>
          </>
        )}

        <Features />
        <ScrollingNotice />
        <Footer />
        <AdMobile />
      </div>
    </div>
  );
}


function LivePlayers() {
  const [count, setCount] = useState(5000);
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1 + Math.floor(Math.random() * 3));
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="hero-live-players">
      <span className="live-dot"></span>
      <strong>{count.toLocaleString('en-US')}+</strong> Players Online Now
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
            <>⬇️ Download 100%</>
          ) : (
            <>⬇️ Download {typeof selectedQuality === 'number' ? `${selectedQuality}p` : selectedQuality}</>
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

function GamePage() {
  const [gameUrl, setGameUrl] = useState('');
  const [count, setCount] = useState(5000);
  const [loaded, setLoaded] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    const fetchGameUrl = async () => {
      try {
        const response = await fetch('/config.json');
        const data = await response.json();
        setGameUrl(data.gameUrl || '');
      } catch (err) {
        console.error('Failed to fetch game config:', err);
        setGameUrl('');
      }
    };
    fetchGameUrl();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1 + Math.floor(Math.random() * 3)), 2000 + Math.random() * 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (/iPhone|iPad|Android|webOS|BlackBerry/i.test(navigator.userAgent)) {
      setControlsOpen(true);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setControlsOpen(v => !v);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Mobile back button: never let it close the app from the game page.
  // Any back navigation returns to the home screen instead of exiting.
  useEffect(() => {
    if (window.history.state && window.history.state.gameGuard) return;
    window.history.pushState({ gameGuard: true }, document.title);
    const onPop = () => {
      window.location.replace('/');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const toggleFullscreen = () => {
    const el = document.querySelector('.game-frame');
    if (!el) return;
    if (!document.fullscreenElement) {
      (el as HTMLElement).requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  };

  const closeGame = () => {
    if (window.confirm('Close game and return to home?')) window.location.href = '/';
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <h1>Grand Theft Auto: Vice City</h1>
        <div className="game-player-count">
          <span className="live-dot"></span>
          <strong>{count.toLocaleString('en-US')}</strong> Playing
        </div>
        <div className="game-header-actions">
          <button className="game-btn" onClick={() => setControlsOpen(v => !v)}>ℹ️ Controls</button>
          <button className="game-btn green" onClick={toggleFullscreen}>⛶ Fullscreen</button>
          <button className="game-btn red" onClick={closeGame}>✕ Close</button>
        </div>
      </div>

      <div className="game-body">
        {gameUrl ? (
          <div className="game-frame">
            <iframe
              title="game"
              src={gameUrl}
              allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              onLoad={() => setLoaded(true)}
            />
            {!loaded && (
              <div className="game-loading">
                <div className="spinner"></div>
                <p>Loading game...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="game-coming-soon">
            <div className="coming-soon-icon">🚧</div>
            <h2>Coming Soon</h2>
            <p>This game is not available yet. Please check back later.</p>
            <a href="/" className="game-btn light">🏠 Back to Home</a>
          </div>
        )}
      </div>

      {controlsOpen && gameUrl && (
        <div className="game-controls-overlay">
          <button className="close-btn-overlay" onClick={() => setControlsOpen(false)}>✕</button>
          <strong>🖥️ Desktop Controls:</strong>
          <div>Arrow Keys - Move<br />Space - Action<br />E - Enter Vehicle<br />WASD - Alternative Controls</div>
          <strong>📱 Mobile Controls:</strong>
          <div>Touch buttons on screen<br />Swipe gestures<br />Tap to interact</div>
          <strong>⌨️ General:</strong>
          <div>F - Fullscreen<br />ESC - Show/Hide Controls</div>
        </div>
      )}

      <AdGameBanner />
    </div>
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
