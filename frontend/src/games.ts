export interface Game {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

export const FIVEPLAY_URL = 'https://fiveplay.lol/';

export const BUILTIN_GAMES: Game[] = [
  {
    id: 'gta-5',
    name: 'GTA V (FivePlay)',
    url: FIVEPLAY_URL,
    thumbnail: '/fiveplay-thumb.svg',
  },
];

const normalizeUrl = (url: string): string =>
  (url || '').trim().replace(/\/+$/, '').toLowerCase();

const BUILTIN_IDS = new Set(BUILTIN_GAMES.map((game) => game.id));
const BUILTIN_URLS = new Set(BUILTIN_GAMES.map((game) => normalizeUrl(game.url)));

export function isBuiltinGameId(id: string): boolean {
  return BUILTIN_IDS.has(id);
}

export function isFivePlayUrl(url: string): boolean {
  return normalizeUrl(url) === normalizeUrl(FIVEPLAY_URL);
}

export function mergeGames(apiGames: Game[] = []): Game[] {
  const fromApi = apiGames.filter(
    (game) =>
      game &&
      game.id &&
      !BUILTIN_IDS.has(game.id) &&
      !BUILTIN_URLS.has(normalizeUrl(game.url))
  );
  return [...BUILTIN_GAMES, ...fromApi];
}
