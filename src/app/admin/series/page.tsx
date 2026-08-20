'use client';

import { useEffect, useState, useCallback } from 'react';
import { getVideos, createVideo, updateVideo, deleteVideo } from '@/lib/admin-api';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Search, Clapperboard, Plus, X, Wand2, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

export default function SeriesPage() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({ name: '', thumbnail: '', img: '', tag: '', tags: '', info: '', tmdbId: '', imdbId: '', year: '', contentType: 'series' as string });

  // TMDB / IMDB import state (for create)
  const [importSource, setImportSource] = useState<'tmdb' | 'imdb'>('tmdb');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Season form state
  const [seasonNum, setSeasonNum] = useState(0);
  const [seasonName, setSeasonName] = useState('');
  const [episodes, setEpisodes] = useState<{ episodeNumber: number; name: string; url: string; thumbnail: string }[]>([]);

  const load = useCallback(async () => {
    try {
      const all = await getVideos();
      setItems(all.filter((v: Video) => v.contentType === 'series'));
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(v => !search || v.name?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setCreateForm({ name: '', thumbnail: '', img: '', tag: '', tags: '', info: '', tmdbId: '', imdbId: '', year: '', contentType: 'series' });
    setSearchQuery('');
    setSearchResults([]);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) { toast.error('Series name is required'); return; }
    setSaving(true);
    try {
      const seasonCount = parseInt(String(createForm.tmdbId)) ? 1 : 1;
      await createVideo({
        ...createForm,
        contentType: 'series',
        info: createForm.info ? createForm.info.split('\n').filter(Boolean) : [],
        tmdbId: createForm.tmdbId ? Number(createForm.tmdbId) : undefined,
        seasons: [{ seasonNumber: 1, name: 'Season 1', episodes: [] }],
        totalSeasons: 1,
        totalEpisodes: 0,
      });
      toast.success('Series created');
      setCreateOpen(false);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const openEdit = (item: Video) => {
    setEditing(item);
    setEditOpen(true);
  };

  const openSeasonManager = (item: Video) => {
    setEditing(item);
    const seasons = item.seasons || [];
    if (seasons.length > 0) {
      setSeasonNum(seasons[0].seasonNumber || 1);
      setSeasonName(seasons[0].name || '');
      setEpisodes(seasons[0].episodes?.map(ep => ({
        episodeNumber: ep.episodeNumber, name: ep.name || '',
        url: ep.url || '', thumbnail: ep.thumbnail || ''
      })) || []);
    } else {
      setSeasonNum(1); setSeasonName('Season 1'); setEpisodes([]);
    }
    setSeasonOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateVideo(editing.id, {
        name: editing.name, tag: editing.tag, tags: editing.tags,
        img: editing.img, thumbnail: editing.thumbnail,
      });
      toast.success('Series updated'); setEditOpen(false); load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleSaveSeasons = async () => {
    if (!editing) return;
    const currentSeasons = [...(editing.seasons || [])];
    const sIdx = currentSeasons.findIndex(s => s.seasonNumber === seasonNum);
    const seasonData = {
      seasonNumber: seasonNum, name: seasonName,
      episodes: episodes.map(ep => ({
        episodeNumber: ep.episodeNumber, name: ep.name,
        url: ep.url, thumbnail: ep.thumbnail || undefined,
      })),
    };
    if (sIdx >= 0) currentSeasons[sIdx] = seasonData;
    else currentSeasons.push(seasonData);
    currentSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);

    setSaving(true);
    try {
      await updateVideo(editing.id, {
        seasons: currentSeasons,
        totalSeasons: currentSeasons.length,
        totalEpisodes: currentSeasons.reduce((sum, s) => sum + (s.episodes?.length || 0), 0),
      });
      toast.success('Seasons updated'); setSeasonOpen(false); load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const addEpisode = () => {
    const num = episodes.length > 0 ? Math.max(...episodes.map(e => e.episodeNumber)) + 1 : 1;
    setEpisodes([...episodes, { episodeNumber: num, name: '', url: '', thumbnail: '' }]);
  };

  const updateEpisode = (idx: number, field: string, value: string | number) => {
    const updated = [...episodes];
    (updated[idx] as any)[field] = value;
    setEpisodes(updated);
  };

  const removeEpisode = (idx: number) => {
    setEpisodes(episodes.filter((_, i) => i !== idx));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteVideo(deleteId); toast.success('Series deleted'); setDeleteOpen(false); setDeleteId(null); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  // TMDB / IMDB Search for series creation
  const handleImportSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      if (importSource === 'tmdb') {
        const isTmdbId = /^\d+$/.test(searchQuery.trim());
        let res: Response;
        if (isTmdbId) {
          res = await fetch(`/api/tmdb?action=tv_details&id=${encodeURIComponent(searchQuery.trim())}`);
        } else {
          res = await fetch(`/api/tmdb?action=search_tv&query=${encodeURIComponent(searchQuery)}`);
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
          toast.error(errData.error || `Failed to fetch TMDB data (${res.status})`);
          return;
        }
        const data = await res.json();
        if (isTmdbId) {
          if (data.name) setSearchResults([data]);
          else toast.error(data.error || 'TV series not found');
        } else {
          if (data.results) setSearchResults(data.results);
          else toast.error(data.error || 'No results found');
        }
      } else {
        const isId = /^tt?\d+$/i.test(searchQuery.trim());
        let res: Response;
        if (isId) {
          res = await fetch(`/api/imdb?action=search_by_id&id=${encodeURIComponent(searchQuery.trim())}`);
        } else {
          res = await fetch(`/api/imdb?action=search&query=${encodeURIComponent(searchQuery.trim())}&type=series`);
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
          toast.error(errData.error || `Failed to fetch IMDB data (${res.status})`);
          return;
        }
        const data = await res.json();
        if (data.error) { toast.error(data.error); return; }
        if (data.Title && !data.Search) {
          setSearchResults([data]);
        } else if (data.Search) {
          setSearchResults(data.Search);
        } else {
          toast.error('No results found');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch data');
    }
    finally { setSearching(false); }
  };

  const applyImportResult = (item: any) => {
    if (importSource === 'tmdb') {
      const seasonCount = item.number_of_seasons || 1;
      setCreateForm(prev => ({
        ...prev,
        name: item.name,
        thumbnail: item.poster_path ? `${TMDB_IMG_BASE}/w500${item.poster_path}` : prev.thumbnail,
        img: item.poster_path ? `${TMDB_IMG_BASE}/w500${item.poster_path}` : prev.img,
        tmdbId: String(item.id),
        imdbId: '',
        year: item.first_air_date ? item.first_air_date.split('-')[0] : '',
        info: item.overview || prev.info,
      }));
      toast.success(`TMDB TV data applied! ${seasonCount} season(s) detected.`);
    } else {
      setCreateForm(prev => ({
        ...prev,
        name: item.Title || prev.name,
        thumbnail: item.Poster && item.Poster !== 'N/A' ? item.Poster : prev.thumbnail,
        img: item.Poster && item.Poster !== 'N/A' ? item.Poster : prev.img,
        tmdbId: '',
        imdbId: item.imdbID || '',
        year: item.Year || '',
        info: item.Plot && item.Plot !== 'N/A' ? item.Plot : prev.info,
      }));
      toast.success('IMDB TV data applied!');
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">TV Series</h2>
          <p className="text-muted-foreground">Manage TV series with seasons and episodes. Import metadata from TMDB or IMDB.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Series</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Series</CardTitle>
          <CardDescription>{filtered.length} series total</CardDescription>
          <div className="relative max-w-sm mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search series..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Series</TableHead>
                <TableHead className="hidden md:table-cell">Seasons</TableHead>
                <TableHead className="hidden sm:table-cell">Episodes</TableHead>
                <TableHead className="hidden lg:table-cell">Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Clapperboard className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No series found</p>
                  </TableCell></TableRow>
                ) : filtered.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {v.thumbnail || v.img ? (
                          <img src={v.thumbnail || v.img} alt="" className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded flex items-center justify-center"><Clapperboard className="w-4 h-4" /></div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">{v.name}</p>
                          <div className="flex items-center gap-1.5">
                            {v.tmdbId && <Badge variant="outline" className="text-[10px] px-1.5 py-0">TMDB:{v.tmdbId}</Badge>}
                            {v.imdbId && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{v.imdbId}</Badge>}
                            <span className="text-xs text-muted-foreground">{v.year || ''}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Badge>{v.totalSeasons || v.seasons?.length || 0}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell">{v.totalEpisodes || v.seasons?.reduce((s, sn) => s + (sn.episodes?.length || 0), 0) || 0}</TableCell>
                    <TableCell className="hidden lg:table-cell"><p className="truncate max-w-[150px] text-xs">{v.tags || v.tag || ''}</p></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openSeasonManager(v)} className="h-8 text-xs">Seasons</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(v.id); setDeleteOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Series Dialog with TMDB/IMDB Import */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Series</DialogTitle><DialogDescription>Create a new TV series. Use Auto-Fill Import to fetch metadata from TMDB or IMDB.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* TMDB / IMDB Import */}
            <div className="md:col-span-2 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Auto-Fill Import</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => { setImportSource('tmdb'); setSearchResults([]); setSearchQuery(''); }} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border-2 ${importSource === 'tmdb' ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-border hover:border-muted-foreground/40 text-muted-foreground'}`}>
                  <Star className="w-3.5 h-3.5" /> TMDB
                </button>
                <button onClick={() => { setImportSource('imdb'); setSearchResults([]); setSearchQuery(''); }} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border-2 ${importSource === 'imdb' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'border-border hover:border-muted-foreground/40 text-muted-foreground'}`}>
                  <Star className="w-3.5 h-3.5" /> IMDB
                </button>
              </div>
              <div className="flex gap-2">
                <Input placeholder={importSource === 'tmdb' ? 'Search TV series name or TMDB ID...' : 'Search name or IMDB ID (e.g. tt31272285)...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleImportSearch()} className="text-sm" />
                <Button variant="outline" size="icon" onClick={handleImportSearch} disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <ScrollArea className="max-h-[200px] mt-2">
                  <div className="space-y-1.5">
                    {searchResults.slice(0, 8).map((m: any, idx: number) => (
                      <button key={m.id || m.imdbID || idx} onClick={() => applyImportResult(m)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left">
                        {importSource === 'tmdb' ? (
                          m.poster_path ? <img src={`${TMDB_IMG_BASE}/w92${m.poster_path}`} alt="" className="w-8 h-12 rounded object-cover shrink-0" /> : <div className="w-8 h-12 rounded bg-muted shrink-0" />
                        ) : (
                          m.Poster && m.Poster !== 'N/A' ? <img src={m.Poster} alt="" className="w-8 h-12 rounded object-cover shrink-0" /> : <div className="w-8 h-12 rounded bg-muted shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium line-clamp-1">{m.name || m.Title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {importSource === 'tmdb'
                              ? `${m.first_air_date?.split('-')[0] || '?'} · ${m.number_of_seasons || '?'}S · ⭐ ${m.vote_average?.toFixed(1) || '?'}`
                              : `${m.Year || '?'} · ${m.totalSeasons ? m.totalSeasons + 'S' : ''} · ⭐ ${m.imdbRating || '?'} · ${m.imdbID || ''}`
                            }
                          </p>
                        </div>
                        <Wand2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
            <Separator className="md:col-span-2" />
            <div className="md:col-span-2 space-y-2"><Label>Name *</Label><Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Series name" /></div>
            <div className="space-y-2"><Label>Thumbnail URL</Label><Input value={createForm.thumbnail} onChange={e => setCreateForm({ ...createForm, thumbnail: e.target.value })} /></div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={createForm.img} onChange={e => setCreateForm({ ...createForm, img: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tags</Label><Input value={createForm.tags} onChange={e => setCreateForm({ ...createForm, tags: e.target.value })} placeholder="drama, thriller" /></div>
            <div className="space-y-2"><Label>Year</Label><Input value={createForm.year} onChange={e => setCreateForm({ ...createForm, year: e.target.value })} /></div>
            <div className="space-y-2"><Label>TMDB ID</Label><Input value={createForm.tmdbId} onChange={e => setCreateForm({ ...createForm, tmdbId: e.target.value })} /></div>
            <div className="space-y-2"><Label>IMDB ID</Label><Input value={createForm.imdbId} onChange={e => setCreateForm({ ...createForm, imdbId: e.target.value })} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Synopsis</Label><Input value={createForm.info} onChange={e => setCreateForm({ ...createForm, info: e.target.value })} placeholder="Brief description..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Series'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Series</DialogTitle><DialogDescription>Update series basic info.</DialogDescription></DialogHeader>
          {editing && <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tags</Label><Input value={editing.tags || editing.tag || ''} onChange={e => setEditing({ ...editing, tags: e.target.value, tag: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Thumbnail</Label><Input value={editing.thumbnail || ''} onChange={e => setEditing({ ...editing, thumbnail: e.target.value })} /></div>
              <div className="space-y-2"><Label>Image</Label><Input value={editing.img || ''} onChange={e => setEditing({ ...editing, img: e.target.value })} /></div>
            </div>
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Season Manager Dialog */}
      <Dialog open={seasonOpen} onOpenChange={setSeasonOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Seasons — {editing?.name}</DialogTitle><DialogDescription>Add, edit or remove episodes for each season.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Season Number</Label><Input type="number" value={seasonNum} onChange={e => setSeasonNum(Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Season Name</Label><Input value={seasonName} onChange={e => setSeasonName(e.target.value)} /></div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-medium">Episodes ({episodes.length})</Label>
              <Button variant="outline" size="sm" onClick={addEpisode}><Plus className="w-3.5 h-3.5 mr-1" />Add Episode</Button>
            </div>
            <div className="space-y-3">
              {episodes.map((ep, idx) => (
                <div key={idx} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Episode {ep.episodeNumber}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEpisode(idx)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder="Episode name" value={ep.name} onChange={e => updateEpisode(idx, 'name', e.target.value)} />
                    <Input placeholder="Video URL" value={ep.url} onChange={e => updateEpisode(idx, 'url', e.target.value)} />
                    <Input placeholder="Thumbnail URL" value={ep.thumbnail} onChange={e => updateEpisode(idx, 'thumbnail', e.target.value)} />
                  </div>
                </div>
              ))}
              {episodes.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No episodes yet. Click &quot;Add Episode&quot; to start.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeasonOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSeasons} disabled={saving}>{saving ? 'Saving...' : 'Save Seasons'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Series?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this series and all its seasons/episodes.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}