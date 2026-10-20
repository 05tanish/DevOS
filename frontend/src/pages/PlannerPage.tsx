import React, { useEffect, useState } from 'react';
import {
  Plus, Search, Calendar, CheckCircle2, Circle,
  Trash2, Edit2, Loader2, ArrowRight, ChevronLeft, ChevronRight,
  CalendarArrowUp, Clock, AlertTriangle, Check, Sparkles, CheckSquare, Square
} from 'lucide-react';
import { api } from '../lib/api';
import MDEditor from '@uiw/react-md-editor';
import type { Task, TaskPriority, TaskStatus, TaskScope } from '../types';
import { TASK_PRIORITIES, TASK_SCOPES, TASK_STATUSES } from '../lib/constants';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { cn } from '../lib/utils';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Returns the current date shifted by the 4:00 AM reset boundary.
 * If the current time is between 00:00 and 03:59, the active planner day
 * belongs to yesterday. Reset happens at 4:00 AM morning.
 */
export function getPlannerDate(date: Date = new Date()): Date {
  const d = new Date(date);
  if (d.getHours() < 4) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function PlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Date navigation (used when scope === DAILY) — defaults to active planner day (4 AM reset)
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateString(getPlannerDate()));

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedScope, setSelectedScope] = useState<TaskScope | 'ALL'>('DAILY');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  // Daily Available Hours Capacity — isolated per day
  const [totalAvailableHours, setTotalAvailableHours] = useState<number>(() => {
    const saved = localStorage.getItem(`planner_total_day_hours_${selectedDate}`);
    return saved ? parseFloat(saved) || 8 : 8;
  });

  // Daily Notes — isolated per day
  const [dayNotes, setDayNotes] = useState<string>(() => {
    return localStorage.getItem(`planner_day_notes_${selectedDate}`) || '';
  });

  // Sync daily hours & notes whenever selectedDate changes
  useEffect(() => {
    const savedHours = localStorage.getItem(`planner_total_day_hours_${selectedDate}`);
    setTotalAvailableHours(savedHours ? parseFloat(savedHours) || 8 : 8);

    const savedNotes = localStorage.getItem(`planner_day_notes_${selectedDate}`);
    setDayNotes(savedNotes || '');
  }, [selectedDate]);

  const handleTotalHoursChange = (val: number) => {
    const rounded = Math.max(0.5, Math.min(24, Math.round(val * 10) / 10));
    setTotalAvailableHours(rounded);
    localStorage.setItem(`planner_total_day_hours_${selectedDate}`, String(rounded));
  };

  const handleDayNotesChange = (val: string) => {
    setDayNotes(val);
    localStorage.setItem(`planner_day_notes_${selectedDate}`, val);
  };

  // Multi-select for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // AI Schedule
  const [aiSchedule, setAiSchedule] = useState<string>('');
  const [aiScheduling, setAiScheduling] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [scope, setScope] = useState<TaskScope>('DAILY');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('1');

  const fetchTasks = async () => {
    try {
      const params: Record<string, string> = {
        page: '1',
        limit: '200',
      };
      if (search) params.search = search;
      if (selectedScope !== 'ALL') params.scope = selectedScope;
      if (selectedPriority) params.priority = selectedPriority;
      // When daily scope, filter by selected date
      if (selectedScope === 'DAILY') params.date = selectedDate;

      const res = await api.get('/planner', { params });
      setTasks(res.data.data.tasks || []);
    } catch (err) {
      toast.error('Failed to fetch tasks');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTasks().finally(() => setLoading(false));
  }, [search, selectedScope, selectedPriority, selectedDate]);

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setStatus('TODO');
    setScope(selectedScope === 'ALL' ? 'DAILY' : selectedScope as TaskScope);
    setCategory('');
    setDueDate(selectedDate);
    setEstimatedHours('1');
    setIsOpen(true);
  };

  const handleOpenEditModal = (t: Task) => {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setPriority(t.priority);
    setStatus(t.status);
    setScope(t.scope);
    setCategory(t.category || '');
    setDueDate(t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '');
    setEstimatedHours(t.estimatedTime ? (t.estimatedTime / 60).toString() : '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Task title is required');

    const parsedHours = parseFloat(estimatedHours);
    const estimatedTimeInMinutes = (!isNaN(parsedHours) && parsedHours > 0)
      ? Math.round(parsedHours * 60)
      : undefined;

    const payload = {
      title,
      description: description || undefined,
      priority,
      status,
      scope,
      category: category || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      estimatedTime: estimatedTimeInMinutes,
    };

    try {
      if (editingTask) {
        await api.patch(`/planner/${editingTask.id}`, payload);
        toast.success('Task updated');
      } else {
        await api.post('/planner', payload);
        toast.success('Task created');
      }
      setIsOpen(false);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/planner/${id}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleMoveToNextDay = async (id: string) => {
    try {
      await api.patch(`/planner/${id}/next-day`);
      toast.success('Task moved to tomorrow');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to move task');
    }
  };

  const handleBulkMoveToNextDay = async () => {
    if (selectedIds.size === 0) return toast.error('Select tasks first');
    try {
      await api.post('/planner/bulk-next-day', { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} task(s) moved to tomorrow`);
      setSelectedIds(new Set());
      fetchTasks();
    } catch (err) {
      toast.error('Failed to move tasks');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return toast.error('Select tasks first');
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} tasks?`)) return;
    try {
      await api.post('/planner/bulk-delete', { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} task(s) deleted`);
      setSelectedIds(new Set());
      fetchTasks();
    } catch (err) {
      toast.error('Failed to delete tasks');
    }
  };

  const toggleSelectTask = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = tasks.length > 0 && tasks.every(t => selectedIds.has(t.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleToggleSelectAll = () => {
    if (tasks.length === 0) return;
    if (allSelected) {
      setSelectedIds(new Set());
      toast.info('Deselected all tasks');
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)));
      toast.info(`Selected all ${tasks.length} task${tasks.length === 1 ? '' : 's'}`);
    }
  };

  const handleToggleSelectColumn = (colTasks: Task[]) => {
    if (colTasks.length === 0) return;
    const colIds = colTasks.map(t => t.id);
    const allColSelected = colIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allColSelected) {
        colIds.forEach(id => next.delete(id));
      } else {
        colIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatusMap: Record<TaskStatus, TaskStatus> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      DONE: 'TODO',
      CANCELLED: 'TODO',
    };
    const nextStatus = nextStatusMap[task.status];
    try {
      await api.patch(`/planner/${task.id}`, { status: nextStatus });
      toast.success(`Task status changed to ${nextStatus.replace('_', ' ')}`);
      fetchTasks();
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  const getPriorityColor = (p: TaskPriority) => {
    return {
      LOW: 'text-muted-foreground bg-secondary/80 border-border',
      MEDIUM: 'text-primary bg-primary/10 border-primary/20',
      HIGH: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      URGENT: 'text-rose-400 bg-rose-400/10 border-rose-400/20'
    }[p];
  };

  // Date navigation helpers
  const navigateDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(toLocalDateString(d));
  };

  const isToday = selectedDate === toLocalDateString(getPlannerDate());

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const plannerToday = getPlannerDate();
    const today = toLocalDateString(plannerToday);
    
    const yestDate = new Date(plannerToday);
    yestDate.setDate(yestDate.getDate() - 1);
    const yesterday = toLocalDateString(yestDate);

    const tomDate = new Date(plannerToday);
    tomDate.setDate(tomDate.getDate() + 1);
    const tomorrow = toLocalDateString(tomDate);

    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    if (dateStr === tomorrow) return 'Tomorrow';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Time budget & allocation calculations
  const totalAllocatedMinutes = tasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0);
  const totalAllocatedHours = Math.round((totalAllocatedMinutes / 60) * 10) / 10;

  const totalCompletedMinutes = tasks.filter(t => t.status === 'DONE').reduce((acc, t) => acc + (t.estimatedTime || 0), 0);
  const totalCompletedHours = Math.round((totalCompletedMinutes / 60) * 10) / 10;

  const isOvertime = totalAllocatedHours > totalAvailableHours;
  const overtimeHours = isOvertime ? Math.round((totalAllocatedHours - totalAvailableHours) * 10) / 10 : 0;
  const remainingHours = !isOvertime ? Math.round((totalAvailableHours - totalAllocatedHours) * 10) / 10 : 0;
  const allocationPercentage = totalAvailableHours > 0 ? Math.min(100, Math.round((totalAllocatedHours / totalAvailableHours) * 100)) : 0;

  // Group tasks by status for columns
  const todoTasks = tasks.filter(t => t.status === 'TODO');
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter(t => t.status === 'DONE');

  // DnD logic
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Find if over is a task or a container
    const overTask = tasks.find(t => t.id === overId);
    const overStatus = overTask ? overTask.status : (overId as TaskStatus);

    if (activeId !== overId) {
      const activeItems = tasks.filter(t => t.status === activeTask.status);
      const overItems = tasks.filter(t => t.status === overStatus);
      
      const oldIndex = activeItems.findIndex(t => t.id === activeId);
      let newIndex = overItems.findIndex(t => t.id === overId);
      if (newIndex < 0) newIndex = overItems.length; // Drop at end of empty col

      let newTasks = [...tasks];
      let hasStatusChange = activeTask.status !== overStatus;

      if (hasStatusChange) {
        // Move across columns
        activeTask.status = overStatus;
        overItems.splice(newIndex, 0, activeTask);
        
        // Optimistic UI update
        newTasks = newTasks.map(t => {
          if (t.id === activeId) return { ...t, status: overStatus };
          return t;
        });
      } else {
        // Reorder within column
        const sortedCol = arrayMove(activeItems, oldIndex, newIndex);
        sortedCol.forEach((t, i) => { t.sortOrder = i; });
        
        newTasks = newTasks.map(t => {
          const sortedItem = sortedCol.find(st => st.id === t.id);
          if (sortedItem) return { ...t, sortOrder: sortedItem.sortOrder };
          return t;
        });
      }

      setTasks(newTasks);

      // Sync with server
      try {
        if (hasStatusChange) {
          await api.patch(`/planner/${activeId}`, { status: overStatus });
        }
        
        // Always reorder the target column to sync sortOrders
        const columnItems = newTasks.filter(t => t.status === overStatus);
        const reorderPayload = columnItems.map((t, idx) => ({ id: t.id, sortOrder: idx }));
        await api.post('/planner/reorder', { items: reorderPayload });
        
      } catch (err) {
        toast.error('Failed to update task order');
        fetchTasks(); // Revert on failure
      }
    }
  };

  const handleAiSchedule = async () => {
    const todoItems = tasks.filter(t => t.status !== 'DONE');
    if (todoItems.length === 0) {
      toast.error('No pending tasks to schedule');
      return;
    }
    setAiScheduling(true);
    setShowAiPanel(true);
    try {
      const res = await api.post('/ai/schedule', {
        tasks: todoItems.map(t => ({
          title: t.title,
          priority: t.priority,
          estimatedMinutes: t.estimatedTime || 60,
        }))
      });
      setAiSchedule(res.data.data.schedule);
      toast.success('AI schedule generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'AI scheduling failed');
    } finally {
      setAiScheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <span>Daily Planner</span>
            <Badge variant="outline" className="text-[10px] font-normal text-primary bg-primary/10 border-primary/20">
              <Clock className="w-3 h-3 mr-1" /> Time Aware
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track your daily tasks, assign required hours, and manage daily workload capacity</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {tasks.length > 0 && (
            <Button
              variant={allSelected ? "secondary" : "outline"}
              onClick={handleToggleSelectAll}
              className={cn(
                "transition-all gap-1.5 text-xs font-semibold",
                allSelected
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-500 hover:bg-amber-500/25"
                  : someSelected
                  ? "border-amber-500/30 text-amber-500/90 hover:bg-amber-500/10"
                  : "text-muted-foreground hover:text-foreground border-border"
              )}
              title={allSelected ? "Deselect all visible tasks" : "Select all visible tasks"}
            >
              {allSelected ? <CheckSquare className="w-4 h-4 text-amber-500" /> : <Square className="w-4 h-4" />}
              <span>{allSelected ? 'Deselect All' : someSelected ? `Select All (${tasks.length})` : `Select All (${tasks.length})`}</span>
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkMoveToNextDay}
              className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
            >
              <CalendarArrowUp className="w-4 h-4 mr-2" />
              Move {selectedIds.size} to Tomorrow
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkDelete}
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedIds.size}
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-muted-foreground">
              Clear
            </Button>
          )}
          <Button onClick={handleOpenAddModal} className="w-full sm:w-auto bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
          <Button
            onClick={handleAiSchedule}
            disabled={aiScheduling}
            className="w-full sm:w-auto gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
          >
            {aiScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiScheduling ? 'Thinking...' : '✨ AI Schedule'}
          </Button>
        </div>
      </div>

      {/* AI Schedule Result Panel */}
      {showAiPanel && (
        <div className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" /> AI Schedule Suggestion
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAiPanel(false)} className="h-7 text-xs text-muted-foreground">
              Dismiss
            </Button>
          </div>
          {aiScheduling ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          ) : aiSchedule ? (
            <div className="prose prose-sm dark:prose-invert max-w-none" data-color-mode="dark">
              <MDEditor.Markdown source={aiSchedule} />
            </div>
          ) : null}
        </div>
      )}

      {/* Scope quick filter tabs */}
      <div className="flex gap-1 bg-secondary/30 p-1 border border-border rounded-lg max-w-md">
        {(['ALL', 'DAILY', 'WEEKLY', 'MONTHLY'] as const).map(sc => (
          <button
            key={sc}
            onClick={() => setSelectedScope(sc)}
            className={cn(
              'flex-1 py-1.5 rounded-md text-xs font-semibold capitalize transition-all',
              (selectedScope === sc)
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {sc.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Date Navigation — visible only for DAILY scope */}
      {selectedScope === 'DAILY' && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
          <button
            onClick={() => navigateDate(-1)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 flex items-center justify-center gap-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {formatDateLabel(selectedDate)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <button
            onClick={() => navigateDate(1)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(toLocalDateString(getPlannerDate()))}
              className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 rounded-md transition-colors"
            >
              Today
            </button>
          )}

          <input
            type="date"
            value={selectedDate}
            onChange={e => e.target.value && setSelectedDate(e.target.value)}
            className="text-xs bg-secondary border border-border text-foreground rounded-md px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
            title="Jump to date"
          />
        </div>
      )}

      {/* ─── DAILY TIME ALLOCATION & HOURS BUDGET SECTION ──────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Daily Hours Budget & Workload Allocation
              </h3>
              <p className="text-xs text-muted-foreground">Assign available hours in your day and track allocated vs remaining time</p>
            </div>
          </div>
          
          {/* Quick presets for available hours */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Presets:</span>
            {[4, 6, 8, 10, 12].map(hrs => (
              <button
                key={hrs}
                onClick={() => handleTotalHoursChange(hrs)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md font-mono transition-colors border',
                  totalAvailableHours === hrs
                    ? 'bg-primary text-primary-foreground font-bold border-primary'
                    : 'bg-secondary/60 text-muted-foreground hover:text-foreground border-border'
                )}
              >
                {hrs}h
              </button>
            ))}
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Day Capacity Input */}
          <div className="bg-secondary/40 border border-border/70 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Available Day Hours</span>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => handleTotalHoursChange(totalAvailableHours - 0.5)}
                className="w-7 h-7 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold text-sm flex items-center justify-center transition-colors"
                title="Decrease 0.5h"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={totalAvailableHours}
                  onChange={e => handleTotalHoursChange(parseFloat(e.target.value) || 0)}
                  className="w-full text-center bg-transparent text-lg font-bold text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary rounded"
                />
              </div>
              <button
                onClick={() => handleTotalHoursChange(totalAvailableHours + 0.5)}
                className="w-7 h-7 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold text-sm flex items-center justify-center transition-colors"
                title="Increase 0.5h"
              >
                +
              </button>
              <span className="text-xs font-semibold text-muted-foreground font-mono">hrs</span>
            </div>
          </div>

          {/* Card 2: Allocated Task Hours */}
          <div className="bg-secondary/40 border border-border/70 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground font-medium">Task Hours Allocated</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg font-bold text-foreground font-mono">{totalAllocatedHours} <span className="text-xs text-muted-foreground">hrs</span></span>
              <span className="text-xs text-muted-foreground font-mono">{tasks.length} task(s)</span>
            </div>
          </div>

          {/* Card 3: Completed Hours */}
          <div className="bg-secondary/40 border border-border/70 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground font-medium">Hours Completed</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg font-bold text-emerald-400 font-mono">{totalCompletedHours} <span className="text-xs text-muted-foreground">hrs</span></span>
              <span className="text-xs text-muted-foreground font-mono">
                {totalAllocatedHours > 0 ? Math.round((totalCompletedHours / totalAllocatedHours) * 100) : 0}% done
              </span>
            </div>
          </div>

          {/* Card 4: Remaining Balance vs Overtime Warning */}
          <div className={cn(
            'border rounded-lg p-3.5 flex flex-col justify-between transition-colors',
            isOvertime
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider">
                {isOvertime ? 'Overtime Warning' : 'Time Left to Utilize'}
              </span>
              {isOvertime ? <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" /> : <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-extrabold font-mono">
                {isOvertime ? `+${overtimeHours}` : remainingHours} <span className="text-xs">hrs</span>
              </span>
              <span className="text-[11px] opacity-80">
                {isOvertime ? 'Exceeds day capacity' : 'Available for work'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Capacity Allocated ({allocationPercentage}%)</span>
            <span className="font-mono">{totalAllocatedHours}h / {totalAvailableHours}h</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                isOvertime
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-cyan-500 to-primary'
              )}
              style={{ width: `${Math.min(100, (totalAllocatedHours / (totalAvailableHours || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Daily Notes & Reflections */}
        <div className="pt-3 border-t border-border/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Day Notes & Focus ({formatDateLabel(selectedDate)})</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">Isolated for {selectedDate}</span>
          </div>
          <textarea
            value={dayNotes}
            onChange={e => handleDayNotesChange(e.target.value)}
            placeholder="Key goals, notes, reminders, or reflections for this day..."
            rows={2}
            className="w-full p-2.5 bg-secondary/40 border border-border/60 rounded-md text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Search and Priority filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-card border border-border p-4 rounded-lg">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {tasks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSelectAll}
              className={cn(
                "h-10 px-3 text-xs font-semibold border transition-all shrink-0 flex items-center gap-2",
                allSelected
                  ? "bg-amber-400/15 border-amber-400/40 text-amber-400 hover:bg-amber-400/25"
                  : someSelected
                  ? "bg-amber-400/10 border-amber-400/30 text-amber-400 hover:bg-amber-400/20"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              )}
              title={allSelected ? "Deselect all visible tasks" : "Select all visible tasks"}
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-amber-400" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground" />
              )}
              <span>{allSelected ? 'Deselect All' : `Select All (${tasks.length})`}</span>
            </Button>
          )}
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary/80 transition-colors cursor-pointer w-full md:w-44"
          >
            <option value="">All Priorities</option>
            {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Board columns */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: TODO */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border pb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To Do ({todoTasks.length})</span>
                {todoTasks.length > 0 && (
                  <button
                    onClick={() => handleToggleSelectColumn(todoTasks)}
                    className="text-[10px] text-muted-foreground hover:text-amber-400 transition-colors flex items-center gap-1 font-medium"
                    title="Select/deselect all To Do tasks"
                  >
                    {todoTasks.every(t => selectedIds.has(t.id)) ? 'Deselect Col' : 'Select Col'}
                  </button>
                )}
              </div>
              <SortableContext items={todoTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div id="TODO" className="space-y-3 overflow-y-auto max-h-[60vh] p-1 scrollbar-thin min-h-[100px]">
                  {todoTasks.map(t => <SortableTaskCard key={t.id} task={t} onToggle={handleToggleStatus} onEdit={handleOpenEditModal} onDelete={handleDelete} onMoveToNextDay={handleMoveToNextDay} isSelected={selectedIds.has(t.id)} onSelect={toggleSelectTask} getPriorityColor={getPriorityColor} />)}
                  {todoTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg pointer-events-none">Drop tasks here</p>}
                </div>
              </SortableContext>
            </div>

            {/* Column 2: IN PROGRESS */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border pb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In Progress ({inProgressTasks.length})</span>
                {inProgressTasks.length > 0 && (
                  <button
                    onClick={() => handleToggleSelectColumn(inProgressTasks)}
                    className="text-[10px] text-muted-foreground hover:text-amber-400 transition-colors flex items-center gap-1 font-medium"
                    title="Select/deselect all In Progress tasks"
                  >
                    {inProgressTasks.every(t => selectedIds.has(t.id)) ? 'Deselect Col' : 'Select Col'}
                  </button>
                )}
              </div>
              <SortableContext items={inProgressTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div id="IN_PROGRESS" className="space-y-3 overflow-y-auto max-h-[60vh] p-1 scrollbar-thin min-h-[100px]">
                  {inProgressTasks.map(t => <SortableTaskCard key={t.id} task={t} onToggle={handleToggleStatus} onEdit={handleOpenEditModal} onDelete={handleDelete} onMoveToNextDay={handleMoveToNextDay} isSelected={selectedIds.has(t.id)} onSelect={toggleSelectTask} getPriorityColor={getPriorityColor} />)}
                  {inProgressTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg pointer-events-none">Drop tasks here</p>}
                </div>
              </SortableContext>
            </div>

            {/* Column 3: DONE */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border pb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed ({doneTasks.length})</span>
                {doneTasks.length > 0 && (
                  <button
                    onClick={() => handleToggleSelectColumn(doneTasks)}
                    className="text-[10px] text-muted-foreground hover:text-amber-400 transition-colors flex items-center gap-1 font-medium"
                    title="Select/deselect all Completed tasks"
                  >
                    {doneTasks.every(t => selectedIds.has(t.id)) ? 'Deselect Col' : 'Select Col'}
                  </button>
                )}
              </div>
              <SortableContext items={doneTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div id="DONE" className="space-y-3 overflow-y-auto max-h-[60vh] p-1 scrollbar-thin min-h-[100px]">
                  {doneTasks.map(t => <SortableTaskCard key={t.id} task={t} onToggle={handleToggleStatus} onEdit={handleOpenEditModal} onDelete={handleDelete} onMoveToNextDay={handleMoveToNextDay} isSelected={selectedIds.has(t.id)} onSelect={toggleSelectTask} getPriorityColor={getPriorityColor} />)}
                  {doneTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg pointer-events-none">Drop tasks here</p>}
                </div>
              </SortableContext>
            </div>
          </div>
        </DndContext>
      )}

      {/* Task Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Task Title *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Design placement revision templates" className="bg-secondary" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Task details..."
                rows={3}
                className="w-full p-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Scope</label>
                <select
                  value={scope}
                  onChange={e => setScope(e.target.value as TaskScope)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {TASK_SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>Hours Needed</span>
                  <span className="text-[10px] text-muted-foreground font-mono">e.g. 1.5 = 1h 30m</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={estimatedHours}
                    onChange={e => setEstimatedHours(e.target.value)}
                    placeholder="e.g. 1.5"
                    className="bg-secondary pr-10"
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold pointer-events-none">
                    hrs
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. DSA, Placement, AI" className="bg-secondary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-secondary" />
              </div>

              {editingTask ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as TaskStatus)}
                    className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              ) : <div />}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {editingTask ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onToggle: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onMoveToNextDay: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  getPriorityColor: (p: TaskPriority) => string;
}

function SortableTaskCard(props: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle — only this triggers drag */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors z-10 select-none"
        title="Drag to reorder"
      >
        ⠿
      </div>
      <div className="pl-5">
        <TaskCard {...props} />
      </div>
    </div>
  );
}

function TaskCard({ task, onToggle, onEdit, onDelete, onMoveToNextDay, isSelected, onSelect, getPriorityColor }: TaskCardProps) {
  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-3 flex flex-col gap-2.5 group hover:border-primary/40 transition-colors cursor-grab active:cursor-grabbing',
        isSelected ? 'border-amber-400/60 bg-amber-400/5' : 'border-border'
      )}
    >
      <div className="flex items-start gap-2.5" onPointerDown={e => e.stopPropagation()}>
        {/* Checkbox for multi-select */}
        <button
          onClick={() => onSelect(task.id)}
          className={cn(
            'shrink-0 mt-0.5 w-4 h-4 rounded border transition-colors',
            isSelected
              ? 'bg-amber-400 border-amber-400'
              : 'border-border hover:border-primary bg-transparent'
          )}
          title="Select for bulk action"
        />
        <button
          onClick={() => onToggle(task)}
          className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-0.5"
          title="Toggle status"
        >
          {task.status === 'DONE' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/10" />
          ) : task.status === 'IN_PROGRESS' ? (
            <ArrowRight className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-xs font-semibold text-foreground leading-tight',
            task.status === 'DONE' && 'line-through text-muted-foreground font-normal'
          )}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-normal">{task.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[10px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={cn('text-[9px] py-0 px-1.5 uppercase', getPriorityColor(task.priority))}>
            {task.priority}
          </Badge>

          {task.estimatedTime ? (
            <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono text-cyan-400 bg-cyan-400/10 border-cyan-400/20">
              <Clock className="w-2.5 h-2.5 mr-0.5 inline" />
              {(task.estimatedTime / 60) >= 1 ? `${(task.estimatedTime / 60).toFixed(1)}h` : `${task.estimatedTime}m`}
            </Badge>
          ) : null}

          {task.category && (
            <span className="bg-secondary px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">{task.category}</span>
          )}
        </div>
        <div className="flex items-center gap-1" onPointerDown={e => e.stopPropagation()}>
          {task.dueDate && (
            <span className="text-muted-foreground flex items-center gap-0.5 mr-1 font-mono">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
            <button
              onClick={() => onMoveToNextDay(task.id)}
              className="p-1 hover:bg-amber-500/10 rounded text-muted-foreground hover:text-amber-500"
              title="Move to next day"
            >
              <CalendarArrowUp className="w-3 h-3" />
            </button>
            <button onClick={() => onEdit(task)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(task.id)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
