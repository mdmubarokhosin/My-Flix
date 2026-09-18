'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  LayoutDashboard, Film, Gift, Users, Settings,
  Plus, Pencil, Trash2, Copy, Check, LogOut,
  Search, RefreshCw, Shield, Eye, EyeOff, Coins,
  Key, Loader2, Tags, Star, ExternalLink, Wand2,
  Ban, UserCheck, Bell, Megaphone, Link as LinkIcon,
  Package, Tv, Globe, Play, Send, Radio,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogMedia, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { database } from '@/lib/firebase-client';
import { ref, onValue, set, update, remove, get } from 'firebase/database';
import type { Video, GiftCode, AppUser, Category, AdminStats, AppNotification, CoinPackage, Season, Episode } from '@/lib/types';

// Firebase rejects undefined values — strip them before any write
function stripUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const clean: any = {};
  for (const k in obj) { if (obj[k] !== undefined) clean[k] = stripUndefined(obj[k]); }
  return clean;
}

// Helper to get admin password for authenticated API calls
function getAdminPw(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('myflix-admin-pw') || '';
}

function adminUrl(url: string): string {
  const pw = getAdminPw();
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}adminPassword=${encodeURIComponent(pw)}`;
}

function adminHeaders(): Record<string, string> {
  return { 'X-Admin-Password': getAdminPw() };
}

function adminBody(body: Record<string, unknown>): string {
  return JSON.stringify({ ...body, adminPassword: getAdminPw() });
}

// ===================== Admin Login =====================

function AdminLogin() {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setIsAdmin } = useAppStore();

  const handleLogin = async () => {
    if (!password.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        localStorage.setItem('myflix-admin-pw', password);
        setIsAdmin(true);
        toast.success('Welcome, Admin!');
      } else {
        toast.error('Incorrect password');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to verify password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm border-amber-500/30">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-3">
              <Shield className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold">Admin Access</h2>
            <p className="text-xs text-muted-foreground">Enter the admin password to continue</p>
          </div>

          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="pr-10"
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPw(!showPw)}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button className="w-full h-11" onClick={handleLogin} disabled={loading || !password.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
            {loading ? 'Verifying...' : 'Login'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== Admin Dashboard =====================

function DashboardTab() {
  const { videos, categories, giftCodes } = useAppStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin', { headers: adminHeaders() });
      if (res.ok) setStats(await res.json());
    } catch { /* */ }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/admin', { headers: adminHeaders() });
        if (res.ok && !ignore) setStats(await res.json());
      } catch { /* */ }
    }
    load();
    return () => { ignore = true; };
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST', headers: adminHeaders() });
      if (res.ok) {
        toast.success('Demo data seeded successfully!');
        setTimeout(fetchStats, 1000);
      } else toast.error('Failed to seed data');
    } catch { toast.error('Network error'); }
    finally { setSeeding(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Videos" value={stats?.totalVideos ?? videos.length} icon={<Film className="w-5 h-5" />} color="text-blue-500" />
        <StatCard label="Categories" value={categories.length} icon={<Tags className="w-5 h-5" />} color="text-emerald-500" />
        <StatCard label="Gift Codes" value={stats?.totalGiftCodes ?? giftCodes.length} icon={<Gift className="w-5 h-5" />} color="text-violet-500" />
        <StatCard label="Total Coins" value={stats?.totalCoinsInCirculation ?? 0} icon={<Coins className="w-5 h-5" />} color="text-amber-500" />
      </div>
      <Button variant="outline" className="w-full" onClick={handleSeed} disabled={seeding}>
        {seeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        {seeding ? 'Seeding...' : 'Seed Demo Data'}
      </Button>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${color}`}>{icon}</div>
        <div>
          <p className="text-lg font-bold tabular-nums">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== Videos Tab =====================

function VideosTab() {
  const { videos, setVideos } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Real-time listener
  useEffect(() => {
    const videosRef = ref(database, 'videos');
    const unsub = onValue(videosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const vids: Video[] = Object.entries(data).map(([id, v]: [string, any]) => ({
          id, name: v.name || '', url: v.url || '', img: v.img, thumbnail: v.thumbnail,
          amount: v.amount || 0, time: v.time, duration: v.duration, tag: v.tag,
          tags: v.tags, info: v.info || [], createdAt: v.createdAt || 0,
          tmdbId: v.tmdbId, year: v.year, language: v.language, quality: v.quality,
          contentType: v.contentType || 'movie',
          seasons: v.seasons || [],
          totalSeasons: v.totalSeasons || 0,
          totalEpisodes: v.totalEpisodes || 0,
        }));
        setVideos(vids.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      } else { setVideos([]); }
    });
    return () => unsub();
  }, [setVideos]);

  const movieList = videos.filter((v) => v.contentType !== 'series');
  const filtered = searchTerm
    ? movieList.filter((v) =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.tag && v.tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.tags && v.tags.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : movieList;

  const handleSave = async (video: any) => {
    setSaving(true);
    try {
      const videoId = video.id || `v_${Date.now()}`;
      const payload = {
        ...video,
        id: videoId,
        contentType: video.contentType || 'movie',
        thumbnail: video.thumbnail || video.img || '',
        img: video.img || video.thumbnail || '',
        duration: video.duration || video.time || '',
        time: video.time || video.duration || '',
        tag: video.tag || video.tags || '',
        tags: video.tags || video.tag || '',
        createdAt: video.createdAt || Date.now(),
      };

      // Direct Firebase Realtime Database update (strip undefined — Firebase rejects them)
      await set(ref(database, `videos/${videoId}`), stripUndefined(payload));
      toast.success(video.id ? 'Video updated successfully' : 'Video added successfully');
      setEditOpen(false);
      setEditVideo(null);
    } catch (err) { console.error('Save video error:', err); toast.error(err instanceof Error ? err.message : 'Failed to save video'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      // Direct Firebase Realtime Database remove
      await remove(ref(database, `videos/${deleteId}`));
      await fetch(`/api/videos/${deleteId}`, { method: 'DELETE', headers: adminHeaders() }).catch(() => {});
      toast.success('Video deleted from Firebase');
    } catch (err) { console.error('Delete video error:', err); toast.error(err instanceof Error ? err.message : 'Failed to delete video'); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search videos by title or tag..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setEditVideo({ id: '', name: '', url: '', amount: 0, tag: '', tags: '', duration: '', info: [], createdAt: Date.now() } as any); setEditOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Video
        </Button>
      </div>

      <Card className="overflow-hidden border border-border/60">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px]">Cover</TableHead>
                <TableHead>Title & Info</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    No videos found in Realtime Database.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v) => (
                  <TableRow key={v.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="w-14 h-9 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                        {(v.thumbnail || v.img) ? (
                          <img src={v.thumbnail || v.img} alt={v.name} className="w-full h-full object-cover" />
                        ) : (
                          <Film className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] sm:max-w-xs">
                      <p className="font-medium text-sm truncate">{v.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        {v.year && <span>{v.year}</span>}
                        {v.quality && <Badge variant="outline" className="text-[10px] py-0 h-4 px-1">{v.quality}</Badge>}
                        {v.tmdbId && <span className="font-mono text-[10px]">TMDB:{v.tmdbId}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {v.tag ? <Badge variant="secondary" className="font-normal">{v.tag}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {v.duration || v.time || '—'}
                    </TableCell>
                    <TableCell>
                      {v.amount > 0 ? (
                        <span className="text-xs font-semibold text-amber-500">{v.amount} coins</span>
                      ) : (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditVideo(v); setEditOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => setDeleteId(v.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editVideo?.id ? 'Edit Video Content' : 'Add New Video'}</DialogTitle></DialogHeader>
          {editVideo && <VideoForm video={editVideo} onSave={handleSave} onCancel={() => setEditOpen(false)} loading={saving} />}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialog size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 className="w-6 h-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete Video Content</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this video from Firebase Realtime Database? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialog>
    </div>
  );
}

function VideoForm({ video, onSave, onCancel, loading }: { video: any; onSave: (v: any) => void; onCancel?: () => void; loading: boolean }) {
  const { categories } = useAppStore();
  const [form, setForm] = useState({ ...video });
  const [importSource, setImportSource] = useState<'tmdb' | 'imdb'>('tmdb');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

  const update = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      if (importSource === 'tmdb') {
        // Auto-detect TMDB ID (pure number)
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
          // details returns a single object — wrap in array
          if (data.title) {
            setSearchResults([data]);
          } else {
            toast.error(data.error || 'Movie not found');
          }
        } else {
          if (data.results) setSearchResults(data.results);
          else toast.error(data.error || 'No results found');
        }
      } else {
        // IMDB search — auto-detect if query is an IMDB ID
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
        // If search_by_id, wrap single result in array
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

  const applyResult = (item: any) => {
    if (importSource === 'tmdb') {
      setForm((prev: any) => ({
        ...prev,
        name: item.title,
        thumbnail: item.poster_path ? `${TMDB_IMG_BASE}/w500${item.poster_path}` : prev.thumbnail,
        img: item.poster_path ? `${TMDB_IMG_BASE}/w500${item.poster_path}` : prev.img,
        tmdbId: item.id,
        imdbId: null,
        importSource: 'tmdb',
        year: item.release_date ? item.release_date.split('-')[0] : '',
        info: item.overview ? [item.overview] : prev.info,
        language: item.original_language || prev.language,
      }));
      toast.success('TMDB data applied!');
    } else {
      // IMDB/OMDb result
      setForm((prev: any) => ({
        ...prev,
        name: item.Title || prev.name,
        thumbnail: item.Poster && item.Poster !== 'N/A' ? item.Poster : prev.thumbnail,
        img: item.Poster && item.Poster !== 'N/A' ? item.Poster : prev.img,
        tmdbId: null,
        imdbId: item.imdbID || null,
        importSource: 'imdb',
        year: item.Year ? item.Year : '',
        info: item.Plot && item.Plot !== 'N/A' ? [item.Plot] : prev.info,
        language: prev.language,
        quality: item.Rated && item.Rated !== 'N/A' ? item.Rated : prev.quality,
      }));
      toast.success('IMDB data applied!');
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const synopsisText = Array.isArray(form.info) ? form.info.join('\n') : (form.info || '');

  return (
    <div className="space-y-3">
      {/* Source Selector + Search */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-1.5 mb-2">
          <Wand2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold">Auto-Fill Import</span>
        </div>
        {/* TMDB / IMDB Toggle */}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="text-sm"
          />
          <Button variant="outline" size="icon" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        {searchResults.length > 0 && (
          <ScrollArea className="max-h-[200px] mt-2">
            <div className="space-y-1.5">
              {searchResults.slice(0, 8).map((m: any, idx: number) => (
                <button key={m.id || m.imdbID || idx} onClick={() => applyResult(m)}
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

      <Separator />

      <div><label className="text-xs text-muted-foreground">Name *</label><Input value={form.name || ''} onChange={(e) => update('name', e.target.value)} className="mt-1" /></div>
      <div><label className="text-xs text-muted-foreground">URL *</label><Input value={form.url || ''} onChange={(e) => update('url', e.target.value)} className="mt-1" placeholder="Video streaming or MP4 URL" /></div>
      <div><label className="text-xs text-muted-foreground">Thumbnail Image URL</label><Input value={form.thumbnail || form.img || ''} onChange={(e) => { update('thumbnail', e.target.value); update('img', e.target.value); }} className="mt-1" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-muted-foreground">Amount (coins)</label><Input type="number" value={form.amount || 0} onChange={(e) => update('amount', parseInt(e.target.value) || 0)} className="mt-1" /></div>
        <div><label className="text-xs text-muted-foreground">Duration</label><Input value={form.duration || form.time || ''} onChange={(e) => { update('duration', e.target.value); update('time', e.target.value); }} className="mt-1" placeholder="e.g. 2h 15m" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Category / Tag</label>
          <select
            value={form.tag || form.tags || ''}
            onChange={(e) => { update('tag', e.target.value); update('tags', e.target.value); }}
            className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none"
          >
            <option value="">Select category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div><label className="text-xs text-muted-foreground">Year</label><Input value={form.year || ''} onChange={(e) => update('year', e.target.value)} className="mt-1" placeholder="e.g. 2024" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-muted-foreground">TMDB ID</label><Input type="number" value={form.tmdbId || ''} onChange={(e) => update('tmdbId', parseInt(e.target.value) || null)} className="mt-1" placeholder="e.g. 550" /></div>
        <div><label className="text-xs text-muted-foreground">Quality</label><Input value={form.quality || ''} onChange={(e) => update('quality', e.target.value)} className="mt-1" placeholder="e.g. HD, 4K" /></div>
      </div>
      <div><label className="text-xs text-muted-foreground">Language</label><Input value={form.language || ''} onChange={(e) => update('language', e.target.value)} className="mt-1" placeholder="e.g. Hindi, English" /></div>
      <div>
        <label className="text-xs text-muted-foreground">Synopsis / Info</label>
        <textarea
          value={synopsisText}
          onChange={(e) => update('info', [e.target.value])}
          className="w-full mt-1 h-20 rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none"
          placeholder="Movie storyline or description..."
        />
      </div>
      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={() => onSave(form)} disabled={!form.name || !form.url || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
          {loading ? 'Saving...' : 'Save Video'}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ===================== Bootstrap Icon Picker Component =====================

const BOOTSTRAP_ICONS_LIST = [
  { name: 'film', tags: 'film movie video cinema' },
  { name: 'fire', tags: 'fire trending hot viral' },
  { name: 'lightning-charge-fill', tags: 'action electric fast lightning power' },
  { name: 'emoji-laughing-fill', tags: 'comedy laugh funny smile emoji' },
  { name: 'heart-fill', tags: 'romantic love heart favorite' },
  { name: 'emoji-dizzy-fill', tags: 'horror ghost scary dizzy' },
  { name: 'tv-fill', tags: 'tv web series show monitor display' },
  { name: 'globe', tags: 'globe bangla world language' },
  { name: 'translate', tags: 'translate hindi language speech' },
  { name: 'controller', tags: 'cartoon game gaming anime' },
  { name: 'camera-reels-fill', tags: 'camera reels film video' },
  { name: 'play-circle-fill', tags: 'play video media player' },
  { name: 'star-fill', tags: 'star rating featured top favorite' },
  { name: 'music-note-beamed', tags: 'music song audio sound' },
  { name: 'award-fill', tags: 'award trophy winner top best' },
  { name: 'bookmark-heart-fill', tags: 'bookmark favorite saved heart' },
  { name: 'box-seam-fill', tags: 'box package series collection' },
  { name: 'camera-video-fill', tags: 'camera video recording stream' },
  { name: 'display-fill', tags: 'display screen monitor web' },
  { name: 'eye-fill', tags: 'eye view watch see' },
  { name: 'gem', tags: 'gem premium diamond vip' },
  { name: 'headset', tags: 'headset audio podcast gaming' },
  { name: 'image-fill', tags: 'image photo poster picture' },
  { name: 'layers-fill', tags: 'layers categories list stack' },
  { name: 'magic', tags: 'magic fantasy sci-fi special' },
  { name: 'megaphone-fill', tags: 'megaphone announcement news viral' },
  { name: 'palette-fill', tags: 'palette art animation cartoon' },
  { name: 'rocket-takeoff-fill', tags: 'rocket launch popular trending' },
  { name: 'shield-check', tags: 'shield verified safe admin' },
  { name: 'ticket-perforated-fill', tags: 'ticket cinema movie show' },
  { name: 'trophy-fill', tags: 'trophy winner top best' },
  { name: 'youtube', tags: 'youtube stream channel video' },
  { name: 'badge-hd-fill', tags: 'badge hd high definition quality' },
  { name: 'badge-4k-fill', tags: 'badge 4k ultra quality' },
  { name: 'badge-3d-fill', tags: 'badge 3d dimension' },
  { name: 'bookmark-star-fill', tags: 'bookmark star favorite' },
  { name: 'broadcast', tags: 'broadcast live stream radio' },
  { name: 'cash-stack', tags: 'cash coins money earn' },
  { name: 'chat-dots-fill', tags: 'chat comments discussion' },
  { name: 'chat-quote-fill', tags: 'chat quote dialog subtitle' },
  { name: 'cloud-arrow-down-fill', tags: 'cloud download drive video' },
  { name: 'compass-fill', tags: 'compass explore discovery' },
  { name: 'disc-fill', tags: 'disc cd dvd movie music' },
  { name: 'file-earmark-play-fill', tags: 'file play video media' },
  { name: 'hand-thumbs-up-fill', tags: 'like thumbs up vote' },
  { name: 'journal-text', tags: 'journal text script info' },
  { name: 'newspaper', tags: 'newspaper news blog article' },
  { name: 'person-video3', tags: 'person video actor cast vlog' },
  { name: 'phone-vibrate-fill', tags: 'phone mobile shorts status' },
  { name: 'tag-fill', tags: 'tag label category price' },
  { name: 'gift-fill', tags: 'gift code redeem reward' },
  { name: 'cart-fill', tags: 'cart purchase buy shop' },
  { name: 'activity', tags: 'activity analytics chart' },
  { name: 'bell-fill', tags: 'bell notification alert' },
  { name: 'clock-fill', tags: 'clock duration time recent' },
  { name: 'funnel-fill', tags: 'funnel filter sort' },
  { name: 'key-fill', tags: 'key admin password secret' },
  { name: 'pin-angle-fill', tags: 'pin pinned feature' },
  { name: 'search', tags: 'search find lookup' },
  { name: 'umbrella-fill', tags: 'umbrella drama romance' },
];

function BootstrapIconPickerModal({
  open,
  onOpenChange,
  onSelectIcon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectIcon: (iconClass: string) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = BOOTSTRAP_ICONS_LIST.filter((ic) =>
    ic.name.toLowerCase().includes(query.toLowerCase()) ||
    ic.tags.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] flex flex-col p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <i className="bi bi-search text-primary" /> Select Bootstrap Icon
          </DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search icons (e.g. film, fire, star, tv, heart...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        {/* Icons Grid */}
        <ScrollArea className="flex-1 pr-1 max-h-[350px]">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {filtered.map((ic) => {
              const fullClass = `bi bi-${ic.name}`;
              return (
                <button
                  key={ic.name}
                  type="button"
                  onClick={() => {
                    onSelectIcon(fullClass);
                    onOpenChange(false);
                    toast.success(`Selected ${fullClass}`);
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border/50 bg-muted/30 hover:bg-primary/10 hover:border-primary/50 text-foreground transition-all active:scale-95 group text-center"
                  title={fullClass}
                >
                  <i className={`${fullClass} text-xl group-hover:scale-110 transition-transform text-primary`} />
                  <span className="text-[10px] text-muted-foreground truncate w-full mt-1.5 font-mono">
                    {ic.name}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                No icons match "{query}"
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ===================== Categories Tab =====================

function CategoriesTab() {
  const { categories, setCategories } = useAppStore();
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('bi bi-film');
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [pickerOpenForNew, setPickerOpenForNew] = useState(false);
  const [pickerOpenForEdit, setPickerOpenForEdit] = useState(false);

  // Real-time listener
  useEffect(() => {
    const settingsRef = ref(database, 'settings');
    const unsub = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.categories) {
        const cats: Category[] = Array.isArray(data.categories)
          ? data.categories.map((c: any) => ({ id: c.id, name: c.name, icon: c.icon }))
          : [];
        setCategories(cats);
      }
    });
    return () => unsub();
  }, [setCategories]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const newCatObj = {
        id: newName.trim().toLowerCase().replace(/\s+/g, '-'),
        name: newName.trim(),
        icon: newIcon.trim() || 'bi bi-film',
      };
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: adminBody(newCatObj),
      });
      const updated = [...categories.filter(c => c.id !== newCatObj.id), newCatObj];
      await set(ref(database, 'settings/categories'), updated);
      setNewName('');
      setNewIcon('bi bi-film');
      toast.success('ক্যাটাগরি যোগ করা হয়েছে');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'ক্যাটাগরি যোগ করতে ব্যর্থ হয়েছে');
    }  };

  const handleConfirmDelete = async () => {
    if (!deleteCatId) return;
    try {
      await fetch(`/api/categories/${deleteCatId}`, { method: 'DELETE', headers: adminHeaders() });
      const updated = categories.filter((c) => c.id !== deleteCatId);
      await set(ref(database, 'settings/categories'), updated);
      toast.success('ক্যাটাগরি ডিলিট করা হয়েছে');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'ডিলিট করতে ব্যর্থ হয়েছে');
    } finally {
      setDeleteCatId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editCat) return;
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: adminBody({ id: editCat.id, name: editCat.name, icon: editCat.icon }),
      });
      const updated = categories.map(c => c.id === editCat.id ? editCat : c);
      await set(ref(database, 'settings/categories'), updated);
      setEditOpen(false);
      toast.success('ক্যাটাগরি আপডেট করা হয়েছে');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'আপডেট করতে ব্যর্থ হয়েছে');
    }  };

  return (
    <div className="space-y-4">
      {/* Form to Add New Category with Bootstrap Icon Picker */}
      <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-3">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add New Category
        </h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Category Name (e.g. Action, Hindi...)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 text-xs"
          />
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-48">
              <Input
                placeholder="bi bi-film"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="pl-8 text-xs font-mono"
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary">
                {newIcon ? <i className={newIcon} /> : <i className="bi bi-film" />}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpenForNew(true)}
              className="text-xs shrink-0 gap-1"
            >
              <Search className="w-3.5 h-3.5" /> Icon
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!newName.trim()}
              size="sm"
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No categories yet</p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-border transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {cat.icon && (cat.icon.startsWith('bi') || cat.icon.startsWith('fa')) ? (
                  <i className={`${cat.icon} text-lg`} />
                ) : (
                  <Tags className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{cat.name}</p>
                <p className="text-xs text-muted-foreground font-mono">Icon: {cat.icon || 'bi bi-film'}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => {
                  setEditCat(cat);
                  setEditOpen(true);
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => setDeleteCatId(cat.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={!!deleteCatId} onOpenChange={() => setDeleteCatId(null)}>
        <AlertDialog size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 className="w-6 h-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>ক্যাটাগরি ডিলিট করার কনফার্মেশন</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিত যে এই ক্যাটাগরিটি মুছে ফেলতে চান? এটি মুছে ফেললে এই ক্যাটাগরির অন্তর্ভুক্ত ভিডিও ফিল্টার প্রভাবিত হতে পারে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">বাতিল</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              ডিলিট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialog>

      {/* Edit Category Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Edit Category</DialogTitle>
          </DialogHeader>
          {editCat && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category Name</label>
                <Input
                  value={editCat.name}
                  onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Icon Class</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={editCat.icon}
                      onChange={(e) => setEditCat({ ...editCat, icon: e.target.value })}
                      className="pl-8 text-xs font-mono"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary">
                      {editCat.icon ? <i className={editCat.icon} /> : <i className="bi bi-film" />}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPickerOpenForEdit(true)}
                    className="text-xs gap-1"
                  >
                    <Search className="w-3.5 h-3.5" /> Pick
                  </Button>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button onClick={handleSaveEdit} className="w-full">
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Icon Pickers */}
      <BootstrapIconPickerModal
        open={pickerOpenForNew}
        onOpenChange={setPickerOpenForNew}
        onSelectIcon={(ic) => setNewIcon(ic)}
      />

      <BootstrapIconPickerModal
        open={pickerOpenForEdit}
        onOpenChange={setPickerOpenForEdit}
        onSelectIcon={(ic) => {
          if (editCat) setEditCat({ ...editCat, icon: ic });
        }}
      />
    </div>
  );
}

// ===================== Gift Codes Tab =====================

function GiftCodesTab() {
  const { giftCodes, setGiftCodes } = useAppStore();
  const [amount, setAmount] = useState('10');
  const [count, setCount] = useState('1');
  const [pkgName, setPkgName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'used'>('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const giftsRef = ref(database, 'gifts');
    const unsub = onValue(giftsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const codes: GiftCode[] = Object.entries(data).map(([id, g]: [string, any]) => ({
          id, amount: g.amount || 0, package: g.package || '',
          status: g.status || 'active', redeemedBy: g.redeemedBy,
          redeemedAt: g.redeemedAt, createdAt: g.createdAt || 0,
        }));
        setGiftCodes(codes);
      } else { setGiftCodes([]); }
    });
    return () => unsub();
  }, [setGiftCodes]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/gift-codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: adminBody({ amount: parseInt(amount) || 10, count: parseInt(count) || 1, package: pkgName.trim() }),
      });
      if (res.ok) toast.success('Gift codes generated!');
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to generate');
      }
    } catch { toast.error('Network error'); }
    finally { setGenerating(false); }
  };

  const handleDeleteCode = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch('/api/gift-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: adminBody({ id: deleteId }),
      });
      if (res.ok) toast.success('Gift code deleted');
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to delete gift code');
      }
    } catch { toast.error('Error deleting gift code'); }
    setDeleteId(null);
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCodes = giftCodes.filter((gc) => {
    if (filter === 'active' && gc.status !== 'active') return false;
    if (filter === 'used' && gc.status !== 'used') return false;
    if (search && !gc.id.toLowerCase().includes(search.toLowerCase()) && !gc.package?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Generate New Codes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Amount (coins)</label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Count</label><Input type="number" value={count} onChange={(e) => setCount(e.target.value)} className="mt-1" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">Package Name</label><Input value={pkgName} onChange={(e) => setPkgName(e.target.value)} className="mt-1" placeholder="e.g. VIP Pack" /></div>
          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Gift className="w-4 h-4 mr-1" />}
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder="Search gift codes..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 text-xs" />
        <div className="flex gap-1 bg-muted p-1 rounded-md text-xs self-start">
          <button onClick={() => setFilter('all')} className={`px-2.5 py-1 rounded-sm transition-all ${filter === 'all' ? 'bg-background shadow font-semibold' : 'text-muted-foreground'}`}>All</button>
          <button onClick={() => setFilter('active')} className={`px-2.5 py-1 rounded-sm transition-all ${filter === 'active' ? 'bg-background shadow font-semibold' : 'text-muted-foreground'}`}>Active</button>
          <button onClick={() => setFilter('used')} className={`px-2.5 py-1 rounded-sm transition-all ${filter === 'used' ? 'bg-background shadow font-semibold' : 'text-muted-foreground'}`}>Used</button>
        </div>
      </div>

      <ScrollArea className="max-h-[400px]">
        {filteredCodes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No gift codes found</p>
        ) : (
          <div className="space-y-2">
            {filteredCodes.map((gc) => (
              <div key={gc.id} className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-medium truncate">{gc.id}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-amber-500 font-semibold">{gc.amount} coins</span>
                    {gc.package && <span className="text-xs text-muted-foreground truncate">· {gc.package}</span>}
                  </div>
                </div>
                <Badge variant={gc.status === 'active' ? 'default' : 'secondary'} className={gc.status === 'active' ? 'bg-emerald-500 text-white' : ''}>
                  {gc.status}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleCopy(gc.id, gc.id)}>
                  {copiedId === gc.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-red-500" onClick={() => setDeleteId(gc.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialog size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 className="w-6 h-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete Gift Code</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this code? Users will not be able to redeem it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteCode}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialog>
    </div>
  );
}

// ===================== Users Tab =====================

function UsersTab() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBalance, setEditBalance] = useState('0');
  const [editIsBanned, setEditIsBanned] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: AppUser[] = Object.entries(data).map(([id, u]: [string, any]) => ({
          id, firstName: u.firstName, lastName: u.lastName, username: u.username,
          photoUrl: u.photoUrl, balance: u.balance || 0, isBanned: !!u.isBanned,
          purchased: u.purchased || [],
          favorites: u.favorites || [], lastCheckIn: u.lastCheckIn, streak: u.streak || 0,
          adWatchedToday: u.adWatchedToday || 0, lastAdDate: u.lastAdDate,
          transactions: u.transactions || [], giftHistory: u.giftHistory || [],
          createdAt: u.createdAt || 0, theme: u.theme,
        }));
        setUsers(list);
      } else { setUsers([]); }
    });
    return () => unsub();
  }, []);

  const filtered = searchTerm
    ? users.filter((u) => `${u.firstName || ''} ${u.lastName || ''} ${u.username || ''} ${u.id}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : users;

  const handleOpenEdit = (user: AppUser) => {
    setEditUser(user);
    setEditFirstName(user.firstName || '');
    setEditUsername(user.username || '');
    setEditBalance(String(user.balance || 0));
    setEditIsBanned(!!user.isBanned);
    setEditOpen(true);
  };

  const handleToggleBan = async (u: AppUser) => {
    const newBannedState = !u.isBanned;
    try {
      await fetch('/api/admin/users', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: adminBody({ id: u.id, isBanned: newBannedState }),
      });
      await set(ref(database, `users/${u.id}/isBanned`), newBannedState);
      toast.success(newBannedState ? 'ইউজার ব্যান করা হয়েছে' : 'ইউজার আনব্যান করা হয়েছে');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'অপারেশন ব্যর্থ হয়েছে');
    }  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    try {
      await fetch('/api/admin/users', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: adminBody({
          id: editUser.id,
          firstName: editFirstName.trim(),
          username: editUsername.trim(),
          balance: parseInt(editBalance) || 0,
          isBanned: editIsBanned,
        }),
      });
      await set(ref(database, `users/${editUser.id}/isBanned`), editIsBanned);
      await set(ref(database, `users/${editUser.id}/balance`), parseInt(editBalance) || 0);
      if (editFirstName.trim()) await set(ref(database, `users/${editUser.id}/firstName`), editFirstName.trim());
      if (editUsername.trim()) await set(ref(database, `users/${editUser.id}/username`), editUsername.trim());

      toast.success('ইউজার তথ্য আপডেট করা হয়েছে');
      setEditOpen(false);
    } catch { toast.error('আপডেট করতে ব্যর্থ হয়েছে'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch('/api/admin/users', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: adminBody({ id: deleteId }),
      });
      await remove(ref(database, `users/${deleteId}`));
      toast.success('ইউজার ডিলিট করা হয়েছে');
    } catch { toast.error('ডিলিট করতে ব্যর্থ হয়েছে'); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="ইউজার নেম বা আইডি দিয়ে সার্চ করুন..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <ScrollArea className="max-h-[500px]">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">কোন ইউজার পাওয়া যায়নি</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div key={u.id} className={`flex items-center gap-3 p-3 rounded-lg border ${u.isBanned ? 'border-red-500/40 bg-red-500/5' : 'border-border/50 bg-card'}`}>
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 font-bold overflow-hidden">
                  {u.photoUrl ? (
                    <img src={u.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (u.firstName || u.username || 'U')[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{u.firstName || u.username || 'Anonymous User'}</p>
                    {u.isBanned && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">ব্যানড</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate font-mono">
                    ID: {u.id.slice(0, 10)}... · <span className="text-amber-500 font-semibold">{u.balance} coins</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 ${u.isBanned ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10' : 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'}`}
                    onClick={() => handleToggleBan(u)}
                    title={u.isBanned ? 'আনব্যান করুন' : 'ব্যান করুন'}
                  >
                    {u.isBanned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleOpenEdit(u)} title="এডিট করুন">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteId(u.id)} title="ডিলিট করুন">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader><DialogTitle>ইউজার প্রোফাইল এডিট করুন</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">ইউজার আইডি</label>
                <Input value={editUser.id} readOnly disabled className="mt-1 bg-muted font-mono text-xs" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">নাম (Name)</label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="mt-1" placeholder="User name" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ইউজারনেম (Username)</label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="mt-1" placeholder="Username" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ব্যালেন্স (Coins)</label>
                <Input type="number" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} className="mt-1" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                <span className="text-sm font-medium">অ্যাকাউন্ট স্টেটাস</span>
                <Button
                  type="button"
                  variant={editIsBanned ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setEditIsBanned(!editIsBanned)}
                  className="gap-1.5"
                >
                  {editIsBanned ? <Ban className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
                  {editIsBanned ? 'ব্যান করা আছে' : 'সক্রিয় (Active)'}
                </Button>
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>বাতিল</Button>
                <Button type="button" onClick={handleSaveUser}>সেভ করুন</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialog size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 className="w-6 h-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>ইউজার ডিলিট করার কনফার্মেশন</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিত যে এই ইউজারকে স্থায়ীভাবে ডিলিট করতে চান? এই কাজ করার পর ইউজারের সমস্ত ডেটা মুছে যাবে এবং পুনরুদ্ধার করা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">বাতিল</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              ডিলিট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialog>
    </div>
  );
}

// ===================== Notifications Tab =====================

function NotificationsTab() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formType, setFormType] = useState<'alert' | 'action'>('alert');
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formTarget, setFormTarget] = useState<'all' | 'specific'>('all');
  const [formUserId, setFormUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Real-time Firebase listener
  useEffect(() => {
    const notifRef = ref(database, 'notifications');
    const unsub = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const all: AppNotification[] = Object.entries(data).map(([id, n]: [string, any]) => ({
          id,
          type: n.type || 'alert',
          title: n.title || '',
          message: n.message || '',
          link: n.link || '',
          targetUserId: n.targetUserId || null,
          createdAt: n.createdAt || 0,
          createdBy: n.createdBy || '',
        }));
        setNotifications(all.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setNotifications([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // User list for target selection
  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsub = onValue(usersRef, (snap) => {
      const data = snap.val();
      if (data) {
        setUsers(Object.entries(data).map(([id, u]: [string, any]) => ({
          id,
          firstName: u.firstName,
          lastName: u.lastName,
          username: u.username,
          balance: u.balance || 0,
          isBanned: u.isBanned || false,
          purchased: [] as string[],
          favorites: [] as string[],
          lastCheckIn: u.lastCheckIn || null,
          streak: u.streak || 0,
          adWatchedToday: 0,
          lastAdDate: null,
          transactions: [] as any[],
          giftHistory: [] as any[],
          createdAt: u.createdAt || 0,
        })));
      }
    });
    return () => unsub();
  }, []);

  const handleSend = async () => {
    if (!formTitle.trim() || !formMessage.trim()) {
      toast.error('শিরোনাম ও বার্তা লিখুন');
      return;
    }
    if (formType === 'action' && !formLink.trim()) {
      toast.error('Action টাইপে লিংক আবশ্যক');
      return;
    }
    if (formTarget === 'specific' && !formUserId.trim()) {
      toast.error('ইউজার ID লিখুন অথবা সিলেক্ট করুন');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: adminBody({
          type: formType,
          title: formTitle.trim(),
          message: formMessage.trim(),
          link: formLink.trim(),
          targetUserId: formTarget === 'specific' ? formUserId.trim() : null,
        }),
      });
      if (res.ok) {
        toast.success('নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!');
        setFormTitle(''); setFormMessage(''); setFormLink(''); setFormUserId('');
        setFormTarget('all');
        setShowCreate(false);
      } else {
        const d = await res.json();
        toast.error(d.error || 'পাঠাতে ব্যর্থ হয়েছে');
      }
    } catch { toast.error('নেটওয়ার্ক সমস্যা'); }
    finally { setSending(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/notifications?id=${deleteConfirmId}`, { method: 'DELETE', headers: adminHeaders() });
      if (res.ok) {
        toast.success('নোটিফিকেশন সরিয়ে দেওয়া হয়েছে');
      } else {
        toast.error('সরাতে ব্যর্থ হয়েছে');
      }
    } catch { toast.error('নেটওয়ার্ক সমস্যা'); }
    finally { setDeleteConfirmId(null); }
  };

  const formatDate = (ts: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('bn-BD', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header + Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Bell className="w-4 h-4" />
            নোটিফিকেশন ম্যানেজমেন্ট
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">
            মোট {notifications.length}টি সক্রিয় নোটিফিকেশন
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> নতুন
        </Button>
      </div>

      {/* Notification List */}
      {loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">ফায়ারবেস থেকে লোড হচ্ছে...</p>
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">কোনো সক্রিয় নোটিফিকেশন নেই</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              উপরে &quot;নতুন&quot; বাটনে ক্লিক করে নোটিফিকেশন পাঠান
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const isAlert = n.type !== 'action';
            return (
              <Card key={n.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isAlert ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                    }`}>
                      {isAlert ? <Megaphone className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={isAlert ? 'destructive' : 'default'} className={`text-[10px] px-1.5 py-0 h-5 ${
                          !isAlert ? 'bg-blue-600 hover:bg-blue-700' : ''
                        }`}>
                          {isAlert ? 'Alert' : 'Action'}
                        </Badge>
                        {n.targetUserId && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                            নির্দিষ্ট ইউজার
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      {n.link && (
                        <p className="text-[11px] text-primary truncate mt-1 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          {n.link}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/60 mt-1.5">{formatDate(n.createdAt)}</p>
                    </div>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => setDeleteConfirmId(n.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialog size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 className="w-6 h-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>নোটিফিকেশন সরিয়ে দিন</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিত যে এই নোটিফিকেশনটি মুছে ফেলতে চান? এটি ডাটাবেস থেকে স্থায়ীভাবে সরিয়ে দেওয়া হবে এবং সকল ইউজারের কাছে এটি আর দেখাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">বাতিল</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              সরিয়ে দিন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialog>

      {/* Create Notification Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>নতুন নোটিফিকেশন তৈরি করুন</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type selector using RadioGroup */}
            <div className="space-y-2">
              <Label>নোটিফিকেশন টাইপ</Label>
              <RadioGroup value={formType} onValueChange={(v) => setFormType(v as 'alert' | 'action')} className="grid grid-cols-2 gap-3">
                <label className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  formType === 'alert'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                    : 'border-muted hover:border-muted-foreground/30'
                }`}>
                  <RadioGroupItem value="alert" className="sr-only" />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    formType === 'alert' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold block">Alert</span>
                    <span className="text-[11px] text-muted-foreground">শুধু OK বাটন</span>
                  </div>
                </label>
                <label className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  formType === 'action'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-muted hover:border-muted-foreground/30'
                }`}>
                  <RadioGroupItem value="action" className="sr-only" />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    formType === 'action' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold block">Action</span>
                    <span className="text-[11px] text-muted-foreground">Cancel + Visit</span>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Target selector using RadioGroup */}
            <div className="space-y-2">
              <Label>প্রাপক</Label>
              <RadioGroup value={formTarget} onValueChange={(v) => setFormTarget(v as 'all' | 'specific')} className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                  formTarget === 'all' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                }`}>
                  <RadioGroupItem value="all" />
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">সব ইউজার</span>
                </label>
                <label className={`flex-1 flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                  formTarget === 'specific' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                }`}>
                  <RadioGroupItem value="specific" />
                  <UserCheck className="w-4 h-4" />
                  <span className="text-sm font-medium">নির্দিষ্ট ইউজার</span>
                </label>
              </RadioGroup>
            </div>

            {formTarget === 'specific' && (
              <div className="space-y-2">
                <Label>ইউজার সিলেক্ট করুন</Label>
                <select
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">-- ইউজার বাছাই করুন --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName || 'Unnamed'} — ID: {u.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">অথবা সরাসরি ইউজার ID লিখুন:</p>
                <Input
                  placeholder="ইউজার ID পেস্ট করুন..."
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                />
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label>শিরোনাম</Label>
              <Input
                placeholder="নোটিফিকেশনের শিরোনাম লিখুন..."
                value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>বার্তা</Label>
              <Textarea
                placeholder="বিস্তারিত বার্তা লিখুন..."
                value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                rows={4}
              />
            </div>

            {/* Link (only for Action type) */}
            {formType === 'action' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" /> লিংক (URL)
                </Label>
                <Input
                  placeholder="https://example.com/page"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  ইউজার &quot;Visit&quot; বাটনে ক্লিক করলে এই লিংকে যাবে
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>বাতিল</Button>
            <Button onClick={handleSend} disabled={sending || !formTitle.trim() || !formMessage.trim()}>
              {sending ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> পাঠানো হচ্ছে...</> : <><Megaphone className="w-4 h-4 mr-1.5" /> পাঠান</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ===================== Coin Packages Tab =====================

interface PackageForm {
  name: string;
  coins: string;
  price: string;
  popular: boolean;
}

function PackagesTab() {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageForm>({ name: '', coins: '', price: '', popular: false });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch('/api/coin-packages');
      const data = await res.json();
      setPackages(Array.isArray(data) ? data : []);
    } catch { setPackages([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', coins: '', price: '', popular: false });
    setDialogOpen(true);
  };

  const openEdit = (pkg: CoinPackage) => {
    setEditingId(pkg.id);
    setForm({ name: pkg.name, coins: String(pkg.coins), price: String(pkg.price), popular: !!pkg.popular });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.coins || !form.price) {
      toast.error('সব ফিল্ড পূরণ করুন');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch('/api/coin-packages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: adminBody({ id: editingId, name: form.name, coins: form.coins, price: form.price, popular: form.popular }),
        });
        if (res.ok) { toast.success('প্যাকেজ আপডেট হয়েছে'); setDialogOpen(false); fetchPackages(); }
        else { const e = await res.json().catch(()=>({})); toast.error(e.error || 'আপডেট ব্যর্থ হয়েছে'); };
      } else {
        const res = await fetch('/api/coin-packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: adminBody({ name: form.name, coins: Number(form.coins), price: Number(form.price), popular: form.popular }),
        });
        if (res.ok) { toast.success('নতুন প্যাকেজ যোগ হয়েছে'); setDialogOpen(false); fetchPackages(); }
        else {
          const errData = await res.json().catch(() => ({}));
          toast.error(errData.error || 'প্যাকেজ তৈরি ব্যর্থ হয়েছে');
        }
      }
    } catch { toast.error('নেটওয়ার্ক ত্রুটি'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/coin-packages?id=${id}`, { method: 'DELETE', headers: adminHeaders() });
      if (res.ok) { toast.success('প্যাকেজ মুছে ফেলা হয়েছে'); setDeleteConfirmId(null); fetchPackages(); }
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'মুছে ফেলা ব্যর্থ হয়েছে');
      }
    } catch { toast.error('নেটওয়ার্ক ত্রুটি'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">মোট {packages.length}টি প্যাকেজ</p>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> নতুন প্যাকেজ
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}</div>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">কোনো প্যাকেজ নেই</p>
            <p className="text-xs text-muted-foreground/70 mt-1">"নতুন প্যাকেজ" বাটনে ক্লিক করে প্যাকেজ যোগ করুন</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="relative overflow-hidden">
              {pkg.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg text-[10px] bg-amber-500 text-white border-0">
                    জনপ্রিয়
                  </Badge>
                </div>
              )}
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{pkg.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">মূল্য:</span>
                      <Badge variant="secondary" className="text-xs font-bold tabular-nums">৳{pkg.price}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">কয়েন:</span>
                      <Badge variant="outline" className="text-xs font-bold tabular-nums text-amber-600 border-amber-300">
                        <Coins className="w-3 h-3 mr-0.5" />{pkg.coins}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(pkg)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500" onClick={() => setDeleteConfirmId(pkg.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'প্যাকেজ সম্পাদনা' : 'নতুন প্যাকেজ যোগ করুন'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">প্যাকেজের নাম</Label>
              <Input
                placeholder="যেমন: বেসিক প্যাকেজ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">কয়েন সংখ্যা</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={form.coins}
                  onChange={(e) => setForm({ ...form, coins: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">মূল্য (৳)</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="popular-check"
                checked={form.popular}
                onChange={(e) => setForm({ ...form, popular: e.target.checked })}
                className="rounded border-input"
              />
              <Label htmlFor="popular-check" className="text-xs cursor-pointer">
                জনপ্রিয় হিসেবে চিহ্নিত করুন
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialog size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 className="w-6 h-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>প্যাকেজ মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই প্যাকেজটি মুছে ফেললে আর ইউজাররা এটি ক্রয় করতে পারবে না। এই কাজ পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => { if (deleteConfirmId) handleDelete(deleteConfirmId); }}
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialog>
    </div>
  );
}

// ===================== Settings Tab =====================

function SettingsTab() {
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [tmdbKey, setTmdbKey] = useState('');
  const [tmdbSaving, setTmdbSaving] = useState(false);
  const [adsNotice, setAdsNotice] = useState('ভিডিও প্লে করার সময় যদি এডস এর কারণে অন্য পেজে নিয়ে যায় তাহলে বেক এসে আবার ভিডিও প্লে করুন');
  const [adsNoticeSaving, setAdsNoticeSaving] = useState(false);
  const [bohudurKey, setBohudurKey] = useState('');
  const [bohudurSaving, setBohudurSaving] = useState(false);
  const [defaultLang, setDefaultLang] = useState<'en' | 'bn'>('en');
  const [langSaving, setLangSaving] = useState(false);
  const [imdbKey, setImdbKey] = useState('');
  const [imdbSaving, setImdbSaving] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [botTokenSaving, setBotTokenSaving] = useState(false);
  const [coinsPerAd, setCoinsPerAd] = useState(5);
  const [coinsPerAdSaving, setCoinsPerAdSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings', { headers: adminHeaders() }).then(r => r.json()).then((s: any) => {
      if (s.tmdbApiKey) setTmdbKey(s.tmdbApiKey);
      if (s.adsNotice) setAdsNotice(s.adsNotice);
      if (s.bohudurApiKey) setBohudurKey(s.bohudurApiKey);
      if (s.defaultLanguage) setDefaultLang(s.defaultLanguage === 'bn' ? 'bn' : 'en');
      if (s.imdbApiKey) setImdbKey(s.imdbApiKey);
      if (s.telegramBotToken) setBotToken(s.telegramBotToken);
      if (s.coinsPerAd !== undefined && s.coinsPerAd !== null) setCoinsPerAd(Number(s.coinsPerAd));
    }).catch(() => {});

    // Also read directly from Firebase Realtime DB
    const noticeRef = ref(database, 'settings/adsNotice');
    get(noticeRef).then((snap) => {
      if (snap.exists() && snap.val()) {
        setAdsNotice(snap.val());
      }
    }).catch(() => {});
  }, []);

  const handleChangePw = async () => {
    if (!newPw.trim()) { toast.error('Enter a password'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: adminBody({ adminPassword: newPw }),
      });
      if (res.ok) { toast.success('Password changed'); setNewPw(''); setConfirmPw(''); }
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to change password');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const handleSaveTmdbKey = async () => {
    if (!tmdbKey.trim()) { toast.error('Enter TMDB API key'); return; }
    setTmdbSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: adminBody({ tmdbApiKey: tmdbKey.trim() }),
      });
      if (res.ok) toast.success('TMDB API key saved!');
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save TMDB key');
      }
    } catch { toast.error('Network error'); }
    finally { setTmdbSaving(false); }
  };

  const handleSaveAdsNotice = async () => {
    if (!adsNotice.trim()) { toast.error('Enter a notice message'); return; }
    setAdsNoticeSaving(true);
    try {
      // Direct Firebase update for instant real-time sync
      await set(ref(database, 'settings/adsNotice'), adsNotice.trim());

      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: adminBody({ adsNotice: adsNotice.trim() }),
      });
      if (res.ok) toast.success('Ads Notice message updated!');
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save notice');
      }
    } catch { toast.error('Network error'); }
    finally { setAdsNoticeSaving(false); }
  };

  const handleSaveBohudurKey = async () => {
    const trimmedKey = bohudurKey.trim();
    if (!trimmedKey) { toast.error('API Key দিন'); return; }
    if (trimmedKey.length < 10) { toast.error('API Key খুব ছোট মনে হচ্ছে, সঠিক Key দিন'); return; }
    setBohudurSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: adminBody({ bohudurApiKey: trimmedKey }),
      });
      if (res.ok) toast.success('Bohudur API Key সংরক্ষিত হয়েছে!');
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch { toast.error('Network error'); }
    finally { setBohudurSaving(false); }
  };

  const handleSaveImdbKey = async () => {
    if (!imdbKey.trim()) { toast.error('Enter IMDB (OMDb) API key'); return; }
    setImdbSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: adminBody({ imdbApiKey: imdbKey.trim() }),
      });
      if (res.ok) toast.success('IMDB (OMDb) API key saved!');
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save IMDB key');
      }
    } catch { toast.error('Network error'); }
    finally { setImdbSaving(false); }
  };

  const handleSaveBotToken = async () => {
    if (!botToken.trim()) { toast.error('Enter Telegram Bot Token'); return; }
    setBotTokenSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: adminBody({ telegramBotToken: botToken.trim() }),
      });
      if (res.ok) toast.success('Telegram Bot Token saved!');
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save Bot Token');
      }
    } catch { toast.error('Network error'); }
    finally { setBotTokenSaving(false); }
  };

  const handleSaveCoinsPerAd = async () => {
    if (coinsPerAd < 1 || coinsPerAd > 100) { toast.error('Coins per ad must be 1-100'); return; }
    setCoinsPerAdSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: adminBody({ coinsPerAd }),
      });
      if (res.ok) toast.success(`Ad reward set to ${coinsPerAd} coins!`);
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save');
      }
    } catch { toast.error('Network error'); }
    finally { setCoinsPerAdSaving(false); }
  };

  const handleSaveDefaultLang = async () => {
    setLangSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: adminBody({ defaultLanguage: defaultLang }),
      });
      if (res.ok) toast.success(defaultLang === 'en' ? 'Default language set to English' : 'ডিফল্ট ভাষা বাংলা সেট করা হয়েছে');
      else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save');
      }
    } catch { toast.error('Network error'); }
    finally { setLangSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Ads Notice Box Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill text-amber-500" />
            Video Player Ads Notice Box
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            ভিডিও প্লেয়ারের নিচে যে লাল/হলুদ নোটিশ বার্তাটি দেখায় তা এখান থেকে পরিবর্তন করুন:
          </p>
          <textarea
            value={adsNotice}
            onChange={(e) => setAdsNotice(e.target.value)}
            className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none"
            placeholder="নোটিশ লিখুন..."
          />
          <Button onClick={handleSaveAdsNotice} disabled={adsNoticeSaving || !adsNotice.trim()} className="w-full">
            {adsNoticeSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            {adsNoticeSaving ? 'Saving...' : 'Save Notice Message'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Change Admin Password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Input type={showPw ? 'text' : 'password'} placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Input type="password" placeholder="Confirm password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          <Button onClick={handleChangePw} disabled={saving || !newPw.trim()} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Key className="w-4 h-4 mr-1" />}
            {saving ? 'Saving...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            TMDB API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Get a free API key from{' '}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-0.5">
              themoviedb.org <ExternalLink className="w-3 h-3" />
            </a>
            {' '}to enable movie details (rating, cast, screenshots, synopsis).
          </p>
          <Input type="password" placeholder="TMDB API Key" value={tmdbKey} onChange={(e) => setTmdbKey(e.target.value)} />
          <Button onClick={handleSaveTmdbKey} disabled={tmdbSaving || !tmdbKey.trim()} className="w-full">
            {tmdbSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Star className="w-4 h-4 mr-1" />}
            {tmdbSaving ? 'Saving...' : 'Save TMDB Key'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            IMDB (OMDb) API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Get a free API key from{' '}
            <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-0.5">
              omdbapi.com <ExternalLink className="w-3 h-3" />
            </a>
            {' '}to enable IMDB movie/series import by ID or name.
          </p>
          <Input type="password" placeholder="OMDb API Key (e.g. abc123...)" value={imdbKey} onChange={(e) => setImdbKey(e.target.value)} />
          <Button onClick={handleSaveImdbKey} disabled={imdbSaving || !imdbKey.trim()} className="w-full">
            {imdbSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Star className="w-4 h-4 mr-1" />}
            {imdbSaving ? 'Saving...' : 'Save IMDB Key'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            Bohudur Payment API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            কয়েন ক্রয় পেমেন্ট গেটওয়ের জন্য Bohudur API Key সেটআপ করুন।{' '}
            <a href="https://docs.bohudur.one" target="_blank" rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-0.5">
              docs.bohudur.one <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <Input type="password" placeholder="AH-BOHUDUR-API-KEY" value={bohudurKey} onChange={(e) => setBohudurKey(e.target.value)} />
          <Button onClick={handleSaveBohudurKey} disabled={bohudurSaving || !bohudurKey.trim()} className="w-full">
            {bohudurSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Coins className="w-4 h-4 mr-1" />}
            {bohudurSaving ? 'সংরক্ষণ হচ্ছে...' : 'Bohudur Key সংরক্ষণ করুন'}
          </Button>
        </CardContent>
      </Card>

      {/* Telegram Bot Token */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" />
            Telegram Bot Token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Telegram Mini App থেকে ইউজারের প্রোফাইল ছবি সিংক করতে Bot Token দিন।{' '}
            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-0.5">
              @BotFather <ExternalLink className="w-3 h-3" />
            </a>
            {' '}থেকে Bot তৈরি করে Token নিন।
          </p>
          <Input type="password" placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" value={botToken} onChange={(e) => setBotToken(e.target.value)} />
          <Button onClick={handleSaveBotToken} disabled={botTokenSaving || !botToken.trim()} className="w-full">
            {botTokenSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            {botTokenSaving ? 'সংরক্ষণ হচ্ছে...' : 'Bot Token সংরক্ষণ করুন'}
          </Button>
        </CardContent>
      </Card>

      {/* Coins Per Ad */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-500" />
            Watch Ad Coin Reward
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            প্রতিটি বিজ্ঞাপন দেখলে ইউজার যত কয়েন পাবে তা নির্ধারণ করুন। ডিফল্ট: 5 কয়েন।
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={100}
              value={coinsPerAd}
              onChange={(e) => setCoinsPerAd(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="w-28 text-center text-lg font-bold tabular-nums"
            />
            <Coins className="w-5 h-5 text-amber-500" />
            <span className="text-xs text-muted-foreground">per ad watch</span>
          </div>
          <Button onClick={handleSaveCoinsPerAd} disabled={coinsPerAdSaving} className="w-full">
            {coinsPerAdSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {coinsPerAdSaving ? 'Saving...' : 'Save Coin Reward'}
          </Button>
        </CardContent>
      </Card>

      {/* Default Language */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-500" />
            Default Website Language
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            ওয়েবসাইটের ডিফল্ট ভাষা নির্বাচন করুন। নতুন ইউজাররা এই ভাষায় সাইট দেখতে পাবে। ইউজাররা হেডার থেকে যেকোনো সময় ভাষা পরিবর্তন করতে পারবে।
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDefaultLang('en')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 ${defaultLang === 'en' ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400' : 'border-border hover:border-muted-foreground/40'}`}
            >
              <span className="text-2xl">🇬🇧</span>
              <span className="text-xs font-bold">English</span>
            </button>
            <button
              onClick={() => setDefaultLang('bn')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 ${defaultLang === 'bn' ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400' : 'border-border hover:border-muted-foreground/40'}`}
            >
              <span className="text-2xl">🇧🇩</span>
              <span className="text-xs font-bold">বাংলা</span>
            </button>
          </div>
          <Button onClick={handleSaveDefaultLang} disabled={langSaving} className="w-full">
            {langSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Globe className="w-4 h-4 mr-1" />}
            {langSaving ? 'Saving...' : 'Save Default Language'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== TV Series Tab =====================

function TvSeriesTab() {
  const { videos, setVideos, categories } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [editSeries, setEditSeries] = useState<Video | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [episodeModalOpen, setEpisodeModalOpen] = useState(false);
  const [editingSeasonNum, setEditingSeasonNum] = useState(1);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [epForm, setEpForm] = useState({ episodeNumber: 1, name: '', url: '', thumbnail: '', duration: '' });

  const seriesList = videos.filter((v) => v.contentType === 'series');
  const filtered = searchTerm
    ? seriesList.filter((v) =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.tag && v.tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : seriesList;

  const handleSave = async (series: any) => {
    setSaving(true);
    try {
      const seriesId = series.id || `s_${Date.now()}`;
      const totalEpisodes = (series.seasons || []).reduce((sum: number, s: Season) => sum + (s.episodes || []).length, 0);
      const totalSeasons = (series.seasons || []).length;
      const payload = {
        ...series,
        id: seriesId,
        contentType: 'series',
        thumbnail: series.thumbnail || series.img || '',
        img: series.img || series.thumbnail || '',
        duration: '',
        time: '',
        tag: series.tag || series.tags || '',
        tags: series.tags || series.tag || '',
        createdAt: series.createdAt || Date.now(),
        totalEpisodes,
        totalSeasons,
      };
      // Strip undefined values — Firebase set() rejects undefined
      await set(ref(database, `videos/${seriesId}`), stripUndefined(payload));
      toast.success(series.id ? 'সিরিজ আপডেট হয়েছে' : 'নতুন সিরিজ যোগ হয়েছে');
      setEditOpen(false);
      setEditSeries(null);
    } catch (err) { console.error('Save series error:', err); toast.error(err instanceof Error ? err.message : 'সংরক্ষণ ব্যর্থ হয়েছে'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove(ref(database, `videos/${deleteId}`));
      toast.success('সিরিজ মুছে ফেলা হয়েছে');
    } catch { toast.error('মুছে ফেলতে ব্যর্থ হয়েছে'); }
    setDeleteId(null);
  };

  const openEpisodeModal = (seasonNum: number, episode?: Episode) => {
    setEditingSeasonNum(seasonNum);
    if (episode) {
      setEditingEpisode(episode);
      setEpForm({ episodeNumber: episode.episodeNumber, name: episode.name, url: episode.url || '', thumbnail: episode.thumbnail || '', duration: episode.duration || '' });
    } else {
      setEditingEpisode(null);
      const existingSeries = editSeries;
      const season = existingSeries?.seasons?.find((s) => s.seasonNumber === seasonNum);
      const nextEpNum = (season?.episodes.length || 0) + 1;
      setEpForm({ episodeNumber: nextEpNum, name: '', url: '', thumbnail: '', duration: '' });
    }
    setEpisodeModalOpen(true);
  };

  const saveEpisode = () => {
    if (!editSeries || !epForm.name.trim() || !epForm.url.trim()) {
      toast.error('এপিসোডের নাম ও URL দিন');
      return;
    }
    const seasons = [...(editSeries.seasons || [])];
    let season = seasons.find((s) => s.seasonNumber === editingSeasonNum);
    if (!season) {
      season = { seasonNumber: editingSeasonNum, name: `Season ${editingSeasonNum}`, episodes: [] };
      seasons.push(season);
    }
    const episodes = [...season.episodes];
    if (editingEpisode) {
      const idx = episodes.findIndex((e) => e.episodeNumber === editingEpisode.episodeNumber);
      if (idx >= 0) episodes[idx] = { ...epForm, episodeNumber: epForm.episodeNumber };
    } else {
      episodes.push({ ...epForm, episodeNumber: epForm.episodeNumber });
    }
    season.episodes = episodes;
    setEditSeries({ ...editSeries, seasons });
    setEpisodeModalOpen(false);
    toast.success(editingEpisode ? 'এপিসোড আপডেট হয়েছে' : 'এপিসোড যোগ হয়েছে');
  };

  const deleteEpisode = (seasonNum: number, epNum: number) => {
    if (!editSeries) return;
    const seasons = (editSeries.seasons || []).map((s) => {
      if (s.seasonNumber === seasonNum) {
        return { ...s, episodes: s.episodes.filter((e) => e.episodeNumber !== epNum) };
      }
      return s;
    });
    setEditSeries({ ...editSeries, seasons });
    toast.success('এপিসোড মুছে ফেলা হয়েছে');
  };

  const addSeason = () => {
    if (!editSeries) return;
    const seasons = [...(editSeries.seasons || [])];
    const nextNum = seasons.length > 0 ? Math.max(...seasons.map((s) => s.seasonNumber)) + 1 : 1;
    seasons.push({ seasonNumber: nextNum, name: `Season ${nextNum}`, episodes: [] });
    setEditSeries({ ...editSeries, seasons });
  };

  const removeSeason = (seasonNum: number) => {
    if (!editSeries) return;
    const seasons = (editSeries.seasons || []).filter((s) => s.seasonNumber !== seasonNum);
    setEditSeries({ ...editSeries, seasons });
    toast.success('সিজন মুছে ফেলা হয়েছে');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="সিরিজ সার্চ করুন..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => {
          setEditSeries({ id: '', name: '', url: '', amount: 0, tag: '', tags: '', duration: '', info: [], createdAt: Date.now(), contentType: 'series', seasons: [{ seasonNumber: 1, name: 'Season 1', episodes: [] }] } as any);
          setEditOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-1" /> Add Series
        </Button>
      </div>

      <Card className="overflow-hidden border border-border/60">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px]">Cover</TableHead>
                <TableHead>Title & Info</TableHead>
                <TableHead className="hidden md:table-cell">Seasons</TableHead>
                <TableHead className="hidden sm:table-cell">Episodes</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    কোনো TV সিরিজ পাওয়া যায়নি।
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v) => (
                  <TableRow key={v.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="w-14 h-9 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                        {(v.thumbnail || v.img) ? (
                          <img src={v.thumbnail || v.img} alt={v.name} className="w-full h-full object-cover" />
                        ) : (
                          <Tv className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] sm:max-w-xs">
                      <p className="font-medium text-sm truncate">{v.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        {v.year && <span>{v.year}</span>}
                        {v.tmdbId && <span className="font-mono text-[10px]">TMDB:{v.tmdbId}</span>}
                        <Badge variant="outline" className="text-[10px] py-0 h-4 px-1 text-purple-500 border-purple-500/30">Series</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-semibold text-purple-500">
                      {v.totalSeasons || (v.seasons?.length || 0)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs font-semibold">
                      {v.totalEpisodes || 0}
                    </TableCell>
                    <TableCell>
                      {v.amount > 0 ? (
                        <span className="text-xs font-semibold text-amber-500">{v.amount} coins</span>
                      ) : (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditSeries(v); setEditOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => setDeleteId(v.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editSeries?.id ? 'Edit TV Series' : 'Add New TV Series'}</DialogTitle></DialogHeader>
          {editSeries && <TvSeriesForm series={editSeries} setSeries={setEditSeries} categories={categories} onSave={handleSave} onCancel={() => setEditOpen(false)} loading={saving} onAddSeason={addSeason} onRemoveSeason={removeSeason} onOpenEpisode={openEpisodeModal} onDeleteEpisode={deleteEpisode} />}
        </DialogContent>
      </Dialog>

      {/* Episode Dialog */}
      <Dialog open={episodeModalOpen} onOpenChange={setEpisodeModalOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>{editingEpisode ? 'Edit Episode' : 'Add Episode'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Episode Number</label><Input type="number" value={epForm.episodeNumber} onChange={(e) => setEpForm({ ...epForm, episodeNumber: parseInt(e.target.value) || 1 })} className="mt-1" /></div>
              <div><label className="text-xs text-muted-foreground">Duration</label><Input value={epForm.duration} onChange={(e) => setEpForm({ ...epForm, duration: e.target.value })} className="mt-1" placeholder="e.g. 45m" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Episode Name *</label><Input value={epForm.name} onChange={(e) => setEpForm({ ...epForm, name: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Video URL *</label><Input value={epForm.url} onChange={(e) => setEpForm({ ...epForm, url: e.target.value })} className="mt-1" placeholder="Embed or streaming URL" /></div>
            <div><label className="text-xs text-muted-foreground">Thumbnail URL</label><Input value={epForm.thumbnail} onChange={(e) => setEpForm({ ...epForm, thumbnail: e.target.value })} className="mt-1" /></div>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => setEpisodeModalOpen(false)}>Cancel</Button>
              <Button onClick={saveEpisode} disabled={!epForm.name.trim() || !epForm.url.trim()}>
                <Check className="w-4 h-4 mr-1" />Save Episode
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialog size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 className="w-6 h-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete TV Series</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will permanently delete this series and all its seasons/episodes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialog>
    </div>
  );
}

function TvSeriesForm({ series, setSeries, categories, onSave, onCancel, loading, onAddSeason, onRemoveSeason, onOpenEpisode, onDeleteEpisode }: {
  series: any; setSeries: (s: any) => void; categories: Category[];
  onSave: (v: any) => void; onCancel?: () => void; loading: boolean;
  onAddSeason: () => void; onRemoveSeason: (sn: number) => void;
  onOpenEpisode: (sn: number, ep?: Episode) => void; onDeleteEpisode: (sn: number, epNum: number) => void;
}) {
  const [importSource, setImportSource] = useState<'tmdb' | 'imdb'>('tmdb');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';
  const seasons: Season[] = series.seasons || [];

  const update = (key: string, value: any) => setSeries((prev: any) => ({ ...prev, [key]: value }));

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      if (importSource === 'tmdb') {
        // Auto-detect TMDB ID (pure number)
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
          // tv_details returns a single object — wrap in array
          if (data.name) {
            setSearchResults([data]);
          } else {
            toast.error(data.error || 'TV series not found');
          }
        } else {
          if (data.results) setSearchResults(data.results);
          else toast.error(data.error || 'No results found');
        }
      } else {
        // IMDB search — auto-detect if query is an IMDB ID
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
        // If search_by_id, wrap single result in array
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

  const applyResult = (item: any) => {
    if (importSource === 'tmdb') {
      const seasonCount = item.number_of_seasons || 1;
      const generatedSeasons: Season[] = [];
      for (let i = 1; i <= seasonCount; i++) {
        generatedSeasons.push({ seasonNumber: i, name: `Season ${i}`, episodes: [] });
      }
      setSeries((prev: any) => ({
        ...prev,
        name: item.name,
        thumbnail: item.poster_path ? `${TMDB_IMG_BASE}/w500${item.poster_path}` : prev.thumbnail,
        img: item.poster_path ? `${TMDB_IMG_BASE}/w500${item.poster_path}` : prev.img,
        tmdbId: item.id,
        imdbId: null,
        importSource: 'tmdb',
        year: item.first_air_date ? item.first_air_date.split('-')[0] : '',
        info: item.overview ? [item.overview] : prev.info,
        totalSeasons: seasonCount,
        seasons: generatedSeasons,
      }));
      toast.success('TMDB TV data applied!');
    } else {
      // IMDB/OMDb result
      const totalSeasons = item.totalSeasons ? parseInt(item.totalSeasons) : 1;
      const generatedSeasons: Season[] = [];
      for (let i = 1; i <= totalSeasons; i++) {
        generatedSeasons.push({ seasonNumber: i, name: `Season ${i}`, episodes: [] });
      }
      setSeries((prev: any) => ({
        ...prev,
        name: item.Title || prev.name,
        thumbnail: item.Poster && item.Poster !== 'N/A' ? item.Poster : prev.thumbnail,
        img: item.Poster && item.Poster !== 'N/A' ? item.Poster : prev.img,
        tmdbId: null,
        imdbId: item.imdbID || null,
        importSource: 'imdb',
        year: item.Year ? item.Year : '',
        info: item.Plot && item.Plot !== 'N/A' ? [item.Plot] : prev.info,
        totalSeasons,
        seasons: generatedSeasons,
      }));
      toast.success('IMDB TV data applied!');
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const synopsisText = Array.isArray(series.info) ? series.info.join('\n') : (series.info || '');

  return (
    <div className="space-y-3">
      {/* Source Selector + Search */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-1.5 mb-2">
          <Wand2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold">Auto-Fill Import</span>
        </div>
        {/* TMDB / IMDB Toggle */}
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
            placeholder={importSource === 'tmdb' ? 'Search TV series name or TMDB ID...' : 'Search name or IMDB ID (e.g. tt31272285)...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="text-sm"
          />
          <Button variant="outline" size="icon" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        {searchResults.length > 0 && (
          <ScrollArea className="max-h-[200px] mt-2">
            <div className="space-y-1.5">
              {searchResults.slice(0, 8).map((m: any, idx: number) => (
                <button key={m.id || m.imdbID || idx} onClick={() => applyResult(m)}
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

      <Separator />

      <div><label className="text-xs text-muted-foreground">Series Name *</label><Input value={series.name || ''} onChange={(e) => update('name', e.target.value)} className="mt-1" /></div>
      <div><label className="text-xs text-muted-foreground">Thumbnail / Poster URL</label><Input value={series.thumbnail || series.img || ''} onChange={(e) => { update('thumbnail', e.target.value); update('img', e.target.value); }} className="mt-1" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-muted-foreground">Amount (coins)</label><Input type="number" value={series.amount || 0} onChange={(e) => update('amount', parseInt(e.target.value) || 0)} className="mt-1" /></div>
        <div><label className="text-xs text-muted-foreground">Year</label><Input value={series.year || ''} onChange={(e) => update('year', e.target.value)} className="mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Category / Tag</label>
          <select value={series.tag || series.tags || ''} onChange={(e) => { update('tag', e.target.value); update('tags', e.target.value); }}
            className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none">
            <option value="">Select category...</option>
            {categories.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
          </select>
        </div>
        <div><label className="text-xs text-muted-foreground">Quality</label><Input value={series.quality || ''} onChange={(e) => update('quality', e.target.value)} className="mt-1" placeholder="e.g. HD, 4K" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-muted-foreground">TMDB ID</label><Input type="number" value={series.tmdbId || ''} onChange={(e) => update('tmdbId', parseInt(e.target.value) || null)} className="mt-1" /></div>
        <div><label className="text-xs text-muted-foreground">Language</label><Input value={series.language || ''} onChange={(e) => update('language', e.target.value)} className="mt-1" /></div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Synopsis / Info</label>
        <textarea value={synopsisText} onChange={(e) => update('info', [e.target.value])}
          className="w-full mt-1 h-20 rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none"
          placeholder="Series storyline or description..." />
      </div>

      {/* Season Management */}
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold flex items-center gap-1.5"><Tv className="w-3.5 h-3.5 text-purple-500" />Seasons & Episodes</span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onAddSeason}>
            <Plus className="w-3 h-3" />Add Season
          </Button>
        </div>

        {seasons.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No seasons yet. Click &quot;Add Season&quot; to start.</p>
        ) : (
          <div className="space-y-2">
            {seasons.map((season) => (
              <div key={season.seasonNumber} className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                  <span className="text-xs font-semibold">{season.name || `Season ${season.seasonNumber}`}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground mr-2">{season.episodes.length} episodes</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenEpisode(season.seasonNumber)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    {seasons.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => onRemoveSeason(season.seasonNumber)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {season.episodes.length > 0 && (
                  <div className="divide-y divide-border/30">
                    {season.episodes.map((ep) => (
                      <div key={ep.episodeNumber} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                        <span className="font-mono text-muted-foreground w-6">E{ep.episodeNumber}</span>
                        <span className="flex-1 truncate">{ep.name}</span>
                        {ep.url && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                        <button className="text-muted-foreground hover:text-foreground shrink-0" onClick={() => onOpenEpisode(season.seasonNumber, ep)}>
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button className="text-muted-foreground hover:text-red-500 shrink-0" onClick={() => onDeleteEpisode(season.seasonNumber, ep.episodeNumber)}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={() => onSave(series)} disabled={!series.name || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
          {loading ? 'Saving...' : 'Save Series'}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ===================== TV Channels Tab =====================

function TvChannelsTab() {
  const { lang } = useAppStore();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editChannel, setEditChannel] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const { database: fbDb } = await import('@/lib/firebase-client');
      const { ref, onValue } = await import('firebase/database');
      const channelRef = ref(fbDb, 'tvChannels');
      onValue(channelRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const arr = Object.entries(data).map(([id, ch]: [string, any]) => ({ id, ...ch }));
          arr.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          setChannels(arr);
        } else { setChannels([]); }
        setLoading(false);
      }, { onlyOnce: true });
    } catch (err) { console.error('Fetch channels error:', err); setLoading(false); }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const handleSave = async (channel: any) => {
    if (!channel.name?.trim()) { toast.error(t('admin.tvChannels.nameRequired', lang)); return; }
    if (!channel.url?.trim() || !channel.url.includes('http')) { toast.error(t('admin.tvChannels.invalidUrl', lang)); return; }
    setSaving(true);
    try {
      const payload = {
        name: channel.name, url: channel.url, logo: channel.logo || '',
        order: channel.order || 0, active: channel.active !== false,
        genre: channel.genre || '', language: channel.language || '', country: channel.country || '',
        adminPassword: getAdminPw(),
      };
      if (channel.id) {
        const res = await fetch(`/api/tv-channels/${channel.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...adminHeaders() }, body: JSON.stringify(payload) });
        if (res.ok) { toast.success(t('admin.tvChannels.updated', lang)); setEditOpen(false); fetchChannels(); }
        else toast.error(t('admin.tvChannels.updateFailed', lang));
      } else {
        const res = await fetch('/api/tv-channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { toast.success(t('admin.tvChannels.added', lang)); setEditOpen(false); fetchChannels(); }
        else toast.error(t('admin.tvChannels.addFailed', lang));
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/tv-channels/${deleteId}`, { method: 'DELETE', headers: adminHeaders() });
      if (res.ok) { toast.success(t('admin.tvChannels.deleted', lang)); fetchChannels(); }
      else toast.error(t('admin.tvChannels.deleteFailed', lang));
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    setDeleteId(null);
  };

  const toggleActive = async (ch: any) => {
    try {
      await fetch(`/api/tv-channels/${ch.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...adminHeaders() }, body: JSON.stringify({ active: !ch.active, adminPassword: getAdminPw() }) });
      fetchChannels();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold">{t('admin.tvChannels.title', lang)}</span>
          <Badge variant="secondary" className="text-[10px]">{channels.length} {t('admin.tvChannels.total', lang).replace(':', '')}</Badge>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditChannel({ id: '', name: '', url: '', logo: '', order: channels.length, active: true, genre: '', language: '', country: '' }); setEditOpen(true); }}>
          <Plus className="w-3.5 h-3.5" />{t('admin.tvChannels.new', lang)}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : channels.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          <Tv className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>{t('admin.tvChannels.noChannels', lang)}</p>
          <p className="text-xs mt-1">{t('admin.tvChannels.noChannelsHint', lang)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((ch) => (
            <Card key={ch.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    {ch.logo ? (
                      <img src={ch.logo} alt={ch.name} className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Tv className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{ch.name}</p>
                      <Badge variant={ch.active !== false ? 'destructive' : 'secondary'} className="text-[9px] px-1.5 py-0 shrink-0">
                        {ch.active !== false ? t('admin.tvChannels.active', lang) : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {ch.genre && <span className="text-[10px] text-muted-foreground">{ch.genre}</span>}
                      {ch.language && <span className="text-[10px] text-muted-foreground">{ch.language}</span>}
                      {ch.country && <span className="text-[10px] text-muted-foreground">{ch.country}</span>}
                      <span className="text-[10px] text-muted-foreground ml-auto"><Eye className="w-3 h-3 inline mr-0.5" />{ch.views || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(ch)}>
                      {ch.active !== false ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditChannel(ch); setEditOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => setDeleteId(ch.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editChannel?.id ? t('admin.tvChannels.editTitle', lang) : t('admin.tvChannels.newTitle', lang)}</DialogTitle>
          </DialogHeader>
          {editChannel && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">{t('admin.tvChannels.name', lang)} *</Label>
                <Input value={editChannel.name || ''} onChange={(e) => setEditChannel({ ...editChannel, name: e.target.value })} className="mt-1" placeholder={t('admin.tvChannels.namePlaceholder', lang)} />
              </div>
              <div>
                <Label className="text-xs">{t('admin.tvChannels.url', lang)} *</Label>
                <Input value={editChannel.url || ''} onChange={(e) => setEditChannel({ ...editChannel, url: e.target.value })} className="mt-1" placeholder={t('admin.tvChannels.urlPlaceholder', lang)} />
              </div>
              <div>
                <Label className="text-xs">{t('admin.tvChannels.logo', lang)}</Label>
                <Input value={editChannel.logo || ''} onChange={(e) => setEditChannel({ ...editChannel, logo: e.target.value })} className="mt-1" placeholder={t('admin.tvChannels.logoPlaceholder', lang)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{t('admin.tvChannels.genre', lang)}</Label>
                  <Input value={editChannel.genre || ''} onChange={(e) => setEditChannel({ ...editChannel, genre: e.target.value })} className="mt-1" placeholder={t('admin.tvChannels.genrePlaceholder', lang)} />
                </div>
                <div>
                  <Label className="text-xs">{t('admin.tvChannels.languageField', lang)}</Label>
                  <Input value={editChannel.language || ''} onChange={(e) => setEditChannel({ ...editChannel, language: e.target.value })} className="mt-1" placeholder={t('admin.tvChannels.languagePlaceholder', lang)} />
                </div>
                <div>
                  <Label className="text-xs">{t('admin.tvChannels.country', lang)}</Label>
                  <Input value={editChannel.country || ''} onChange={(e) => setEditChannel({ ...editChannel, country: e.target.value })} className="mt-1" placeholder={t('admin.tvChannels.countryPlaceholder', lang)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t('admin.tvChannels.order', lang)}</Label>
                  <Input type="number" value={editChannel.order || 0} onChange={(e) => setEditChannel({ ...editChannel, order: parseInt(e.target.value) || 0 })} className="mt-1" placeholder={t('admin.tvChannels.orderPlaceholder', lang)} />
                </div>
                <div className="flex items-end pb-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={editChannel.active !== false} onChange={(e) => setEditChannel({ ...editChannel, active: e.target.checked })} className="h-4 w-4 rounded" />
                    <Label className="text-xs">{t('admin.tvChannels.active', lang)}</Label>
                  </div>
                </div>
              </div>
              {editChannel.logo && (
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden">
                    <img src={editChannel.logo} alt="preview" className="w-full h-full object-contain p-1.5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Logo preview</span>
                </div>
              )}
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t('admin.tvChannels.cancel', lang)}</Button>
                <Button onClick={() => handleSave(editChannel)} disabled={!editChannel.name?.trim() || saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  {t('admin.tvChannels.save', lang)}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialog size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 className="w-6 h-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>{t('admin.tvChannels.deleteConfirm', lang)}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.tvChannels.deleteConfirmDesc', lang)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">{t('admin.tvChannels.cancel', lang)}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>{t('admin.tvChannels.deleteConfirm', lang)}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialog>
    </div>
  );
}

// ===================== Main Admin Panel =====================

export function AdminPanel() {
  const { isAdmin, setIsAdmin } = useAppStore();

  if (!isAdmin) return <AdminLogin />;

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Admin Panel</h2>
        <Button variant="ghost" size="sm" className="text-red-500 gap-1" onClick={() => setIsAdmin(false)}>
          <LogOut className="w-4 h-4" /> Logout
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full flex overflow-x-auto justify-start sm:grid sm:grid-cols-10 h-11 mb-4 scrollbar-none">
          <TabsTrigger value="dashboard" className="text-xs shrink-0 sm:shrink gap-1 px-3 sm:px-1"><LayoutDashboard className="w-3.5 h-3.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="videos" className="text-xs shrink-0 sm:shrink gap-1 px-3 sm:px-1"><Film className="w-3.5 h-3.5" />Movies</TabsTrigger>
          <TabsTrigger value="tvseries" className="text-xs shrink-0 sm:shrink gap-1 px-3 sm:px-1"><Tv className="w-3.5 h-3.5" />TV Series</TabsTrigger>
          <TabsTrigger value="tvchannels" className="text-xs shrink-0 sm:shrink gap-1 px-3 sm:px-1"><Radio className="w-3.5 h-3.5" />Live TV</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs shrink-0 sm:shrink gap-1 px-3 sm:px-1"><Tags className="w-3.5 h-3.5" />Cats</TabsTrigger>
          <TabsTrigger value="gifts" className="text-xs shrink-0 sm:shrink gap-1 px-3 sm:px-1"><Gift className="w-3.5 h-3.5" />Gifts</TabsTrigger>
          <TabsTrigger value="packages" className="text-xs shrink-0 sm:shrink gap-1 px-3 sm:px-1"><Package className="w-3.5 h-3.5" />Packages</TabsTrigger>
          <TabsTrigger value="users" className="text-xs shrink-0 sm:shrink gap-1 px-3 sm:px-1"><Users className="w-3.5 h-3.5" />Users</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs shrink-0 sm:shrink gap-1 px-3 sm:px-1"><Bell className="w-3.5 h-3.5" />Notify</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs shrink-0 sm:shrink gap-1 px-3 sm:px-1"><Settings className="w-3.5 h-3.5" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="videos"><VideosTab /></TabsContent>
        <TabsContent value="tvseries"><TvSeriesTab /></TabsContent>
        <TabsContent value="tvchannels"><TvChannelsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="gifts"><GiftCodesTab /></TabsContent>
        <TabsContent value="packages"><PackagesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
