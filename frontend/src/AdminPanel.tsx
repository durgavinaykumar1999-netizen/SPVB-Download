import { useState, useEffect, useCallback } from 'react';
import './AdminPanel.css';

interface Game {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  createdAt: string;
}

interface Movie {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  createdAt: string;
}

interface AdminPanelProps {
  token: string;
  onLogout: () => void;
}

export default function AdminPanel({ token, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'games' | 'movies'>('games');
  const [games, setGames] = useState<Game[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [newGame, setNewGame] = useState({ name: '', url: '', thumbnail: '' });
  const [newMovie, setNewMovie] = useState({ name: '', url: '', thumbnail: '' });
  const [message, setMessage] = useState('');
  const [moviesMessage, setMoviesMessage] = useState('');

  const fetchGames = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
      const response = await fetch(`${apiUrl}/api/admin/games`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setGames(data.games);
      }
    } catch (err) {
      console.error('Failed to fetch games:', err);
    }
  }, [token]);

  const fetchMovies = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
      const response = await fetch(`${apiUrl}/api/admin/movies`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setMovies(data.movies);
      }
    } catch (err) {
      console.error('Failed to fetch movies:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchGames();
    fetchMovies();
  }, [fetchGames, fetchMovies]);

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGame.name || !newGame.url) {
      setMessage('❌ Name and URL required');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
      const response = await fetch(`${apiUrl}/api/admin/games/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newGame),
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Game added successfully!');
        setNewGame({ name: '', url: '', thumbnail: '' });
        fetchGames();
      } else {
        setMessage('❌ ' + (data.message || 'Failed to add game'));
      }
    } catch (err) {
      setMessage('❌ Error: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!window.confirm('Delete this game?')) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
      const response = await fetch(`${apiUrl}/api/admin/games/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Game deleted!');
        fetchGames();
      } else {
        setMessage('❌ Delete failed');
      }
    } catch (err) {
      setMessage('❌ Error: ' + String(err));
    }
  };

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovie.name || !newMovie.url) {
      setMoviesMessage('❌ Name and Stream URL required');
      return;
    }

    setMoviesLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
      const response = await fetch(`${apiUrl}/api/admin/movies/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newMovie),
      });

      const data = await response.json();
      if (data.success) {
        setMoviesMessage('✅ Movie added successfully!');
        setNewMovie({ name: '', url: '', thumbnail: '' });
        fetchMovies();
      } else {
        setMoviesMessage('❌ ' + (data.message || 'Failed to add movie'));
      }
    } catch (err) {
      setMoviesMessage('❌ Error: ' + String(err));
    } finally {
      setMoviesLoading(false);
    }
  };

  const handleDeleteMovie = async (id: string) => {
    if (!window.confirm('Delete this movie?')) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
      const response = await fetch(`${apiUrl}/api/admin/movies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setMoviesMessage('✅ Movie deleted!');
        fetchMovies();
      } else {
        setMoviesMessage('❌ Delete failed');
      }
    } catch (err) {
      setMoviesMessage('❌ Error: ' + String(err));
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🎮 Admin Panel</h1>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          🎮 Games
        </button>
        <button
          className={`admin-tab ${activeTab === 'movies' ? 'active' : ''}`}
          onClick={() => setActiveTab('movies')}
        >
          🎬 Movies
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'games' && (
        <>
        {/* Add Game Section */}
        <section className="add-game-section">
          <h2>➕ Add New Game</h2>
          <form onSubmit={handleAddGame} className="add-game-form">
            <div className="form-group">
              <label>Game Name *</label>
              <input
                type="text"
                placeholder="e.g., Grand Theft Auto: Vice City"
                value={newGame.name}
                onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Game URL (iframe src) *</label>
              <input
                type="url"
                placeholder="https://example.com/game"
                value={newGame.url}
                onChange={(e) => setNewGame({ ...newGame, url: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Thumbnail URL (optional)</label>
              <input
                type="url"
                placeholder="https://example.com/thumb.jpg"
                value={newGame.thumbnail}
                onChange={(e) => setNewGame({ ...newGame, thumbnail: e.target.value })}
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="add-btn">
              {loading ? 'Adding...' : 'Add Game'}
            </button>
          </form>

          {message && (
            <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </section>

        {/* Games List Section */}
        <section className="games-list-section">
          <h2>📋 Available Games ({games.length})</h2>

          {games.length === 0 ? (
            <p className="no-games">No games added yet. Add one above!</p>
          ) : (
            <div className="games-table">
              <div className="table-header">
                <div className="col-name">Game Name</div>
                <div className="col-url">URL</div>
                <div className="col-date">Added</div>
                <div className="col-action">Action</div>
              </div>

              {games.map((game) => (
                <div key={game.id} className="table-row">
                  <div className="col-name">
                    <strong>{game.name}</strong>
                  </div>
                  <div className="col-url">
                    <a href={game.url} target="_blank" rel="noopener noreferrer" className="url-link">
                      {new URL(game.url).hostname}
                    </a>
                  </div>
                  <div className="col-date">
                    {new Date(game.createdAt).toLocaleDateString()}
                  </div>
                  <div className="col-action">
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      className="delete-btn"
                      disabled={loading}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Games Preview */}
        <section className="preview-section">
          <h2>👀 Games Preview</h2>
          <p>Games will appear in this order on the games page:</p>
          <div className="preview-list">
            {games.map((game) => (
              <div key={game.id} className="preview-card">
                {game.thumbnail && (
                  <img src={game.thumbnail} alt={game.name} className="preview-thumb" />
                )}
                <div className="preview-info">
                  <h3>{game.name}</h3>
                  <button className="preview-play-btn">▶ Play Game</button>
                </div>
              </div>
            ))}
          </div>
        </section>
        </>
        )}

        {activeTab === 'movies' && (
        <>
        {/* Add Movie Section */}
        <section className="add-movie-section">
          <h2>➕ Add New Movie</h2>
          <form onSubmit={handleAddMovie} className="add-movie-form">
            <div className="form-group">
              <label>Movie Name *</label>
              <input
                type="text"
                placeholder="e.g., Sample Movie"
                value={newMovie.name}
                onChange={(e) => setNewMovie({ ...newMovie, name: e.target.value })}
                disabled={moviesLoading}
              />
            </div>

            <div className="form-group">
              <label>Stream URL (.m3u8) *</label>
              <input
                type="url"
                placeholder="https://example.com/stream/chunklist_b2628000.m3u8"
                value={newMovie.url}
                onChange={(e) => setNewMovie({ ...newMovie, url: e.target.value })}
                disabled={moviesLoading}
              />
            </div>

            <div className="form-group">
              <label>Poster/Thumbnail URL (optional)</label>
              <input
                type="url"
                placeholder="https://example.com/poster.jpg"
                value={newMovie.thumbnail}
                onChange={(e) => setNewMovie({ ...newMovie, thumbnail: e.target.value })}
                disabled={moviesLoading}
              />
            </div>

            <button type="submit" disabled={moviesLoading} className="add-btn">
              {moviesLoading ? 'Adding...' : 'Add Movie'}
            </button>
          </form>

          {moviesMessage && (
            <div className={`message ${moviesMessage.includes('✅') ? 'success' : 'error'}`}>
              {moviesMessage}
            </div>
          )}
        </section>

        {/* Movies List Section */}
        <section className="movies-list-section">
          <h2>📋 Available Movies ({movies.length})</h2>

          {movies.length === 0 ? (
            <p className="no-movies">No movies added yet. Add one above!</p>
          ) : (
            <div className="movies-table">
              <div className="table-header">
                <div className="col-name">Movie Name</div>
                <div className="col-url">Stream URL</div>
                <div className="col-date">Added</div>
                <div className="col-action">Action</div>
              </div>

              {movies.map((movie) => (
                <div key={movie.id} className="table-row">
                  <div className="col-name">
                    <strong>{movie.name}</strong>
                  </div>
                  <div className="col-url">
                    <a href={movie.url} target="_blank" rel="noopener noreferrer" className="url-link">
                      {new URL(movie.url).hostname}
                    </a>
                  </div>
                  <div className="col-date">
                    {new Date(movie.createdAt).toLocaleDateString()}
                  </div>
                  <div className="col-action">
                    <button
                      onClick={() => handleDeleteMovie(movie.id)}
                      className="delete-btn"
                      disabled={moviesLoading}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Movies Preview */}
        <section className="preview-section">
          <h2>👀 Movies Preview</h2>
          <p>Movies will appear in this order on the movies page:</p>
          <div className="preview-list">
            {movies.map((movie) => (
              <div key={movie.id} className="preview-card">
                {movie.thumbnail && (
                  <img src={movie.thumbnail} alt={movie.name} className="preview-thumb" />
                )}
                <div className="preview-info">
                  <h3>{movie.name}</h3>
                  <button className="preview-play-btn">▶ Watch Movie</button>
                </div>
              </div>
            ))}
          </div>
        </section>
        </>
        )}
      </div>
    </div>
  );
}
