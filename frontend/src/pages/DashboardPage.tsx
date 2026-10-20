import { useEffect, useState } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout/legacy';
import {
  Code2, CalendarCheck,
  Bell, Target, Briefcase, FileText, TrendingUp, CheckCircle2,
  Clock, AlertCircle, Flame, Loader2, Edit2, Check, RotateCcw, Eye, EyeOff, ListOrdered,
  ExternalLink, GraduationCap
} from 'lucide-react';
import { Github } from '../components/ui/BrandIcons';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import type { GfgProfileStats } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

// Import react-grid-layout styles
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ReactGridLayout = WidthProvider(RGL);

/* ─── Types ─────────────────────────────────────────────────────────── */
interface DashStats {
  priority?: {
    active: { id: string; title: string; progress: number; estimatedTotalHours: number; hoursCompleted: number; dailyHoursAlloc: number } | null;
    next: { id: string; title: string; priorityLevel: string } | null;
  };
  tasks: { dueToday: number; completedToday: number; pending: number };
  dsa: { totalSolved: number; dueRevisions: number };
  github: { currentStreak: number; longestStreak: number; totalCommits: number; todayCommits: number; hasCommittedToday: boolean };
  gfg?: GfgProfileStats;
  learning: { minutesToday: number };
  jobs: Record<string, number>;
  books: { reading: { id: string; title: string; author?: string; currentPage: number; totalPages?: number }[]; count: number };
  notes: { pinned: number; total: number };
  reminders: { active: number };
}

interface WidgetConfig {
  id: string;
  type: string;
  visible: boolean;
  config: Record<string, any>;
}

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/* ─── Reusable Widget Card ───────────────────────────────────────────── */
interface WidgetProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  isEditing?: boolean;
}

function Widget({ title, icon: Icon, children, className, isEditing }: WidgetProps) {
  return (
    <div className={cn(
      'bg-card border border-border rounded-xl p-4 flex flex-col gap-3 h-full select-none transition-all duration-200 shadow-sm hover:border-muted-foreground/30 hover:translate-y-[-1px]',
      isEditing && 'border-primary/80 bg-primary/[0.02] cursor-grab active:cursor-grabbing hover:translate-y-0',
      className
    )}>
      <div className="flex items-center justify-between border-b border-border/30 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
        </div>
        {isEditing && (
          <span className="text-[8px] bg-primary/20 text-primary border border-primary/30 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
            Draggable
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin">
        {children}
      </div>
    </div>
  );
}

function StatRow({ label, value, variant = 'default' }: { label: string; value: string | number; variant?: 'default' | 'accent' | 'warn' | 'success' }) {
  const colors = {
    default: 'text-foreground',
    accent: 'text-primary',
    warn: 'text-amber-400',
    success: 'text-emerald-400',
  };
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/10 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-semibold tabular-nums', colors[variant])}>{value}</span>
    </div>
  );
}

/* ─── Individual Widgets ─────────────────────────────────────────────── */
function TasksWidget({ data, isEditing }: { data: DashStats['tasks']; isEditing?: boolean }) {
  const pct = data.dueToday > 0 ? Math.round((data.completedToday / data.dueToday) * 100) : 0;
  return (
    <Widget title="Today's Tasks" icon={CalendarCheck} isEditing={isEditing}>
      <div className="space-y-2">
        <div className="space-y-1">
          <StatRow label="Due today" value={data.dueToday} />
          <StatRow label="Completed" value={data.completedToday} variant="success" />
          <StatRow label="Pending" value={data.pending} variant={data.pending > 3 ? 'warn' : 'default'} />
        </div>
        {data.dueToday > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Progress</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>
    </Widget>
  );
}

function DSAWidget({ data, isEditing }: { data: DashStats['dsa']; isEditing?: boolean }) {
  return (
    <Widget title="DSA Progress" icon={Code2} isEditing={isEditing}>
      <div className="space-y-3">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{data.totalSolved}</p>
            <p className="text-[10px] text-muted-foreground">Total Solved</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className={cn('text-2xl font-bold tabular-nums', data.dueRevisions > 0 ? 'text-amber-400' : 'text-emerald-400')}>
              {data.dueRevisions}
            </p>
            <p className="text-[10px] text-muted-foreground">Revisions Due</p>
          </div>
        </div>
        {data.dueRevisions > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-2 py-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {data.dueRevisions} problem{data.dueRevisions > 1 ? 's' : ''} need review
          </div>
        )}
      </div>
    </Widget>
  );
}

function GitHubWidget({ data, isEditing }: { data: DashStats['github']; isEditing?: boolean }) {
  return (
    <Widget title="GitHub Streak" icon={Github} isEditing={isEditing}>
      <div className="space-y-3">
        <div className="flex items-center justify-around text-center">
          <div>
            <div className="flex items-center gap-1 justify-center">
              <Flame className={cn('w-4 h-4', data.currentStreak > 0 ? 'text-orange-400' : 'text-muted-foreground')} />
              <p className="text-2xl font-bold text-foreground tabular-nums">{data.currentStreak}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Current Streak</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{data.longestStreak}</p>
            <p className="text-[10px] text-muted-foreground">Best Streak</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs border-t border-border/10 pt-2">
          <span className="text-[10px] text-muted-foreground">Today's commits</span>
          {data.hasCommittedToday ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] hover:bg-emerald-500/10 font-bold">
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />{data.todayCommits} commits
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-400 border border-amber-400/20 text-[9px] font-bold bg-amber-400/5">
              Pending check
            </Badge>
          )}
        </div>
      </div>
    </Widget>
  );
}

function GFGWidget({ data, isEditing }: { data?: GfgProfileStats; isEditing?: boolean }) {
  if (!data) {
    return (
      <Widget title="GeeksforGeeks Profile" icon={GraduationCap} isEditing={isEditing}>
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2">
          <GraduationCap className="w-8 h-8 opacity-40 text-emerald-500" />
          <p className="text-xs">No GeeksforGeeks stats connected yet.</p>
          <span className="text-[10px] text-muted-foreground/70">Connect GFG username in Settings → Profile</span>
        </div>
      </Widget>
    );
  }

  const {
    displayName, username, avatar, institution,
    totalSolved, totalActiveDays = 0, byDifficulty,
    topicAnalysis = [], profileUrl
  } = data;

  const dSchool = byDifficulty?.school || 0;
  const dBasic = byDifficulty?.basic || 0;
  const dEasy = byDifficulty?.easy || 0;
  const dMedium = byDifficulty?.medium || 0;
  const dHard = byDifficulty?.hard || 0;
  const sumDifficulty = (dSchool + dBasic + dEasy + dMedium + dHard) || totalSolved || 1;

  const pSchool = (dSchool / sumDifficulty) * 100;
  const pBasic = (dBasic / sumDifficulty) * 100;
  const pEasy = (dEasy / sumDifficulty) * 100;
  const pMedium = (dMedium / sumDifficulty) * 100;
  const pHard = (dHard / sumDifficulty) * 100;

  return (
    <Widget
      title="GeeksforGeeks Profile & Analytics"
      icon={GraduationCap}
      isEditing={isEditing}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-3 h-full">
        {/* Top Profile Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-secondary/30 border border-border/40 p-3 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={displayName || username}
                  className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/50 shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-bold text-white text-sm shadow-sm">
                  {(displayName || username || 'G').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card flex items-center justify-center" title="Live Synced">
                <Check className="w-2 h-2 text-black stroke-[3]" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-foreground truncate">{displayName || username}</h4>
                <span className="text-[11px] font-mono text-emerald-400">@{username}</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Live API
                </Badge>
              </div>
              {institution && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                  <GraduationCap className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{institution}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <a
              href={profileUrl || `https://www.geeksforgeeks.org/user/${username}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
            >
              <span>View Profile</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Total Solved Card */}
          <div className="bg-secondary/40 border border-border/50 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Solved</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">{totalSolved}</span>
              <span className="text-[10px] text-muted-foreground">solved</span>
            </div>
          </div>

          {/* Active Days Card */}
          <div className="bg-secondary/40 border border-border/50 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Days</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-foreground font-mono tracking-tight">{totalActiveDays}</span>
              <span className="text-[10px] text-muted-foreground">days</span>
            </div>
          </div>

          {/* Easy / Medium Highlight */}
          <div className="bg-secondary/40 border border-border/50 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Easy / Medium</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-emerald-400 font-mono">{dEasy}</span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xl font-bold text-amber-400 font-mono">{dMedium}</span>
            </div>
          </div>

          {/* Hard Solved */}
          <div className="bg-secondary/40 border border-border/50 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Hard Solved</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-400 font-mono tracking-tight">{dHard}</span>
              <span className="text-[10px] text-rose-400/70 font-semibold">advanced</span>
            </div>
          </div>
        </div>

        {/* Difficulty Breakdown Segmented Bar & Badges */}
        <div className="bg-secondary/20 border border-border/30 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Difficulty Distribution
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">{totalSolved} problems</span>
          </div>

          {/* Multi-segment progress bar */}
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex shadow-inner">
            {pSchool > 0 && <div style={{ width: `${pSchool}%` }} className="bg-slate-400 h-full transition-all" title={`School: ${dSchool}`} />}
            {pBasic > 0 && <div style={{ width: `${pBasic}%` }} className="bg-sky-400 h-full transition-all" title={`Basic: ${dBasic}`} />}
            {pEasy > 0 && <div style={{ width: `${pEasy}%` }} className="bg-emerald-500 h-full transition-all" title={`Easy: ${dEasy}`} />}
            {pMedium > 0 && <div style={{ width: `${pMedium}%` }} className="bg-amber-500 h-full transition-all" title={`Medium: ${dMedium}`} />}
            {pHard > 0 && <div style={{ width: `${pHard}%` }} className="bg-rose-500 h-full transition-all" title={`Hard: ${dHard}`} />}
          </div>

          {/* Legend Badges */}
          <div className="grid grid-cols-5 gap-1 pt-1 text-center">
            <div className="bg-slate-500/10 border border-slate-500/20 rounded px-1 py-0.5">
              <p className="text-xs font-bold text-slate-300 font-mono">{dSchool}</p>
              <p className="text-[8px] text-slate-400 uppercase font-semibold">School</p>
            </div>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded px-1 py-0.5">
              <p className="text-xs font-bold text-sky-400 font-mono">{dBasic}</p>
              <p className="text-[8px] text-sky-400/80 uppercase font-semibold">Basic</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded px-1 py-0.5">
              <p className="text-xs font-bold text-emerald-400 font-mono">{dEasy}</p>
              <p className="text-[8px] text-emerald-400/80 uppercase font-semibold">Easy</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5">
              <p className="text-xs font-bold text-amber-400 font-mono">{dMedium}</p>
              <p className="text-[8px] text-amber-400/80 uppercase font-semibold">Medium</p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded px-1 py-0.5">
              <p className="text-xs font-bold text-rose-400 font-mono">{dHard}</p>
              <p className="text-[8px] text-rose-400/80 uppercase font-semibold">Hard</p>
            </div>
          </div>
        </div>

        {/* Top Solved Topics Tags */}
        {topicAnalysis.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Top Topics Solved</span>
            <div className="flex flex-wrap gap-1.5">
              {topicAnalysis.slice(0, 8).map((t) => (
                <span
                  key={t.topic}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-secondary border border-border/60 text-foreground font-medium hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors"
                >
                  <span>{t.topic}</span>
                  <span className="font-mono text-emerald-400 font-bold text-[9px]">({t.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Widget>
  );
}

function MilestonesWidget({ data, isEditing }: { data: DashStats; isEditing?: boolean }) {
  const milestones = [
    { label: 'Tasks Completed', value: data.tasks.completedToday, target: Math.max(data.tasks.dueToday, 3), icon: '✅' },
    { label: 'DSA Problems', value: data.dsa.totalSolved % 10, target: 10, icon: '🧩', note: `${data.dsa.totalSolved} total` },
    { label: 'Commits Today', value: data.github?.todayCommits || 0, target: 3, icon: '🔀' },
    { label: 'Books Reading', value: data.books.count, target: 2, icon: '📖' },
  ];
  return (
    <Widget title="Daily Milestones" icon={TrendingUp} isEditing={isEditing}>
      <div className="space-y-2.5">
        {milestones.map(m => {
          const pct = Math.min((m.value / Math.max(m.target, 1)) * 100, 100);
          return (
            <div key={m.label} className="space-y-0.5">
              <div className="flex justify-between items-baseline text-[10px]">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span>{m.icon}</span> {m.label}
                  {m.note && <span className="text-muted-foreground/60">({m.note})</span>}
                </span>
                <span className={cn('font-semibold tabular-nums', pct >= 100 ? 'text-emerald-400' : 'text-foreground')}>
                  {m.value}/{m.target}
                </span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', pct >= 100 ? 'bg-emerald-400' : 'bg-primary')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}


function RevisionWidget({ data, isEditing }: { data: DashStats['dsa']; isEditing?: boolean }) {
  return (
    <Widget title="Revision Due" icon={Clock} isEditing={isEditing}>
      <div className="flex flex-col items-center justify-center py-2 gap-1.5 h-full">
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border',
          data.dueRevisions === 0
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
        )}>
          {data.dueRevisions}
        </div>
        <p className="text-[10px] text-muted-foreground text-center font-medium">
          {data.dueRevisions === 0 ? 'All caught up! 🎉' : `Topic revisions due`}
        </p>
      </div>
    </Widget>
  );
}

function RemindersWidget({ data, isEditing }: { data: DashStats['reminders']; isEditing?: boolean }) {
  return (
    <Widget title="Reminders" icon={Bell} isEditing={isEditing}>
      <div className="flex flex-col items-center justify-center py-2 gap-1.5 h-full">
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary">
          {data.active}
        </div>
        <p className="text-[10px] text-muted-foreground text-center font-medium">Active reminder{data.active !== 1 ? 's' : ''}</p>
      </div>
    </Widget>
  );
}

function PlacementWidget({ isEditing }: { isEditing?: boolean }) {
  const [topics, setTopics] = useState<{ name: string; progress: number }[]>([]);

  useEffect(() => {
    api.get('/placement/topics')
      .then(res => {
        const data: any[] = res.data?.data || [];
        // Aggregate progress per category from topic list
        const catMap: Record<string, { total: number; done: number }> = {};
        data.forEach((t: any) => {
          const cat = t.category || 'General';
          if (!catMap[cat]) catMap[cat] = { total: 0, done: 0 };
          catMap[cat].total += 1;
          if (t.status === 'DONE') catMap[cat].done += 1;
        });
        setTopics(Object.entries(catMap).map(([name, v]) => ({
          name,
          progress: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0,
        })).slice(0, 4));
      })
      .catch(() => {
        // Fallback to placeholder if API fails
        setTopics([
          { name: 'DBMS', progress: 0 },
          { name: 'OS', progress: 0 },
          { name: 'Networks', progress: 0 },
          { name: 'System Design', progress: 0 },
        ]);
      });
  }, []);

  return (
    <Widget title="Placement Prep" icon={Target} isEditing={isEditing}>
      <div className="space-y-1.5 py-1">
        {topics.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">Loading...</p>
        ) : topics.map((c) => (
          <div key={c.name} className="space-y-0.5">
            <div className="flex justify-between text-[9px] text-muted-foreground font-medium">
              <span>{c.name}</span>
              <span>{c.progress}%</span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${c.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

function JobsWidget({ data, isEditing }: { data: DashStats['jobs']; isEditing?: boolean }) {
  const activeStages = ['WISHLIST', 'APPLIED', 'OA', 'INTERVIEW', 'OFFER'];
  return (
    <Widget title="Job Applications" icon={Briefcase} isEditing={isEditing}>
      <div className="grid grid-cols-5 gap-1 pt-2">
        {activeStages.map((stage) => (
          <div key={stage} className="bg-secondary/40 border border-border/10 rounded px-1.5 py-2 text-center flex flex-col justify-between min-h-[50px]">
            <p className="text-base font-bold text-foreground tabular-nums leading-none">{data[stage] || 0}</p>
            <p className="text-[8px] text-muted-foreground truncate uppercase font-bold tracking-wider mt-1">{stage.slice(0, 3)}</p>
          </div>
        ))}
      </div>
    </Widget>
  );
}

function NotesWidget({ data, isEditing }: { data: DashStats['notes']; isEditing?: boolean }) {
  return (
    <Widget title="Notes & Ideas" icon={FileText} isEditing={isEditing}>
      <div className="flex items-center justify-around py-2 h-full">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{data.pinned}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1">Pinned</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{data.total}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1">Total</p>
        </div>
      </div>
    </Widget>
  );
}

function ActivityChartWidget({ isEditing }: { isEditing?: boolean }) {
  const [snapshots, setSnapshots] = useState<any[]>([]);

  useEffect(() => {
    const fetchSnapshots = async () => {
      try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const params = {
          startDate: thirtyDaysAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
        const res = await api.get('/analytics/snapshots', { params });
        const data = res.data.data || [];
        setSnapshots(data.map((snap: any) => ({
          dateStr: new Date(snap.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          'DSA Solved': snap.dsaSolved,
          'DSA Revisions': snap.revisionsCount,
          'GitHub Commits': snap.githubCommits,
          'Tasks Completed': snap.tasksCompleted,
        })));
      } catch (err) {
        console.error('Failed to fetch snapshots for dashboard');
      }
    };
    fetchSnapshots();
  }, []);

  return (
    <Widget title="Daily Activity (30 Days)" icon={TrendingUp} isEditing={isEditing}>
      {snapshots.length === 0 ? (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading...</div>
      ) : (
        <div className="h-full w-full min-h-[120px] text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={snapshots}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d36" vertical={false} />
              <XAxis dataKey="dateStr" stroke="#718096" tick={{fontSize: 9}} tickLine={false} axisLine={false} />
              <YAxis stroke="#718096" tick={{fontSize: 9}} tickLine={false} axisLine={false} width={25} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#171923', borderColor: '#2a2d36', fontSize: '10px' }} />
              <Line type="monotone" dataKey="Tasks Completed" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="DSA Solved" stroke="#ec4899" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="GitHub Commits" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Widget>
  );
}

function PriorityWidget({ data, isEditing }: { data?: DashStats['priority']; isEditing?: boolean }) {
  const active = data?.active;
  const next = data?.next;
  const remHours = active ? Math.max(active.estimatedTotalHours - active.hoursCompleted, 0) : 0;
  const remDays = active && active.dailyHoursAlloc > 0 ? Math.ceil(remHours / active.dailyHoursAlloc) : 0;

  return (
    <Widget title="Current Active Priority" icon={ListOrdered} isEditing={isEditing}>
      {!active ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-2 gap-1">
          <p className="text-xs text-muted-foreground">No active priority in progress.</p>
          <a href="/priority" className="text-[11px] text-primary hover:underline font-semibold">
            Set Priority in Execution Queue →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground truncate">{active.title}</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                Active
              </Badge>
            </div>
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Progress</span>
                <span className="font-semibold text-foreground">{active.progress}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${active.progress}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/20 text-center">
            <div className="bg-secondary/30 rounded p-1.5">
              <p className="text-[10px] text-muted-foreground">Planned Today</p>
              <p className="text-xs font-bold text-foreground">{active.dailyHoursAlloc}h/day</p>
            </div>
            <div className="bg-secondary/30 rounded p-1.5">
              <p className="text-[10px] text-muted-foreground">Remaining</p>
              <p className="text-xs font-bold text-foreground">{remHours}h</p>
            </div>
            <div className="bg-secondary/30 rounded p-1.5">
              <p className="text-[10px] text-muted-foreground">Est. Finish</p>
              <p className="text-xs font-bold text-foreground">{remDays} days</p>
            </div>
          </div>

          {next && (
            <div className="flex items-center justify-between text-[11px] bg-secondary/20 rounded px-2 py-1.5 border border-border/10">
              <span className="text-muted-foreground truncate">Next: <strong className="text-foreground">{next.title}</strong></span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-bold">{next.priorityLevel}</span>
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}

/* ─── Dashboard Page ─────────────────────────────────────────────────── */
export function DashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, layoutRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/layout')
      ]);
      setStats(statsRes.data.data);
      const rawLayout: LayoutItem[] = statsRes.data.data ? (layoutRes.data.data?.layout || []) : [];
      const rawWidgets: WidgetConfig[] = statsRes.data.data ? (layoutRes.data.data?.widgets || []) : [];

      const wList = [...rawWidgets];
      if (!wList.some(w => w?.id === 'gfg')) {
        wList.push({ id: 'gfg', type: 'GFG_PROFILE', visible: true, config: {} });
      }
      const lList = [...rawLayout];
      if (!lList.some(l => l?.i === 'gfg')) {
        lList.push({ i: 'gfg', x: 0, y: 8, w: 12, h: 5 });
      }

      setLayout(lList);
      setWidgets(wList);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLayoutChange = (newLayout: any) => {
    setLayout(newLayout);
  };

  const handleToggleWidget = (widgetId: string) => {
    setWidgets(prev => (prev || []).map(w => {
      if (w.id === widgetId) {
        return { ...w, visible: !w.visible };
      }
      return w;
    }));
  };

  const handleSaveLayout = async () => {
    setSavingLayout(true);
    try {
      await api.patch('/dashboard/layout', {
        layout,
        widgets
      });
      toast.success('Dashboard layout saved successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to save layout configuration');
    } finally {
      setSavingLayout(false);
    }
  };

  const handleResetLayout = async () => {
    if (!confirm('Are you sure you want to reset your layout to the default arrangement?')) return;
    setSavingLayout(true);
    try {
      const res = await api.patch('/dashboard/layout', {
        layout: null, // passing null resets it in backend service
        widgets: null
      });
      setLayout(res.data.data?.layout || []);
      setWidgets(res.data.data?.widgets || []);
      toast.success('Dashboard layout reset to default');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to reset layout');
    } finally {
      setSavingLayout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading your developer board...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Could not load dashboard stats.</p>
        </div>
      </div>
    );
  }

  // Filter layouts and widgets to render visible ones in the grid
  const visibleWidgets = (widgets || []).filter(w => w?.visible);
  const visibleLayout = (layout || []).filter(l => visibleWidgets.some(w => w?.id === l?.i));

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'priority': return <PriorityWidget data={stats.priority} isEditing={isEditing} />;
      case 'tasks': return <TasksWidget data={stats.tasks} isEditing={isEditing} />;
      case 'dsa': return <DSAWidget data={stats.dsa} isEditing={isEditing} />;
      case 'github': return <GitHubWidget data={stats.github} isEditing={isEditing} />;
      case 'milestones': return <MilestonesWidget data={stats} isEditing={isEditing} />;
      case 'revision': return <RevisionWidget data={stats.dsa} isEditing={isEditing} />;
      case 'reminders': return <RemindersWidget data={stats.reminders} isEditing={isEditing} />;
      case 'placement': return <PlacementWidget isEditing={isEditing} />;
      case 'jobs': return <JobsWidget data={stats.jobs} isEditing={isEditing} />;
      case 'notes': return <NotesWidget data={stats.notes} isEditing={isEditing} />;
      case 'gfg': return <GFGWidget data={stats.gfg} isEditing={isEditing} />;
      case 'activityChart': return <ActivityChartWidget isEditing={isEditing} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="border-border hover:bg-secondary/80 text-xs font-semibold"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Customize Layout
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleResetLayout}
                variant="outline"
                size="sm"
                disabled={savingLayout}
                className="border-border text-xs font-semibold hover:text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Default
              </Button>
              <Button
                onClick={handleSaveLayout}
                size="sm"
                disabled={savingLayout}
                className="bg-primary text-primary-foreground text-xs font-semibold shadow-sm"
              >
                {savingLayout ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                )}
                Save Layout
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Widget Visibility Panel during Editing */}
      {isEditing && (
        <div className="bg-card border border-border/80 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-b border-border/30 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Configure Widget Visibility</h3>
            <span className="text-[10px] text-muted-foreground">Select widgets to display on your dashboard grid</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {(widgets || []).map((w) => (
              <button
                key={w.id}
                onClick={() => handleToggleWidget(w.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                  w.visible
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                {w.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {w.id === 'gfg' ? 'GeeksforGeeks' : (w.id.charAt(0).toUpperCase() + w.id.slice(1))} Widget
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GRID LAYOUT CONTAINER */}
      <div className="w-full">
        <ReactGridLayout
          className="layout"
          layout={visibleLayout}
          cols={12}
          rowHeight={38}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={handleLayoutChange as any}
          margin={[16, 16]}
          containerPadding={[0, 0]}
        >
          {visibleWidgets.map((w) => (
            <div key={w.id}>
              {renderWidgetContent(w.id)}
            </div>
          ))}
        </ReactGridLayout>
      </div>
    </div>
  );
}
