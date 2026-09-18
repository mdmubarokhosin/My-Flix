'use client';

import { useState, useEffect } from 'react';
import type { Season, Episode, DownloadLink } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Trash2, ChevronDown, ChevronRight, Download, X,
  ArrowUp, ArrowDown, Copy, Tv,
} from 'lucide-react';
import { toast } from 'sonner';

const DOWNLOAD_ICON_OPTIONS = [
  'Download', 'FileVideo', 'HardDriveDownload', 'CloudDownload',
  'Link', 'Link2', 'Film', 'MonitorPlay', 'Disc', 'Package',
];

const emptyDownloadLink: DownloadLink = {
  label: '', icon: 'Download', url: '', quality: '', size: '',
};

interface EpisodeForm {
  episodeNumber: number;
  name: string;
  url: string;
  thumbnail: string;
  duration: string;
  downloadLinks: DownloadLink[];
}

interface SeasonForm {
  seasonNumber: number;
  name: string;
  episodes: EpisodeForm[];
}

interface SeasonManagerProps {
  seasons: Season[];
  onChange: (seasons: Season[]) => void;
}

/**
 * International-standard multi-season manager.
 *
 * Features:
 *  - Add / edit / delete seasons (each with its own number + name)
 *  - Add / edit / delete / reorder episodes within each season
 *  - Per-episode: name, URL, thumbnail, duration, multiple download links
 *  - Per-episode download links: label, icon, quality, size, URL
 *  - Duplicate episode (auto-increments number)
 *  - Auto-increment episode numbers on add
 *  - Collapsible seasons + episodes
 *  - Live episode count + download link count badges
 */
export function SeasonManager({ seasons, onChange }: SeasonManagerProps) {
  const [seasonForms, setSeasonForms] = useState<SeasonForm[]>([]);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(0);
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);

  // Sync from props whenever the incoming seasons change (e.g. when the
  // dialog is opened for a different series).
  useEffect(() => {
    const forms: SeasonForm[] = (seasons || []).map((s) => ({
      seasonNumber: s.seasonNumber || 1,
      name: s.name || `Season ${s.seasonNumber || 1}`,
      episodes: (s.episodes || []).map((e) => ({
        episodeNumber: e.episodeNumber || 1,
        name: e.name || '',
        url: e.url || '',
        thumbnail: e.thumbnail || '',
        duration: e.duration || '',
        downloadLinks: Array.isArray(e.downloadLinks) ? e.downloadLinks : [],
      })),
    }));
    const initial = forms.length > 0
      ? forms
      : [{ seasonNumber: 1, name: 'Season 1', episodes: [] }];
    setSeasonForms(initial);
    setExpandedSeason(0);
    setExpandedEpisode(null);
  }, [seasons]);

  // Push changes up to parent whenever seasonForms change.
  const pushChange = (next: SeasonForm[]) => {
    setSeasonForms(next);
    const out: Season[] = next.map((sf) => ({
      seasonNumber: sf.seasonNumber,
      name: sf.name,
      episodes: sf.episodes.map((ep) => {
        const cleanLinks = (ep.downloadLinks || [])
          .filter((l) => l.url.trim() && l.label.trim())
          .map((l) => ({
            label: l.label.trim(),
            icon: l.icon || 'Download',
            url: l.url.trim(),
            quality: l.quality?.trim() || undefined,
            size: l.size?.trim() || undefined,
          }));
        const epOut: Episode = {
          episodeNumber: ep.episodeNumber,
          name: ep.name,
          url: ep.url,
        };
        if (ep.thumbnail) epOut.thumbnail = ep.thumbnail;
        if (ep.duration) epOut.duration = ep.duration;
        if (cleanLinks.length > 0) epOut.downloadLinks = cleanLinks;
        return epOut;
      }),
    }));
    onChange(out);
  };

  // ---- Season-level operations ----
  const addSeason = () => {
    const nextNum = seasonForms.length > 0
      ? Math.max(...seasonForms.map((s) => s.seasonNumber)) + 1
      : 1;
    const newSeason: SeasonForm = {
      seasonNumber: nextNum,
      name: `Season ${nextNum}`,
      episodes: [],
    };
    const next = [...seasonForms, newSeason];
    pushChange(next);
    setExpandedSeason(next.length - 1);
    toast.success(`Season ${nextNum} added`);
  };

  const updateSeason = (idx: number, field: 'seasonNumber' | 'name', value: string | number) => {
    const next = [...seasonForms];
    (next[idx] as unknown as Record<string, unknown>)[field] = value;
    pushChange(next);
  };

  const removeSeason = (idx: number) => {
    const next = seasonForms.filter((_, i) => i !== idx);
    pushChange(next);
    if (expandedSeason === idx) setExpandedSeason(null);
    toast.success('Season removed');
  };

  // ---- Episode-level operations ----
  const addEpisode = (seasonIdx: number) => {
    const next = [...seasonForms];
    const eps = next[seasonIdx].episodes;
    const nextNum = eps.length > 0 ? Math.max(...eps.map((e) => e.episodeNumber)) + 1 : 1;
    eps.push({
      episodeNumber: nextNum,
      name: '',
      url: '',
      thumbnail: '',
      duration: '',
      downloadLinks: [],
    });
    pushChange(next);
    setExpandedEpisode(`${seasonIdx}-${eps.length - 1}`);
  };

  const updateEpisode = (seasonIdx: number, epIdx: number, field: keyof EpisodeForm, value: string | number) => {
    const next = [...seasonForms];
    (next[seasonIdx].episodes[epIdx] as unknown as Record<string, unknown>)[field] = value;
    pushChange(next);
  };

  const removeEpisode = (seasonIdx: number, epIdx: number) => {
    const next = [...seasonForms];
    next[seasonIdx].episodes = next[seasonIdx].episodes.filter((_, i) => i !== epIdx);
    pushChange(next);
  };

  const moveEpisode = (seasonIdx: number, epIdx: number, dir: 'up' | 'down') => {
    const next = [...seasonForms];
    const eps = next[seasonIdx].episodes;
    const newIdx = dir === 'up' ? epIdx - 1 : epIdx + 1;
    if (newIdx < 0 || newIdx >= eps.length) return;
    [eps[epIdx], eps[newIdx]] = [eps[newIdx], eps[epIdx]];
    // Renumber sequentially so order matches episode number.
    eps.forEach((e, i) => { e.episodeNumber = i + 1; });
    pushChange(next);
  };

  const duplicateEpisode = (seasonIdx: number, epIdx: number) => {
    const next = [...seasonForms];
    const eps = next[seasonIdx].episodes;
    const orig = eps[epIdx];
    const nextNum = eps.length > 0 ? Math.max(...eps.map((e) => e.episodeNumber)) + 1 : 1;
    const copy: EpisodeForm = {
      episodeNumber: nextNum,
      name: orig.name ? `${orig.name} (copy)` : '',
      url: orig.url,
      thumbnail: orig.thumbnail,
      duration: orig.duration,
      downloadLinks: orig.downloadLinks.map((l) => ({ ...l })),
    };
    eps.push(copy);
    pushChange(next);
    toast.success('Episode duplicated');
  };

  // ---- Episode download-link operations ----
  const addEpisodeDownloadLink = (seasonIdx: number, epIdx: number) => {
    const next = [...seasonForms];
    next[seasonIdx].episodes[epIdx].downloadLinks.push({ ...emptyDownloadLink });
    pushChange(next);
  };

  const updateEpisodeDownloadLink = (
    seasonIdx: number, epIdx: number, linkIdx: number,
    field: keyof DownloadLink, value: string,
  ) => {
    const next = [...seasonForms];
    const links = next[seasonIdx].episodes[epIdx].downloadLinks;
    links[linkIdx] = { ...links[linkIdx], [field]: value };
    pushChange(next);
  };

  const removeEpisodeDownloadLink = (seasonIdx: number, epIdx: number, linkIdx: number) => {
    const next = [...seasonForms];
    next[seasonIdx].episodes[epIdx].downloadLinks =
      next[seasonIdx].episodes[epIdx].downloadLinks.filter((_, i) => i !== linkIdx);
    pushChange(next);
  };

  const totalEpisodes = seasonForms.reduce((sum, s) => sum + s.episodes.length, 0);

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">{seasonForms.length} Season{seasonForms.length !== 1 ? 's' : ''}</Badge>
          <Badge variant="secondary">{totalEpisodes} Episode{totalEpisodes !== 1 ? 's' : ''}</Badge>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSeason}>
          <Plus className="w-3.5 h-3.5 mr-1" />Add Season
        </Button>
      </div>

      {/* Seasons list */}
      <div className="space-y-3">
        {seasonForms.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
            <Tv className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No seasons yet. Click &quot;Add Season&quot; to start.</p>
          </div>
        )}

        {seasonForms.map((season, sIdx) => {
          const isExpanded = expandedSeason === sIdx;
          return (
            <div key={sIdx} className="rounded-xl border overflow-hidden bg-card">
              {/* Season header */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedSeason(isExpanded ? null : sIdx)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 shrink-0" />
                    : <ChevronRight className="w-4 h-4 shrink-0" />
                  }
                  <Badge variant="outline" className="shrink-0">S{season.seasonNumber}</Badge>
                  <span className="text-sm font-medium truncate">{season.name}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {season.episodes.length} ep
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeSeason(sIdx); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Season expanded content */}
              {isExpanded && (
                <div className="p-3 pt-0 space-y-3 border-t">
                  <div className="grid grid-cols-3 gap-2 pt-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Season #</Label>
                      <Input
                        type="number"
                        value={season.seasonNumber}
                        onChange={(e) => updateSeason(sIdx, 'seasonNumber', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Season Name</Label>
                      <Input
                        value={season.name}
                        onChange={(e) => updateSeason(sIdx, 'name', e.target.value)}
                        placeholder="e.g. Season 1, Special Episodes"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Episodes ({season.episodes.length})
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => addEpisode(sIdx)}
                    >
                      <Plus className="w-3 h-3 mr-0.5" />Add Episode
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {season.episodes.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-4 border border-dashed rounded-lg">
                        No episodes in this season yet.
                      </p>
                    )}
                    {season.episodes.map((ep, eIdx) => {
                      const epKey = `${sIdx}-${eIdx}`;
                      const isEpExpanded = expandedEpisode === epKey;
                      return (
                        <div key={eIdx} className="rounded-lg border bg-background">
                          {/* Episode header */}
                          <div
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedEpisode(isEpExpanded ? null : epKey)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isEpExpanded
                                ? <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                                : <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                              }
                              <Badge variant="outline" className="shrink-0 text-[10px]">E{ep.episodeNumber}</Badge>
                              <span className="text-xs font-medium truncate max-w-[180px]">
                                {ep.name || `Episode ${ep.episodeNumber}`}
                              </span>
                              {ep.url && (
                                <Badge variant="outline" className="shrink-0 text-[9px] text-emerald-600 border-emerald-500/40">
                                  URL
                                </Badge>
                              )}
                              {ep.downloadLinks && ep.downloadLinks.length > 0 && (
                                <Badge variant="outline" className="shrink-0 text-[9px] text-emerald-600 border-emerald-500/40">
                                  <Download className="w-2.5 h-2.5 mr-0.5" />{ep.downloadLinks.length}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={eIdx === 0}
                                onClick={(e) => { e.stopPropagation(); moveEpisode(sIdx, eIdx, 'up'); }}
                                title="Move up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={eIdx === season.episodes.length - 1}
                                onClick={(e) => { e.stopPropagation(); moveEpisode(sIdx, eIdx, 'down'); }}
                                title="Move down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); duplicateEpisode(sIdx, eIdx); }}
                                title="Duplicate"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={(e) => { e.stopPropagation(); removeEpisode(sIdx, eIdx); }}
                                title="Delete"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Episode expanded content */}
                          {isEpExpanded && (
                            <div className="p-2 pt-0 space-y-2 border-t">
                              <div className="grid grid-cols-12 gap-2 pt-2">
                                <div className="col-span-12 sm:col-span-2 space-y-1">
                                  <Label className="text-[10px] text-muted-foreground">Episode #</Label>
                                  <Input
                                    type="number"
                                    value={ep.episodeNumber}
                                    onChange={(e) => updateEpisode(sIdx, eIdx, 'episodeNumber', Number(e.target.value))}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="col-span-12 sm:col-span-7 space-y-1">
                                  <Label className="text-[10px] text-muted-foreground">Episode Name</Label>
                                  <Input
                                    value={ep.name}
                                    onChange={(e) => updateEpisode(sIdx, eIdx, 'name', e.target.value)}
                                    placeholder="e.g. The Pilot"
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="col-span-12 sm:col-span-3 space-y-1">
                                  <Label className="text-[10px] text-muted-foreground">Duration</Label>
                                  <Input
                                    value={ep.duration}
                                    onChange={(e) => updateEpisode(sIdx, eIdx, 'duration', e.target.value)}
                                    placeholder="45m"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Streaming URL</Label>
                                <Input
                                  value={ep.url}
                                  onChange={(e) => updateEpisode(sIdx, eIdx, 'url', e.target.value)}
                                  placeholder="https://..."
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Thumbnail URL (optional)</Label>
                                <Input
                                  value={ep.thumbnail}
                                  onChange={(e) => updateEpisode(sIdx, eIdx, 'thumbnail', e.target.value)}
                                  placeholder="https://..."
                                  className="h-8 text-xs"
                                />
                              </div>

                              {/* Per-episode download links */}
                              <div className="pt-2 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                    <Download className="w-3 h-3" /> Download Links
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px]"
                                    onClick={() => addEpisodeDownloadLink(sIdx, eIdx)}
                                  >
                                    <Plus className="w-3 h-3 mr-0.5" />Add Link
                                  </Button>
                                </div>
                                {ep.downloadLinks && ep.downloadLinks.length > 0 && (
                                  <div className="space-y-1.5">
                                    {ep.downloadLinks.map((link, linkIdx) => (
                                      <div key={linkIdx} className="grid grid-cols-12 gap-1.5 p-1.5 rounded border bg-muted/20">
                                        <div className="col-span-12 sm:col-span-3">
                                          <Input
                                            value={link.label}
                                            onChange={(e) => updateEpisodeDownloadLink(sIdx, eIdx, linkIdx, 'label', e.target.value)}
                                            placeholder="Label"
                                            className="text-[11px] h-7"
                                          />
                                        </div>
                                        <div className="col-span-5 sm:col-span-2">
                                          <Select
                                            value={link.icon || 'Download'}
                                            onValueChange={(v) => updateEpisodeDownloadLink(sIdx, eIdx, linkIdx, 'icon', v)}
                                          >
                                            <SelectTrigger className="text-[11px] h-7"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              {DOWNLOAD_ICON_OPTIONS.map((ic) => (
                                                <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="col-span-5 sm:col-span-2">
                                          <Input
                                            value={link.quality || ''}
                                            onChange={(e) => updateEpisodeDownloadLink(sIdx, eIdx, linkIdx, 'quality', e.target.value)}
                                            placeholder="720p"
                                            className="text-[11px] h-7"
                                          />
                                        </div>
                                        <div className="col-span-10 sm:col-span-4">
                                          <Input
                                            value={link.url}
                                            onChange={(e) => updateEpisodeDownloadLink(sIdx, eIdx, linkIdx, 'url', e.target.value)}
                                            placeholder="https://..."
                                            className="text-[11px] h-7"
                                          />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1 flex justify-center items-center">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => removeEpisodeDownloadLink(sIdx, eIdx, linkIdx)}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
