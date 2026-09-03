import { useState, useEffect } from 'react';
import './MoviesList.css';
import ScrollingNotice from './ScrollingNotice';
import { SmallBannerAd, MobileBannerAd } from './Ads';

interface Movie {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

interface MoviesListProps {
  onSelectMovie: (movie: Movie) => void;
}

export default function MoviesList({ onSelectMovie }: MoviesListProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
      const response = await fetch(`${apiUrl}/api/movies/list`);
      const data = await response.json();
      if (data.success) {
        setMovies(data.movies);
      } else {
        setError(data.message || 'Failed to load movies');
      }
    } catch (err) {
      setError('Error loading movies: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="movies-list-container">
        <div className="loading">⏳ Loading movies...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="movies-list-container">
        <div className="error">❌ {error}</div>
        <button onClick={fetchMovies} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="movies-list-container">
        <div className="no-movies">
          <h2>🎬 No Movies Available</h2>
          <p>Come back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="movies-list-wrapper">
      <ScrollingNotice educationMode={true} />
      <SmallBannerAd />
      <div className="movies-list-container">
        <div className="movies-list-header">
          <h1>🎬 Watch Movies</h1>
          <a href="/" className="back-home-btn">🏠 Home</a>
        </div>
      <p className="movies-count">Available: {movies.length} movie{movies.length !== 1 ? 's' : ''}</p>

      <div className="movies-grid">
        {movies.map((movie) => (
          <div key={movie.id} className="movie-card">
            <div className="movie-card-image">
              {movie.thumbnail ? (
                <img src={movie.thumbnail} alt={movie.name} />
              ) : (
                <div className="no-image">🎬</div>
              )}
              <div className="movie-card-overlay">
                <button
                  onClick={() => onSelectMovie(movie)}
                  className="play-button"
                >
                  ▶ WATCH NOW
                </button>
              </div>
            </div>
            <div className="movie-card-info">
              <h3>{movie.name}</h3>
              <p className="movie-id">ID: {movie.id.substring(0, 8)}</p>
            </div>
          </div>
        ))}
      </div>
      </div>
      <MobileBannerAd />
    </div>
  );
}
