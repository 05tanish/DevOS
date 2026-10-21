import { useState, useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import {
  Lightbulb, Plus, Search, Star, Edit2, Trash2, Copy, ExternalLink,
  ChevronDown, ChevronUp, Eye, X, Code2, ArrowUpDown, Filter, Loader2,
  Link as LinkIcon, BookOpen, Video, Sparkles
} from 'lucide-react';
import { api } from '../lib/api';
import type { DsaConcept, DsaDifficulty } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Arrays', 'Strings', 'STL', 'Trees', 'Graphs', 'DP',
  'Bit Manipulation', 'Math', 'Sliding Window', 'Binary Search',
  'Linked List', 'Stack', 'Queue', 'Heap', 'Trie',
  'Backtracking', 'Greedy', 'Hashing', 'Recursion', 'Sorting',
  'Two Pointers', 'Other',
];

const LANGUAGES = ['C++', 'Java', 'Python', 'JavaScript'];

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  EASY:   { label: 'Easy',   color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  MEDIUM: { label: 'Medium', color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30' },
  HARD:   { label: 'Hard',   color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/30' },
};

const SORT_OPTIONS = [
  { value: 'latest',            label: 'Latest First' },
  { value: 'oldest',            label: 'Oldest First' },
  { value: 'alphabetical_asc',  label: 'A → Z' },
  { value: 'alphabetical_desc', label: 'Z → A' },
];

const emptyForm = {
  topic: '',
  category: 'Arrays',
  shortDescription: '',
  detailedNotes: '',
  codeSnippet: '',
  language: 'C++',
  leetcodeUrl: '',
  gfgUrl: '',
  codeforcesUrl: '',
  youtubeUrl: '',
  referenceLinks: [''],
  tags: '',
  difficulty: 'EASY' as DsaDifficulty,
  isFavorite: false,
};

// ── Page Component ─────────────────────────────────────────────────────────
export function DsaConceptsPage() {
  const [concepts, setConcepts] = useState<DsaConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters, search, sort
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterTag, setFilterTag] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [showFilters, setShowFilters] = useState(false);

  // Available tags/categories from server
  const [availableCategories, setAvailableCategories] = useState<string[]>(CATEGORIES);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<DsaConcept | null>(null);
  const [editing, setEditing] = useState<DsaConcept | null>(null);

  // AI Explain
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [aiExplaining, setAiExplaining] = useState(false);

  // Form
  const [form, setForm] = useState({ ...emptyForm });

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchConcepts = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterCategory !== 'ALL') params.category = filterCategory;
      if (filterTag) params.tag = filterTag;
      if (filterDifficulty !== 'ALL') params.difficulty = filterDifficulty;
      if (filterFavorites) params.favorite = 'true';
      if (sortBy) params.sortBy = sortBy;

      const res = await api.get('/dsa-concepts', { params });
      const data = res.data.data;
      setConcepts(data.concepts || []);
      if (data.categories?.length) setAvailableCategories(data.categories);
      if (data.tags?.length) setAvailableTags(data.tags);
    } catch {
      toast.error('Failed to load DSA concepts');
    }
  }, [search, filterCategory, filterTag, filterDifficulty, filterFavorites, sortBy]);

  useEffect(() => {
    setLoading(true);
    fetchConcepts().finally(() => setLoading(false));
  }, [fetchConcepts]);

  // ── CRUD Handlers ────────────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEditForm = (concept: DsaConcept) => {
    setEditing(concept);
    setForm({
      topic: concept.topic,
      category: concept.category,
      shortDescription: concept.shortDescription || '',
      detailedNotes: concept.detailedNotes || '',
      codeSnippet: concept.codeSnippet || '',
      language: concept.language || 'C++',
      leetcodeUrl: concept.leetcodeUrl || '',
      gfgUrl: concept.gfgUrl || '',
      codeforcesUrl: concept.codeforcesUrl || '',
      youtubeUrl: concept.youtubeUrl || '',
      referenceLinks: concept.referenceLinks?.length ? [...concept.referenceLinks] : [''],
      tags: concept.tags?.join(', ') || '',
      difficulty: concept.difficulty,
      isFavorite: concept.isFavorite,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.topic.trim()) {
      toast.error('Topic name is required');
      return;
    }
    if (!form.category.trim()) {
      toast.error('Category is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        topic: form.topic.trim(),
        category: form.category,
        shortDescription: form.shortDescription || null,
        detailedNotes: form.detailedNotes || null,
        codeSnippet: form.codeSnippet || null,
        language: form.language,
        leetcodeUrl: form.leetcodeUrl || null,
        gfgUrl: form.gfgUrl || null,
        codeforcesUrl: form.codeforcesUrl || null,
        youtubeUrl: form.youtubeUrl || null,
        referenceLinks: form.referenceLinks.filter(l => l.trim()),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        difficulty: form.difficulty,
        isFavorite: form.isFavorite,
      };

      if (editing) {
        await api.patch(`/dsa-concepts/${editing.id}`, payload);
        toast.success('Concept updated');
      } else {
        await api.post('/dsa-concepts', payload);
        toast.success('Concept created');
      }

      setFormOpen(false);
      fetchConcepts();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save concept';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/dsa-concepts/${id}`);
      toast.success('Concept deleted');
      setDeleteConfirmId(null);
      if (viewing?.id === id) {
        setViewOpen(false);
        setViewing(null);
      }
      fetchConcepts();
    } catch {
      toast.error('Failed to delete concept');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const res = await api.patch(`/dsa-concepts/${id}/favorite`);
      const msg = res.data.message || 'Updated';
      toast.success(msg);
      fetchConcepts();
      // Update view if open
      if (viewing?.id === id) {
        setViewing(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      }
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const openView = (concept: DsaConcept) => {
    setViewing(concept);
    setViewOpen(true);
    setAiExplanation('');
  };

  const handleAiExplain = async (topic: string) => {
    setAiExplaining(true);
    try {
      const res = await api.post('/ai/explain-dsa', { concept: topic });
      setAiExplanation(res.data.data.explanation);
      toast.success('AI explanation generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'AI explanation failed');
    } finally {
      setAiExplaining(false);
    }
  };

  // ── Reference Links helpers ──────────────────────────────────────────────
  const addRefLink = () => setForm(f => ({ ...f, referenceLinks: [...f.referenceLinks, ''] }));
  const removeRefLink = (idx: number) =>
    setForm(f => ({ ...f, referenceLinks: f.referenceLinks.filter((_, i) => i !== idx) }));
  const updateRefLink = (idx: number, val: string) =>
    setForm(f => ({ ...f, referenceLinks: f.referenceLinks.map((l, i) => i === idx ? val : l) }));

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalConcepts = concepts.length;
  const uniqueCats = new Set(concepts.map(c => c.category)).size;
  const favorites = concepts.filter(c => c.isFavorite).length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Important DSA Concepts</h1>
            <p className="text-sm text-muted-foreground">Quick reference for essential coding patterns &amp; tricks</p>
          </div>
        </div>
        <Button onClick={openCreateForm} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Concept
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Concepts', value: totalConcepts, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20' },
          { label: 'Categories', value: uniqueCats, color: 'from-purple-500/20 to-purple-600/10 border-purple-500/20' },
          { label: 'Favorites', value: favorites, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/20' },
          { label: 'Languages', value: new Set(concepts.map(c => c.language)).size, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20' },
        ].map(stat => (
          <div
            key={stat.label}
            className={cn(
              'rounded-lg border p-3 bg-gradient-to-br',
              stat.color
            )}
          >
            <p className="text-[11px] uppercase font-medium text-muted-foreground tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by topic, description, or tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(v => !v)}
              className={cn(showFilters && 'bg-primary/10 border-primary/30')}
              title="Toggle filters"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFilterFavorites(v => !v)}
              className={cn(filterFavorites && 'bg-amber-500/15 border-amber-500/30')}
              title="Show favorites only"
            >
              <Star className={cn('w-4 h-4', filterFavorites && 'text-amber-400 fill-amber-400')} />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-card/50">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {availableCategories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Levels</SelectItem>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>

            {availableTags.length > 0 && (
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Tags</SelectItem>
                  {availableTags.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCategory('ALL');
                setFilterDifficulty('ALL');
                setFilterTag('');
                setFilterFavorites(false);
                setSearch('');
              }}
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && concepts.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto">
            <Lightbulb className="w-8 h-8 text-violet-400" />
          </div>
          <p className="text-lg font-semibold text-foreground">No concepts found</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {search || filterCategory !== 'ALL' || filterTag || filterDifficulty !== 'ALL' || filterFavorites
              ? 'Try adjusting your search or filter criteria.'
              : 'Start building your DSA reference library by adding your first concept.'}
          </p>
          {!search && filterCategory === 'ALL' && !filterTag && filterDifficulty === 'ALL' && !filterFavorites && (
            <Button onClick={openCreateForm} className="gap-2">
              <Plus className="w-4 h-4" /> Add First Concept
            </Button>
          )}
        </div>
      )}

      {/* Cards Grid */}
      {!loading && concepts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {concepts.map(concept => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              onView={() => openView(concept)}
              onEdit={() => openEditForm(concept)}
              onDelete={() => setDeleteConfirmId(concept.id)}
              onFavorite={() => handleToggleFavorite(concept.id)}
              onCopyCode={() => concept.codeSnippet && copyCode(concept.codeSnippet)}
            />
          ))}
        </div>
      )}

      {/* ── Create/Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Concept' : 'Add New Concept'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the details of this DSA concept.' : 'Fill in the details for a new DSA concept.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Topic */}
            <div className="space-y-1.5">
              <Label htmlFor="topic">
                Topic Name <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <Input
                id="topic"
                placeholder="e.g. Two Sum Pattern"
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                required
              />
            </div>

            {/* Category + Difficulty + Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Category <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v as DsaDifficulty }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Short Description */}
            <div className="space-y-1.5">
              <Label htmlFor="shortDesc">Short Description</Label>
              <Textarea
                id="shortDesc"
                placeholder="A brief one-line explanation..."
                rows={2}
                value={form.shortDescription}
                onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))}
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="e.g. Arrays, Hashing, Pattern"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              />
            </div>

            {/* Code Snippet */}
            <div className="space-y-1.5">
              <Label htmlFor="code">Code Snippet</Label>
              <Textarea
                id="code"
                placeholder="Paste your code here..."
                rows={6}
                className="font-mono text-sm"
                value={form.codeSnippet}
                onChange={e => setForm(f => ({ ...f, codeSnippet: e.target.value }))}
              />
            </div>

            {/* Detailed Notes (Markdown) */}
            <div className="space-y-1.5">
              <Label>Detailed Notes (Markdown)</Label>
              <div data-color-mode="dark">
                <MDEditor
                  value={form.detailedNotes}
                  onChange={v => setForm(f => ({ ...f, detailedNotes: v || '' }))}
                  height={200}
                  preview="edit"
                />
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="leetcode">LeetCode Link</Label>
                <Input
                  id="leetcode"
                  placeholder="https://leetcode.com/..."
                  value={form.leetcodeUrl}
                  onChange={e => setForm(f => ({ ...f, leetcodeUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gfg">GeeksforGeeks Link</Label>
                <Input
                  id="gfg"
                  placeholder="https://geeksforgeeks.org/..."
                  value={form.gfgUrl}
                  onChange={e => setForm(f => ({ ...f, gfgUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="codeforces">Codeforces Link</Label>
                <Input
                  id="codeforces"
                  placeholder="https://codeforces.com/..."
                  value={form.codeforcesUrl}
                  onChange={e => setForm(f => ({ ...f, codeforcesUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="youtube">YouTube Link</Label>
                <Input
                  id="youtube"
                  placeholder="https://youtube.com/..."
                  value={form.youtubeUrl}
                  onChange={e => setForm(f => ({ ...f, youtubeUrl: e.target.value }))}
                />
              </div>
            </div>

            {/* Reference Links */}
            <div className="space-y-2">
              <Label>Reference Links</Label>
              {form.referenceLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="https://..."
                    value={link}
                    onChange={e => updateRefLink(idx, e.target.value)}
                    className="flex-1"
                  />
                  {form.referenceLinks.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeRefLink(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addRefLink} className="gap-1">
                <Plus className="w-3 h-3" /> Add Link
              </Button>
            </div>

            {/* Favorite toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFavorite}
                onChange={e => setForm(f => ({ ...f, isFavorite: e.target.checked }))}
                className="sr-only"
              />
              <Star className={cn('w-5 h-5 transition-colors', form.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground')} />
              <span className="text-sm text-foreground">Mark as favorite</span>
            </label>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ─────────────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={v => { setViewOpen(v); if (!v) setViewing(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl">{viewing.topic}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {viewing.shortDescription || 'No description provided.'}
                    </DialogDescription>
                  </div>
                  <button
                    onClick={() => handleToggleFavorite(viewing.id)}
                    className="shrink-0 mt-0.5"
                    title={viewing.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={cn(
                      'w-5 h-5 transition-colors',
                      viewing.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground hover:text-amber-400'
                    )} />
                  </button>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">{viewing.category}</Badge>
                  <Badge className={cn('border', DIFFICULTY_CONFIG[viewing.difficulty]?.bg)}>
                    {DIFFICULTY_CONFIG[viewing.difficulty]?.label || viewing.difficulty}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Code2 className="w-3 h-3" />{viewing.language}
                  </Badge>
                  {viewing.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {/* Code Snippet */}
                {viewing.codeSnippet && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-violet-400" /> Code Snippet
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => copyCode(viewing.codeSnippet!)} className="gap-1 h-7 text-xs">
                        <Copy className="w-3 h-3" /> Copy
                      </Button>
                    </div>
                    <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 text-sm font-mono overflow-x-auto border border-zinc-800 whitespace-pre-wrap">
                      {viewing.codeSnippet}
                    </pre>
                  </div>
                )}

                {/* Detailed Notes */}
                {viewing.detailedNotes && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-400" /> Detailed Notes
                    </h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none border rounded-lg p-4 bg-card/50" data-color-mode="dark">
                      <MDEditor.Markdown source={viewing.detailedNotes} />
                    </div>
                  </div>
                )}

                {/* External Links */}
                {(viewing.leetcodeUrl || viewing.gfgUrl || viewing.codeforcesUrl || viewing.youtubeUrl || viewing.referenceLinks?.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <LinkIcon className="w-4 h-4 text-cyan-400" /> External Resources
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {viewing.leetcodeUrl && (
                        <a href={viewing.leetcodeUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <ExternalLink className="w-3 h-3" /> LeetCode
                          </Button>
                        </a>
                      )}
                      {viewing.gfgUrl && (
                        <a href={viewing.gfgUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <ExternalLink className="w-3 h-3" /> GFG
                          </Button>
                        </a>
                      )}
                      {viewing.codeforcesUrl && (
                        <a href={viewing.codeforcesUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <ExternalLink className="w-3 h-3" /> Codeforces
                          </Button>
                        </a>
                      )}
                      {viewing.youtubeUrl && (
                        <a href={viewing.youtubeUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <Video className="w-3 h-3" /> YouTube
                          </Button>
                        </a>
                      )}
                      {viewing.referenceLinks?.filter(Boolean).map((link, i) => (
                        <a key={i} href={link} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <LinkIcon className="w-3 h-3" /> Ref {i + 1}
                          </Button>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground border-t pt-3">
                  <span>Created: {new Date(viewing.createdAt).toLocaleDateString()}</span>
                  <span>Updated: {new Date(viewing.updatedAt).toLocaleDateString()}</span>
                </div>

                {/* AI Explain Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-violet-400" /> AI Explanation
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-7 text-xs bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 hover:border-violet-500/50 text-violet-300 hover:text-violet-200"
                      disabled={aiExplaining}
                      onClick={() => handleAiExplain(viewing.topic)}
                    >
                      {aiExplaining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {aiExplaining ? 'Generating...' : aiExplanation ? 'Regenerate' : 'Explain with AI'}
                    </Button>
                  </div>
                  {aiExplanation && (
                    <div className="prose prose-sm dark:prose-invert max-w-none border rounded-lg p-4 bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20" data-color-mode="dark">
                      <MDEditor.Markdown source={aiExplanation} />
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setViewOpen(false); openEditForm(viewing); }} className="gap-1">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button variant="destructive" onClick={() => setDeleteConfirmId(viewing.id)} className="gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={v => !v && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Concept</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this concept? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Concept Card Component ───────────────────────────────────────────────────
function ConceptCard({
  concept,
  onView,
  onEdit,
  onDelete,
  onFavorite,
  onCopyCode,
}: {
  concept: DsaConcept;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onCopyCode: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const diff = DIFFICULTY_CONFIG[concept.difficulty];
  const hasLinks = concept.leetcodeUrl || concept.gfgUrl || concept.codeforcesUrl || concept.youtubeUrl;

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/20">
      {/* Favorite */}
      <button
        onClick={e => { e.stopPropagation(); onFavorite(); }}
        className="absolute top-3 right-3 z-10"
        title={concept.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star className={cn(
          'w-4 h-4 transition-colors',
          concept.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/40 hover:text-amber-400'
        )} />
      </button>

      <CardHeader className="pb-2 pr-10">
        <div className="space-y-2">
          {/* Topic */}
          <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors" onClick={onView}>
            {concept.topic}
          </h3>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{concept.category}</Badge>
            <Badge className={cn('text-[10px] px-1.5 py-0 border', diff?.bg)}>{diff?.label}</Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
              <Code2 className="w-2.5 h-2.5" />{concept.language}
            </Badge>
          </div>

          {/* Tags */}
          {concept.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {concept.tags.slice(0, 4).map(tag => (
                <span key={tag} className="text-[10px] text-muted-foreground bg-secondary/60 rounded px-1.5 py-0.5">
                  {tag}
                </span>
              ))}
              {concept.tags.length > 4 && (
                <span className="text-[10px] text-muted-foreground">+{concept.tags.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Short Description */}
        {concept.shortDescription && (
          <p className="text-xs text-muted-foreground line-clamp-2">{concept.shortDescription}</p>
        )}

        {/* Code Snippet Preview */}
        {concept.codeSnippet && (
          <div className="relative">
            <pre className={cn(
              'bg-zinc-900 text-zinc-300 rounded-md p-2.5 text-[11px] font-mono overflow-hidden border border-zinc-800 whitespace-pre-wrap',
              !expanded && 'max-h-[80px]'
            )}>
              {concept.codeSnippet}
            </pre>
            {concept.codeSnippet.split('\n').length > 4 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 text-[10px] text-primary mt-1 hover:underline"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" /> Collapse</> : <><ChevronDown className="w-3 h-3" /> Expand</>}
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onView}>
            <Eye className="w-3 h-3" /> View
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onEdit}>
            <Edit2 className="w-3 h-3" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" /> Delete
          </Button>
          {concept.codeSnippet && (
            <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onCopyCode}>
              <Copy className="w-3 h-3" /> Copy
            </Button>
          )}
          {hasLinks && (
            <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onView}>
              <ExternalLink className="w-3 h-3" /> Links
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DsaConceptsPage;
