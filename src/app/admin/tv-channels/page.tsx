'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTvChannels, createTvChannel, updateTvChannel, deleteTvChannel } from '@/lib/admin-api';
import type { TvChannel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Tv } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { name: '', url: '', logo: '', genre: '', language: '', country: '', active: true, order: 0 };

type FormData = typeof emptyForm;

export default function TvChannelsPage() {
  const [items, setItems] = useState<TvChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await getTvChannels()); } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.genre?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: TvChannel) => {
    setEditingId(item.id);
    setForm({ name: item.name || '', url: item.url || '', logo: item.logo || '', genre: item.genre || '', language: item.language || '', country: item.country || '', active: item.active !== false, order: item.order || 0 });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) { toast.error('Name and URL are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, order: Number(form.order) || 0 };
      if (editingId) { await updateTvChannel(editingId, payload); toast.success('Channel updated'); }
      else { await createTvChannel(payload); toast.success('Channel created'); }
      setDialogOpen(false); load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleToggleActive = async (item: TvChannel) => {
    try {
      await updateTvChannel(item.id, { active: !item.active });
      toast.success(`Channel ${item.active ? 'deactivated' : 'activated'}`);
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteTvChannel(deleteId); toast.success('Channel deleted'); setDeleteOpen(false); setDeleteId(null); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">TV Channels</h2>
          <p className="text-muted-foreground">Manage live TV channels with m3u8 stream URLs.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Channel</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Channels</CardTitle>
          <CardDescription>{filtered.length} channel(s) total</CardDescription>
          <div className="relative max-w-sm mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search channels..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="hidden md:table-cell">Genre</TableHead>
                <TableHead className="hidden sm:table-cell">Language</TableHead>
                <TableHead className="hidden lg:table-cell">Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Tv className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No channels found</p>
                  </TableCell></TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {c.logo ? <img src={c.logo} alt="" className="w-8 h-8 object-contain rounded" /> : <div className="w-8 h-8 bg-muted rounded flex items-center justify-center"><Tv className="w-4 h-4" /></div>}
                        <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.url}</p></div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{c.genre || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{c.language || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{c.country || '-'}</TableCell>
                    <TableCell><Switch checked={c.active !== false} onCheckedChange={() => handleToggleActive(c)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(c.id); setDeleteOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Channel' : 'Add Channel'}</DialogTitle><DialogDescription>{editingId ? 'Update channel details.' : 'Add a new live TV channel with stream URL.'}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Stream URL (m3u8) *</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>Logo URL</Label><Input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Genre</Label><Input value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} placeholder="Sports, News..." /></div>
              <div className="space-y-2"><Label>Language</Label><Input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
              <div className="space-y-2"><Label>Order</Label><Input type="number" value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Channel?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}