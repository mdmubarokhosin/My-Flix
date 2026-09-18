'use client';

import { useEffect, useState, useCallback } from 'react';
import { getGiftCodes, createGiftCode, updateGiftCode, deleteGiftCode } from '@/lib/admin-api';
import type { GiftCode } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Gift, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[arr[i] % chars.length];
  }
  return code;
}

const emptyForm = { code: '', amount: 100, package: '' };
type FormData = typeof emptyForm;

export default function GiftCodesPage() {
  const [items, setItems] = useState<GiftCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await getGiftCodes()); } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(g => !search || g.id?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditingId(null);
    setForm({ code: generateCode(), amount: 100, package: '' });
    setDialogOpen(true);
  };
  const openEdit = (item: GiftCode) => {
    setEditingId(item.id);
    setForm({ code: item.id || '', amount: item.amount || 0, package: item.package || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error('Code is required'); return; }
    setSaving(true);
    try {
      if (editingId) { await updateGiftCode(editingId, form); toast.success('Gift code updated'); }
      else { await createGiftCode(form); toast.success('Gift code created'); }
      setDialogOpen(false); load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteGiftCode(deleteId); toast.success('Gift code deleted'); setDeleteOpen(false); setDeleteId(null); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  const activeCount = items.filter(g => g.status === 'active').length;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gift Codes</h2>
          <p className="text-muted-foreground">Create and manage gift codes for coin rewards. {activeCount} active out of {items.length} total.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Create Code</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Gift Codes</CardTitle>
          <CardDescription>{filtered.length} code(s) shown</CardDescription>
          <div className="relative max-w-sm mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search codes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden sm:table-cell">Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Redeemed By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No gift codes found</p>
                  </TableCell></TableRow>
                ) : filtered.map(g => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{g.id}</code>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(g.id)}><Copy className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{g.amount}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell">{g.package || '-'}</TableCell>
                    <TableCell><Badge variant={g.status === 'active' ? 'default' : 'destructive'}>{g.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{g.redeemedBy || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(g.id); setDeleteOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Gift Code' : 'Create Gift Code'}</DialogTitle><DialogDescription>{editingId ? 'Update gift code details.' : 'Generate a new gift code for coin rewards.'}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Code *</Label>
                {!editingId && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setForm({ ...form, code: generateCode() })}><RefreshCw className="w-3 h-3 mr-1" />Regenerate</Button>}
              </div>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="font-mono" />
            </div>
            <div className="space-y-2"><Label>Coins Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Package Name</Label><Input value={form.package} onChange={e => setForm({ ...form, package: e.target.value })} placeholder="e.g. Starter Pack" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Gift Code?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}