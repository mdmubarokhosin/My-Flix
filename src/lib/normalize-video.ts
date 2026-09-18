import type { Video, Season, Episode, DownloadLink } from './types';

/**
 * Normalize a raw Firebase RTDB video record into a fully-typed `Video`
 * object that includes ALL fields — including the new downloadLinks,
 * director, genres, cast, rating, backdrops, imdbId, importSource fields.
 *
 * Use this everywhere we read a video from Firebase so that newly-added
 * fields are not silently dropped.
 */
export function normalizeVideo(
  raw: Record<string, unknown> | null | undefined,
  id: string,
): Video | null {
  if (!raw) return null;

  // Helper: read string with fallback.
  const str = (key: string, fallback = ''): string =>
    typeof raw[key] === 'string' ? (raw[key] as string) : fallback;

  // Helper: read string-or-array-of-strings as string[].
  const strArr = (key: string): string[] | undefined => {
    const v = raw[key];
    if (Array.isArray(v)) {
      return v.filter((s): s is string => typeof s === 'string');
    }
    if (typeof v === 'string' && v) return [v];
    return undefined;
  };

  // Seasons + episodes
  let seasons: Season[] | undefined;
  if (Array.isArray(raw.seasons)) {
    seasons = (raw.seasons as Record<string, unknown>[])
      .filter((s) => !!s && typeof s === 'object')
      .map((s): Season => {
        const episodes: Episode[] = Array.isArray(s.episodes)
          ? (s.episodes as Record<string, unknown>[])
              .filter((e) => !!e && typeof e === 'object')
              .map((e): Episode => {
                const ep: Episode = {
                  episodeNumber: Number(e.episodeNumber) || 1,
                  name: typeof e.name === 'string' ? e.name : '',
                  url: typeof e.url === 'string' ? e.url : '',
                };
                if (typeof e.thumbnail === 'string' && e.thumbnail) ep.thumbnail = e.thumbnail;
                if (typeof e.duration === 'string' && e.duration) ep.duration = e.duration;
                if (Array.isArray(e.downloadLinks)) {
                  ep.downloadLinks = e.downloadLinks.filter(
                    (l): l is DownloadLink =>
                      !!l && typeof l === 'object' &&
                      typeof (l as { label?: string }).label === 'string' &&
                      typeof (l as { url?: string }).url === 'string',
                  );
                }
                return ep;
              })
          : [];
        return {
          seasonNumber: Number(s.seasonNumber) || 1,
          name: typeof s.name === 'string' ? s.name : 'Season',
          episodes,
        };
      });
  }

  // Download links (video-level)
  let downloadLinks: DownloadLink[] | undefined;
  if (Array.isArray(raw.downloadLinks)) {
    downloadLinks = (raw.downloadLinks as unknown[]).filter(
      (l): l is DownloadLink =>
        !!l && typeof l === 'object' &&
        typeof (l as { label?: string }).label === 'string' &&
        typeof (l as { url?: string }).url === 'string',
    );
    if (downloadLinks.length === 0) downloadLinks = undefined;
  }

  // Build the base video object.
  const video: Video = {
    id,
    name: str('name'),
    url: str('url'),
    img: str('img') || str('thumbnail'),
    thumbnail: str('thumbnail') || str('img'),
    amount: Number(raw.amount) || 0,
    time: str('time') || str('duration'),
    duration: str('duration') || str('time'),
    tag: str('tag') || str('tags'),
    tags: str('tags') || str('tag'),
    info: strArr('info') ?? [],
    createdAt: Number(raw.createdAt) || 0,
  };

  // Optional numeric / string fields.
  if (raw.tmdbId !== undefined && raw.tmdbId !== null && raw.tmdbId !== '') {
    const n = Number(raw.tmdbId);
    if (!isNaN(n)) video.tmdbId = n;
  }
  const year = str('year', '');
  if (year) video.year = year;
  const language = str('language', '');
  if (language) video.language = language;
  const quality = str('quality', '');
  if (quality) video.quality = quality;
  if (raw.contentType === 'movie' || raw.contentType === 'series') {
    video.contentType = raw.contentType;
  }
  const imdbId = str('imdbId', '');
  if (imdbId) video.imdbId = imdbId;
  if (raw.importSource === 'tmdb' || raw.importSource === 'imdb') {
    video.importSource = raw.importSource;
  }
  const director = str('director', '');
  if (director) video.director = director;
  if (raw.rating !== undefined && raw.rating !== null && raw.rating !== '') {
    const r = Number(raw.rating);
    if (!isNaN(r) && r >= 0 && r <= 10) video.rating = r;
  }
  const genres = strArr('genres');
  if (genres) video.genres = genres;
  const cast = strArr('cast');
  if (cast) video.cast = cast;
  const backdrops = strArr('backdrops');
  if (backdrops) video.backdrops = backdrops;
  if (downloadLinks) video.downloadLinks = downloadLinks;

  if (seasons) {
    video.seasons = seasons;
    video.totalSeasons = typeof raw.totalSeasons === 'number'
      ? raw.totalSeasons
      : seasons.length;
    video.totalEpisodes = typeof raw.totalEpisodes === 'number'
      ? raw.totalEpisodes
      : seasons.reduce((sum, s) => sum + (s.episodes?.length || 0), 0);
  }
  const firstAirDate = str('firstAirDate', '');
  if (firstAirDate) video.firstAirDate = firstAirDate;

  return video;
}
