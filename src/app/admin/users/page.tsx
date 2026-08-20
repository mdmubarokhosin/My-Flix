'use client';

import { useEffect, useState, useCallback } from 'react';
import { getUsers, updateUser, deleteUser, toggleBanUser, addUserCoins } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Search, Users, Ban, Coins, ShieldBan, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  id: string; firstName?: string; lastName?: string; username?: string; photoUrl?: string;
  balance: number; isBanned?: boolean; purchased?: any[]; favorites?: any[];
  transactions?: any[]; createdAt: number;
}

export default function UsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [coinsOpen, setCoinsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [coinsAmount, setCoinsAmount] = useState(0);
  const [coinsReason, setCoinsReason] = useState('');
  const [coinsAction, setCoinsAction] = useState<'add' | 'remove'>('add');

  const load = useCallback(async () => {
    try { setItems(await getUsers()); } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(u =>
    !search || u.id.includes(search) || u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) || u.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (u: UserRow) => { setEditing(u); setEditOpen(true); };
  const openCoins = (u: UserRow) => {
    setEditing(u); setCoinsAmount(0); setCoinsReason(''); setCoinsAction('add'); setCoinsOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateUser(editing.id, { firstName: editing.firstName, lastName: editing.lastName, username: editing.username });
      toast.success('User updated'); setEditOpen(false); load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleCoins = async () => {
    if (!editing) return;
    if (!coinsReason.trim()) { toast.error('Reason is required'); return; }
    setSaving(true);
    try {
      const amount = coinsAction === 'add' ? Math.abs(coinsAmount) : -Math.abs(coinsAmount);
      await addUserCoins(editing.id, amount, coinsReason);
      toast.success(`Coins ${coinsAction === 'add' ? 'added' : 'removed'}`);
      setCoinsOpen(false); load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleToggleBan = async (u: UserRow) => {
    try {
      const result = await toggleBanUser(u.id);
      toast.success(result.isBanned ? 'User banned' : 'User unbanned');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteUser(deleteId); toast.success('User deleted'); setDeleteOpen(false); setDeleteId(null); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage user accounts, ban/unban, and adjust coin balances.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Users</CardTitle>
          <CardDescription>{filtered.length} user(s) total</CardDescription>
          <div className="relative max-w-sm mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users by ID, name, username..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Username</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="hidden sm:table-cell">Purchases</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No users found</p>
                  </TableCell></TableRow>
                ) : filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {u.photoUrl ? <img src={u.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">{u.firstName?.[0] || '?'}</div>}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[150px]">{u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Anonymous'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 12)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{u.username || '-'}</TableCell>
                    <TableCell><Badge variant="secondary">{u.balance || 0}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell">{u.purchased?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant={u.isBanned ? 'destructive' : 'default'} className="cursor-pointer" onClick={() => handleToggleBan(u)}>
                        {u.isBanned ? 'Banned' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title={u.isBanned ? 'Unban' : 'Ban'} onClick={() => handleToggleBan(u)}>
                          {u.isBanned ? <ShieldCheck className="w-3.5 h-3.5 text-green-500" /> : <ShieldBan className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Manage Coins" onClick={() => openCoins(u)}><Coins className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(u.id); setDeleteOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit User</DialogTitle><DialogDescription>Update user profile information.</DialogDescription></DialogHeader>
          {editing && <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>User ID</Label><Input value={editing.id} disabled /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input value={editing.firstName || ''} onChange={e => setEditing({ ...editing, firstName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value={editing.lastName || ''} onChange={e => setEditing({ ...editing, lastName: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Username</Label><Input value={editing.username || ''} onChange={e => setEditing({ ...editing, username: e.target.value })} /></div>
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Coins Dialog */}
      <Dialog open={coinsOpen} onOpenChange={setCoinsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Manage Coins — {editing?.firstName || editing?.id}</DialogTitle><DialogDescription>Add or remove coins from this user&apos;s balance.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">{editing?.balance || 0}</p>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={coinsAction} onValueChange={v => setCoinsAction(v as 'add' | 'remove')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="add">Add Coins</SelectItem><SelectItem value="remove">Remove Coins</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" value={coinsAmount} onChange={e => setCoinsAmount(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Reason *</Label><Input value={coinsReason} onChange={e => setCoinsReason(e.target.value)} placeholder="e.g. bonus, penalty, correction" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoinsOpen(false)}>Cancel</Button>
            <Button onClick={handleCoins} disabled={saving || !coinsReason.trim()}>{saving ? 'Processing...' : coinsAction === 'add' ? 'Add Coins' : 'Remove Coins'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete User?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this user and all their data.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}