import { useState, useEffect } from 'react';
import './GamesList.css';
import ScrollingNotice from './ScrollingNotice';
import { SmallBannerAd, MobileBannerAd } from './Ads';
import LazyAdLoader from './components/LazyAdLoader';

interface Game {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

interface GamesListProps {
  onSelectGame: (game: Game) => void;
}

export default function GamesList({ onSelectGame }: GamesListProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:1406';
      const response = await fetch(`${apiUrl}/api/games/list`);
      const data = await response.json();
      if (data.success) {
        setGames(data.games);
      } else {
        setError(data.message || 'Failed to load games');
      }
    } catch (err) {
      setError('Error loading games: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="games-list-container">
        <div className="loading">⏳ Loading games...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="games-list-container">
        <div className="error">❌ {error}</div>
        <button onClick={fetchGames} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="games-list-container">
        <div className="no-games">
          <h2>🎮 No Games Available</h2>
          <p>Come back soon!</p>
        </div>
      </div>
    );
  }

  const isMobile = /iPhone|iPad|Android|webOS|BlackBerry/i.test(navigator.userAgent);

  return (
    <div className="games-list-wrapper">
      <ScrollingNotice educationMode={true} />
      {isMobile && <LazyAdLoader adKey="1029ff22b684cfa96772119d5a4a7e73" width={320} height={50} />}
      <div className="games-list-container">
        <div className="games-list-header">
          <h1>🎮 Play Games</h1>
          <a href="/" className="back-home-btn">🏠 Home</a>
        </div>
      <p className="games-count">Available: {games.length} game{games.length !== 1 ? 's' : ''}</p>

      <div className="games-grid">
        {games.map((game) => (
          <div key={game.id} className="game-card">
            <div className="game-card-image">
              {game.thumbnail ? (
                <img src={game.thumbnail} alt={game.name} />
              ) : (
                <div className="no-image">🎮</div>
              )}
              <div className="game-card-overlay">
                <button
                  onClick={() => onSelectGame(game)}
                  className="play-button"
                >
                  ▶ PLAY NOW
                </button>
              </div>
            </div>
            <div className="game-card-info">
              <h3>{game.name}</h3>
              <p className="game-id">ID: {game.id.substring(0, 8)}</p>
            </div>
          </div>
        ))}
      </div>
      </div>
      {isMobile && <LazyAdLoader adKey="1029ff22b684cfa96772119d5a4a7e73" width={320} height={50} />}
    </div>
  );
}
