import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './MoviePage.css';

interface Movie {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

interface MoviePageProps {
  onClose?: () => void;
}

export default function MoviePage({ onClose }: MoviePageProps = {}) {
  const [movieUrl, setMovieUrl] = useState('');
  const [movieName, setMovieName] = useState('Movie');
  const [count, setCount] = useState(2000);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [controlsOpen, setControlsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const fetchMovieUrl = async () => {
      try {
        const pathname = window.location.pathname;
        const movieId = pathname.split('/watch/')[1];

        if (!movieId) {
          setMovieUrl('');
          return;
        }

        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
        const response = await fetch(`${apiUrl}/api/movies/list`);
        const data = await response.json();

        if (data.success && data.movies) {
          const movie = data.movies.find((m: Movie) => m.id === movieId);
          if (movie) {
            setMovieUrl(movie.url);
            setMovieName(movie.name);
            setLoaded(false);
            setError('');
          } else {
            console.error('Movie not found');
            setMovieUrl('');
          }
        }
      } catch (err) {
        console.error('Failed to fetch movie:', err);
        setMovieUrl('');
      }
    };
    fetchMovieUrl();
  }, []);

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';

    const fetchViewerCount = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/admin/stats`);
        const data = await res.json();
        if (data.success) {
          const realUsers = data.stats.totalUsers || 0;
          setCount(2000 + realUsers);
        }
      } catch (error) {
        setCount(2000);
      }
    };

    fetchViewerCount();
    const interval = setInterval(fetchViewerCount, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!movieUrl || !videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true
      });

      hlsRef.current = hls;
      hls.loadSource(movieUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoaded(true);
        setError('');
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('⚠️ Network error loading stream. Check your connection and try again.');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('⚠️ Media error playing stream. Try refreshing the page.');
              break;
            default:
              setError('⚠️ Error loading stream. Please try again later.');
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = movieUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoaded(true);
        setError('');
      });
      video.addEventListener('error', () => {
        setError('⚠️ Error loading stream. Please try again later.');
      });
      video.play().catch(() => {});
      return () => {
        video.src = '';
      };
    } else {
      setError('❌ Your browser does not support HLS streaming. Please use a modern browser (Chrome, Firefox, Edge, or Safari).');
    }
  }, [movieUrl]);

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

  useEffect(() => {
    if (window.history.state && window.history.state.movieGuard) return;
    window.history.pushState({ movieGuard: true }, document.title);
    const onPop = () => {
      window.location.replace('/');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const toggleFullscreen = () => {
    const el = videoRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  };

  const closeMovie = () => {
    window.location.href = '/watch';
  };

  return (
    <div className="movie-page">
      <div className="movie-header">
        <h1>{movieName}</h1>
        <div className="movie-viewer-count">
          <span className="live-dot"></span>
          <strong>{count.toLocaleString('en-US')}</strong> Watching
        </div>
        <div className="movie-header-actions">
          <button className="movie-btn" onClick={() => setControlsOpen(v => !v)}>ℹ️ Info</button>
          <button className="movie-btn green" onClick={toggleFullscreen}>⛶ Fullscreen</button>
          <button className="movie-btn red" onClick={closeMovie}>✕ Close</button>
        </div>
      </div>

      <div className="movie-body">
        {movieUrl ? (
          <div className="movie-frame">
            <video
              ref={videoRef}
              controls
              playsInline
              className="movie-video"
            />
            {!loaded && !error && (
              <div className="movie-loading">
                <div className="spinner"></div>
                <p>Loading stream...</p>
              </div>
            )}
            {error && (
              <div className="movie-error">
                <p>{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="movie-coming-soon">
            <div className="coming-soon-icon">🎬</div>
            <h2>Coming Soon</h2>
            <p>This movie is not available yet. Please check back later.</p>
            <a href="/watch" className="movie-btn light">🎬 Back to Movies</a>
          </div>
        )}
      </div>

      {controlsOpen && movieUrl && (
        <div className="movie-info-overlay">
          <button className="close-btn-overlay" onClick={() => setControlsOpen(false)}>✕</button>
          <strong>🎬 Playback Controls:</strong>
          <div>Play / Pause - Click video or spacebar<br />Volume - Click speaker icon<br />Fullscreen - Click fullscreen button or press F</div>
          <strong>⏱️ Timeline:</strong>
          <div>Seek - Click on progress bar<br />Forward - Right arrow key<br />Rewind - Left arrow key</div>
        </div>
      )}
    </div>
  );
}
