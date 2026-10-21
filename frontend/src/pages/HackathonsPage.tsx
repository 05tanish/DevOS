import { useState, useEffect } from 'react';
import { Plus, Search, Users, Trophy, Calendar, ExternalLink, Edit2, Trash2, Link as LinkIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Hackathon {
  id: string;
  name: string;
  teamMembers: string[];
  idea?: string;
  techStack: string[];
  submissionLink?: string;
  githubUrl?: string;
  demoUrl?: string;
  registrationLink?: string;
  deadline?: string;
  status: string;
  prize?: string;
  prizePool?: string;
  teamStatus?: string;
  learnings?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
}

const STATUSES = [
  { value: 'REGISTERED', label: 'Registered', color: 'bg-blue-500', icon: '📝' },
  { value: 'BUILDING', label: 'Building', color: 'bg-yellow-500', icon: '🔨' },
  { value: 'SUBMITTED', label: 'Submitted', color: 'bg-purple-500', icon: '✅' },
  { value: 'RESULTS_AWAITED', label: 'Results Awaited', color: 'bg-orange-500', icon: '⏳' },
  { value: 'WON', label: 'Won', color: 'bg-green-500', icon: '🏆' },
  { value: 'PARTICIPATED', label: 'Participated', color: 'bg-gray-500', icon: '✨' },
];

const emptyForm = {
  name: '', teamMembers: '', idea: '', techStack: '', deadline: '',
  status: 'REGISTERED', prize: '', prizePool: '', registrationLink: '',
  submissionLink: '', githubUrl: '', demoUrl: '', teamStatus: '', learnings: '', notes: '',
};

export default function HackathonsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [filtered, setFiltered] = useState<Hackathon[]>([]);
  const [activeStatus, setActiveStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<any>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Hackathon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Hackathon | null>(null);

  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => { fetchAll(); fetchStats(); }, []);
  useEffect(() => { applyFilter(); }, [hackathons, activeStatus, search]);

  const fetchAll = async () => {
    try {
      const res = await api.get('/hackathons');
      setHackathons(res.data.data);
    } catch { toast.error('Failed to load hackathons'); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/hackathons/stats');
      setStats(res.data.data);
    } catch { /* silent */ }
  };

  const applyFilter = () => {
    let f = [...hackathons];
    if (activeStatus !== 'all') f = f.filter(h => h.status === activeStatus.toUpperCase());
    if (search) f = f.filter(h => h.name.toLowerCase().includes(search.toLowerCase()) || h.idea?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(f);
  };

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setFormOpen(true); };

  const openEdit = (h: Hackathon) => {
    setEditing(h);
    setForm({
      name: h.name || '',
      teamMembers: Array.isArray(h.teamMembers) ? h.teamMembers.join(', ') : (h.teamMembers || ''),
      idea: h.idea || '',
      techStack: Array.isArray(h.techStack) ? h.techStack.join(', ') : (h.techStack || ''),
      deadline: h.deadline ? h.deadline.split('T')[0] : '',
      status: h.status || 'REGISTERED',
      prize: h.prize || '',
      prizePool: h.prizePool || '',
      registrationLink: h.registrationLink || '',
      submissionLink: h.submissionLink || '',
      githubUrl: h.githubUrl || '',
      demoUrl: h.demoUrl || '',
      teamStatus: h.teamStatus || '',
      learnings: h.learnings || '',
      notes: h.notes || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Hackathon name is required');
      return;
    }
    const payload = {
      name: form.name.trim(),
      status: form.status,
      idea: form.idea.trim() || undefined,
      teamMembers: form.teamMembers ? form.teamMembers.split(',').map(s => s.trim()).filter(Boolean) : [],
      techStack: form.techStack ? form.techStack.split(',').map(s => s.trim()).filter(Boolean) : [],
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      prize: form.prize.trim() || undefined,
      prizePool: form.prizePool.trim() || undefined,
      registrationLink: form.registrationLink.trim() || undefined,
      submissionLink: form.submissionLink.trim() || undefined,
      githubUrl: form.githubUrl.trim() || undefined,
      demoUrl: form.demoUrl.trim() || undefined,
      teamStatus: form.teamStatus.trim() || undefined,
      learnings: form.learnings.trim() || undefined,
      notes: form.notes.trim() || undefined,
      tags: [],
    };
    try {
      if (editing) {
        await api.patch(`/hackathons/${editing.id}`, payload);
        toast.success('Hackathon updated');
        if (detailItem?.id === editing.id) setDetailItem({ ...detailItem, ...payload } as any);
      } else {
        await api.post('/hackathons', payload);
        toast.success('Hackathon added');
      }
      setFormOpen(false);
      fetchAll();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save hackathon');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/hackathons/${deleteId}`);
      toast.success('Hackathon deleted');
      if (detailItem?.id === deleteId) setDetailItem(null);
      setDeleteId(null);
      fetchAll();
      fetchStats();
    } catch { toast.error('Failed to delete hackathon'); }
  };

  const statusBadge = (status: string) => {
    const s = STATUSES.find(x => x.value === status);
    return <Badge className={s?.color ?? 'bg-gray-500'} variant="secondary">{s?.icon} {s?.label ?? status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hackathon Hub</h1>
          <p className="text-muted-foreground">Track your hackathon journey</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Hackathon</Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Registered', value: stats.registered, color: 'text-blue-500' },
            { label: 'Building', value: stats.building, color: 'text-yellow-500' },
            { label: 'Submitted', value: stats.submitted, color: 'text-purple-500' },
            { label: 'Won', value: stats.won, color: 'text-green-500' },
          ].map(s => (
            <Card key={s.label}>
              <CardHeader className="pb-1"><CardTitle className="text-sm">{s.label}</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search hackathons..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={activeStatus} onValueChange={setActiveStatus}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value.toLowerCase()}>{s.icon} {s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No hackathons found</p>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Your First Hackathon</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(h => (
            <Card key={h.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setDetailItem(h)}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{h.name}</CardTitle>
                  {statusBadge(h.status)}
                </div>
                {h.idea && <CardDescription className="mt-1 line-clamp-2">{h.idea}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                {h.teamMembers?.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{h.teamMembers.length} member{h.teamMembers.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {h.techStack?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {h.techStack.slice(0, 3).map((t, i) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}
                    {h.techStack.length > 3 && <Badge variant="outline" className="text-xs">+{h.techStack.length - 3}</Badge>}
                  </div>
                )}
                {h.deadline && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(h.deadline), 'MMM dd, yyyy')}
                  </div>
                )}
                {h.prize && (
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{h.prize}</span>
                  </div>
                )}
                <div
                  className="flex gap-1 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(h)}>
                    <Edit2 className="w-3 h-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(h.id)}>
                    <Trash2 className="w-3 h-3 mr-1" />Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Hackathon' : 'Add Hackathon'}</DialogTitle>
            <DialogDescription>Track a hackathon with all details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>
                Name <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Hack The North 2026" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Status <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Project Idea</Label>
              <Textarea value={form.idea} onChange={e => setForm({ ...form, idea: e.target.value })} rows={2} placeholder="AI-powered code review assistant" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Team Members (comma-separated)</Label>
                <Input value={form.teamMembers} onChange={e => setForm({ ...form, teamMembers: e.target.value })} placeholder="Alice, Bob, Charlie" />
              </div>
              <div>
                <Label>Team Status</Label>
                <Input value={form.teamStatus} onChange={e => setForm({ ...form, teamStatus: e.target.value })} placeholder="Looking for members, Full team, Solo" />
              </div>
            </div>
            <div>
              <Label>Tech Stack (comma-separated)</Label>
              <Input value={form.techStack} onChange={e => setForm({ ...form, techStack: e.target.value })} placeholder="React, Node.js, OpenAI" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prize</Label>
                <Input value={form.prize} onChange={e => setForm({ ...form, prize: e.target.value })} placeholder="1st Place, Runner-up" />
              </div>
              <div>
                <Label>Prize Pool</Label>
                <Input value={form.prizePool} onChange={e => setForm({ ...form, prizePool: e.target.value })} placeholder="$10,000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Registration Link</Label>
                <Input value={form.registrationLink} onChange={e => setForm({ ...form, registrationLink: e.target.value })} placeholder="https://devpost.com/..." />
              </div>
              <div>
                <Label>GitHub URL</Label>
                <Input value={form.githubUrl} onChange={e => setForm({ ...form, githubUrl: e.target.value })} placeholder="https://github.com/..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Demo URL</Label>
                <Input value={form.demoUrl} onChange={e => setForm({ ...form, demoUrl: e.target.value })} placeholder="https://demo.myapp.com" />
              </div>
              <div>
                <Label>Submission Link</Label>
                <Input value={form.submissionLink} onChange={e => setForm({ ...form, submissionLink: e.target.value })} placeholder="https://devpost.com/submit/..." />
              </div>
            </div>
            <div>
              <Label>Learnings</Label>
              <Textarea value={form.learnings} onChange={e => setForm({ ...form, learnings: e.target.value })} rows={2} placeholder="What did you learn from this hackathon?" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any additional notes..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Save Changes' : 'Add Hackathon'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Hackathon?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle className="text-xl">{detailItem.name}</DialogTitle>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => { setDetailItem(null); openEdit(detailItem); }}>
                      <Edit2 className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setDetailItem(null); setDeleteId(detailItem.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {statusBadge(detailItem.status)}
                  {detailItem.deadline && (
                    <Badge variant="outline">📅 {format(new Date(detailItem.deadline), 'MMM dd, yyyy')}</Badge>
                  )}
                </div>
                {detailItem.idea && <p className="text-sm text-muted-foreground">{detailItem.idea}</p>}
                {detailItem.teamMembers?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Team</p>
                    <div className="flex flex-wrap gap-2">
                      {detailItem.teamMembers.map((m, i) => <Badge key={i} variant="outline">{m}</Badge>)}
                    </div>
                  </div>
                )}
                {detailItem.techStack?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Tech Stack</p>
                    <div className="flex flex-wrap gap-1">
                      {detailItem.techStack.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
                    </div>
                  </div>
                )}
                {detailItem.prize && (
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">{detailItem.prize}</span>
                    {detailItem.prizePool && <span className="text-sm text-muted-foreground">({detailItem.prizePool})</span>}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {detailItem.registrationLink && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={detailItem.registrationLink} target="_blank" rel="noopener noreferrer"><LinkIcon className="w-3 h-3 mr-1" />Register</a>
                    </Button>
                  )}
                  {detailItem.githubUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={detailItem.githubUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 mr-1" />GitHub</a>
                    </Button>
                  )}
                  {detailItem.demoUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={detailItem.demoUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 mr-1" />Demo</a>
                    </Button>
                  )}
                  {detailItem.submissionLink && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={detailItem.submissionLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 mr-1" />Submission</a>
                    </Button>
                  )}
                </div>
                {detailItem.learnings && (
                  <div>
                    <p className="text-sm font-medium mb-1">Learnings</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/40 p-3 rounded-lg">{detailItem.learnings}</p>
                  </div>
                )}
                {detailItem.notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/40 p-3 rounded-lg">{detailItem.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
