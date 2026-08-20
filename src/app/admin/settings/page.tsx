'use client';

import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Save, Settings, Key } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [form, setForm] = useState({
    adminPassword: '', tmdbApiKey: '', imdbApiKey: '', bohudurApiKey: '',
    telegramBotToken: '', defaultLanguage: 'en', coinsPerAd: 10, adsNotice: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setForm({
        adminPassword: '',
        tmdbApiKey: data.tmdbApiKey || '',
        imdbApiKey: data.imdbApiKey || '',
        bohudurApiKey: data.bohudurApiKey || '',
        telegramBotToken: data.telegramBotToken || '',
        defaultLanguage: data.defaultLanguage || 'en',
        coinsPerAd: data.coinsPerAd || 10,
        adsNotice: data.adsNotice || '',
      });
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.adminPassword.trim()) delete payload.adminPassword;
      if (!form.tmdbApiKey.trim()) delete payload.tmdbApiKey;
      if (!form.imdbApiKey.trim()) delete payload.imdbApiKey;
      if (!form.bohudurApiKey.trim()) delete payload.bohudurApiKey;
      if (!form.telegramBotToken.trim()) delete payload.telegramBotToken;
      if (!form.adsNotice.trim()) delete payload.adsNotice;

      await updateSettings(payload);
      toast.success('Settings saved');
      setForm({ ...form, adminPassword: '' });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Configure platform settings, API keys, and security.</p>
      </div>

    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Security</CardTitle>
          <CardDescription>Change admin password. Leave empty to keep current password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Admin Password</Label>
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={form.adminPassword}
              onChange={e => setForm({ ...form, adminPassword: e.target.value })}
              placeholder="Leave empty to keep current"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showPasswords} onChange={e => setShowPasswords(e.target.checked)} />
            Show passwords
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> API Keys</CardTitle>
          <CardDescription>External service integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>TMDB API Key</Label>
            <Input type={showPasswords ? 'text' : 'password'} value={form.tmdbApiKey} onChange={e => setForm({ ...form, tmdbApiKey: e.target.value })} placeholder="TMDB v3 API key" />
          </div>
          <div className="space-y-2">
            <Label>IMDB API Key (OMDB)</Label>
            <Input type={showPasswords ? 'text' : 'password'} value={form.imdbApiKey} onChange={e => setForm({ ...form, imdbApiKey: e.target.value })} placeholder="OMDB API key" />
          </div>
          <div className="space-y-2">
            <Label>Bohudur API Key</Label>
            <Input type={showPasswords ? 'text' : 'password'} value={form.bohudurApiKey} onChange={e => setForm({ ...form, bohudurApiKey: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Telegram Bot Token</Label>
            <Input type={showPasswords ? 'text' : 'password'} value={form.telegramBotToken} onChange={e => setForm({ ...form, telegramBotToken: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Platform configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Language</Label>
              <Select value={form.defaultLanguage} onValueChange={v => setForm({ ...form, defaultLanguage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="bn">Bangla</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Coins Per Ad</Label>
              <Input type="number" value={form.coinsPerAd} onChange={e => setForm({ ...form, coinsPerAd: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ads Notice Text</Label>
            <Textarea value={form.adsNotice} onChange={e => setForm({ ...form, adsNotice: e.target.value })} rows={2} placeholder="Message shown to users about ads" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg">
        <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save All Settings'}
      </Button>
    </div>
    </div>
  );
}