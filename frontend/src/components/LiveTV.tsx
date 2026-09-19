import { useState, useEffect, useRef, useCallback } from 'react';

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
  const [showChannelList, setShowChannelList] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = () => /iPhone|iPad|Android|webOS|BlackBerry/i.test(navigator.userAgent);

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
              const nameMatch = line.match(/,(.+?)$/);
              const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

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

  // Filter channels by search query and language
  useEffect(() => {
    let filtered = [...channels];

    // Filter by language first
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(ch => ch.language === selectedLanguage);
    }

    // Then filter by search query
    if (searchQuery && searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(ch =>
        ch.name.toLowerCase().includes(query) ||
        (ch.country && ch.country.toLowerCase().includes(query))
      );
    }

    setFilteredChannels(filtered);
  }, [searchQuery, selectedLanguage, channels]);

  // Normalize channel name for URL: lowercase, spaces to dashes, remove special chars
  const normalizeChannelName = useCallback((name: string) =>
    name.toLowerCase()
      .replace(/\s+/g, '-')           // spaces to dashes
      .replace(/[()]/g, '')            // remove parentheses
      .replace(/-+/g, '-'),            // collapse multiple dashes
    []
  );

  // Play channel and update URL
  const playChannel = (channel: Channel) => {
    setSelectedChannel(channel);

    // Update URL for direct access
    const channelPath = normalizeChannelName(channel.name);
    window.history.pushState(null, '', `/livetv/${encodeURIComponent(channelPath)}`);

    if (videoRef.current) {
      videoRef.current.src = channel.url;
      videoRef.current.play().catch(() => {
        console.log('Playback failed');
      });
    }

    // On mobile, hide channel list to focus on video
    if (isMobile()) {
      setShowChannelList(false);
    }
  };

  // Auto-play direct channel from URL
  useEffect(() => {
    if (directChannel && channels.length > 0) {
      const normalizedDirectChannel = normalizeChannelName(directChannel);

      const channel = channels.find(ch =>
        normalizeChannelName(ch.name) === normalizedDirectChannel
      );

      if (channel) {
        // Auto-select and play the channel
        setSelectedChannel(channel);

        const channelPath = normalizeChannelName(channel.name);
        window.history.pushState(null, '', `/livetv/${encodeURIComponent(channelPath)}`);

        if (videoRef.current) {
          videoRef.current.src = channel.url;
          videoRef.current.play().catch(() => {
            console.log('Playback failed');
          });
        }

        if (isMobile()) {
          setShowChannelList(false);
        }
      }
    }
  }, [directChannel, channels, normalizeChannelName]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B1220',
        color: '#F8FAFC',
        fontSize: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px',
            animation: 'spin 2s linear infinite'
          }}>📺</div>
          <p>Loading Live TV Channels...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const mobile = isMobile();

  if (mobile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0B1220',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '10px'
      }}>
        {/* Mobile Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #111A2E 0%, #1a3a5f 100%)',
          borderBottom: '2px solid #2563EB',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>📺 Live TV</h1>
          {!showChannelList && (
            <button
              onClick={() => setShowChannelList(true)}
              style={{
                padding: '6px 12px',
                background: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              📋 Channels
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                background: '#EF4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Video Player - Always visible */}
        {selectedChannel ? (
          <div style={{
            width: '100%',
            aspectRatio: '16/9',
            background: '#000',
            overflow: 'hidden',
            borderBottom: '2px solid #2563EB'
          }}>
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                background: '#000'
              }}
            />
          </div>
        ) : (
          <div style={{
            width: '100%',
            aspectRatio: '16/9',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '2px solid #2563EB'
          }}>
            <div style={{ textAlign: 'center', color: '#AAB4C8', fontSize: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📺</div>
              <div>Select a channel to play</div>
            </div>
          </div>
        )}

        {/* Channel Info - Below video when playing */}
        {selectedChannel && (
          <div style={{
            padding: '12px 16px',
            background: '#111A2E',
            borderBottom: '1px solid #1e3a5f'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
              ▶ {selectedChannel.name}
            </div>
            <div style={{ fontSize: '11px', color: '#AAB4C8', lineHeight: '1.4' }}>
              {selectedChannel.language && <div>🗣️ {selectedChannel.language}</div>}
              {selectedChannel.country && <div>🌍 {selectedChannel.country}</div>}
            </div>
          </div>
        )}

        {/* Channels List - Toggleable on mobile */}
        {showChannelList && (
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px 16px',
            paddingBottom: '80px'
          }}>
            {/* Filters */}
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
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />

            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '12px',
                background: '#0B1220',
                border: '1px solid #2563EB',
                borderRadius: '6px',
                color: '#F8FAFC',
                fontSize: '14px',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              {languages.map(lang => (
                <option key={lang} value={lang}>
                  {lang === 'all' ? '🌍 All Languages' : `🗣️ ${lang}`}
                </option>
              ))}
            </select>

            <div style={{
              fontSize: '12px',
              color: '#AAB4C8',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #1e3a5f'
            }}>
              Found: <strong>{filteredChannels.length}</strong> channels
            </div>

            {/* Channel Buttons */}
            {filteredChannels.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#AAB4C8', padding: '20px' }}>
                No channels found
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {filteredChannels.map((channel, idx) => (
                  <button
                    key={idx}
                    onClick={() => playChannel(channel)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: selectedChannel?.url === channel.url ? '#2563EB' : '#0B1220',
                      border: selectedChannel?.url === channel.url ? '2px solid #2563EB' : '1px solid #1e3a5f',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '13px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedChannel?.url !== channel.url) {
                        e.currentTarget.style.background = '#1a3a5f';
                        e.currentTarget.style.borderColor = '#2563EB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedChannel?.url !== channel.url) {
                        e.currentTarget.style.background = '#0B1220';
                        e.currentTarget.style.borderColor = '#1e3a5f';
                      }
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>▶ {channel.name}</div>
                    <div style={{ fontSize: '11px', color: '#AAB4C8' }}>
                      {channel.language} {channel.country && `• ${channel.country}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop Layout
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

      {/* Desktop Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '350px 1fr',
        gap: '20px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
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

          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '15px',
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

          <div style={{
            fontSize: '12px',
            color: '#AAB4C8',
            marginBottom: '10px'
          }}>
            Found: <strong>{filteredChannels.length}</strong> channels
          </div>

          {/* Channel List Scroll */}
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
                      e.currentTarget.style.background = '#1a3a5f';
                      e.currentTarget.style.borderColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChannel?.url !== channel.url) {
                      e.currentTarget.style.background = '#0B1220';
                      e.currentTarget.style.borderColor = '#1e3a5f';
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
          {/* Video */}
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
              <li>Direct access: /livetv/channel-name</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
