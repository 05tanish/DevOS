import React, { useEffect, useState } from 'react';
import {
  Plus, Search, CheckCircle2, Clock, Pause, Play,
  Trash2, Copy, Edit2, ListOrdered,
  GripVertical, Loader2, RefreshCw
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type { Priority, PriorityLevel, PriorityStatus, PriorityStats } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { toast } from 'sonner';

const LEVEL_COLORS: Record<PriorityLevel, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
  HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  LOW: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

const STATUS_COLORS: Record<PriorityStatus, string> = {
  NOT_STARTED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  IN_PROGRESS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  PAUSED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  COMPLETED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  ARCHIVED: 'bg-zinc-800 text-zinc-500 border-zinc-700',
};

/* ── Sortable Priority Card ── */
interface CardProps {
  priority: Priority;
  onEdit: (p: Priority) => void;
  onComplete: (id: string) => void;
  onTogglePause: (p: Priority) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortablePriorityCard({
  priority, onEdit, onComplete, onTogglePause, onDuplicate, onDelete
}: CardProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = useSortable({ id: priority.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const remHours = priority.remainingHours ?? Math.max(priority.estimatedTotalHours - priority.hoursCompleted, 0);
  const remDays = priority.remainingDays ?? (priority.dailyHoursAlloc > 0 ? Math.ceil(remHours / priority.dailyHoursAlloc) : 0);
  const remWeeks = priority.remainingWeeks ?? (remDays > 0 ? +(remDays / 7).toFixed(1) : 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card border border-border rounded-xl p-4 transition-all space-y-3 relative group',
        priority.isActive && 'border-primary/60 shadow-md shadow-primary/5 bg-primary/[0.02]',
        isDragging && 'opacity-50 border-primary cursor-grabbing shadow-lg'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5"
            title="Drag to reorder queue"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground truncate">{priority.title}</h3>
              {priority.isActive && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] font-bold uppercase tracking-wider">
                  Active
                </Badge>
              )}
            </div>
            {priority.category && (
              <span className="text-[10px] text-muted-foreground font-medium">{priority.category}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {priority.deadline && priority.status !== 'COMPLETED' && (() => {
            const days = Math.ceil((new Date(priority.deadline).getTime() - Date.now()) / 86400000);
            const isOverdue = days < 0;
            return (
              <span className={cn(
                "inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider",
                isOverdue
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              )}>
                <Clock className="w-3 h-3" />
                {isOverdue ? 'Overdue' : `${days}d left`}
              </span>
            );
          })()}
          <Badge className={cn('text-[9px] uppercase font-bold border', LEVEL_COLORS[priority.priorityLevel])}>
            {priority.priorityLevel}
          </Badge>
          <Badge className={cn('text-[9px] uppercase font-bold border', STATUS_COLORS[priority.status])}>
            {priority.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Description */}
      {priority.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{priority.description}</p>
      )}

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
          <span>{priority.hoursCompleted}h / {priority.estimatedTotalHours}h completed</span>
          <span className="font-bold text-foreground">{priority.progress}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', priority.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-primary')}
            style={{ width: `${priority.progress}%` }}
          />
        </div>
      </div>

      {/* Time Allocation & Calculation Breakdown */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/20 text-center">
        <div className="bg-secondary/30 rounded-lg p-2">
          <span className="text-[10px] text-muted-foreground block">Daily Alloc</span>
          <span className="text-xs font-bold text-foreground">{priority.dailyHoursAlloc}h/day</span>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2">
          <span className="text-[10px] text-muted-foreground block">Remaining</span>
          <span className="text-xs font-bold text-foreground">{remHours}h</span>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2">
          <span className="text-[10px] text-muted-foreground block">Est. Days</span>
          <span className="text-xs font-bold text-foreground">{remDays} days</span>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2">
          <span className="text-[10px] text-muted-foreground block">Est. Weeks</span>
          <span className="text-xs font-bold text-purple-400">{remWeeks} wks</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-2 border-t border-border/10 text-xs">
        <span className="text-[10px] text-muted-foreground font-mono">Queue #{priority.queuePosition + 1}</span>

        <div className="flex items-center gap-1">
          {priority.status !== 'COMPLETED' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] hover:bg-emerald-500/10 hover:text-emerald-400"
                onClick={() => onComplete(priority.id)}
                title="Mark Complete"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => onTogglePause(priority)}
                title={priority.status === 'PAUSED' ? 'Resume' : 'Pause'}
              >
                {priority.status === 'PAUSED' ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => onEdit(priority)}
            title="Edit Priority"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => onDuplicate(priority.id)}
            title="Duplicate Priority"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(priority.id)}
            title="Delete Priority"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Priority Page Component ── */
export default function PriorityPage() {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [stats, setStats] = useState<PriorityStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sort, setSort] = useState<string>('queueOrder');

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priorityLevel: 'MEDIUM' as PriorityLevel,
    estimatedTotalHours: 10,
    dailyHoursAlloc: 2,
    hoursCompleted: 0,
    deadline: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchAll = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/priorities', {
          params: {
            search: search || undefined,
            priorityLevel: levelFilter !== 'ALL' ? levelFilter : undefined,
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            sort: sort !== 'queueOrder' ? sort : undefined,
            limit: 100,
          },
        }),
        api.get('/priorities/stats'),
      ]);
      setPriorities(listRes.data.data.priorities || []);
      setStats(statsRes.data.data || null);
    } catch (err) {
      toast.error('Failed to load priorities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [search, levelFilter, statusFilter, sort]);

  const openCreateDialog = () => {
    setEditingPriority(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      priorityLevel: 'MEDIUM',
      estimatedTotalHours: 10,
      dailyHoursAlloc: 2,
      hoursCompleted: 0,
      deadline: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (p: Priority) => {
    setEditingPriority(p);
    setFormData({
      title: p.title,
      description: p.description || '',
      category: p.category || '',
      priorityLevel: p.priorityLevel,
      estimatedTotalHours: p.estimatedTotalHours,
      dailyHoursAlloc: p.dailyHoursAlloc,
      hoursCompleted: p.hoursCompleted,
      deadline: p.deadline ? new Date(p.deadline).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Title is required');

    try {
      if (editingPriority) {
        await api.patch(`/priorities/${editingPriority.id}`, formData);
        toast.success('Priority updated');
      } else {
        await api.post('/priorities', formData);
        toast.success('Priority created in queue');
      }
      setDialogOpen(false);
      fetchAll();
    } catch (err) {
      toast.error('Failed to save priority');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.patch(`/priorities/${id}/complete`);
      toast.success('Priority marked completed! Next priority activated.');
      fetchAll();
    } catch (err) {
      toast.error('Failed to complete priority');
    }
  };

  const handleTogglePause = async (p: Priority) => {
    try {
      const nextStatus = p.status === 'PAUSED' ? 'IN_PROGRESS' : 'PAUSED';
      await api.patch(`/priorities/${p.id}`, { status: nextStatus });
      toast.success(`Priority ${nextStatus === 'PAUSED' ? 'paused' : 'resumed'}`);
      fetchAll();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/priorities/${id}/duplicate`);
      toast.success('Priority duplicated to queue');
      fetchAll();
    } catch (err) {
      toast.error('Failed to duplicate priority');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this priority?')) return;
    try {
      await api.delete(`/priorities/${id}`);
      fetchAll();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleRequeue = async (id: string) => {
    try {
      await api.patch(`/priorities/${id}`, { status: 'NOT_STARTED' });
      fetchAll();
    } catch (error) {
      console.error('Requeue failed:', error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = priorities.findIndex((p) => p.id === active.id);
    const newIndex = priorities.findIndex((p) => p.id === over.id);

    const reordered = arrayMove(priorities, oldIndex, newIndex).map((p, idx) => ({
      ...p,
      queuePosition: idx,
    }));

    setPriorities(reordered);

    try {
      await api.post('/priorities/reorder', {
        items: reordered.map((p) => ({ id: p.id, queuePosition: p.queuePosition })),
      });
      toast.success('Queue order updated');
    } catch (err) {
      toast.error('Failed to save queue order');
      fetchAll();
    }
  };

  // Divide into Kanban columns
  const activePriorities = priorities.filter((p) => p.status === 'IN_PROGRESS');
  const queuePriorities = priorities.filter((p) => p.status === 'NOT_STARTED' || p.status === 'PAUSED');
  const completedPriorities = priorities.filter((p) => p.status === 'COMPLETED');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-card border border-border p-5 rounded-xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-primary" /> Execution Queue
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage long-term major goals sequentially. Time allocation automatically predicts completion timelines.
          </p>
        </div>

        <Button onClick={openCreateDialog} className="bg-primary text-primary-foreground font-semibold text-xs h-9">
          <Plus className="w-4 h-4 mr-1.5" /> Add New Priority
        </Button>
      </div>

      {/* Overview Metric Bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="bg-card border border-border p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active Goal</span>
            <p className="text-sm font-bold text-foreground truncate">
              {stats.activePriority ? stats.activePriority.title : 'None Selected'}
            </p>
          </div>

          <div className="bg-card border border-border p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Planned Daily</span>
            <p className="text-sm font-bold text-foreground">{stats.todayPlannedHours} hrs/day</p>
          </div>

          <div className="bg-card border border-border p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Hours Remaining</span>
            <p className="text-sm font-bold text-foreground">{stats.totalRemainingHours} hrs</p>
          </div>

          <div className="bg-card border border-border p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Est. Weeks</span>
            <p className="text-sm font-bold text-purple-400">{stats.totalWeeksRemaining ?? 0} wks</p>
          </div>

          <div className="bg-card border border-border p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Overall Progress</span>
            <p className="text-sm font-bold text-emerald-400">{stats.overallProgress}%</p>
          </div>

          <div className="bg-card border border-border p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Est. Timeline Finish</span>
            <p className="text-sm font-bold text-foreground">
              {stats.estimatedFinishDate ? new Date(stats.estimatedFinishDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Search priorities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-secondary/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="h-9 px-2.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
          >
            <option value="ALL">All Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">Active</option>
            <option value="NOT_STARTED">Queued</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Sort Order */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 px-2.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
          >
            <option value="queueOrder">Queue Order</option>
            <option value="deadline">Deadline</option>
            <option value="progress">Progress</option>
            <option value="hoursRemaining">Hours Remaining</option>
            <option value="createdAt">Created Date</option>
          </select>

          <Button variant="outline" size="sm" onClick={fetchAll} className="h-9 px-2.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Active Priorities */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-foreground">Current Active</h2>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                  {activePriorities.length}
                </Badge>
              </div>

              <div className="space-y-3 min-h-[150px]">
                {activePriorities.length === 0 ? (
                  <div className="border border-dashed border-border/50 rounded-xl p-6 text-center">
                    <p className="text-xs text-muted-foreground">No active priority right now.</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">Complete or activate an item in the queue.</p>
                  </div>
                ) : (
                  activePriorities.map((p) => (
                    <SortablePriorityCard
                      key={p.id}
                      priority={p}
                      onEdit={openEditDialog}
                      onComplete={handleComplete}
                      onTogglePause={handleTogglePause}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Queued Priorities */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-foreground">Execution Queue</h2>
                </div>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                  {queuePriorities.length}
                </Badge>
              </div>

              <SortableContext items={queuePriorities.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 min-h-[150px]">
                  {queuePriorities.length === 0 ? (
                    <div className="border border-dashed border-border/50 rounded-xl p-6 text-center">
                      <p className="text-xs text-muted-foreground">Queue is empty.</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">Click "Add New Priority" to queue major goals.</p>
                    </div>
                  ) : (
                    queuePriorities.map((p) => (
                      <SortablePriorityCard
                        key={p.id}
                        priority={p}
                        onEdit={openEditDialog}
                        onComplete={handleComplete}
                        onTogglePause={handleTogglePause}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </div>

            {/* Column 3: Completed Priorities */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-bold text-foreground">Completed</h2>
                </div>
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                  {completedPriorities.length}
                </Badge>
              </div>

              <div className="space-y-3 min-h-[150px]">
                {completedPriorities.length === 0 ? (
                  <div className="border border-dashed border-border/50 rounded-xl p-6 text-center">
                    <p className="text-xs text-muted-foreground">No completed priorities yet.</p>
                  </div>
                ) : (
                  completedPriorities.map((p) => (
                    <div key={p.id} className="bg-card/60 border border-border/60 rounded-xl p-4 space-y-2 opacity-80 transition-opacity">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-foreground line-through">{p.title}</h3>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Completed on {p.completedAt ? new Date(p.completedAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px]">Finished</Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2 border-t border-border/20 opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs flex-1 text-muted-foreground hover:text-foreground"
                          onClick={() => handleRequeue(p.id)}
                        >
                          <RefreshCw className="w-3 h-3 mr-1.5" /> Requeue
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(p)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DndContext>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPriority ? 'Edit Priority' : 'Create New Priority'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Title <span className="text-red-500 font-bold">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Build AI Assistant, Learn Kubernetes"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional scope, key outcomes, resources..."
                rows={3}
                className="w-full p-2.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Category</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Backend, AI, DevOps..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Priority Level <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  value={formData.priorityLevel}
                  onChange={(e) => setFormData({ ...formData, priorityLevel: e.target.value as PriorityLevel })}
                  className="w-full h-9 px-2.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
                  required
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Est. Total Hours <span className="text-red-500 font-bold">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={formData.estimatedTotalHours}
                  onChange={(e) => setFormData({ ...formData, estimatedTotalHours: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Daily Hours Allocation <span className="text-red-500 font-bold">*</span>
                </label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={formData.dailyHoursAlloc}
                  onChange={(e) => setFormData({ ...formData, dailyHoursAlloc: Number(e.target.value) })}
                />
              </div>
            </div>

            {editingPriority && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Hours Completed</label>
                <Input
                  type="number"
                  min="0"
                  max={formData.estimatedTotalHours}
                  value={formData.hoursCompleted}
                  onChange={(e) => {
                    const done = Number(e.target.value);
                    const progress = Math.min(Math.round((done / Math.max(formData.estimatedTotalHours, 1)) * 100), 100);
                    setFormData({ ...formData, hoursCompleted: done, ...(progress ? { progress } : {}) });
                  }}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Target Deadline (Optional)</label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            {/* Auto-calculated Est. Weeks Preview */}
            {formData.estimatedTotalHours > 0 && formData.dailyHoursAlloc > 0 && (
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-1">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Estimated Duration Preview</span>
                <div className="flex gap-4 text-xs text-foreground font-semibold">
                  <span>{Math.ceil((formData.estimatedTotalHours - formData.hoursCompleted) / formData.dailyHoursAlloc)} days</span>
                  <span className="text-purple-400">
                    ~{+(Math.ceil((formData.estimatedTotalHours - formData.hoursCompleted) / formData.dailyHoursAlloc) / 7).toFixed(1)} weeks
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground text-xs font-semibold">
                {editingPriority ? 'Save Changes' : 'Queue Priority'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
