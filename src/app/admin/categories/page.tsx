'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCategories, updateCategories } from '@/lib/admin-api';
import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Save, Tags, X } from 'lucide-react';
import { toast } from 'sonner';

const ICON_OPTIONS = [
  'bi bi-translate', 'bi bi-globe', 'bi bi-lightning-charge-fill', 'bi bi-emoji-laughing-fill',
  'bi bi-heart-fill', 'bi bi-emoji-dizzy-fill', 'bi bi-stars', 'bi bi-controller',
  'bi bi-tv-fill', 'bi bi-fire', 'bi bi-film', 'bi bi-music-note-beamed',
  'bi bi-camera-reels', 'bi bi-palette', 'bi bi-rocket-takeoff', 'bi bi-trophy',
  'bi bi-book', 'bi bi-megaphone', 'bi bi-shield-check', 'bi bi-cursor',
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [newCat, setNewCat] = useState({ name: '', icon: ICON_OPTIONS[0] });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerFor, setIconPickerFor] = useState<number | null>(null); // null = new

  const load = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCategories(categories);
      toast.success('Categories saved');
      setEditingIdx(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const addCategory = () => {
    if (!newCat.name.trim()) { toast.error('Name is required'); return; }
    const id = newCat.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setCategories([...categories, { id, name: newCat.name, icon: newCat.icon }]);
    setNewCat({ name: '', icon: ICON_OPTIONS[0] });
  };

  const removeCategory = (idx: number) => {
    setCategories(categories.filter((_, i) => i !== idx));
  };

  const updateCat = (idx: number, field: 'name' | 'icon', value: string) => {
    const updated = [...categories];
    (updated[idx] as any)[field] = value;
    if (field === 'name') updated[idx].id = value.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setCategories(updated);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground">Organize your content with categories and tags. {categories.length} categories configured.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>

      {/* Icon picker popover */}
      {showIconPicker && (
        <Card className="absolute z-50 p-4 w-72 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Select Icon</p>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowIconPicker(false); setIconPickerFor(null); }}><X className="w-3.5 h-3.5" /></Button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {ICON_OPTIONS.map(icon => (
              <button
                key={icon}
                className={`p-2 rounded border text-xl hover:bg-accent ${
                  (iconPickerFor === null && newCat.icon === icon) ||
                  (iconPickerFor !== null && categories[iconPickerFor]?.icon === icon)
                    ? 'border-primary bg-primary/10' : 'border-border'
                }`}
                onClick={() => {
                  if (iconPickerFor === null) setNewCat({ ...newCat, icon });
                  else updateCat(iconPickerFor, 'icon', icon);
                  setShowIconPicker(false); setIconPickerFor(null);
                }}
              ><i className={icon}></i></button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-3">
        {categories.map((cat, idx) => (
          <Card key={cat.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <button className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-accent" onClick={() => { setIconPickerFor(idx); setShowIconPicker(true); }}>
                <i className={cat.icon}></i>
              </button>
              {editingIdx === idx ? (
                <Input value={cat.name} onChange={e => updateCat(idx, 'name', e.target.value)} className="flex-1" />
              ) : (
                <div className="flex-1">
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">ID: {cat.id}</p>
                </div>
              )}
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCategory(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add new category */}
      <Card className="border-dashed">
        <CardContent className="p-3 flex items-center gap-3">
          <button className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-accent" onClick={() => { setIconPickerFor(null); setShowIconPicker(true); }}>
            <i className={newCat.icon}></i>
          </button>
          <Input value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="New category name" className="flex-1" />
          <Button variant="outline" onClick={addCategory}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </CardContent>
      </Card>
    </div>
  );
}