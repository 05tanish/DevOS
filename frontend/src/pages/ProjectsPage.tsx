import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Globe, Edit2, Trash2, CheckCircle2, Circle, Clock, Loader2, Sparkles } from 'lucide-react';
import { Github } from '@/components/ui/BrandIcons';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import MDEditor from '@uiw/react-md-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Feature {
  id: string;
  name: string;
  description?: string;
  status: 'COMPLETED' | 'PENDING' | 'FUTURE';
  order: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'IDEA';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  completionPercentage: number;
  techStack: string[];
  githubUrl?: string;
  deploymentUrl?: string;
  notes?: string;
  architectureNotes?: string;
  tags?: string[];
  features: Feature[];
  createdAt: string;
}

const STATUSES = ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'IDEA'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-green-500', COMPLETED: 'bg-blue-500', ON_HOLD: 'bg-yellow-500', IDEA: 'bg-purple-500',
};
const priorityColor: Record<string, string> = {
  CRITICAL: 'text-red-500', HIGH: 'text-orange-500', MEDIUM: 'text-yellow-500', LOW: 'text-green-500',
};

const emptyForm = {
  name: '', description: '', status: 'ACTIVE', priority: 'MEDIUM',
  techStack: '', githubUrl: '', deploymentUrl: '', notes: '',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Detail view
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [featureInput, setFeatureInput] = useState('');

  // AI Readme State
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiReadme, setAiReadme] = useState<string>('');
  const [showAiPanel, setShowAiPanel] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { fetchProjects(); fetchStats(); }, []);

  // Compute filtered list synchronously — no extra state, no re-render loop
  const filtered = useMemo(() => {
    let f = [...(projects ?? [])];
    if (activeTab !== 'all') f = f.filter(p => p.status === activeTab.toUpperCase());
    if (search) f = f.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.techStack.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );
    return f;
  }, [projects, activeTab, search]);

  const fetchProjects = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/projects');
      // Backend returns { success, data: Project[] } — so res.data.data is the array
      setProjects(res.data.data ?? []);
    } catch { if (!silent) toast.error('Failed to fetch projects'); }
    finally { if (!silent) setLoading(false); }
  };

  // Silent refresh — used after mutations so the page never re-shows the loading spinner
  const refreshProjects = () => fetchProjects(true);

  const handleAiReadme = async (project: Project) => {
    setAiGenerating(true);
    setShowAiPanel(true);
    setAiReadme('');
    try {
      const res = await api.post('/ai/generate-readme', {
        project: {
          name: project.name,
          description: project.description,
          techStack: project.techStack,
          features: project.features.map(f => f.name),
        }
      });
      setAiReadme(res.data.data.readme);
      toast.success('README generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/projects/stats');
      setStats(res.data.data);
    } catch { /* silent */ }
  };

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setFormOpen(true); };
  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '', status: p.status,
      priority: p.priority, techStack: p.techStack.join(', '),
      githubUrl: p.githubUrl || '', deploymentUrl: p.deploymentUrl || '', notes: p.notes || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, techStack: form.techStack.split(',').map(s => s.trim()).filter(Boolean) };
    try {
      if (editing) {
        await api.patch(`/projects/${editing.id}`, payload);
        toast.success('Project updated');
        if (detailProject?.id === editing.id) {
          const res = await api.get(`/projects/${editing.id}`);
          setDetailProject(res.data.data);
        }
      } else {
        await api.post('/projects', payload);
        toast.success('Project created');
      }
      setFormOpen(false);
      fetchStats();
      refreshProjects();
    } catch { toast.error('Failed to save project'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/projects/${deleteId}`);
      toast.success('Project deleted');
      if (detailProject?.id === deleteId) setDetailProject(null);
      setDeleteId(null);
      fetchStats();
      refreshProjects();
    } catch { toast.error('Failed to delete project'); }
  };

  const openDetail = async (p: Project) => {
    const res = await api.get(`/projects/${p.id}`);
    setDetailProject(res.data.data);
  };

  const addFeature = async () => {
    if (!detailProject || !featureInput.trim()) return;
    try {
      await api.post(`/projects/${detailProject.id}/features`, { name: featureInput.trim() });
      toast.success('Feature added');
      setFeatureInput('');
      const res = await api.get(`/projects/${detailProject.id}`);
      setDetailProject(res.data.data);
      refreshProjects();
    } catch { toast.error('Failed to add feature'); }
  };

  const cycleFeature = async (feature: Feature) => {
    if (!detailProject) return;
    const next = feature.status === 'PENDING' ? 'COMPLETED' : feature.status === 'COMPLETED' ? 'FUTURE' : 'PENDING';
    try {
      await api.patch(`/projects/features/${feature.id}`, { status: next });
      const res = await api.get(`/projects/${detailProject.id}`);
      setDetailProject(res.data.data);
      refreshProjects();
    } catch { toast.error('Failed to update feature'); }
  };

  const deleteFeature = async (featureId: string) => {
    if (!detailProject) return;
    try {
      await api.delete(`/projects/features/${featureId}`);
      const res = await api.get(`/projects/${detailProject.id}`);
      setDetailProject(res.data.data);
      refreshProjects();
    } catch { toast.error('Failed to delete feature'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Hub</h1>
          <p className="text-muted-foreground">Manage your coding projects</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />New Project</Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Active', value: stats.active, color: 'text-green-500' },
            { label: 'Completed', value: stats.completed, color: 'text-blue-500' },
            { label: 'On Hold', value: stats.onHold, color: 'text-yellow-500' },
            { label: 'Ideas', value: stats.ideas, color: 'text-purple-500' },
          ].map(s => (
            <Card key={s.label}>
              <CardHeader className="pb-1"><CardTitle className="text-sm">{s.label}</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="on_hold">On Hold</TabsTrigger>
          <TabsTrigger value="idea">Ideas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No projects found</p>
                <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Create Project</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(p => (
                <Card
                  key={p.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => openDetail(p)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{p.name}</CardTitle>
                        {p.description && (
                          <CardDescription className="line-clamp-2 mt-1">{p.description}</CardDescription>
                        )}
                      </div>
                      <Badge className={statusColor[p.status]} variant="secondary">{p.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{p.completionPercentage}%</span>
                      </div>
                      <Progress value={p.completionPercentage} />
                    </div>

                    {p.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.techStack.slice(0, 4).map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                        {p.techStack.length > 4 && <Badge variant="outline" className="text-xs">+{p.techStack.length - 4}</Badge>}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className={`text-xs font-medium ${priorityColor[p.priority]}`}>{p.priority}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {p.githubUrl && (
                          <a href={p.githubUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Github className="w-3 h-3" /></Button>
                          </a>
                        )}
                        {p.deploymentUrl && (
                          <a href={p.deploymentUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Globe className="w-3 h-3" /></Button>
                          </a>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Project' : 'Create Project'}</DialogTitle>
            <DialogDescription>Fill in the project details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>
                Name <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My awesome project" required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What does this project do?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Tech Stack (comma-separated)</Label>
              <Input value={form.techStack} onChange={e => setForm({ ...form, techStack: e.target.value })} placeholder="React, Node.js, PostgreSQL" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>GitHub URL</Label>
                <Input value={form.githubUrl} onChange={e => setForm({ ...form, githubUrl: e.target.value })} placeholder="https://github.com/..." />
              </div>
              <div>
                <Label>Deployment URL</Label>
                <Input value={form.deploymentUrl} onChange={e => setForm({ ...form, deploymentUrl: e.target.value })} placeholder="https://myapp.vercel.app" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Save Changes' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
            <DialogDescription>This will permanently delete the project and all its features. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project Detail Dialog */}
      <Dialog open={!!detailProject} onOpenChange={(open) => {
        if (!open) {
          setDetailProject(null);
          setShowAiPanel(false);
          setAiReadme('');
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailProject && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <DialogTitle className="text-xl">{detailProject.name}</DialogTitle>
                    {detailProject.description && (
                      <DialogDescription className="mt-1">{detailProject.description}</DialogDescription>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button 
                      size="sm" 
                      onClick={() => handleAiReadme(detailProject)}
                      disabled={aiGenerating}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                    >
                      {aiGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                      Generate README
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setDetailProject(null); openEdit(detailProject); }}>
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10" onClick={() => { setDetailProject(null); setDeleteId(detailProject.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5">
                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge className={statusColor[detailProject.status]} variant="secondary">{detailProject.status}</Badge>
                  <Badge variant="outline" className={priorityColor[detailProject.priority]}>{detailProject.priority}</Badge>
                  <Badge variant="outline">{detailProject.completionPercentage}% complete</Badge>
                </div>

                {/* Progress */}
                <Progress value={detailProject.completionPercentage} />

                {/* Tech Stack */}
                {detailProject.techStack.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Tech Stack</p>
                    <div className="flex flex-wrap gap-2">
                      {detailProject.techStack.map((t, i) => <Badge key={i} variant="outline">{t}</Badge>)}
                    </div>
                  </div>
                )}

                {/* Links */}
                {(detailProject.githubUrl || detailProject.deploymentUrl) && (
                  <div className="flex gap-2">
                    {detailProject.githubUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={detailProject.githubUrl} target="_blank" rel="noopener noreferrer">
                          <Github className="w-4 h-4 mr-1" /> GitHub
                        </a>
                      </Button>
                    )}
                    {detailProject.deploymentUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={detailProject.deploymentUrl} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-4 h-4 mr-1" /> Live
                        </a>
                      </Button>
                    )}
                  </div>
                )}

                {/* Features */}
                <div>
                  <p className="text-sm font-medium mb-3">
                    Features ({detailProject.features.filter(f => f.status === 'COMPLETED').length}/{detailProject.features.length})
                  </p>

                  {/* Add feature */}
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={featureInput}
                      onChange={e => setFeatureInput(e.target.value)}
                      placeholder="Add a feature..."
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={addFeature} disabled={!featureInput.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {detailProject.features.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">No features yet</p>
                    )}
                    {detailProject.features.map(f => (
                      <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg border border-border group/feat">
                        <button
                          onClick={() => cycleFeature(f)}
                          className="shrink-0 transition-colors"
                          title="Click to cycle status"
                        >
                          {f.status === 'COMPLETED' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : f.status === 'FUTURE' ? (
                            <Clock className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <span className={`flex-1 text-sm ${f.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>
                          {f.name}
                        </span>
                        <Badge variant="outline" className="text-xs hidden group-hover/feat:flex">{f.status}</Badge>
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/feat:opacity-100"
                          onClick={() => deleteFeature(f.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {(detailProject.architectureNotes || (detailProject as any).notes) && (
                  <div>
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/40 p-3 rounded-lg">
                      {detailProject.architectureNotes || (detailProject as any).notes}
                    </p>
                  </div>
                )}
                
                {/* AI README Panel */}
                {showAiPanel && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-400" /> AI Generated README
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowAiPanel(false)} className="h-7 text-xs">
                        Hide
                      </Button>
                    </div>
                    {aiGenerating ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                      </div>
                    ) : aiReadme ? (
                      <div className="p-4 bg-secondary/30 border border-border rounded-lg prose prose-sm dark:prose-invert max-w-none" data-color-mode="dark">
                        <MDEditor.Markdown source={aiReadme} />
                      </div>
                    ) : null}
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
