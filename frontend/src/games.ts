export interface Game {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

export const FIVEPLAY_URL = 'https://fiveplay.lol/';
export const GTA3_DESKTOP_URL = 'https://gta3-web.vercel.app/';
export const GTA3_MOBILE_URL = 'https://gta3browser.vercel.app/';
export const GTA3_URL = GTA3_DESKTOP_URL;

export const BUILTIN_GAMES: Game[] = [
  {
    id: 'gta-5',
    name: 'GTA V (FivePlay)',
    url: FIVEPLAY_URL,
    thumbnail: '/fiveplay-thumb.svg',
  },
  {
    id: 'gta-3',
    name: 'GTA III (re3 Web)',
    url: GTA3_URL,
    thumbnail: '/gta3-thumb.svg',
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

export function isGta3Url(url: string): boolean {
  const normalized = normalizeUrl(url);
  return normalized === normalizeUrl(GTA3_DESKTOP_URL) || normalized === normalizeUrl(GTA3_MOBILE_URL);
}

export function isGta3MobileUrl(url: string): boolean {
  return normalizeUrl(url) === normalizeUrl(GTA3_MOBILE_URL);
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
