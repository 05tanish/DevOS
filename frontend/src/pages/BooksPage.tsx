import React, { useEffect, useState } from 'react';
import {
  Library, Plus, Search, BookOpen, User, Trash2, Edit2, Loader2, Download, X,
  ArrowLeft, ArrowRight, Type, AlertCircle
} from 'lucide-react';
import ePub from 'epubjs';
import { api } from '../lib/api';
import type { Book, BookCategory, ReadingStatus } from '../types';
import { BOOK_CATEGORIES, READING_STATUSES } from '../lib/constants';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { cn } from '../lib/utils';

export function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals
  const [isOpen, setIsOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [activeBook, setActiveBook] = useState<Book | null>(null);

  // Custom Book Reader states
  const [txtPages, setTxtPages] = useState<string[]>([]);
  const [txtCurrentPage, setTxtCurrentPage] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ page: number; text: string }[]>([]);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [readerError, setReaderError] = useState<string | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<BookCategory>('BACKEND');
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('WANT_TO_READ');
  const [coverUrl, setCoverUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(300);
  const [notes, setNotes] = useState('');
  const [highlights, setHighlights] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchBooks = async () => {
    try {
      const params: Record<string, string> = {
        limit: '100'
      };
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;

      const res = await api.get('/books', { params });
      setBooks(res.data.data.books || []);
    } catch (err) {
      toast.error('Failed to load books');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchBooks().finally(() => setLoading(false));
  }, [search, selectedCategory, selectedStatus]);

  const handleOpenAddModal = () => {
    setEditingBook(null);
    setTitle('');
    setAuthor('');
    setCategory('PRODUCTIVITY');
    setReadingStatus('WANT_TO_READ');
    setCoverUrl('');
    setFileUrl('');
    setCurrentPage(0);
    setTotalPages(300);
    setNotes('');
    setHighlights('');
    setSelectedFile(null);
    setIsOpen(true);
  };

  const handleOpenEditModal = (b: Book) => {
    setEditingBook(b);
    setTitle(b.title);
    setAuthor(b.author || '');
    setCategory(b.category);
    setReadingStatus(b.readingStatus);
    setCoverUrl(b.coverUrl || '');
    setFileUrl(b.fileUrl || '');
    setCurrentPage(b.currentPage);
    setTotalPages(b.totalPages || 300);
    setNotes(b.notes || '');
    setHighlights(b.highlights || '');
    setSelectedFile(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Book title is required');

    setSaving(true);
    const formData = new FormData();
    formData.append('title', title);
    if (author) formData.append('author', author);
    formData.append('category', category);
    formData.append('readingStatus', readingStatus);
    if (coverUrl) formData.append('coverUrl', coverUrl);
    formData.append('currentPage', String(currentPage));
    formData.append('totalPages', String(totalPages));
    if (notes) formData.append('notes', notes);
    if (highlights) formData.append('highlights', highlights);

    if (selectedFile) {
      formData.append('book', selectedFile);
    } else if (fileUrl) {
      formData.append('fileUrl', fileUrl);
    }

    try {
      if (editingBook) {
        await api.patch(`/books/${editingBook.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Book updated');
      } else {
        await api.post('/books', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Book logged successfully');
      }
      setIsOpen(false);
      fetchBooks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
      await api.delete(`/books/${id}`);
      toast.success('Book deleted');
      fetchBooks();
    } catch (err) {
      toast.error('Failed to delete book');
    }
  };

  const updateProgress = async (book: Book, pages: number) => {
    if (pages < 0 || (book.totalPages && pages > book.totalPages)) {
      return toast.error('Invalid page number');
    }
    const payload: Record<string, any> = { currentPage: pages };
    if (book.totalPages && pages === book.totalPages) {
      payload.readingStatus = 'COMPLETED';
    } else if (pages > 0 && book.readingStatus === 'WANT_TO_READ') {
      payload.readingStatus = 'READING';
    }

    try {
      await api.patch(`/books/${book.id}`, payload);
      toast.success('Reading progress updated');
      fetchBooks();
    } catch (err) {
      toast.error('Failed to update progress');
    }
  };

  const getStatusColor = (st: ReadingStatus) => {
    return {
      WANT_TO_READ: 'text-muted-foreground bg-secondary/80 border-border',
      READING: 'text-primary bg-primary/10 border-primary/20',
      COMPLETED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      PAUSED: 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    }[st];
  };

  useEffect(() => {
    if (!isReaderOpen || !activeBook || !activeBook.fileUrl) return;

    const url = activeBook.fileUrl;
    const ext = url.split('.').pop()?.toLowerCase();
    setReaderError(null);
    setSearchResults([]);
    setSearchQuery('');

    if (ext === 'txt') {
      setReaderLoading(true);
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch text file contents');
          return res.text();
        })
        .then(text => {
          const pageSize = 2000;
          const pages: string[] = [];
          for (let i = 0; i < text.length; i += pageSize) {
            pages.push(text.slice(i, i + pageSize));
          }
          setTxtPages(pages);
          const resumePage = activeBook.currentPage || 0;
          setTxtCurrentPage(resumePage < pages.length ? resumePage : 0);
          setReaderLoading(false);
        })
        .catch(err => {
          setReaderError(err.message || 'Failed to parse text file');
          setReaderLoading(false);
        });
    } else if (ext === 'epub') {
      setReaderLoading(true);
      setTimeout(() => {
        try {
          const epubBook = ePub(url);
          const viewerElement = document.getElementById('epub-viewer');
          if (viewerElement) {
            viewerElement.innerHTML = '';
            const rendition = epubBook.renderTo('epub-viewer', {
              width: '100%',
              height: '100%',
              spread: 'none',
            });
            rendition.display();

            rendition.on('relocated', (location: any) => {
              if (location && location.start) {
                const progress = location.start.percentage;
                const pageNum = Math.round(progress * (activeBook.totalPages || 100));
                api.patch(`/books/${activeBook.id}`, { currentPage: pageNum }).catch(() => {});
                activeBook.currentPage = pageNum;
              }
            });
          }
          setReaderLoading(false);
        } catch (err: any) {
          setReaderError('Failed to load EPUB: ' + err.message);
          setReaderLoading(false);
        }
      }, 300);
    }
  }, [isReaderOpen, activeBook]);

  const handleTxtPageChange = async (newPage: number) => {
    if (!activeBook || newPage < 0 || newPage >= txtPages.length) return;
    setTxtCurrentPage(newPage);
    try {
      await api.patch(`/books/${activeBook.id}`, {
        currentPage: newPage,
        totalPages: txtPages.length,
      });
      activeBook.currentPage = newPage;
      activeBook.totalPages = txtPages.length;
      fetchBooks();
    } catch (err) {
      // silent
    }
  };

  const handleTxtSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results: { page: number; text: string }[] = [];
    const query = searchQuery.toLowerCase();
    txtPages.forEach((content, idx) => {
      const lower = content.toLowerCase();
      if (lower.includes(query)) {
        const index = lower.indexOf(query);
        const snippet = '...' + content.substring(Math.max(0, index - 20), Math.min(content.length, index + query.length + 30)) + '...';
        results.push({ page: idx, text: snippet });
      }
    });
    setSearchResults(results);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Book Library</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track and organize technical reference books, guidelines, and productivity titles</p>
        </div>
        <Button onClick={handleOpenAddModal} className="w-full sm:w-auto bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Log Book
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-card border border-border p-4 rounded-lg">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, author..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 w-full md:w-auto shrink-0">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary transition-colors cursor-pointer"
          >
            <option value="">All Categories</option>
            {BOOK_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary transition-colors cursor-pointer"
          >
            <option value="">All Statuses</option>
            {READING_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Grid of Books */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : books.length === 0 ? (
        <div className="bg-card border border-border p-12 rounded-lg text-center">
          <Library className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No books found in library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map(book => {
            const progress = book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
            return (
              <div
                key={book.id}
                className="bg-card border border-border rounded-xl overflow-hidden flex flex-col justify-between hover:border-muted-foreground/30 transition-all group"
              >
                {/* Book Cover Placeholder/Image */}
                <div className="h-40 bg-secondary/30 relative flex items-center justify-center border-b border-border overflow-hidden shrink-0">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                      <BookOpen className="w-8 h-8 text-primary" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">{book.category.replace('_', ' ')}</span>
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenEditModal(book)} className="p-1.5 bg-card/90 rounded border border-border text-muted-foreground hover:text-foreground shadow-sm">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(book.id)} className="p-1.5 bg-card/90 rounded border border-border text-muted-foreground hover:text-destructive shadow-sm">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">{book.category.replace('_', ' ')}</span>
                      <Badge variant="outline" className={cn('text-[9px] py-0 px-1.5', getStatusColor(book.readingStatus))}>
                        {book.readingStatus.replace('_', ' ')}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-bold text-foreground line-clamp-1 leading-snug">{book.title}</h4>
                    {book.author && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" /> {book.author}
                      </p>
                    )}
                  </div>

                  {/* Reading Progress bar */}
                  <div className="space-y-1.5 border-t border-border/40 pt-3">
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{progress}% read</span>
                      <span>{book.currentPage} / {book.totalPages || '?'} pages</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>

                    {/* Quick progress actions */}
                    {book.readingStatus !== 'COMPLETED' && (
                      <div className="flex items-center justify-between pt-1.5 gap-2">
                        <button
                          disabled={book.currentPage <= 0}
                          onClick={() => updateProgress(book, book.currentPage - 10)}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-40 transition-colors"
                        >
                          -10 pgs
                        </button>
                        <button
                          disabled={!!(book.totalPages && book.currentPage >= book.totalPages)}
                          onClick={() => updateProgress(book, book.currentPage + 10)}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-40 transition-colors"
                        >
                          +10 pgs
                        </button>
                      </div>
                    )}

                    {/* Read Online Button */}
                    {book.fileUrl && (
                      <div className="flex gap-2 border-t border-border/20 pt-3 mt-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveBook(book);
                            setIsReaderOpen(true);
                          }}
                          className="flex-1 text-[10px] h-7 bg-primary/5 hover:bg-primary/15 border-primary/20 text-primary font-semibold transition-colors"
                        >
                          <BookOpen className="w-3 h-3 mr-1" /> Read Online
                        </Button>
                        <a
                          href={book.fileUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center px-2 py-1 h-7 rounded border border-border bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                          title="Download Book"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Book Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Edit Book Details' : 'Log Reference Book'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Book Title <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Designing Data-Intensive Applications" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Author / Publisher</label>
                <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="e.g. Martin Kleppmann" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as BookCategory)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
                >
                  {BOOK_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Reading Status</label>
                <select
                  value={readingStatus}
                  onChange={e => setReadingStatus(e.target.value as ReadingStatus)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
                >
                  {READING_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Current Page</label>
                <Input type="number" min="0" value={currentPage} onChange={e => setCurrentPage(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Total Pages</label>
                <Input type="number" min="1" value={totalPages} onChange={e => setTotalPages(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Cover Image URL (Optional)</label>
                <Input type="url" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Or E-Book Link</label>
                <Input type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." disabled={!!selectedFile} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Upload PDF File (Recommended)</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer border border-border rounded-md bg-secondary/20 p-1"
                />
                {selectedFile && (
                  <button type="button" onClick={() => setSelectedFile(null)} className="p-1 hover:text-destructive text-muted-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Highlights / Quotes</label>
              <textarea
                value={highlights}
                onChange={e => setHighlights(e.target.value)}
                placeholder="Log key quotes or highlights from the book..."
                rows={2}
                className="w-full p-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Study Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Write down brief session learnings, notes, takeaways..."
                rows={3}
                className="w-full p-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                {editingBook ? 'Save Changes' : 'Log Book'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Read Online Fullscreen Modal */}
      {isReaderOpen && activeBook && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> {activeBook.title}
              </h3>
              {activeBook.author && (
                <p className="text-[10px] text-muted-foreground mt-0.5">by {activeBook.author}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                {activeBook.fileUrl?.toLowerCase().endsWith('.txt') ? (
                  <>Page {txtCurrentPage + 1} / {txtPages.length || '?'}</>
                ) : (
                  <>Progress: {activeBook.currentPage} / {activeBook.totalPages || '?'} pages</>
                )}
              </span>
              <button
                onClick={() => {
                  setIsReaderOpen(false);
                  setActiveBook(null);
                }}
                className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reader Workspace */}
          <div className="flex-1 flex overflow-hidden bg-secondary/15">
            {/* Search sidebar for TXT files */}
            {activeBook.fileUrl?.toLowerCase().endsWith('.txt') && (
              <div className="w-80 border-r border-border bg-card flex flex-col h-full shrink-0">
                <div className="p-4 border-b border-border">
                  <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2">Search Inside Book</h4>
                  <form onSubmit={handleTxtSearch} className="flex gap-2">
                    <Input
                      placeholder="Type keyword..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-8 text-xs bg-secondary/50"
                    />
                    <Button type="submit" size="sm" className="h-8 px-3 text-xs bg-primary text-primary-foreground">Find</Button>
                  </form>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 divide-y divide-border/40 scrollbar-thin">
                  {searchResults.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-10">No search results.</p>
                  ) : (
                    searchResults.map((res, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleTxtPageChange(res.page)}
                        className={cn(
                          "w-full text-left p-2 rounded text-xs transition-colors hover:bg-secondary/40",
                          txtCurrentPage === res.page && "bg-primary/10 text-primary border border-primary/20"
                        )}
                      >
                        <span className="font-bold text-[10px] text-muted-foreground block mb-0.5">Page {res.page + 1}</span>
                        <p className="text-muted-foreground line-clamp-2 leading-relaxed">{res.text}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Main view frame */}
            <div className="flex-1 p-6 flex flex-col justify-between items-center overflow-hidden">
              {readerLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Loading file...</p>
                </div>
              ) : readerError ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 max-w-sm text-center">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                  <p className="text-sm font-semibold text-foreground">Error Loading Book</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{readerError}</p>
                  <a href={activeBook.fileUrl} download className="mt-2 text-xs text-primary hover:underline">Download file instead</a>
                </div>
              ) : activeBook.fileUrl?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={activeBook.fileUrl || ''}
                  className="w-full h-full max-w-5xl bg-white rounded-xl shadow-2xl border border-border/80"
                  title={activeBook.title}
                />
              ) : activeBook.fileUrl?.toLowerCase().endsWith('.txt') ? (
                <div className="w-full max-w-3xl flex flex-col h-full justify-between bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  {/* Font controls bar */}
                  <div className="px-4 py-2 border-b border-border bg-secondary/20 flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Text Reader Controls</span>
                    <div className="flex items-center gap-2">
                      <Type className="w-3.5 h-3.5 text-muted-foreground" />
                      {(['sm', 'md', 'lg'] as const).map(sz => (
                        <button
                          key={sz}
                          onClick={() => setFontSize(sz)}
                          className={cn(
                            "px-2 py-0.5 rounded border capitalize text-[10px] font-semibold transition-all",
                            fontSize === sz ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {sz === 'sm' ? 'Small' : sz === 'md' ? 'Medium' : 'Large'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text page content container */}
                  <div className="flex-1 overflow-y-auto p-8 select-text scrollbar-thin">
                    <pre
                      className={cn(
                        "whitespace-pre-wrap font-sans leading-relaxed text-foreground tracking-wide break-words",
                        fontSize === 'sm' && "text-xs",
                        fontSize === 'md' && "text-sm",
                        fontSize === 'lg' && "text-base"
                      )}
                    >
                      {txtPages[txtCurrentPage] || 'End of document.'}
                    </pre>
                  </div>

                  {/* TXT navigation footer */}
                  <div className="px-4 py-3 border-t border-border bg-secondary/20 flex justify-between items-center text-xs">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={txtCurrentPage <= 0}
                      onClick={() => handleTxtPageChange(txtCurrentPage - 1)}
                      className="h-8 px-3"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Prev Page
                    </Button>
                    <span className="text-muted-foreground">Page {txtCurrentPage + 1} of {txtPages.length}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={txtCurrentPage >= txtPages.length - 1}
                      onClick={() => handleTxtPageChange(txtCurrentPage + 1)}
                      className="h-8 px-3"
                    >
                      Next Page <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : activeBook.fileUrl?.toLowerCase().endsWith('.epub') ? (
                <div className="w-full max-w-4xl flex flex-col h-full bg-white text-black rounded-xl shadow-2xl border border-border overflow-hidden">
                  {/* EPUB container */}
                  <div id="epub-viewer" className="flex-1 h-full w-full bg-white text-black" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <p className="text-sm font-semibold text-foreground">Format Not Natively Supported</p>
                  <p className="text-xs text-muted-foreground mb-4">This file extension cannot be rendered directly in the online viewer.</p>
                  <a href={activeBook.fileUrl} download className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all">
                    Download & Open Externally
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
