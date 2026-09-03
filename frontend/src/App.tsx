import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import ScrollingNotice from './ScrollingNotice';
import { AdHeader, AdSidebar, AdInline, AdMobile, AdGameBanner } from './Ads';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';
import GamesList from './GamesList';
import MoviesList from './MoviesList';
import MoviePage from './MoviePage';

// Ad Networks: Highrevenueformat + Profitableratecpmnetwork
// All ads are clickable (opens in new tab on click)
// Ads show on download results pages (when metadata present) and history pages
const SHOW_THIRD_PARTY_ADS = true;

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
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
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

  const isMobile = () => /iPhone|iPad|Android|webOS|BlackBerry/i.test(navigator.userAgent);

  const apiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
    return fetch(url, options);
  };

  const createSession = useCallback(async () => {
    try {
      console.log('[DEBUG] Creating session with API URL:', apiUrl);
      const res = await apiCall(`${apiUrl}/api/session`, { method: 'POST' });
      const data = await res.json();
      console.log('[DEBUG] Session response:', data);
      if (data.success) {
        setSessionId(data.session_id);
        localStorage.setItem('spvb_session_id', data.session_id);
        push('✅ Session created');
        console.log('[DEBUG] Session ID saved:', data.session_id);
      } else {
        push(`❌ Session failed: ${data.message || 'Unknown error'}`, 'error');
        console.error('[DEBUG] Session error:', data);
      }
    } catch (error) {
      push(`❌ Session failed: ${error}`, 'error');
      console.error('[DEBUG] Session exception:', error);
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

  useEffect(() => {
    if (!isMobile()) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement | null;

      if (!link) return;

      const href = link.getAttribute('href');
      const isExternal = href && (href.startsWith('http') || href.startsWith('//'));

      if (isExternal && href) {
        e.preventDefault();
        e.stopPropagation();
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    };

    const handlePopstate = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.forward();
    };

    document.addEventListener('click', handleLinkClick, true);
    window.addEventListener('popstate', handlePopstate);

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
      window.removeEventListener('popstate', handlePopstate);
    };
  }, []);

  const fetchMetadata = async () => {
    if (!url) {
      push('❌ Please enter a URL', 'error');
      return;
    }
    if (!sessionId) {
      push('⏳ Creating session... Please try again', 'error');
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
  }, [apiUrl, sessionId, push, completedDownload, metadata]);

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

  const [showGame, setShowGame] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token') || null);

  const pathname = window.location.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const isGameRoute = pathname.startsWith('/play/');
  const isGamesListRoute = pathname === '/play';
  const isMovieRoute = pathname.startsWith('/watch/');
  const isMoviesListRoute = pathname === '/watch';

  // Admin route
  if (isAdminRoute) {
    if (!adminToken) {
      return <AdminLogin onLogin={(token) => {
        setAdminToken(token);
        localStorage.setItem('admin_token', token);
      }} />;
    }
    return <AdminPanel token={adminToken} onLogout={() => {
      setAdminToken(null);
      localStorage.removeItem('admin_token');
      window.location.href = '/';
    }} />;
  }

  // Games list route
  if (isGamesListRoute) {
    return <GamesList onSelectGame={(game) => {
      window.location.href = `/play/${game.id}`;
    }} />;
  }

  // Game detail route
  if (isGameRoute || showGame) {
    return <GamePage onClose={() => setShowGame(false)} />;
  }

  // Movies list route
  if (isMoviesListRoute) {
    return <MoviesList onSelectMovie={(movie) => {
      window.location.href = `/watch/${movie.id}`;
    }} />;
  }

  // Movie detail route
  if (isMovieRoute) {
    return <MoviePage onClose={() => {}} />;
  }

  // Show ads on all pages with proper content
  // Ads appear on: home, download results, games, movies, history
  const shouldShowAds = true;

  return (
    <div className="app">
      <div className="bg-grid"></div>
      <div className="bg-blob blob1"></div>
      <div className="bg-blob blob2"></div>

      <ToastStack toasts={toasts} />

      <div style={{ position: 'relative', zIndex: 2, background: 'transparent' }}>
        <header className="header">
          <div className="logo-section">
            <img src="logo.png" alt="SPVB" className="logo-img" />
            <span className="logo-text">SPVB</span>
          </div>
          <nav>
            <a href="/play" className="nav-btn games-btn" style={{ textDecoration: 'none' }}>
              <span>🎮</span> Games
            </a>
            <a href="/watch" className="nav-btn movies-btn" style={{ textDecoration: 'none' }}>
              <span>🎬</span> Movies
            </a>
            <button className="nav-btn">
              <span>?</span> How it works
            </button>
            <div className="profile-avatar">D</div>
          </nav>
        </header>

        {shouldShowAds && SHOW_THIRD_PARTY_ADS && <AdHeader />}

        <section className="hero-section">
          <h1>
            <span className="gradient-text">SPVB</span> Downloader
          </h1>
          <p>Download and process videos from your favorite platforms with speed and security.</p>
          <PlatformBadges />
          <LivePlayers />
        </section>

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

            {shouldShowAds && SHOW_THIRD_PARTY_ADS && <AdInline />}
            </div>
            {shouldShowAds && SHOW_THIRD_PARTY_ADS && (
              <aside className="content-sidebar">
                <AdSidebar />
              </aside>
            )}
            </div>
        </section>

        <Features />
        <ScrollingNotice />
        <Footer />
        {shouldShowAds && SHOW_THIRD_PARTY_ADS && <AdMobile />}
      </div>
    </div>
  );
}


function LivePlayers() {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
  const [count, setCount] = useState(5000);

  useEffect(() => {
    const fetchPlayerCount = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/admin/stats`);
        const data = await res.json();
        if (data.success) {
          const realUsers = data.stats.totalUsers || 0;
          setCount(5000 + realUsers);
        }
      } catch (error) {
        setCount(5000);
      }
    };

    fetchPlayerCount();
    const interval = setInterval(fetchPlayerCount, 5000);
    return () => clearInterval(interval);
  }, [apiUrl]);

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
  const [modal, setModal] = useState<'privacy' | 'terms' | 'contact' | null>(null);

  return (
    <>
      <footer className="footer">
        <div className="footer-content">
          <p className="footer-info">🔒 Session-based · Temporary processing · Auto cleanup · No login required</p>
          <div className="footer-links">
            <p>© 2026 SPVB Downloader. All rights reserved.</p>
            <div className="footer-buttons">
              <button onClick={() => setModal('privacy')} className="footer-link">Privacy Policy</button>
              <span className="separator">·</span>
              <button onClick={() => setModal('terms')} className="footer-link">Terms of Service</button>
              <span className="separator">·</span>
              <button onClick={() => setModal('contact')} className="footer-link">Contact Us</button>
            </div>
          </div>
        </div>
      </footer>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>

            {modal === 'privacy' && (
              <div>
                <h2>Privacy Policy</h2>
                <div className="modal-body">
                  <h3>1. Information We Collect</h3>
                  <p>We collect session IDs and download history stored locally on your device. No personal data is stored on our servers.</p>

                  <h3>2. How We Use Your Information</h3>
                  <p>Session data is used to maintain your current session for up to 30 minutes. Download history is stored in your browser only.</p>

                  <h3>3. Data Security</h3>
                  <p>All communications are encrypted. We do not share any data with third parties.</p>

                  <h3>4. Cookies</h3>
                  <p>We use browser storage (localStorage) to save your session ID and download history. You can clear this anytime in browser settings.</p>

                  <h3>5. Contact Us</h3>
                  <p>For privacy concerns, please use our Contact Us form below.</p>
                </div>
              </div>
            )}

            {modal === 'terms' && (
              <div>
                <h2>Terms of Service</h2>
                <div className="modal-body">
                  <h3>1. Acceptance of Terms</h3>
                  <p>By using SPVB Downloader, you agree to these terms and conditions. If you do not agree, please do not use our service.</p>

                  <h3>2. Permitted Use</h3>
                  <p>You may use this service for personal, non-commercial purposes only. Downloading copyrighted content without permission is prohibited.</p>

                  <h3>3. User Responsibilities</h3>
                  <p>You are responsible for ensuring that your use of our service complies with all applicable laws and regulations in your jurisdiction.</p>

                  <h3>4. Disclaimer</h3>
                  <p>This service is provided "as is" without warranties. We are not liable for any damages resulting from use or inability to use the service.</p>

                  <h3>5. Termination</h3>
                  <p>We reserve the right to terminate or restrict access to our service at any time.</p>

                  <h3>6. Changes to Terms</h3>
                  <p>We may update these terms at any time. Continued use constitutes acceptance of updated terms.</p>
                </div>
              </div>
            )}

            {modal === 'contact' && (
              <div>
                <h2>Contact Us - Educational Project</h2>
                <div className="modal-body">
                  <h3>Report Copyright or Issues</h3>
                  <p>This is an educational project. If you have any concerns about copyright or third-party content, please contact us immediately.</p>

                  <div className="contact-section">
                    <h4>📧 Primary Contact Email</h4>
                    <p><a href="mailto:vinaymail1820@gmail.com">vinaymail1820@gmail.com</a></p>
                  </div>

                  <div className="contact-section">
                    <h4>ℹ️ Project Information</h4>
                    <p>This is an <strong>Educational Initiative</strong> created for learning purposes only. We do not store any data on our servers. All game content is hosted on third-party servers.</p>
                  </div>

                  <div className="contact-section">
                    <h4>⚖️ Copyright Claims</h4>
                    <p>If you believe we are hosting copyrighted content without permission, please email us with:</p>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      <li>Description of the copyrighted content</li>
                      <li>Your ownership proof</li>
                      <li>Specific URL(s) in question</li>
                    </ul>
                  </div>

                  <div className="contact-section">
                    <h4>⏱️ Response Time</h4>
                    <p>We respond to copyright claims and inquiries within 24 hours.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function GamePage({ onClose }: { onClose?: () => void } = {}) {
  const [gameUrl, setGameUrl] = useState('');
  const [gameName, setGameName] = useState('Game');
  const [count, setCount] = useState(5000);
  const [loaded, setLoaded] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    const fetchGameUrl = async () => {
      try {
        const pathname = window.location.pathname;
        const gameId = pathname.split('/play/')[1];

        if (!gameId) {
          setGameUrl('');
          return;
        }

        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
        const response = await fetch(`${apiUrl}/api/games/list`);
        const data = await response.json();

        if (data.success && data.games) {
          const game = data.games.find((g: any) => g.id === gameId);
          if (game) {
            setGameUrl(game.url);
            setGameName(game.name);
          } else {
            console.error('Game not found');
            setGameUrl('');
          }
        }
      } catch (err) {
        console.error('Failed to fetch game:', err);
        setGameUrl('');
      }
    };
    fetchGameUrl();
  }, []);

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';

    const fetchPlayerCount = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/admin/stats`);
        const data = await res.json();
        if (data.success) {
          const realUsers = data.stats.totalUsers || 0;
          setCount(5000 + realUsers);
        }
      } catch (error) {
        setCount(5000);
      }
    };

    fetchPlayerCount();
    const interval = setInterval(fetchPlayerCount, 5000);
    return () => clearInterval(interval);
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
    window.location.href = '/play';
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <h1>{gameName}</h1>
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
            <a href="/play" className="game-btn light">🎮 Back to Games</a>
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

      {gameUrl && SHOW_THIRD_PARTY_ADS && <AdGameBanner />}
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
