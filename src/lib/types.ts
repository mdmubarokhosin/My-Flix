// ===== Telegram Types =====
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

// ===== Firebase RTDB Data Types =====
// These match the exact structure stored in Firebase Realtime Database

export interface Episode {
  episodeNumber: number;
  name: string;
  url: string;
  thumbnail?: string;
  duration?: string;
}

export interface Season {
  seasonNumber: number;
  name: string;
  episodes: Episode[];
}

export interface Video {
  id: string;
  name: string;
  url: string;
  img?: string;
  thumbnail?: string;
  amount: number;
  time?: string;
  duration?: string;
  tag?: string;
  tags?: string;
  info?: string[];
  createdAt: number;
  tmdbId?: number;
  year?: string;
  language?: string;
  quality?: string;
  contentType?: 'movie' | 'series';
  seasons?: Season[];
  totalSeasons?: number;
  totalEpisodes?: number;
  firstAirDate?: string;
  imdbId?: string;
  importSource?: 'tmdb' | 'imdb';
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface AppUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  balance: number;
  isBanned?: boolean;
  purchased: string[];
  favorites: string[];
  lastCheckIn: string | null;
  streak: number;
  adWatchedToday: number;
  lastAdDate: string | null;
  transactions: UserTransaction[];
  giftHistory: GiftHistoryEntry[];
  createdAt: number;
  theme?: string;
}

export interface UserTransaction {
  type: 'earn' | 'spend' | 'redeem' | 'gift' | 'admin' | 'checkin' | 'purchase';
  title: string;
  amount: number;
  time: number;
}

export interface GiftHistoryEntry {
  code: string;
  amount: number;
  time: number;
}

export interface GiftCode {
  id: string;
  amount: number;
  package: string;
  status: 'active' | 'used';
  redeemedBy?: string;
  redeemedAt?: number;
  createdAt: number;
}

export interface ShortVideo {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  views: number;
  createdAt: number;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  popular?: boolean;
  createdAt: number;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  packageId: string;
  packageName: string;
  coins: number;
  amount: number;
  paymentkey: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  completedAt?: number;
}

export interface Settings {
  categories: Category[];
  adminPassword: string;
  tmdbApiKey?: string;
  imdbApiKey?: string;
  adsNotice?: string;
  bohudurApiKey?: string;
  defaultLanguage?: string;
  coinsPerAd?: number;
  telegramBotToken?: string;
}

export interface TvChannel {
  id: string;
  name: string;
  url: string;          // m3u8 stream URL
  logo?: string;       // channel logo URL
  order: number;       // display order
  active: boolean;     // whether channel is live/active
  genre?: string;      // e.g. Sports, News, Entertainment
  language?: string;   // e.g. English, Bangla, Hindi
  country?: string;    // e.g. USA, BD, UK
  views: number;       // total view count
  createdAt: number;
}

export interface AppNotification {
  id: string;
  type: 'alert' | 'action'; // টাইপ ১: alert (শুধু OK), টাইপ ২: action (Cancel + Visit)
  title: string;
  message: string;
  link?: string; // টাইপ ২ তে এই লিংকে নিয়ে যাবে
  targetUserId?: string | null; // null = সব ইউজার, নির্দিষ্ট ID = নির্দিষ্ট ইউজার
  createdAt: number;
  createdBy: string; // admin
}

export interface AdminStats {
  totalVideos: number;
  totalUsers: number;
  totalGiftCodes: number;
  activeGiftCodes: number;
  totalCoinsInCirculation: number;
}

export type AppPage =
  | 'home'
  | 'player'
  | 'search'
  | 'shorts'
  | 'earn'
  | 'redeem'
  | 'profile'
  | 'favorites'
  | 'admin'
  | 'category-detail'
  | 'series-detail'
  | 'live-tv';

// ===== Frontend-only types =====

export interface Favorite {
  id: string;
  userId: string;
  videoId: string;
  video?: Video;
}

export interface Purchase {
  id: string;
  userId: string;
  videoId: string;
  coins: number;
  video?: Video;
}

// ===== TMDB Types =====

export interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  tagline?: string;
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: TmdbGenre[];
  poster_path: string | null;
  backdrop_path: string | null;
  production_companies: { id: number; name: string; logo_path: string | null }[];
  spoken_languages: { english_name: string; iso_639_1: string }[];
  status: string;
  budget: number;
  revenue: number;
  imdb_id?: string;
  credits?: TmdbCredits;
  images?: TmdbImages;
  videos?: TmdbVideosResponse;
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  tagline?: string;
  first_air_date: string;
  last_air_date?: string;
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: TmdbGenre[];
  poster_path: string | null;
  backdrop_path: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: TmdbTvSeason[];
  status: string;
  created_by: { id: number; name: string; profile_path: string | null }[];
  networks: { id: number; name: string; logo_path: string | null }[];
  credits?: TmdbCredits;
  images?: TmdbImages;
  videos?: TmdbVideosResponse;
}

export interface TmdbTvSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  overview: string;
  air_date: string;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbImage {
  file_path: string;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
  aspect_ratio: number;
  height: number;
  width: number;
}

export interface TmdbImages {
  backdrops: TmdbImage[];
  posters: TmdbImage[];
}

export interface ImdbDetails {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  totalSeasons?: string;
}

export interface TmdbSearchResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  popularity: number;
  media_type?: string;
}

export interface TmdbTvSearchResult {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  popularity: number;
  genre_ids?: number[];
  origin_country?: string[];
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface TmdbVideosResponse {
  results: TmdbVideo[];
}

// Default categories from original project
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'hindi', name: 'Hindi', icon: 'bi bi-translate' },
  { id: 'bangla', name: 'Bangla', icon: 'bi bi-globe' },
  { id: 'action', name: 'Action', icon: 'bi bi-lightning-charge-fill' },
  { id: 'comedy', name: 'Comedy', icon: 'bi bi-emoji-laughing-fill' },
  { id: 'romantic', name: 'Romantic', icon: 'bi bi-heart-fill' },
  { id: 'horror', name: 'Horror', icon: 'bi bi-emoji-dizzy-fill' },
  { id: 'anime', name: 'Anime', icon: 'bi bi-stars' },
  { id: 'cartoon', name: 'Cartoon', icon: 'bi bi-controller' },
  { id: 'web-series', name: 'Web Series', icon: 'bi bi-tv-fill' },
  { id: 'viral', name: 'Viral', icon: 'bi bi-fire' },
];
