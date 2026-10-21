import React, { useEffect, useState } from 'react';
import {
  User as UserIcon, Bell, Clock, Save,
  Loader2, ShieldCheck, KeyRound, Upload, Trash2, Edit, Edit2, Plus, X,
  Code2, GraduationCap, Link2, RefreshCw, Copy, CheckCircle2
} from 'lucide-react';
import { Github, Linkedin } from '../components/ui/BrandIcons';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'users' | 'extension'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile Form Fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [gfgUsername, setGfgUsername] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [backupEmail, setBackupEmail] = useState('');
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifTelegram, setNotifTelegram] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [reminderTime, setReminderTime] = useState('21:00');
  const [telegramNotifInterval, setTelegramNotifInterval] = useState<number>(1);

  // Telegram PIN linking state
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramPin, setTelegramPin] = useState('');
  const [telegramPinExpiry, setTelegramPinExpiry] = useState<Date | null>(null);
  const [pinGenerating, setPinGenerating] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);

  // Chrome Extension State
  const [extensionTokens, setExtensionTokens] = useState<any[]>([]);
  const [extensionTokenName, setExtensionTokenName] = useState('Chrome Extension');
  const [extensionToken, setExtensionToken] = useState('');
  const [extensionTokenGenerating, setExtensionTokenGenerating] = useState(false);
  const [editingExtensionTokenId, setEditingExtensionTokenId] = useState<string | null>(null);
  const [editingExtensionTokenName, setEditingExtensionTokenName] = useState('');

  // File Upload State
  const [logoUploading, setLogoUploading] = useState(false);

  // DSA Sync Test State
  const [syncTesting, setSyncTesting] = useState(false);
  const [syncResult, setSyncResult] = useState<{ leetcode: any; gfg: any } | null>(null);

  // Manual Alert Trigger State
  const [testingAlerts, setTestingAlerts] = useState(false);

  // Password Update Fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Admin User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN'>('USER');
  const [newUserName, setNewUserName] = useState('');
  const [userCreating, setUserCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<'USER' | 'ADMIN'>('USER');
  const [editUserName, setEditUserName] = useState('');
  const [userUpdating, setUserUpdating] = useState(false);

  const loadProfile = () => {
    setLoading(true);
    api.get('/profile')
      .then(res => {
        const p = res.data.data;
        setName(p.name || '');
        setBio(p.bio || '');
        setAvatarUrl(p.avatarUrl || '');
        setLogoUrl(p.logoUrl || '');
        setGithubUsername(p.githubUsername || '');
        setLeetcodeUsername(p.leetcodeUsername || '');
        setGfgUsername(p.gfgUsername || '');
        setLinkedinUrl(p.linkedinUrl || '');
        setBackupEmail(p.backupEmail || '');
        setNotifEmail(p.notifEmail || false);
        setNotifTelegram(p.notifTelegram || false);
        setTelegramChatId(p.telegramChatId || '');
        setTelegramLinked(!!p.telegramChatId);
        setReminderTime(p.reminderTime || '21:00');
        setTelegramNotifInterval(p.telegramNotifInterval || 1);
      })
      .catch(() => toast.error('Failed to load profile details'))
      .finally(() => setLoading(false));

    loadExtensionStatus();
  };

  const loadExtensionStatus = () => {
    api.get('/auth/extension-status')
      .then(res => {
        setExtensionTokens(res.data.data.tokens || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/users');
      setUsersList(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Display Name is required');

    setSaving(true);
    const payload = {
      name,
      bio: bio || undefined,
      avatarUrl: avatarUrl || undefined,
      logoUrl: logoUrl || undefined,
      githubUsername: githubUsername || undefined,
      leetcodeUsername: leetcodeUsername || undefined,
      gfgUsername: gfgUsername || undefined,
      linkedinUrl: linkedinUrl || undefined,
      backupEmail: backupEmail || undefined,
      notifEmail,
      notifTelegram,
      telegramChatId: telegramChatId || undefined,
      reminderTime,
      telegramNotifInterval,
    };

    try {
      const res = await api.patch('/profile', payload);
      toast.success('Profile updated successfully');

      // Update auth store user info
      if (user) {
        setUser({
          ...user,
          profile: {
            ...user.profile,
            ...res.data.data
          }
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const testDsaSync = async () => {
    if (!leetcodeUsername && !gfgUsername) {
      toast.error('Please save at least one username first');
      return;
    }
    setSyncTesting(true);
    setSyncResult(null);
    try {
      const res = await api.get('/dsa/profile-stats');
      setSyncResult(res.data.data);
      const lc = res.data.data?.leetcode;
      const gfg = res.data.data?.gfg;
      if (lc || gfg) {
        toast.success(`Synced! LC: ${lc?.totalSolved ?? '—'} solved, GFG: ${gfg?.totalSolved ?? '—'} solved`);
      } else {
        toast.error('Could not fetch stats. Check usernames and try again.');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Sync test failed');
    } finally {
      setSyncTesting(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    setLogoUploading(true);
    try {
      const res = await api.post('/profile/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = res.data.data.logoUrl;
      setLogoUrl(uploadedUrl);
      toast.success('System logo uploaded successfully');

      // Update auth store user info logoUrl
      if (user && user.profile) {
        setUser({
          ...user,
          profile: {
            ...user.profile,
            logoUrl: uploadedUrl
          }
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      return toast.error('All password fields are required');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters long');
    }

    setPasswordSaving(true);
    try {
      await api.patch('/auth/update-password', { oldPassword, newPassword });
      toast.success('Password updated successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserName.trim() || !newUserPassword.trim()) {
      return toast.error('Email, Display Name, and Password are required');
    }

    setUserCreating(true);
    try {
      await api.post('/users', {
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        name: newUserName
      });
      toast.success('User created successfully');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('USER');
      setIsAddUserOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setUserCreating(false);
    }
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUserUpdating(true);
    try {
      await api.patch(`/users/${editingUser.id}`, {
        name: editUserName || undefined,
        role: editUserRole,
        password: editUserPassword || undefined
      });
      toast.success('User updated successfully');
      setEditingUser(null);
      setEditUserPassword('');
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setUserUpdating(false);
    }
  };

  const handleDeleteUser = async (targetId: string) => {
    if (!confirm('Are you sure you want to delete this user? All their data will be permanently deleted.')) {
      return;
    }

    try {
      await api.delete(`/users/${targetId}`);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage details, GitHub integration, brand logo, and user access</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Navigation Links & Status */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-card border border-border p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">Navigation</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left",
                  activeTab === 'profile'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <UserIcon className="w-4 h-4" /> Profile & Branding
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left",
                  activeTab === 'password'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <KeyRound className="w-4 h-4" /> Update Password
              </button>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => {
                    setActiveTab('users');
                    loadUsers();
                  }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left",
                    activeTab === 'users'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <ShieldCheck className="w-4 h-4" /> User Management
                </button>
              )}
              <button
                onClick={() => {
                  setActiveTab('extension');
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left",
                  activeTab === 'extension'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Code2 className="w-4 h-4" /> Chrome Extension
              </button>
            </div>
          </div>

          {/* User Status Card */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">Session Details</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {name.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-foreground truncate">{name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground">System Role:</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider",
                user?.role === 'ADMIN' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground border border-border'
              )}>
                {user?.role || 'USER'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Tab Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile settings */}
              <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4">
                  <UserIcon className="w-4 h-4 text-primary" /> Profile Settings
                </h3>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Display Name <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Display Name" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Backup Email</label>
                      <Input type="email" value={backupEmail} onChange={e => setBackupEmail(e.target.value)} placeholder="backup@example.com" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Bio / Status</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={2}
                      className="w-full p-2.5 bg-secondary/30 border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Github className="w-3.5 h-3.5" /> GitHub Username
                      </label>
                      <Input value={githubUsername} onChange={e => setGithubUsername(e.target.value)} placeholder="octocat" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Linkedin className="w-3.5 h-3.5" /> LinkedIn URL
                      </label>
                      <Input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-amber-500" /> LeetCode Username
                      </label>
                      <Input value={leetcodeUsername} onChange={e => setLeetcodeUsername(e.target.value)} placeholder="e.g. leetcode_user" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-500" /> GFG Username
                      </label>
                      <Input value={gfgUsername} onChange={e => setGfgUsername(e.target.value)} placeholder="e.g. gfg_user" />
                    </div>
                  </div>

                  {/* Sync Test */}
                  <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Save your profile first, then test if your LeetCode / GFG profiles are reachable.</p>
                      <Button
                        type="button"
                        disabled={syncTesting}
                        onClick={testDsaSync}
                        className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 shrink-0 ml-3"
                      >
                        {syncTesting
                          ? <><Loader2 className="w-3 h-3 animate-spin mr-1.5" />Testing...</>
                          : <><RefreshCw className="w-3 h-3 mr-1.5" />Test Sync</>}
                      </Button>
                    </div>
                    {syncResult && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-card border border-border rounded p-2.5 space-y-1">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">LeetCode</p>
                          {syncResult.leetcode ? (
                            <>
                              <p className="text-sm font-bold text-foreground">{syncResult.leetcode.totalSolved} <span className="text-xs font-normal text-muted-foreground">solved</span></p>
                              <div className="flex gap-2 text-[10px]">
                                <span className="text-emerald-400">{syncResult.leetcode.easySolved}E</span>
                                <span className="text-amber-400">{syncResult.leetcode.mediumSolved}M</span>
                                <span className="text-rose-400">{syncResult.leetcode.hardSolved}H</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">Rank #{syncResult.leetcode.ranking?.toLocaleString()}</p>
                            </>
                          ) : (
                            <p className="text-[10px] text-rose-400">❌ Not found or unavailable</p>
                          )}
                        </div>
                        <div className="bg-card border border-border rounded p-2.5 space-y-1">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">GeeksForGeeks</p>
                          {syncResult.gfg ? (
                            <p className="text-sm font-bold text-foreground">{syncResult.gfg.totalSolved} <span className="text-xs font-normal text-muted-foreground">solved</span></p>
                          ) : (
                            <p className="text-[10px] text-rose-400">❌ Not found or unavailable</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notification Toggles */}
                  <div className="border-t border-border pt-4 space-y-4">
                    <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" /> Notifications & Checklist Reminders
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-xs font-medium text-foreground">Email Alerts</label>
                          <p className="text-[10px] text-muted-foreground">Receive daily planner alerts & DSA due revisions via email</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifEmail}
                          onChange={e => setNotifEmail(e.target.checked)}
                          className="w-4 h-4 text-primary bg-secondary border-border rounded focus:ring-primary"
                        />
                      </div>

                      {/* ── Telegram Integration ── */}
                      <div className="border-t border-border/45 pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                              <Link2 className="w-3.5 h-3.5" /> Telegram Integration
                            </label>
                            <p className="text-[10px] text-muted-foreground">
                              {telegramLinked
                                ? `Linked to chat ID: ${telegramChatId}`
                                : 'Link your Telegram account to enable bot commands & alerts'}
                            </p>
                          </div>
                          {telegramLinked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-900/40 text-green-400 border border-green-700/50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Linked
                            </span>
                          )}
                        </div>

                        {/* PIN generation */}
                        <div className="bg-secondary/60 border border-border rounded-md p-3 space-y-2">
                          <p className="text-[10px] text-muted-foreground">
                            Generate a one-time 6-digit PIN, then send <code className="bg-accent px-1 rounded text-foreground">/link &lt;PIN&gt;</code> to the DevOS bot on Telegram.
                          </p>
                          {telegramPin && telegramPinExpiry && (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-2xl font-bold tracking-[0.4em] text-primary select-all">{telegramPin}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(telegramPin);
                                  setPinCopied(true);
                                  setTimeout(() => setPinCopied(false), 2000);
                                }}
                                className="p-1.5 rounded hover:bg-accent transition-colors"
                                title="Copy PIN"
                              >
                                {pinCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                              </button>
                              <span className="text-[10px] text-muted-foreground">
                                Expires {telegramPinExpiry.toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                          <Button
                            type="button"
                            disabled={pinGenerating}
                            onClick={async () => {
                              setPinGenerating(true);
                              try {
                                const res = await api.post('/profile/telegram-link-pin');
                                setTelegramPin(res.data.data.token);
                                setTelegramPinExpiry(new Date(res.data.data.expiresAt));
                                toast.success('PIN generated — expires in 15 minutes');
                              } catch (e: any) {
                                toast.error(e.response?.data?.message || 'Failed to generate PIN');
                              } finally {
                                setPinGenerating(false);
                              }
                            }}
                            className="h-8 text-xs bg-primary text-primary-foreground font-semibold px-3"
                          >
                            {pinGenerating
                              ? <><Loader2 className="w-3 h-3 animate-spin mr-1.5" />Generating...</>
                              : <><RefreshCw className="w-3 h-3 mr-1.5" />{telegramPin ? 'Regenerate PIN' : 'Generate PIN'}</>}
                          </Button>
                        </div>

                        {/* Notification settings */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-xs font-medium text-foreground">Telegram Alerts</label>
                            <p className="text-[10px] text-muted-foreground">Receive daily summary & revision reminders</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifTelegram}
                            onChange={e => setNotifTelegram(e.target.checked)}
                            className="w-4 h-4 text-primary bg-secondary border-border rounded focus:ring-primary"
                          />
                        </div>

                        {/* Test Alerts Button */}
                        <div className="pt-2">
                          <Button
                            type="button"
                            disabled={testingAlerts}
                            onClick={async () => {
                              setTestingAlerts(true);
                              try {
                                await api.post('/profile/trigger-report');
                                toast.success('Daily report triggered! Check your Email & Telegram.');
                              } catch (e: any) {
                                toast.error(e.response?.data?.message || 'Failed to trigger report');
                              } finally {
                                setTestingAlerts(false);
                              }
                            }}
                            className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3"
                          >
                            {testingAlerts
                              ? <><Loader2 className="w-3 h-3 animate-spin mr-1.5" />Triggering...</>
                              : <><Bell className="w-3 h-3 mr-1.5" />Test Daily Report Alerts</>}
                          </Button>
                        </div>

                        {notifTelegram && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Scheduled Time
                              </label>
                              <Input type="text" value={reminderTime} onChange={e => setReminderTime(e.target.value)} placeholder="21:00" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Bell className="w-3.5 h-3.5" /> Digest Interval (hrs)
                              </label>
                              <Input
                                type="number"
                                min="1"
                                value={telegramNotifInterval}
                                onChange={e => setTelegramNotifInterval(Number(e.target.value))}
                                placeholder="e.g. 1"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 flex justify-end">
                    <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground font-semibold text-xs h-9 px-4">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                      Save Profile Settings
                    </Button>
                  </div>
                </form>
              </div>

              {/* Branding Customization section */}
              <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-2">
                  <Upload className="w-4 h-4 text-primary" /> Branding & System Logo
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Upload a custom branding logo to replace the default icon displayed in the system sidebar.
                </p>

                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-xl border border-border bg-secondary/40 flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="System Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="text-xl font-black text-primary tracking-tighter">DO</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo-upload"
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2 border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-md cursor-pointer transition-all",
                          logoUploading && "pointer-events-none opacity-50"
                        )}
                      >
                        {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {logoUploading ? 'Uploading...' : 'Choose Logo Image'}
                      </label>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Supported formats: PNG, JPG, SVG. Recommended square proportions.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASSWORD TAB */}
          {activeTab === 'password' && (
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4">
                <KeyRound className="w-4 h-4 text-primary" /> Update Password
              </h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Current Password</label>
                  <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">New Password</label>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-border">
                  <Button type="submit" disabled={passwordSaving} className="bg-secondary border border-border text-foreground hover:bg-secondary/80 font-semibold text-xs h-9 px-4">
                    {passwordSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* USER MANAGEMENT TAB */}
          {activeTab === 'users' && user?.role === 'ADMIN' && (
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" /> System Users
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Create, modify password/roles, and delete user profiles</p>
                </div>
                <Button
                  onClick={() => setIsAddUserOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 px-3 flex items-center gap-1 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Add User
                </Button>
              </div>

              {/* Users list */}
              {usersLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-secondary/40 text-[10px] text-muted-foreground font-semibold border-b border-border">
                        <th className="p-3">Display Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Role</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-secondary/20 transition-all">
                          <td className="p-3 font-medium text-foreground">{u.profile?.name || 'N/A'}</td>
                          <td className="p-3 text-muted-foreground">{u.email}</td>
                          <td className="p-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide border",
                              u.role === 'ADMIN'
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-secondary text-muted-foreground border-border'
                            )}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditUserName(u.profile?.name || '');
                                setEditUserRole(u.role);
                              }}
                              className="text-muted-foreground hover:text-primary transition-all p-1"
                              title="Edit User"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {u.id !== user.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-muted-foreground hover:text-destructive transition-all p-1"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {usersList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground">No users registered.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ADD USER DIALOG (OVERLAY MODAL) */}
              {isAddUserOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                  <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-primary" /> Create New System User
                      </h4>
                      <button onClick={() => setIsAddUserOpen(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleAddUserSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                        <Input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Jane Doe" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                        <Input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="jane@example.com" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Initial Password</label>
                        <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Minimum 6 characters" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">System Role</label>
                        <select
                          value={newUserRole}
                          onChange={e => setNewUserRole(e.target.value as 'USER' | 'ADMIN')}
                          className="w-full p-2 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
                        >
                          <option value="USER">USER (Developer Access)</option>
                          <option value="ADMIN">ADMIN (System Administrator)</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddUserOpen(false)}
                          className="text-xs border-border h-8"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={userCreating}
                          className="bg-primary text-primary-foreground font-semibold text-xs h-8 px-4"
                        >
                          {userCreating ? 'Creating...' : 'Create User'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* EDIT USER DIALOG (OVERLAY MODAL) */}
              {editingUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                  <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        <Edit className="w-4 h-4 text-primary" /> Edit User Settings
                      </h4>
                      <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleUpdateUserSubmit} className="space-y-3">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Modifying Account</p>
                        <p className="text-xs font-bold text-foreground">{editingUser.email}</p>
                      </div>

                      <div className="space-y-1 border-t border-border pt-3">
                        <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                        <Input value={editUserName} onChange={e => setEditUserName(e.target.value)} placeholder="Jane Doe" required />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Change Password (Optional)</label>
                        <Input type="password" value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)} placeholder="Leave blank to keep current" />
                      </div>

                      {editingUser.id !== user.id && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">System Role</label>
                          <select
                            value={editUserRole}
                            onChange={e => setEditUserRole(e.target.value as 'USER' | 'ADMIN')}
                            className="w-full p-2 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
                          >
                            <option value="USER">USER (Developer Access)</option>
                            <option value="ADMIN">ADMIN (System Administrator)</option>
                          </select>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-3 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingUser(null)}
                          className="text-xs border-border h-8"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={userUpdating}
                          className="bg-primary text-primary-foreground font-semibold text-xs h-8 px-4"
                        >
                          {userUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EXTENSION TAB */}
          {activeTab === 'extension' && (
            <div className="space-y-6">
              <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Code2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Job Capture Extension</h3>
                    <p className="text-[11px] text-muted-foreground">Capture jobs directly from LinkedIn, Indeed, etc.</p>
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-lg p-4 mb-6 border border-border/50 text-sm text-zinc-300">
                  <p className="mb-2">The Job Capture Extension allows you to one-click save jobs from any career site straight into your DevOS Job Tracker.</p>
                  <p>To connect the extension, generate an access token below and paste it into the extension popup.</p>
                </div>

                <div className="space-y-6">
                  {/* Status Indicator & List */}
                  {extensionTokens.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">Active Connectors</p>
                      <div className="grid gap-3">
                        {extensionTokens.map(token => (
                          <div key={token.id} className="flex items-center justify-between p-3 bg-secondary/20 border border-border rounded-lg">
                            <div className="flex items-center gap-3 w-full max-w-[60%]">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <div className="w-full">
                                {editingExtensionTokenId === token.id ? (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Input
                                      value={editingExtensionTokenName}
                                      onChange={(e) => setEditingExtensionTokenName(e.target.value)}
                                      className="h-7 text-xs bg-background"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      className="h-7 text-[10px] px-2"
                                      onClick={async () => {
                                        if (!editingExtensionTokenName.trim()) return;
                                        try {
                                          await api.patch(`/auth/extension-token/${token.id}`, { name: editingExtensionTokenName });
                                          toast.success('Connector renamed');
                                          setEditingExtensionTokenId(null);
                                          loadExtensionStatus();
                                        } catch {
                                          toast.error('Failed to rename connector');
                                        }
                                      }}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-[10px] px-2 text-muted-foreground"
                                      onClick={() => setEditingExtensionTokenId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    {token.name}
                                    <button 
                                      className="text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setEditingExtensionTokenId(token.id);
                                        setEditingExtensionTokenName(token.name);
                                      }}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </p>
                                )}
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {token.lastUsed ? `Last active: ${new Date(token.lastUsed).toLocaleString()}` : 'Never used'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-[10px] px-2"
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to disconnect "${token.name}"?`)) return;
                                try {
                                  await api.delete(`/auth/extension-token/${token.id}`);
                                  toast.success('Connector revoked');
                                  loadExtensionStatus();
                                } catch {
                                  toast.error('Failed to disconnect');
                                }
                              }}
                            >
                              Revoke
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-secondary/20 border border-border rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <p className="text-sm font-semibold text-foreground">No Active Connectors</p>
                    </div>
                  )}

                  {/* Token Generation */}
                  {!extensionToken ? (
                    <div className="bg-secondary/20 border border-border rounded-lg p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Add New Connector</h4>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Connector Name</label>
                        <Input 
                          placeholder="e.g. Work Macbook" 
                          value={extensionTokenName}
                          onChange={e => setExtensionTokenName(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                        disabled={extensionTokenGenerating || !extensionTokenName.trim()}
                        onClick={async () => {
                          setExtensionTokenGenerating(true);
                          try {
                            const res = await api.post('/auth/extension-token', { name: extensionTokenName });
                            setExtensionToken(res.data.data.token);
                            toast.success('Token generated successfully');
                            loadExtensionStatus();
                          } catch {
                            toast.error('Failed to generate token');
                          } finally {
                            setExtensionTokenGenerating(false);
                          }
                        }}
                      >
                        {extensionTokenGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <KeyRound className="w-3 h-3 mr-2" />}
                        Generate Access Token
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                      <label className="text-xs font-semibold text-emerald-400">Your Access Token (Copy this now)</label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={extensionToken}
                          className="font-mono text-xs bg-black/40 border-emerald-500/30 text-emerald-100"
                        />
                        <Button
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(extensionToken);
                            toast.success('Copied to clipboard');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        This token will not be shown again. Paste it into the extension to connect.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full h-8 text-xs mt-3"
                        onClick={() => {
                          setExtensionToken('');
                          setExtensionTokenName('Chrome Extension');
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
