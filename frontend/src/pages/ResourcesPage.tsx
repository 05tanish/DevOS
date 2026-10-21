import React, { useEffect, useState } from 'react';
import {
  BookMarked, Plus, Search, Folder, FolderPlus, Star, Trash2, Edit2,
  ExternalLink, Loader2, CheckCircle2, Play
} from 'lucide-react';
import { api } from '../lib/api';
import type { Resource, ResourceFolder, ResourceType } from '../types';
import { RESOURCE_TYPES } from '../lib/constants';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { cn } from '../lib/utils';

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected folder & filters
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all'); // 'all', 'root', or folder UUID
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals
  const [isResourceOpen, setIsResourceOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Resource Form Fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('WEBSITE');
  const [url, setUrl] = useState('');
  const [folderId, setFolderId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('NOT_STARTED');
  const [tagsInput, setTagsInput] = useState('');

  // Folder Form Fields
  const [folderName, setFolderName] = useState('');

  const fetchFolders = async () => {
    try {
      const res = await api.get('/resources/folders');
      setFolders(res.data.data || []);
    } catch (err) {
      // ignore
    }
  };

  const fetchResources = async () => {
    try {
      const params: Record<string, string> = {
        limit: '100',
      };
      if (selectedFolderId !== 'all') {
        params.folderId = selectedFolderId;
      }
      if (search) params.search = search;
      if (selectedType) params.type = selectedType;
      if (selectedStatus) params.status = selectedStatus;

      const res = await api.get('/resources', { params });
      setResources(res.data.data.resources || []);
    } catch (err) {
      toast.error('Failed to load resources');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchFolders(), fetchResources()]).finally(() => setLoading(false));
  }, [selectedFolderId, search, selectedType, selectedStatus]);

  const handleOpenAddResource = () => {
    setEditingResource(null);
    setTitle('');
    setType('WEBSITE');
    setUrl('');
    setFolderId(selectedFolderId !== 'all' && selectedFolderId !== 'root' ? selectedFolderId : '');
    setDescription('');
    setStatus('NOT_STARTED');
    setTagsInput('');
    setIsResourceOpen(true);
  };

  const handleOpenEditResource = (r: Resource) => {
    setEditingResource(r);
    setTitle(r.title);
    setType(r.type);
    setUrl(r.url || '');
    setFolderId(r.folderId || '');
    setDescription(r.description || '');
    setStatus(r.status || 'NOT_STARTED');
    setTagsInput(r.tags?.join(', ') || '');
    setIsResourceOpen(true);
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Resource title is required');

    const payload = {
      title,
      type,
      url: url || undefined,
      folderId: folderId || null,
      description: description || undefined,
      status,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      if (editingResource) {
        await api.patch(`/resources/${editingResource.id}`, payload);
        toast.success('Resource updated');
      } else {
        await api.post('/resources', payload);
        toast.success('Resource saved');
      }
      setIsResourceOpen(false);
      fetchResources();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save resource');
    }
  };

  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return toast.error('Folder name is required');
    try {
      await api.post('/resources/folders', { name: folderName });
      toast.success('Folder created');
      setFolderName('');
      setIsFolderOpen(false);
      fetchFolders();
    } catch (err) {
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await api.delete(`/resources/${id}`);
      toast.success('Resource deleted');
      fetchResources();
    } catch (err) {
      toast.error('Failed to delete resource');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this folder? Resources inside will be moved to root.')) return;
    try {
      await api.delete(`/resources/folders/${id}`);
      toast.success('Folder deleted');
      if (selectedFolderId === id) setSelectedFolderId('all');
      fetchFolders();
      fetchResources();
    } catch (err) {
      toast.error('Failed to delete folder');
    }
  };

  const handleToggleFavorite = async (r: Resource) => {
    try {
      await api.patch(`/resources/${r.id}`, { isFavorite: !r.isFavorite });
      toast.success(r.isFavorite ? 'Removed from favorites' : 'Marked as favorite');
      fetchResources();
    } catch (err) {
      toast.error('Failed to update favorite status');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] gap-6 overflow-hidden">
      {/* Sidebar - Folders */}
      <div className="w-full md:w-60 bg-card border border-border rounded-xl p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">Folders</h3>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsFolderOpen(true)}>
            <FolderPlus className="w-4 h-4" />
          </Button>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setSelectedFolderId('all')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left',
              selectedFolderId === 'all' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary/40'
            )}
          >
            <BookMarked className="w-4 h-4 shrink-0" />
            <span>All Resources</span>
          </button>
          <button
            onClick={() => setSelectedFolderId('root')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left',
              selectedFolderId === 'root' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary/40'
            )}
          >
            <Folder className="w-4 h-4 shrink-0" />
            <span>Unorganized (Root)</span>
          </button>

          {folders.map(f => (
            <div key={f.id} className="group flex items-center justify-between rounded-lg hover:bg-secondary/40 transition-colors">
              <button
                onClick={() => setSelectedFolderId(f.id)}
                className={cn(
                  'flex-1 flex items-center gap-2.5 px-3 py-2 text-xs text-left truncate transition-colors',
                  selectedFolderId === f.id ? 'text-primary font-semibold' : 'text-muted-foreground'
                )}
              >
                <Folder className={cn("w-4 h-4 shrink-0", selectedFolderId === f.id ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{f.name}</span>
              </button>
              <button
                onClick={() => handleDeleteFolder(f.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive shrink-0 mr-1.5"
                title="Delete folder"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Main vault area */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center bg-card border border-border p-4 rounded-xl shrink-0">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vault resources..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-secondary/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto shrink-0">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-secondary border border-border text-foreground text-xs rounded-md px-3 h-10 outline-none hover:bg-secondary transition-colors cursor-pointer"
            >
              <option value="">All Types</option>
              {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-secondary border border-border text-foreground text-xs rounded-md px-3 h-10 outline-none hover:bg-secondary transition-colors cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <Button onClick={handleOpenAddResource} className="w-full sm:w-auto bg-primary text-primary-foreground font-medium text-xs h-10">
            <Plus className="w-4 h-4 mr-1.5" /> Add Resource
          </Button>
        </div>

        {/* Resources Cards Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : resources.length === 0 ? (
          <div className="flex-1 bg-card border border-border rounded-xl flex flex-col items-center justify-center p-8 text-center">
            <BookMarked className="w-12 h-12 text-muted-foreground mb-3" />
            <h4 className="font-semibold text-foreground text-sm mb-1">No Resources Found</h4>
            <p className="text-xs text-muted-foreground mb-4">You don't have any bookmarks logged matching filters here.</p>
            <Button onClick={handleOpenAddResource} className="bg-primary text-primary-foreground text-xs h-8">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Resource
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 pr-1 scrollbar-thin">
            {resources.map(res => (
              <div
                key={res.id}
                className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-muted-foreground/30 transition-all group relative"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase bg-secondary/80 px-1.5 py-0.5 rounded border border-border/40">
                      {res.type.replace('_', ' ')}
                    </span>
                    <div className="flex gap-1 items-center shrink-0">
                      <button onClick={() => handleToggleFavorite(res)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
                        <Star className={cn("w-3.5 h-3.5", res.isFavorite ? "text-amber-400 fill-amber-400" : "text-muted-foreground")} />
                      </button>
                      <button onClick={() => handleOpenEditResource(res)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteResource(res.id)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-foreground leading-snug">{res.title}</h4>

                  {res.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {res.description}
                    </p>
                  )}

                  {/* Tags */}
                  {res.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {res.tags.map(t => (
                        <span key={t} className="text-[9px] bg-secondary/80 px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer status & link */}
                <div className="border-t border-border/40 pt-2.5 flex items-center justify-between text-[10px]">
                  {res.status === 'COMPLETED' ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                  ) : res.status === 'IN_PROGRESS' ? (
                    <span className="text-blue-400 flex items-center gap-1 font-semibold">
                      <Play className="w-3 h-3 text-blue-400 fill-blue-400/10" /> In Progress
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not Started</span>
                  )}

                  {res.url ? (
                    <a href={res.url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-0.5 font-semibold">
                      Open link <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic text-[9px]">Local bookmark</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Folder Modal */}
      <Dialog open={isFolderOpen} onOpenChange={setIsFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Resource Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFolderSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Folder Name <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <Input value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="e.g. System Design Cheat sheets" required />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsFolderOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">Create Folder</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Resource Modal */}
      <Dialog open={isResourceOpen} onOpenChange={setIsResourceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource bookmark' : 'Add Resource bookmark'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResourceSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Resource Title <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Clean Code Architecture Guide" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as ResourceType)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
                >
                  {RESOURCE_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Move to Folder</label>
                <select
                  value={folderId}
                  onChange={e => setFolderId(e.target.value)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
                >
                  <option value="">Unorganized (Root)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. systemdesign, architecture" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Resource URL (Optional)</label>
              <Input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/..." />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description or notes..."
                rows={3}
                className="w-full p-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsResourceOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {editingResource ? 'Save Changes' : 'Save bookmark'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
