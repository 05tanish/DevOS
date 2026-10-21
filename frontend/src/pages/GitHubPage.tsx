import React, { useEffect, useState } from 'react';
import {
  Flame, Calendar, GitCommit, GitBranch, Terminal, Edit2, CheckCircle2, Loader2, Sparkles
} from 'lucide-react';
import { Github } from '../components/ui/BrandIcons';
import { api } from '../lib/api';
import type { GithubActivity, GithubStreakStats } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

export function GitHubPage() {
  const [activities, setActivities] = useState<GithubActivity[]>([]);
  const [stats, setStats] = useState<GithubStreakStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [commits, setCommits] = useState<number>(1);
  const [reposInput, setReposInput] = useState('');
  const [features, setFeatures] = useState('');
  const [bugsFix, setBugsFix] = useState('');
  const [upcomingWork, setUpcomingWork] = useState('');
  const [notes, setNotes] = useState('');

  const fetchActivities = async () => {
    try {
      const res = await api.get('/github');
      setActivities(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load GitHub logs');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/github/stats');
      setStats(res.data.data);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchActivities(), fetchStats()]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (commits < 0) return toast.error('Commits count cannot be negative');

    const payload = {
      date: new Date(date).toISOString(),
      commits: Number(commits),
      repositories: reposInput.split(',').map(r => r.trim()).filter(Boolean),
      features: features || undefined,
      bugsFix: bugsFix || undefined,
      upcomingWork: upcomingWork || undefined,
      notes: notes || undefined,
    };

    try {
      await api.post('/github', payload);
      toast.success('GitHub activity logged successfully');
      // Reset fields
      setReposInput('');
      setFeatures('');
      setBugsFix('');
      setUpcomingWork('');
      setNotes('');
      // Refresh
      fetchActivities();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to log activity');
    }
  };

  const handleEditSelect = (act: GithubActivity) => {
    setDate(new Date(act.date).toISOString().split('T')[0]);
    setCommits(act.commits);
    setReposInput(act.repositories?.join(', ') || '');
    setFeatures(act.features || '');
    setBugsFix(act.bugsFix || '');
    setUpcomingWork(act.upcomingWork || '');
    setNotes(act.notes || '');
    toast.info(`Editing details for ${new Date(act.date).toLocaleDateString()}`);
  };

  const [syncing, setSyncing] = useState(false);

  const handleAutoSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/github/sync');
      toast.success(res.data.message || 'GitHub activity synced!');
      fetchActivities();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sync failed — check your GitHub username in settings');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">GitHub Tracker</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Log commits manually or sync automatically from your GitHub public activity</p>
        </div>
        <Button onClick={handleAutoSync} disabled={syncing} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 shrink-0">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Github className="w-4 h-4 mr-2" />}
          {syncing ? 'Syncing...' : 'Auto-Sync from GitHub'}
        </Button>
      </div>

      {/* Streak Dashboard widgets */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.currentStreak} days</p>
              <p className="text-xs text-muted-foreground mt-0.5">Current Streak</p>
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.longestStreak} days</p>
              <p className="text-xs text-muted-foreground mt-0.5">Longest Streak</p>
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <GitCommit className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.totalCommits}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Commits Logged</p>
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.todayCommits}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Commits Logged Today</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logger form card */}
        <div className="lg:col-span-1 bg-card border border-border p-5 rounded-xl h-fit">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4">
            <Github className="w-4 h-4 text-primary" /> Log Activity
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Commits count <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <Input type="number" min="0" value={commits} onChange={e => setCommits(Number(e.target.value))} required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Repositories (comma-separated)</label>
              <Input value={reposInput} onChange={e => setReposInput(e.target.value)} placeholder="e.g. personalplace, backend-core" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Features built</label>
              <textarea
                value={features}
                onChange={e => setFeatures(e.target.value)}
                placeholder="List features built..."
                rows={2}
                className="w-full p-2.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Bugs fixed</label>
              <textarea
                value={bugsFix}
                onChange={e => setBugsFix(e.target.value)}
                placeholder="List bugs resolved..."
                rows={2}
                className="w-full p-2.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Upcoming Work / Todo</label>
              <textarea
                value={upcomingWork}
                onChange={e => setUpcomingWork(e.target.value)}
                placeholder="Notes on what is next..."
                rows={2}
                className="w-full p-2.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Additional Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Session takeaways..."
                rows={2}
                className="w-full p-2.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
              />
            </div>

            <Button type="submit" className="w-full bg-primary text-primary-foreground font-medium text-xs py-2 h-9">
              Save Log entry
            </Button>
          </form>
        </div>

        {/* Contribution Logs list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 px-1">
            <Calendar className="w-4 h-4 text-primary" /> Contribution History
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <div className="bg-card border border-border p-12 rounded-xl text-center">
              <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No activity logged yet. Start logging above!</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[80vh] pr-1 scrollbar-thin">
              {activities.map(act => (
                <div
                  key={act.id}
                  className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors group relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-semibold text-foreground">
                        {new Date(act.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <Badge className="bg-primary/15 text-primary border-primary/20 hover:bg-primary/15 text-[9px] font-bold">
                        {act.commits} commit{act.commits !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    <button
                      onClick={() => handleEditSelect(act)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground shrink-0"
                      title="Load details to edit form"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Repositories worked on */}
                  {act.repositories?.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5">
                        <Terminal className="w-3 h-3" /> Repos:
                      </span>
                      {act.repositories.map(r => (
                        <span key={r} className="text-[9px] bg-secondary/80 px-1.5 py-0.5 rounded border border-border text-foreground font-mono">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Detailed logs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-muted-foreground pt-1.5 border-t border-border/40">
                    {act.features && (
                      <div>
                        <span className="font-semibold text-foreground block mb-0.5">Features Built:</span>
                        <p className="bg-secondary/40 p-2 rounded border border-border/30 whitespace-pre-wrap">{act.features}</p>
                      </div>
                    )}
                    {act.bugsFix && (
                      <div>
                        <span className="font-semibold text-foreground block mb-0.5">Bugs Fixed:</span>
                        <p className="bg-secondary/40 p-2 rounded border border-border/30 whitespace-pre-wrap">{act.bugsFix}</p>
                      </div>
                    )}
                    {act.upcomingWork && (
                      <div>
                        <span className="font-semibold text-foreground block mb-0.5">Next Steps:</span>
                        <p className="bg-secondary/40 p-2 rounded border border-border/30 whitespace-pre-wrap">{act.upcomingWork}</p>
                      </div>
                    )}
                    {act.notes && (
                      <div>
                        <span className="font-semibold text-foreground block mb-0.5">Notes:</span>
                        <p className="bg-secondary/40 p-2 rounded border border-border/30 whitespace-pre-wrap">{act.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
