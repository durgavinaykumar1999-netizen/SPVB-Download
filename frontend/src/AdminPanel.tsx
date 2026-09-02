import { useState, useEffect, useCallback } from 'react';
import './AdminPanel.css';

interface Game {
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
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [newGame, setNewGame] = useState({ name: '', url: '', thumbnail: '' });
  const [message, setMessage] = useState('');

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

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

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

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🎮 Games Admin Panel</h1>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-content">
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
      </div>
    </div>
  );
}
