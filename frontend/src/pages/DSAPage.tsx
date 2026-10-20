import React, { useEffect, useState } from 'react';
import {
  Code2, Plus, Search, ExternalLink, Edit2, Trash2, Check,
  AlertCircle, CheckCircle2, Bookmark, BookmarkCheck, Loader2,
  RefreshCw, Target, Eye, GraduationCap
} from 'lucide-react';
import { subDays } from 'date-fns';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { DSA_TOPICS, DSA_PLATFORMS, DSA_DIFFICULTIES } from '../lib/constants';
import type { DsaProblem, DsaDifficulty, DsaPlatform, DsaTopic, GfgProfileStats } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';

// Special filter modes for DSA
type DsaFilterMode = 'ALL' | 'ONE_TIME_REVISION' | 'BEFORE_PLACEMENT' | 'QUICK_REVIEW';

const FILTER_MODES: { value: DsaFilterMode; label: string; icon: React.ReactNode; description: string; color: string }[] = [
  {
    value: 'ALL',
    label: 'All Problems',
    icon: <Code2 className="w-3.5 h-3.5" />,
    description: 'Show all solved problems',
    color: 'text-foreground',
  },
  {
    value: 'ONE_TIME_REVISION',
    label: 'One-Time Revision',
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    description: 'Problems needing a single revision pass',
    color: 'text-blue-400',
  },
  {
    value: 'BEFORE_PLACEMENT',
    label: 'Before Placement',
    icon: <Target className="w-3.5 h-3.5" />,
    description: 'High-priority problems for placement prep',
    color: 'text-rose-400',
  },
  {
    value: 'QUICK_REVIEW',
    label: 'Just See / Quick Review',
    icon: <Eye className="w-3.5 h-3.5" />,
    description: 'Easy problems to skim through fast',
    color: 'text-emerald-400',
  },
];

export function DSAPage() {
  const [problems, setProblems] = useState<DsaProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; easy: number; medium: number; hard: number; dueRevisions: number } | null>(null);

  // Daily Goal & Profile Stats states
  const [dailyGoal, setDailyGoal] = useState<{
    todayGoal: { completed: boolean; solvedCount: number; date: string };
    streak: { currentStreak: number; longestStreak: number };
    history: { id: string; date: string; completed: boolean; solvedCount: number }[];
  } | null>(null);
  const [profileStats, setProfileStats] = useState<{
    leetcode: { totalSolved: number; easySolved: number; mediumSolved: number; hardSolved: number; acceptanceRate: number; ranking: number } | null;
    gfg: GfgProfileStats | null;
  } | null>(null);
  const [togglingGoal, setTogglingGoal] = useState(false);

  // Filter mode (special modes)
  const [filterMode, setFilterMode] = useState<DsaFilterMode>('ALL');

  // Standard Filters
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [topicFilter, setTopicFilter] = useState<string>('');

  // Form checkboxes (per-problem flags)
  const [oneTimeRevision, setOneTimeRevision] = useState(false);
  const [beforePlacement, setBeforePlacement] = useState(false);
  const [quickReview, setQuickReview] = useState(false);

  // Modals
  const [isOpen, setIsOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<DsaProblem | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<DsaDifficulty>('EASY');
  const [platform, setPlatform] = useState<DsaPlatform>('LEETCODE');
  const [problemUrl, setProblemUrl] = useState('');
  const [solutionUrl, setSolutionUrl] = useState('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [topics, setTopics] = useState<DsaTopic[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [personalRating, setPersonalRating] = useState<number>(3);
  const [timeTaken, setTimeTaken] = useState<number>(30);
  const [mistakes, setMistakes] = useState('');

  const fetchProblems = async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (difficultyFilter) params.difficulty = difficultyFilter;
      if (platformFilter) params.platform = platformFilter;
      if (topicFilter) params.topic = topicFilter;

      // Special mode filters sent as tags
      if (filterMode === 'ONE_TIME_REVISION') params.tag = 'one-time-revision';
      if (filterMode === 'BEFORE_PLACEMENT') params.tag = 'before-placement';
      if (filterMode === 'QUICK_REVIEW') params.tag = 'quick-review';

      const res = await api.get('/dsa', { params });
      // Backend returns { problems: [...], pagination: {...} }
      const data = res.data.data;
      setProblems(Array.isArray(data) ? data : (data?.problems || []));
    } catch (err) {
      toast.error('Failed to load problems');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/dsa/stats');
      setStats(res.data.data);
    } catch (err) {
      // ignore
    }
  };

  const fetchDailyGoal = async () => {
    try {
      const res = await api.get('/dsa/daily-goal');
      setDailyGoal(res.data.data);
    } catch (err) {
      // ignore
    }
  };

  const fetchProfileStats = async () => {
    try {
      const res = await api.get('/dsa/profile-stats');
      setProfileStats(res.data.data);
    } catch (err) {
      // ignore
    }
  };

  const handleToggleDailyGoal = async () => {
    if (!dailyGoal) return;
    setTogglingGoal(true);
    try {
      const nextStatus = !dailyGoal.todayGoal.completed;
      await api.post('/dsa/daily-goal', { completed: nextStatus });
      toast.success(nextStatus ? 'Daily practice completed!' : 'Daily practice reset');
      fetchDailyGoal();
    } catch (err) {
      toast.error('Failed to update daily goal');
    } finally {
      setTogglingGoal(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchProblems(),
      fetchStats(),
      fetchDailyGoal(),
      fetchProfileStats()
    ]).finally(() => setLoading(false));
  }, [search, difficultyFilter, platformFilter, topicFilter, filterMode]);

  const handleOpenAddModal = () => {
    setEditingProblem(null);
    setName('');
    setDifficulty('EASY');
    setPlatform('LEETCODE');
    setProblemUrl('');
    setSolutionUrl('');
    setCode('');
    setNotes('');
    setTopics([]);
    setTagsInput('');
    setPersonalRating(3);
    setTimeTaken(30);
    setMistakes('');
    setOneTimeRevision(false);
    setBeforePlacement(false);
    setQuickReview(false);
    setIsOpen(true);
  };

  const handleOpenEditModal = (p: DsaProblem) => {
    setEditingProblem(p);
    setName(p.name);
    setDifficulty(p.difficulty);
    setPlatform(p.platform);
    setProblemUrl(p.problemUrl || '');
    setSolutionUrl(p.solutionUrl || '');
    setCode(p.code || '');
    setNotes(p.notes || '');
    setTopics(p.topics || []);
    setTagsInput(p.tags?.filter(t => !['one-time-revision', 'before-placement', 'quick-review'].includes(t)).join(', ') || '');
    setPersonalRating(p.personalRating || 3);
    setTimeTaken(p.timeTaken || 30);
    setMistakes(p.mistakes || '');
    setOneTimeRevision(p.tags?.includes('one-time-revision') || false);
    setBeforePlacement(p.tags?.includes('before-placement') || false);
    setQuickReview(p.tags?.includes('quick-review') || false);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Problem name is required');

    // Build tags array combining manual tags + special mode tags
    const specialTags: string[] = [];
    if (oneTimeRevision) specialTags.push('one-time-revision');
    if (beforePlacement) specialTags.push('before-placement');
    if (quickReview) specialTags.push('quick-review');

    const manualTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const allTags = [...new Set([...manualTags, ...specialTags])];

    const payload = {
      name,
      difficulty,
      platform,
      problemUrl: problemUrl || undefined,
      solutionUrl: solutionUrl || undefined,
      code: code || undefined,
      notes: notes || undefined,
      topics,
      tags: allTags,
      personalRating: Number(personalRating),
      timeTaken: Number(timeTaken) || undefined,
      mistakes: mistakes || undefined,
    };

    try {
      if (editingProblem) {
        await api.patch(`/dsa/${editingProblem.id}`, payload);
        toast.success('Problem updated successfully');
      } else {
        await api.post('/dsa', payload);
        toast.success('Problem created successfully (revisions scheduled!)');
      }
      setIsOpen(false);
      fetchProblems();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save problem');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;
    try {
      await api.delete(`/dsa/${id}`);
      toast.success('Problem deleted');
      fetchProblems();
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete problem');
    }
  };

  const toggleTopic = (topic: DsaTopic) => {
    if (topics.includes(topic)) {
      setTopics(topics.filter(t => t !== topic));
    } else {
      setTopics([...topics, topic]);
    }
  };

  const handleCompleteRevision = async (revisionId: string) => {
    try {
      await api.patch(`/dsa/revisions/${revisionId}/complete`);
      toast.success('Revision marked as completed!');
      fetchProblems();
      fetchStats();
    } catch (err) {
      toast.error('Failed to complete revision');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">DSA Tracker</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Solve problems and schedule active spaced repetition revision logs</p>
        </div>
        <Button onClick={handleOpenAddModal} className="w-full sm:w-auto bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Add Problem
        </Button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Solved</p>
          </div>
          <div className="bg-card border border-border p-4 rounded-lg text-center border-l-4 border-l-emerald-500">
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.easy}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Easy</p>
          </div>
          <div className="bg-card border border-border p-4 rounded-lg text-center border-l-4 border-l-amber-500">
            <p className="text-2xl font-bold text-amber-400 tabular-nums">{stats.medium}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Medium</p>
          </div>
          <div className="bg-card border border-border p-4 rounded-lg text-center border-l-4 border-l-rose-500">
            <p className="text-2xl font-bold text-rose-400 tabular-nums">{stats.hard}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Hard</p>
          </div>
          <div className="bg-card border border-border p-4 rounded-lg text-center col-span-2 md:col-span-1">
            <p className={cn('text-2xl font-bold tabular-nums', stats.dueRevisions > 0 ? 'text-amber-400' : 'text-emerald-400')}>
              {stats.dueRevisions}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Due Revisions</p>
          </div>
        </div>
      )}

      {/* Daily Goal & Streak & External Profile Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Practice Card */}
        {dailyGoal && (
          <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Today's DSA Goal
              </h3>
              <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/20">
                <span>🔥 {dailyGoal.streak.currentStreak} day streak</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="daily-goal-checkbox"
                type="checkbox"
                checked={dailyGoal.todayGoal.completed}
                disabled={togglingGoal}
                onChange={handleToggleDailyGoal}
                className="w-5 h-5 rounded border-border bg-secondary text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="daily-goal-checkbox" className="text-xs font-medium text-foreground cursor-pointer select-none">
                {dailyGoal.todayGoal.completed ? (
                  <span className="text-emerald-400 font-semibold">Completed! ({dailyGoal.todayGoal.solvedCount} solved today)</span>
                ) : (
                  <span className="text-muted-foreground">Mark daily practice as completed</span>
                )}
              </label>
            </div>

            {/* History dots (past 14 days) */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Past 14 Days History</span>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
                {Array.from({ length: 14 }).map((_, idx) => {
                  const date = subDays(new Date(), 13 - idx);
                  const dateStr = date.toISOString().split('T')[0];
                  const historyDay = dailyGoal.history.find(h => h.date.startsWith(dateStr));
                  const isCompleted = historyDay?.completed;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold select-none shrink-0",
                        isCompleted ? "bg-emerald-600 text-white" : "bg-secondary text-muted-foreground border border-border"
                      )}
                      title={`${date.toLocaleDateString()}: ${isCompleted ? 'Completed' : 'Pending'}`}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* LeetCode Tracker Card */}
        {profileStats && profileStats.leetcode ? (
          <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-500" /> LeetCode Profile
              </h3>
              <span className="text-[10px] text-muted-foreground">Rank: #{profileStats.leetcode.ranking?.toLocaleString() || '?'}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-secondary border border-border/50 p-2 rounded">
                <p className="text-sm font-bold text-foreground">{profileStats.leetcode.totalSolved}</p>
                <p className="text-[9px] text-muted-foreground">Solved</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                <p className="text-sm font-bold text-emerald-400">{profileStats.leetcode.easySolved}</p>
                <p className="text-[9px] text-emerald-500/80">Easy</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                <p className="text-sm font-bold text-amber-400">{profileStats.leetcode.mediumSolved}</p>
                <p className="text-[9px] text-amber-500/80">Medium</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded">
                <p className="text-sm font-bold text-rose-400">{profileStats.leetcode.hardSolved}</p>
                <p className="text-[9px] text-rose-500/80">Hard</p>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground flex justify-between pt-1 border-t border-border/40">
              <span>Acceptance Rate: {profileStats.leetcode.acceptanceRate}%</span>
              <span>Sync Active</span>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 min-h-[110px]">
            <Code2 className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">LeetCode Stats Not Synced</p>
            <p className="text-[10px] text-muted-foreground">Add your LeetCode username in Settings → Profile.</p>
          </div>
        )}

        {/* GFG Tracker Card */}
        {profileStats && profileStats.gfg ? (
          <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-500" /> GeeksforGeeks Profile
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Live Synced
                </Badge>
                {profileStats.gfg.profileUrl && (
                  <a
                    href={profileStats.gfg.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-emerald-400 transition-colors"
                    title="Open GeeksforGeeks Profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-secondary/40 border border-border/50 p-2.5 rounded-lg">
              {profileStats.gfg.avatar ? (
                <img
                  src={profileStats.gfg.avatar}
                  alt={profileStats.gfg.displayName || profileStats.gfg.username}
                  className="w-10 h-10 rounded-full object-cover border border-emerald-500/50 shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                  GFG
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-bold text-foreground truncate">
                    {profileStats.gfg.displayName || profileStats.gfg.username}
                  </p>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {profileStats.gfg.totalSolved} Solved
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <span>@{profileStats.gfg.username}</span>
                  {profileStats.gfg.totalActiveDays !== undefined && profileStats.gfg.totalActiveDays > 0 && (
                    <>
                      <span>•</span>
                      <span>{profileStats.gfg.totalActiveDays} active days</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Difficulty breakdown */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="bg-secondary/40 rounded p-1">
                <span className="text-[9px] text-sky-400 uppercase font-semibold">Basic</span>
                <p className="text-xs font-bold text-foreground">{profileStats.gfg.byDifficulty?.basic ?? 0}</p>
              </div>
              <div className="bg-secondary/40 rounded p-1">
                <span className="text-[9px] text-emerald-400 uppercase font-semibold">Easy</span>
                <p className="text-xs font-bold text-emerald-400">{profileStats.gfg.byDifficulty?.easy ?? 0}</p>
              </div>
              <div className="bg-secondary/40 rounded p-1">
                <span className="text-[9px] text-amber-400 uppercase font-semibold">Medium</span>
                <p className="text-xs font-bold text-amber-400">{profileStats.gfg.byDifficulty?.medium ?? 0}</p>
              </div>
              <div className="bg-secondary/40 rounded p-1">
                <span className="text-[9px] text-rose-400 uppercase font-semibold">Hard</span>
                <p className="text-xs font-bold text-rose-400">{profileStats.gfg.byDifficulty?.hard ?? 0}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 min-h-[110px]">
            <GraduationCap className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">GFG Stats Not Synced</p>
            <p className="text-[10px] text-muted-foreground">Add your GeeksforGeeks username in Settings → Profile.</p>
          </div>
        )}
      </div>

      {/* Special Filter Mode Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {FILTER_MODES.map(mode => (
          <button
            key={mode.value}
            onClick={() => setFilterMode(mode.value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all',
              filterMode === mode.value
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-secondary/40'
            )}
          >
            <span className={cn(filterMode === mode.value ? 'text-primary' : mode.color)}>
              {mode.icon}
            </span>
            <span className="text-xs font-medium truncate">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Standard Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-card border border-border p-4 rounded-lg">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search problems by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 w-full md:w-auto shrink-0">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            <option value="">All Difficulty</option>
            {DSA_DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            <option value="">All Platforms</option>
            {DSA_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            <option value="">All Topics</option>
            {DSA_TOPICS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Problems table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : problems.length === 0 ? (
        <div className="bg-card border border-border p-12 rounded-lg text-center">
          <Code2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No problems solved matching filters.</p>
          {filterMode !== 'ALL' && (
            <p className="text-xs text-muted-foreground mt-1">
              Tag problems with <code className="bg-secondary px-1.5 py-0.5 rounded text-[10px]">
                {filterMode === 'ONE_TIME_REVISION' ? 'one-time-revision' : filterMode === 'BEFORE_PLACEMENT' ? 'before-placement' : 'quick-review'}
              </code> when adding/editing them to see them here.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-card border border-border rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Problem</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Topics</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flags</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revisions Due</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {problems.map((p) => {
                const diffColor = {
                  EASY: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                  MEDIUM: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                  HARD: 'text-rose-400 bg-rose-400/10 border-rose-400/20'
                }[p.difficulty];

                // Check active pending revisions
                const activeRevision = p.revisions?.find(r => !r.completedAt);

                // Special flag tags
                const hasOneTimeRevision = p.tags?.includes('one-time-revision');
                const hasBeforePlacement = p.tags?.includes('before-placement');
                const hasQuickReview = p.tags?.includes('quick-review');

                return (
                  <tr key={p.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm text-foreground">{p.name}</span>
                        <div className="flex items-center gap-2">
                          {p.problemUrl && (
                            <a href={p.problemUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                              Problem <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {p.solutionUrl && (
                            <a href={p.solutionUrl} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground hover:underline flex items-center gap-0.5">
                              Solution <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={diffColor}>{p.difficulty}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {p.topics?.slice(0, 3).map(t => (
                          <Badge key={t} variant="secondary" className="text-[10px] py-0.5 bg-secondary/80">
                            {t.replace('_', ' ')}
                          </Badge>
                        ))}
                        {p.topics?.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] py-0.5">
                            +{p.topics.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-muted-foreground">{p.platform}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {hasOneTimeRevision && (
                          <span className="flex items-center gap-1 text-[10px] text-blue-400">
                            <RefreshCw className="w-3 h-3" /> Revision
                          </span>
                        )}
                        {hasBeforePlacement && (
                          <span className="flex items-center gap-1 text-[10px] text-rose-400">
                            <Target className="w-3 h-3" /> Placement
                          </span>
                        )}
                        {hasQuickReview && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                            <Eye className="w-3 h-3" /> Quick
                          </span>
                        )}
                        {!hasOneTimeRevision && !hasBeforePlacement && !hasQuickReview && (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {activeRevision ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Due {new Date(activeRevision.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCompleteRevision(activeRevision.id)}
                            className="h-7 px-2 hover:bg-emerald-500/10 text-emerald-400"
                            title="Complete Revision"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary" onClick={() => handleOpenEditModal(p)}>
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/15 hover:text-destructive" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProblem ? 'Edit DSA Problem' : 'Add New DSA Problem'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Problem Name *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Two Sum" className="bg-secondary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Platform</label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value as DsaPlatform)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {DSA_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as DsaDifficulty)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {DSA_DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Difficulty Rating (1-5)</label>
                <Input type="number" min="1" max="5" value={personalRating} onChange={e => setPersonalRating(Number(e.target.value))} className="bg-secondary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Time Taken (min)</label>
                <Input type="number" min="1" value={timeTaken} onChange={e => setTimeTaken(Number(e.target.value))} className="bg-secondary" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Problem URL</label>
                <Input type="url" value={problemUrl} onChange={e => setProblemUrl(e.target.value)} placeholder="https://leetcode.com/..." className="bg-secondary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Solution URL</label>
                <Input type="url" value={solutionUrl} onChange={e => setSolutionUrl(e.target.value)} placeholder="https://github.com/..." className="bg-secondary" />
              </div>
            </div>

            {/* Topics Multi-Select */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Topics</label>
              <div className="flex flex-wrap gap-1.5 p-2.5 border border-border bg-secondary rounded-md max-h-[120px] overflow-y-auto">
                {DSA_TOPICS.map((topic) => {
                  const active = topics.includes(topic);
                  return (
                    <button
                      type="button"
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className={cn(
                        'text-[10px] font-medium px-2 py-1 border rounded transition-all flex items-center gap-1',
                        active
                          ? 'bg-primary/20 text-primary border-primary'
                          : 'bg-card text-muted-foreground border-border hover:bg-secondary/80'
                      )}
                    >
                      {active ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                      {topic.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Filter Flags */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground block">Problem Flags</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className={cn(
                  'flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all',
                  oneTimeRevision ? 'bg-blue-400/10 border-blue-400/50 text-blue-400' : 'bg-secondary border-border text-muted-foreground hover:border-blue-400/30'
                )}>
                  <input
                    type="checkbox"
                    checked={oneTimeRevision}
                    onChange={e => setOneTimeRevision(e.target.checked)}
                    className="rounded accent-blue-400"
                  />
                  <div>
                    <RefreshCw className="w-3.5 h-3.5 mb-0.5" />
                    <span className="text-[10px] font-medium block">One-Time Revision</span>
                  </div>
                </label>
                <label className={cn(
                  'flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all',
                  beforePlacement ? 'bg-rose-400/10 border-rose-400/50 text-rose-400' : 'bg-secondary border-border text-muted-foreground hover:border-rose-400/30'
                )}>
                  <input
                    type="checkbox"
                    checked={beforePlacement}
                    onChange={e => setBeforePlacement(e.target.checked)}
                    className="rounded accent-rose-400"
                  />
                  <div>
                    <Target className="w-3.5 h-3.5 mb-0.5" />
                    <span className="text-[10px] font-medium block">Before Placement</span>
                  </div>
                </label>
                <label className={cn(
                  'flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all',
                  quickReview ? 'bg-emerald-400/10 border-emerald-400/50 text-emerald-400' : 'bg-secondary border-border text-muted-foreground hover:border-emerald-400/30'
                )}>
                  <input
                    type="checkbox"
                    checked={quickReview}
                    onChange={e => setQuickReview(e.target.checked)}
                    className="rounded accent-emerald-400"
                  />
                  <div>
                    <Eye className="w-3.5 h-3.5 mb-0.5" />
                    <span className="text-[10px] font-medium block">Just See / Quick Review</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Code (Optional)</label>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Paste code here..."
                rows={4}
                className="w-full p-3 bg-secondary border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Mistakes / Learnings</label>
                <Input value={mistakes} onChange={e => setMistakes(e.target.value)} placeholder="e.g. Forgot edge case for negative numbers" className="bg-secondary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. recursion, trees, fast-slow" className="bg-secondary" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="w-full p-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {editingProblem ? 'Save Changes' : 'Create Problem'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
