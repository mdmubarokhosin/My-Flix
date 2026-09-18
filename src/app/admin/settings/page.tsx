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
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    tmdbApiKey: '',
    imdbApiKey: '',
    bohudurApiKey: '',
    telegramBotToken: '',
    defaultLanguage: 'en',
    coinsPerAd: 10,
    adsNotice: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = (await getSettings()) as Record<string, unknown>;
      setForm((prev) => ({
        ...prev,
        tmdbApiKey: (data.tmdbApiKey as string) || '',
        imdbApiKey: (data.imdbApiKey as string) || '',
        bohudurApiKey: (data.bohudurApiKey as string) || '',
        telegramBotToken: (data.telegramBotToken as string) || '',
        defaultLanguage: (data.defaultLanguage as string) || 'en',
        coinsPerAd: typeof data.coinsPerAd === 'number' ? data.coinsPerAd : 10,
        adsNotice: (data.adsNotice as string) || '',
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate password fields.
    if (form.newPassword || form.currentPassword) {
      if (form.newPassword !== form.confirmNewPassword) {
        toast.error('New password and confirmation do not match');
        return;
      }
      if (form.newPassword.length < 6) {
        toast.error('New password must be at least 6 characters long');
        return;
      }
      if (!form.currentPassword) {
        toast.error('Please enter your current password to set a new one');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        tmdbApiKey: form.tmdbApiKey,
        imdbApiKey: form.imdbApiKey,
        bohudurApiKey: form.bohudurApiKey,
        telegramBotToken: form.telegramBotToken,
        defaultLanguage: form.defaultLanguage,
        coinsPerAd: form.coinsPerAd,
        adsNotice: form.adsNotice,
      };
      // Strip empty-string API keys (so we don't overwrite existing with empty).
      for (const k of ['tmdbApiKey', 'imdbApiKey', 'bohudurApiKey', 'telegramBotToken', 'adsNotice']) {
        if (!form[k]) delete payload[k];
      }

      // Only include password change fields if the user is actually changing the password.
      if (form.newPassword && form.currentPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      await updateSettings(payload);
      toast.success('Settings saved');
      setForm({ ...form, currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
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
            <CardDescription>
              Change admin password. You must provide your current password. Leave blank to keep the current one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                placeholder="Required to change password"
                autoComplete="current-password"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>New Admin Password</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="Min 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={form.confirmNewPassword}
                onChange={(e) => setForm({ ...form, confirmNewPassword: e.target.value })}
                placeholder="Re-type new password"
                autoComplete="new-password"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              Show passwords
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> API Keys</CardTitle>
            <CardDescription>External service integrations. Leave blank to keep existing value.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>TMDB API Key</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={form.tmdbApiKey}
                onChange={(e) => setForm({ ...form, tmdbApiKey: e.target.value })}
                placeholder="TMDB v3 API key"
              />
            </div>
            <div className="space-y-2">
              <Label>IMDB API Key (OMDB)</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={form.imdbApiKey}
                onChange={(e) => setForm({ ...form, imdbApiKey: e.target.value })}
                placeholder="OMDB API key"
              />
            </div>
            <div className="space-y-2">
              <Label>Bohudur API Key</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={form.bohudurApiKey}
                onChange={(e) => setForm({ ...form, bohudurApiKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telegram Bot Token</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={form.telegramBotToken}
                onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
              />
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
                <Select
                  value={form.defaultLanguage}
                  onValueChange={(v) => setForm({ ...form, defaultLanguage: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="bn">Bangla</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Coins Per Ad</Label>
                <Input
                  type="number"
                  value={form.coinsPerAd}
                  onChange={(e) => setForm({ ...form, coinsPerAd: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ads Notice Text</Label>
              <Textarea
                value={form.adsNotice}
                onChange={(e) => setForm({ ...form, adsNotice: e.target.value })}
                rows={2}
                placeholder="Message shown to users about ads"
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => void handleSave()} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}
