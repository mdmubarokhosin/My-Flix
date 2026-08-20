'use client';

import { useEffect, useState, useCallback } from 'react';
import { getVideos, createVideo, updateVideo, deleteVideo } from '@/lib/admin-api';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Film, Wand2, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
  name: '', url: '', img: '', thumbnail: '', amount: 0, tag: '', tags: '',
  duration: '', quality: '', year: '', language: '', contentType: 'movie' as string,
  info: '', tmdbId: '', imdbId: '',
};

type FormData = typeof emptyForm;

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

export default function VideosPage() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // TMDB / IMDB import state
  const [importSource, setImportSource] = useState<'tmdb' | 'imdb'>('tmdb');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getVideos();
      setItems(data);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(v =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.tag?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSearchQuery('');
    setSearchResults([]);
    setDialogOpen(true);
  };

  const openEdit = (item: Video) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '', url: item.url || '', img: item.img || '',
      thumbnail: item.thumbnail || '', amount: item.amount || 0, tag: item.tag || '',
      tags: item.tags || '', duration: item.duration || '', quality: item.quality || '',
      year: item.year || '', language: item.language || '',
      contentType: item.contentType || 'movie', info: (item.info || []).join('\n'),
      tmdbId: item.tmdbId ? String(item.tmdbId) : '',
      imdbId: item.imdbId || '',
    });
    setSearchQuery('');
    setSearchResults([]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      toast.error('Name and URL are required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name, url: form.url, amount: Number(form.amount) || 0,
        img: form.img, thumbnail: form.thumbnail, tag: form.tag, tags: form.tags,
        duration: form.duration, quality: form.quality, year: form.year,
        language: form.language, contentType: form.contentType,
        info: form.info ? form.info.split('\n').filter(Boolean) : [],
        tmdbId: form.tmdbId ? Number(form.tmdbId) : undefined,
        imdbId: form.imdbId || undefined,
      };
      if (editingId) {
        await updateVideo(editingId, payload);
        toast.success('Video updated');
      } else {
        await createVideo(payload);
        toast.success('Video created');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteVideo(deleteId);
      toast.success('Video deleted');
      setDeleteOpen(false);
      setDeleteId(null);
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  // TMDB / IMDB Search
  const handleImportSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      if (importSource === 'tmdb') {
        const isTmdbId = /^\d+$/.test(searchQuery.trim());
        let res: Response;
        if (isTmdbId) {
          res = await fetch(`/api/tmdb?action=details&id=${encodeURIComponent(searchQuery.trim())}`);
        } else {
          res = await fetch(`/api/tmdb?action=search&query=${encodeURIComponent(searchQuery)}`);
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
          toast.error(errData.error || `Failed to fetch TMDB data (${res.status})`);
          return;
        }
        const data = await res.json();
        if (isTmdbId) {
          if (data.title) setSearchResults([data]);
          else toast.error(data.error || 'Movie not found');
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
          res = await fetch(`/api/imdb?action=search&query=${encodeURIComponent(searchQuery.trim())}&type=movie`);
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
      setForm(prev => ({
        ...prev,
        name: item.title,
        thumbnail: item.poster_path ? `${TMDB_IMG_BASE}/w500${item.poster_path}` : prev.thumbnail,
        img: item.poster_path ? `${TMDB_IMG_BASE}/w500${item.poster_path}` : prev.img,
        tmdbId: String(item.id),
        imdbId: '',
        year: item.release_date ? item.release_date.split('-')[0] : '',
        info: item.overview ? item.overview : prev.info,
        language: item.original_language || prev.language,
      }));
      toast.success('TMDB data applied!');
    } else {
      setForm(prev => ({
        ...prev,
        name: item.Title || prev.name,
        thumbnail: item.Poster && item.Poster !== 'N/A' ? item.Poster : prev.thumbnail,
        img: item.Poster && item.Poster !== 'N/A' ? item.Poster : prev.img,
        tmdbId: '',
        imdbId: item.imdbID || '',
        year: item.Year || '',
        info: item.Plot && item.Plot !== 'N/A' ? item.Plot : prev.info,
        quality: item.Rated && item.Rated !== 'N/A' ? item.Rated : prev.quality,
      }));
      toast.success('IMDB data applied!');
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const movies = filtered.filter(v => v.contentType !== 'series');

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Videos</h2>
          <p className="text-muted-foreground">Manage your movie collection. Import from TMDB or IMDB.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Add Video
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Movies</CardTitle>
          <CardDescription>{movies.length} movie(s) total</CardDescription>
          <div className="relative max-w-sm mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search videos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Coins</TableHead>
                  <TableHead className="hidden lg:table-cell">Quality</TableHead>
                  <TableHead className="hidden lg:table-cell">Language</TableHead>
                  <TableHead className="hidden sm:table-cell">Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movies.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Film className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No videos found</p>
                  </TableCell></TableRow>
                ) : movies.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {v.thumbnail || v.img ? (
                          <img src={v.thumbnail || v.img} alt="" className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded flex items-center justify-center"><Film className="w-4 h-4" /></div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">{v.name}</p>
                          <div className="flex items-center gap-1.5">
                            {v.tmdbId && <Badge variant="outline" className="text-[10px] px-1.5 py-0">TMDB:{v.tmdbId}</Badge>}
                            {v.imdbId && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{v.imdbId}</Badge>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="secondary">{v.amount || 0} coins</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell">{v.quality || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{v.language || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{v.year || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Video' : 'Add Video'}</DialogTitle><DialogDescription>{editingId ? 'Update video details below.' : 'Add a new movie. Use Auto-Fill Import to fetch data from TMDB or IMDB.'}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* TMDB / IMDB Import Section */}
            <div className="md:col-span-2 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Auto-Fill Import</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => { setImportSource('tmdb'); setSearchResults([]); setSearchQuery(''); }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border-2 ${importSource === 'tmdb' ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-border hover:border-muted-foreground/40 text-muted-foreground'}`}
                >
                  <Star className="w-3.5 h-3.5" /> TMDB
                </button>
                <button
                  onClick={() => { setImportSource('imdb'); setSearchResults([]); setSearchQuery(''); }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border-2 ${importSource === 'imdb' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'border-border hover:border-muted-foreground/40 text-muted-foreground'}`}
                >
                  <Star className="w-3.5 h-3.5" /> IMDB
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={importSource === 'tmdb' ? 'Search movie name or TMDB ID...' : 'Search name or IMDB ID (e.g. tt31272285)...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleImportSearch()}
                  className="text-sm"
                />
                <Button variant="outline" size="icon" onClick={handleImportSearch} disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <ScrollArea className="max-h-[200px] mt-2">
                  <div className="space-y-1.5">
                    {searchResults.slice(0, 8).map((m: any, idx: number) => (
                      <button key={m.id || m.imdbID || idx} onClick={() => applyImportResult(m)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left">
                        {importSource === 'tmdb' ? (
                          m.poster_path ? (
                            <img src={`${TMDB_IMG_BASE}/w92${m.poster_path}`} alt="" className="w-8 h-12 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-12 rounded bg-muted shrink-0" />
                          )
                        ) : (
                          m.Poster && m.Poster !== 'N/A' ? (
                            <img src={m.Poster} alt="" className="w-8 h-12 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-12 rounded bg-muted shrink-0" />
                          )
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium line-clamp-1">{m.title || m.Title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {importSource === 'tmdb'
                              ? `${m.release_date?.split('-')[0] || '?'} · ⭐ ${m.vote_average?.toFixed(1) || '?'}${m.imdbID ? ` · ${m.imdbID}` : ''}`
                              : `${m.Year || '?'} · ⭐ ${m.imdbRating || '?'} · ${m.imdbID || ''}`
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

            <div className="md:col-span-2 space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Video name" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Video URL *</Label>
              <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Thumbnail URL</Label>
              <Input value={form.thumbnail} onChange={e => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={form.img} onChange={e => setForm({ ...form, img: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Coins (amount)</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={form.contentType} onValueChange={v => setForm({ ...form, contentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="series">TV Series</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="action, comedy, hindi" />
            </div>
            <div className="space-y-2">
              <Label>Quality</Label>
              <Input value={form.quality} onChange={e => setForm({ ...form, quality: e.target.value })} placeholder="720p, 1080p, 4K" />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="2024" />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} placeholder="English, Hindi, Bangla" />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="2h 15m" />
            </div>
            <div className="space-y-2">
              <Label>TMDB ID</Label>
              <Input value={form.tmdbId} onChange={e => setForm({ ...form, tmdbId: e.target.value })} placeholder="12345" />
            </div>
            <div className="space-y-2">
              <Label>IMDB ID</Label>
              <Input value={form.imdbId} onChange={e => setForm({ ...form, imdbId: e.target.value })} placeholder="tt1234567" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Info / Synopsis</Label>
              <Textarea value={form.info} onChange={e => setForm({ ...form, info: e.target.value })} rows={3} placeholder="Movie synopsis or description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this video and remove it from all users' purchases and favorites.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}