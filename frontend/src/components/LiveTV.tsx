import { useState, useEffect, useRef } from 'react';

interface Channel {
  name: string;
  url: string;
  language?: string;
  country?: string;
  group?: string;
}

interface LiveTVProps {
  onClose?: () => void;
  directChannel?: string;
}

export default function LiveTV({ onClose, directChannel }: LiveTVProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load IPTV channels
  useEffect(() => {
    const loadChannels = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://iptv-org.github.io/iptv/index.m3u');
        const data = await response.text();
        const lines = data.split('\n');

        const parsedChannels: Channel[] = [];
        const langs = new Set<string>();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (line.startsWith('#EXTINF:')) {
            const nextLine = (lines[i + 1] || '').trim();

            if (nextLine.startsWith('http')) {
              // Extract channel name
              const nameMatch = line.match(/,(.+?)$/);
              const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

              // Extract language from line attributes
              const langMatch = line.match(/tvg-language="([^"]+)"/);
              const language = langMatch ? langMatch[1].trim() : 'Unknown';

              const countryMatch = line.match(/tvg-country="([^"]+)"/);
              const country = countryMatch ? countryMatch[1].trim() : '';

              const groupMatch = line.match(/group-title="([^"]+)"/);
              const group = groupMatch ? groupMatch[1].trim() : 'General';

              if (language !== 'Unknown') {
                langs.add(language);
              }

              parsedChannels.push({
                name,
                url: nextLine,
                language,
                country,
                group
              });
            }
          }
        }

        setChannels(parsedChannels);
        setFilteredChannels(parsedChannels);
        setLanguages(['all', ...Array.from(langs).sort()]);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load channels:', error);
        setLoading(false);
      }
    };

    loadChannels();
  }, []);

  // Filter channels
  useEffect(() => {
    let filtered = channels;

    // Filter by language
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(ch => ch.language === selectedLanguage);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(ch =>
        ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ch.country && ch.country.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredChannels(filtered);
  }, [searchQuery, selectedLanguage, channels]);

  // Play channel
  const playChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    if (videoRef.current) {
      videoRef.current.src = channel.url;
      videoRef.current.play().catch(() => {
        console.log('Playback failed - trying alternative method');
      });
    }
  };

  // Auto-play direct channel from URL
  useEffect(() => {
    if (directChannel && channels.length > 0) {
      const channel = channels.find(ch =>
        ch.name.toLowerCase().replace(/\s+/g, '-') === directChannel.toLowerCase()
      );
      if (channel) {
        playChannel(channel);
      }
    }
  }, [directChannel, channels]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B1220',
        color: '#F8FAFC'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ marginBottom: '20px' }}></div>
          <p>Loading Live TV Channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B1220',
      color: '#F8FAFC',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '20px',
        background: 'linear-gradient(135deg, #111A2E 0%, #1a3a5f 100%)',
        borderRadius: '8px',
        borderBottom: '2px solid #2563EB'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>📺 Live TV</h1>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ✕ Close
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* LEFT: Channel List */}
        <div style={{
          background: '#111A2E',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #1e3a5f',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
          overflow: 'hidden'
        }}>
          {/* Filters */}
          <div style={{ marginBottom: '15px' }}>
            {/* Search */}
            <input
              type="text"
              placeholder="🔍 Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                background: '#0B1220',
                border: '1px solid #2563EB',
                borderRadius: '6px',
                color: '#F8FAFC',
                fontSize: '14px'
              }}
            />

            {/* Language Filter */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#0B1220',
                border: '1px solid #2563EB',
                borderRadius: '6px',
                color: '#F8FAFC',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {languages.map(lang => (
                <option key={lang} value={lang}>
                  {lang === 'all' ? '🌍 All Languages' : `🗣️ ${lang}`}
                </option>
              ))}
            </select>
          </div>

          {/* Channel Count */}
          <div style={{
            fontSize: '12px',
            color: '#AAB4C8',
            marginBottom: '10px'
          }}>
            Found: <strong>{filteredChannels.length}</strong> channels
          </div>

          {/* Channels Scroll */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            borderTop: '1px solid #1e3a5f',
            paddingTop: '10px'
          }}>
            {filteredChannels.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#AAB4C8', padding: '20px' }}>
                No channels found
              </div>
            ) : (
              filteredChannels.map((channel, idx) => (
                <button
                  key={idx}
                  onClick={() => playChannel(channel)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '8px',
                    background: selectedChannel?.url === channel.url ? '#2563EB' : '#0B1220',
                    border: selectedChannel?.url === channel.url ? '2px solid #2563EB' : '1px solid #1e3a5f',
                    borderRadius: '6px',
                    color: '#F8FAFC',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    fontSize: '13px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChannel?.url !== channel.url) {
                      (e.target as HTMLElement).style.background = '#1a3a5f';
                      (e.target as HTMLElement).style.borderColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChannel?.url !== channel.url) {
                      (e.target as HTMLElement).style.background = '#0B1220';
                      (e.target as HTMLElement).style.borderColor = '#1e3a5f';
                    }
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>▶ {channel.name}</div>
                  <div style={{ fontSize: '11px', color: '#AAB4C8' }}>
                    🗣️ {channel.language} {channel.country && `• 🌍 ${channel.country}`}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Video Player */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {/* Video Player */}
          <div style={{
            background: '#000',
            borderRadius: '8px',
            border: '2px solid #2563EB',
            overflow: 'hidden'
          }}>
            {selectedChannel ? (
              <>
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    background: '#000',
                    display: 'block'
                  }}
                />
                {/* Channel Info */}
                <div style={{
                  padding: '15px',
                  background: '#111A2E',
                  borderTop: '1px solid #1e3a5f'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                    📺 {selectedChannel.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#AAB4C8' }}>
                    <div>🗣️ Language: <strong>{selectedChannel.language}</strong></div>
                    {selectedChannel.country && (
                      <div>🌍 Country: <strong>{selectedChannel.country}</strong></div>
                    )}
                    {selectedChannel.group && (
                      <div>📂 Category: <strong>{selectedChannel.group}</strong></div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                width: '100%',
                aspectRatio: '16/9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                color: '#AAB4C8',
                fontSize: '18px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>📺</div>
                  <div>Select a channel to start watching</div>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{
            background: '#111A2E',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #1e3a5f',
            fontSize: '12px',
            color: '#AAB4C8'
          }}>
            <strong>💡 How to use:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>Search channels by name or country</li>
              <li>Filter by language using dropdown</li>
              <li>Click on any channel to play</li>
              <li>Use video controls (Play, Volume, Fullscreen)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile Responsive */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="display: grid"] {
            display: flex !important;
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
