import { useEffect, useState } from 'react';
import {
  Plus, Search, Calendar, MapPin, Trash2, Edit2, Loader2,
  Eye, Download, Briefcase, DollarSign, FileText
} from 'lucide-react';
import { api } from '../lib/api';
import type { CollegePlacement, PlacementStatus, CollegePlacementStats } from '../types';
import { COLLEGE_PLACEMENT_STATUSES } from '../lib/constants';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { cn } from '../lib/utils';

export function CollegePlacementPage() {
  const [placements, setPlacements] = useState<CollegePlacement[]>([]);
  const [stats, setStats] = useState<CollegePlacementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PlacementStatus | 'ALL'>('ALL');

  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<CollegePlacement | null>(null);

  // PDF Preview
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Form fields
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [packageAmount, setPackageAmount] = useState('');
  const [status, setStatus] = useState<PlacementStatus>('APPLIED');
  const [applicationDate, setApplicationDate] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [offerDate, setOfferDate] = useState('');
  const [notes, setNotes] = useState('');
  const [skills, setSkills] = useState<string>('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const fetchPlacements = async () => {
    try {
      const params: any = {};
      if (filterStatus && filterStatus !== 'ALL') params.status = filterStatus;
      if (search) params.search = search;

      const res = await api.get('/college-placement', { params });
      setPlacements(res.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch placements');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/college-placement/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPlacements(), fetchStats()]).finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => fetchPlacements(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const resetForm = () => {
    setCompany('');
    setRole('');
    setLocation('');
    setPackageAmount('');
    setStatus('APPLIED');
    setApplicationDate(new Date().toISOString().split('T')[0]);
    setInterviewDate('');
    setOfferDate('');
    setNotes('');
    setSkills('');
    setResumeFile(null);
  };

  const handleOpenModal = (placement?: CollegePlacement) => {
    if (placement) {
      setEditingPlacement(placement);
      setCompany(placement.company);
      setRole(placement.role);
      setLocation(placement.location || '');
      setPackageAmount(placement.package || '');
      setStatus(placement.status);
      setApplicationDate(placement.applicationDate?.split('T')[0] || '');
      setInterviewDate(placement.interviewDate?.split('T')[0] || '');
      setOfferDate(placement.offerDate?.split('T')[0] || '');
      setNotes(placement.notes || '');
      setSkills(placement.skills?.join(', ') || '');
    } else {
      setEditingPlacement(null);
      resetForm();
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!company.trim() || !role.trim()) {
      toast.error('Company and Role are required');
      return;
    }

    const formData = new FormData();
    formData.append('company', company);
    formData.append('role', role);
    if (location) formData.append('location', location);
    if (packageAmount) formData.append('package', packageAmount);
    formData.append('status', status);
    if (applicationDate) formData.append('applicationDate', new Date(applicationDate).toISOString());
    if (interviewDate) formData.append('interviewDate', new Date(interviewDate).toISOString());
    if (offerDate) formData.append('offerDate', new Date(offerDate).toISOString());
    if (notes) formData.append('notes', notes);
    
    // Handle skills as JSON array
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      formData.append('skills', JSON.stringify(skillsArray));
    }
    
    if (resumeFile) formData.append('resume', resumeFile);

    try {
      if (editingPlacement) {
        await api.patch(`/college-placement/${editingPlacement.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Placement updated');
      } else {
        await api.post('/college-placement', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Placement added');
      }
      setIsOpen(false);
      fetchPlacements();
      fetchStats();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.message || 'Failed to save placement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this placement application?')) return;
    try {
      await api.delete(`/college-placement/${id}`);
      toast.success('Placement deleted');
      fetchPlacements();
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete placement');
    }
  };

  const handleDeleteResume = async (id: string) => {
    if (!confirm('Delete resume from this application?')) return;
    try {
      await api.delete(`/college-placement/${id}/resume`);
      toast.success('Resume deleted');
      fetchPlacements();
    } catch (err) {
      toast.error('Failed to delete resume');
    }
  };

  const getStatusColor = (status: PlacementStatus) => {
    const colors: Record<PlacementStatus, string> = {
      APPLIED: 'bg-blue-100 text-blue-800 border-blue-200',
      SHORTLISTED: 'bg-purple-100 text-purple-800 border-purple-200',
      INTERVIEW_SCHEDULED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      INTERVIEW_COMPLETED: 'bg-orange-100 text-orange-800 border-orange-200',
      OFFER_RECEIVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      ACCEPTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      WITHDRAWN: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredPlacements = placements;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              College Placement
            </h1>
            <p className="text-muted-foreground mt-1">Track your campus placement applications</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Application
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="text-sm text-muted-foreground">Total Applications</div>
              <div className="text-2xl font-bold text-foreground mt-1">{stats.total}</div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="text-sm text-muted-foreground">With Resume</div>
              <div className="text-2xl font-bold text-blue-500 mt-1">{stats.withResume}</div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="text-sm text-muted-foreground">Upcoming Interviews</div>
              <div className="text-2xl font-bold text-yellow-500 mt-1">{stats.upcomingInterviews}</div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="text-sm text-muted-foreground">Offers</div>
              <div className="text-2xl font-bold text-green-500 mt-1">
                {stats.byStatus['OFFER_RECEIVED'] || 0}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card rounded-lg p-4 border border-border space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by company or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as PlacementStatus | 'ALL')}
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Status</option>
              {COLLEGE_PLACEMENT_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Placements List */}
        <div className="space-y-4">
          {filteredPlacements.length === 0 ? (
            <div className="bg-card rounded-lg p-12 text-center border border-border">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No placement applications yet</p>
              <Button onClick={() => handleOpenModal()} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Application
              </Button>
            </div>
          ) : (
            filteredPlacements.map((placement) => (
              <div
                key={placement.id}
                className="bg-card rounded-lg p-6 border border-border hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground">{placement.company}</h3>
                      <Badge className={cn('border', getStatusColor(placement.status))}>
                        {placement.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground font-medium">{placement.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenModal(placement)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(placement.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                  {placement.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {placement.location}
                    </div>
                  )}
                  {placement.package && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      {placement.package}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Applied: {formatDate(placement.applicationDate)}
                  </div>
                </div>

                {placement.interviewDate && (
                  <div className="text-sm text-muted-foreground mb-4">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Interview: {formatDate(placement.interviewDate)}
                  </div>
                )}

                {placement.skills && placement.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {placement.skills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {placement.resumeFileUrl && (
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground flex-1">{placement.resumeFileName}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewPdfUrl(placement.resumeFileUrl!)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={placement.resumeFileUrl} download target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteResume(placement.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlacement ? 'Edit Placement' : 'Add Placement Application'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Company <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Role <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Bangalore" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Package</label>
                <Input value={packageAmount} onChange={(e) => setPackageAmount(e.target.value)} placeholder="e.g., 12 LPA" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PlacementStatus)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {COLLEGE_PLACEMENT_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Application Date</label>
                <Input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Interview Date</label>
                <Input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Offer Date</label>
                <Input type="date" value={offerDate} onChange={(e) => setOfferDate(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Skills (comma-separated)</label>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Node.js, MongoDB" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                rows={3}
                placeholder="Add any additional notes..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Resume (PDF)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
                {editingPlacement?.resumeFileName && !resumeFile && (
                  <span className="text-sm text-muted-foreground">(Current: {editingPlacement.resumeFileName})</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={!!previewPdfUrl} onOpenChange={() => setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Resume Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full">
            {previewPdfUrl && (
              <iframe
                src={previewPdfUrl}
                className="w-full h-full border-0 rounded"
                title="Resume Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
