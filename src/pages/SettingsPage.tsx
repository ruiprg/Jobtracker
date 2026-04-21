import { useEffect, useState, useRef } from 'react';
import {
  fetchSearches,
  createSearch,
  updateSearch,
  deleteSearch,
  fetchResume,
  uploadResume,
  importApplications,
  searchJobs,
} from '../lib/api';
import { useToast } from '../hooks/useToast';
import {
  IconPlus,
  IconX,
  IconTrash,
  IconEdit,
  IconRefresh,
  IconUpload,
  IconFile,
} from '../components/Icons';

export function SettingsPage() {
  const [tab, setTab] = useState<'searches' | 'resume' | 'import'>('searches');

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
        <p>Manage saved searches, resume, and data import</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'searches' ? 'active' : ''}`} onClick={() => setTab('searches')}>
          Saved Searches
        </button>
        <button className={`tab ${tab === 'resume' ? 'active' : ''}`} onClick={() => setTab('resume')}>
          Resume
        </button>
        <button className={`tab ${tab === 'import' ? 'active' : ''}`} onClick={() => setTab('import')}>
          Import Data
        </button>
      </div>

      {tab === 'searches' && <SavedSearchesTab />}
      {tab === 'resume' && <ResumeTab />}
      {tab === 'import' && <ImportTab />}
    </div>
  );
}

// ============================================================
// Saved Searches Tab
// ============================================================
function SavedSearchesTab() {
  const { toast } = useToast();
  const [searches, setSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [running, setRunning] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);

  useEffect(() => {
    fetchSearches()
      .then(setSearches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setName('');
    setKeywords('');
    setLocation('');
    setRemoteOnly(false);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name || !keywords) {
      toast('Name and keywords are required', 'error');
      return;
    }
    try {
      if (editingId) {
        const updated = await updateSearch({ id: editingId, name, keywords, location, remote_only: remoteOnly });
        setSearches((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
        toast('Search updated', 'success');
      } else {
        const created = await createSearch({ name, keywords, location, remote_only: remoteOnly });
        setSearches((prev) => [created, ...prev]);
        toast('Search created', 'success');
      }
      resetForm();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleEdit = (search: any) => {
    setEditingId(search.id);
    setName(search.name);
    setKeywords(search.keywords);
    setLocation(search.location || '');
    setRemoteOnly(!!search.remote_only);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this saved search?')) return;
    try {
      await deleteSearch(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
      toast('Search deleted', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleRun = async (search: any) => {
    setRunning(search.id);
    try {
      const result = await searchJobs({ search_id: search.id });
      toast(result.message, 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setRunning(null);
    }
  };

  const handleToggleActive = async (search: any) => {
    try {
      const updated = await updateSearch({ id: search.id, active: !search.active });
      setSearches((prev) => prev.map((s) => (s.id === search.id ? updated : s)));
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleRunAll = async () => {
    const active = searches.filter((s) => s.active);
    if (active.length === 0) {
      toast('No active searches to run', 'error');
      return;
    }
    toast(`Running ${active.length} saved searches...`, 'info');
    for (const s of active) {
      setRunning(s.id);
      try {
        await searchJobs({ search_id: s.id });
      } catch {
        // continue with next
      }
    }
    setRunning(null);
    toast('All saved searches completed', 'success');
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading searches...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          {searches.length} saved search{searches.length !== 1 ? 'es' : ''}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={handleRunAll}>
            <IconRefresh /> Run All Active
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <IconPlus /> New Search
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="card-header">
            <div className="card-title">{editingId ? 'Edit Search' : 'New Saved Search'}</div>
            <button className="btn btn-icon btn-ghost" onClick={resetForm}><IconX /></button>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Wind Energy - Portugal" />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., portugal, belgium, remote" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Keywords (comma-separated)</label>
            <input className="input" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., wind turbine, CFD engineer, site assessment" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />
              Remote only
            </label>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {editingId ? 'Update' : 'Create'} Search
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {searches.map((search) => (
          <div
            key={search.id}
            className="card"
            style={{
              padding: 'var(--space-md) var(--space-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              opacity: search.active ? 1 : 0.5,
            }}
          >
            <input
              type="checkbox"
              checked={!!search.active}
              onChange={() => handleToggleActive(search)}
              title="Toggle active"
              style={{ cursor: 'pointer' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{search.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {search.keywords}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 4, fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                {search.location && <span>Location: {search.location}</span>}
                {search.remote_only ? <span className="remote-badge">Remote</span> : null}
                {search.last_run && <span>Last run: {new Date(search.last_run).toLocaleDateString()}</span>}
                <span>Results: {search.results_count}</span>
              </div>
            </div>
            <button
              className="btn btn-sm btn-accent"
              disabled={running === search.id}
              onClick={() => handleRun(search)}
            >
              <IconRefresh /> {running === search.id ? 'Running...' : 'Run'}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(search)}>
              <IconEdit />
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(search.id)}>
              <IconTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Resume Tab
// ============================================================
function ResumeTab() {
  const { toast } = useToast();
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchResume()
      .then(setResume)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast('Please upload a PDF file', 'error');
      return;
    }

    setUploading(true);
    try {
      // Read PDF as text on the client side.
      // For a proper implementation we'd use pdfjs-dist, but for simplicity
      // we extract raw text from the arraybuffer.
      const buffer = await file.arrayBuffer();

      // Simple PDF text extraction: look for text between parentheses in streams.
      // This is a basic approach; for production, use pdf.js.
      let text = '';
      const bytes = new Uint8Array(buffer);
      const str = new TextDecoder('latin1').decode(bytes);

      // Try to find text objects in PDF
      const textMatches = str.match(/\(([^)]+)\)/g);
      if (textMatches) {
        text = textMatches
          .map((m) => m.slice(1, -1))
          .filter((t) => t.length > 1 && !/^[\\\/\d.]+$/.test(t))
          .join(' ');
      }

      // Fallback: just extract all printable ASCII sequences
      if (text.length < 100) {
        const printable = str.match(/[\x20-\x7E]{4,}/g);
        if (printable) {
          text = printable
            .filter((s) => !/^[\d.\/\\%<>]+$/.test(s) && s.length > 5)
            .join(' ');
        }
      }

      if (text.length < 50) {
        toast('Could not extract text from PDF. Try pasting your resume text manually.', 'error');
        setUploading(false);
        return;
      }

      await uploadResume({ filename: file.name, text_content: text.substring(0, 10000) });
      setResume({ filename: file.name, text_content: text.substring(0, 10000) });
      toast('Resume uploaded successfully', 'success');
    } catch (e: any) {
      toast(e.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handlePasteSubmit = async (text: string) => {
    if (!text.trim()) {
      toast('Please paste your resume text', 'error');
      return;
    }
    setUploading(true);
    try {
      await uploadResume({ filename: 'resume-pasted.txt', text_content: text.substring(0, 10000) });
      setResume({ filename: 'resume-pasted.txt', text_content: text });
      toast('Resume saved', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading resume...</div>;
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <div className="card-title">Upload Resume (PDF)</div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
          Upload your resume to enable AI-powered analysis. The text will be extracted and compared
          against job descriptions to suggest improvements.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <div className="file-upload" onClick={() => fileRef.current?.click()}>
          {uploading ? (
            <div><div className="spinner" style={{ display: 'inline-block' }} /> Uploading...</div>
          ) : (
            <>
              <IconUpload />
              <div style={{ marginTop: 8, fontWeight: 500 }}>Click to upload PDF resume</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>or drag and drop</div>
            </>
          )}
        </div>
      </div>

      {/* Current resume */}
      {resume && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="card-header">
            <div className="card-title">
              <IconFile /> Current Resume: {resume.filename}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
              {resume.text_content?.length || 0} characters extracted
            </span>
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              lineHeight: 1.6,
              maxHeight: 200,
              overflow: 'auto',
              padding: 'var(--space-md)',
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {resume.text_content?.substring(0, 2000)}
            {resume.text_content?.length > 2000 && '...'}
          </div>
        </div>
      )}

      {/* Manual paste fallback */}
      <PasteResume onSubmit={handlePasteSubmit} uploading={uploading} />
    </div>
  );
}

function PasteResume({ onSubmit, uploading }: { onSubmit: (text: string) => void; uploading: boolean }) {
  const [text, setText] = useState('');

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Or Paste Resume Text</div>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
        If PDF extraction doesn't work well, you can paste your resume text directly.
      </p>
      <textarea
        className="textarea"
        style={{ minHeight: 200 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your full resume text here..."
      />
      <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" disabled={uploading || !text.trim()} onClick={() => onSubmit(text)}>
          Save Resume Text
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Import Tab (Excel)
// ============================================================
function ImportTab() {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Dynamically import xlsx to parse the file
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      if (json.length === 0) {
        toast('Spreadsheet is empty', 'error');
        return;
      }

      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      setPreview(json.slice(0, 10));

      // Auto-detect column mapping
      const map: Record<string, string> = {};
      for (const h of hdrs) {
        const lower = h.toLowerCase();
        if (lower.includes('company') || lower.includes('empresa')) map.company = h;
        else if (lower.includes('title') || lower.includes('position') || lower.includes('cargo') || lower.includes('job')) map.title = h;
        else if (lower.includes('url') || lower.includes('link')) map.url = h;
        else if (lower.includes('location') || lower.includes('local')) map.location = h;
        else if (lower.includes('status') || lower.includes('estado')) map.status = h;
        else if (lower.includes('note') || lower.includes('nota')) map.notes = h;
      }
      setColumnMap(map);

      toast(`Found ${json.length} rows in "${sheetName}"`, 'success');
    } catch (e: any) {
      toast('Failed to read spreadsheet: ' + e.message, 'error');
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    // Re-parse the full file for import (preview only shows first 10)
    // For simplicity, we use the preview data -- user should re-upload for full import
    // Actually, let's re-read from the file input
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast('Please select the file again', 'error');
      return;
    }

    setImporting(true);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      const rows = json.map((row) => ({
        company: String(row[columnMap.company] || '').trim(),
        title: String(row[columnMap.title] || '').trim(),
        url: columnMap.url ? String(row[columnMap.url] || '').trim() : undefined,
        location: columnMap.location ? String(row[columnMap.location] || '').trim() : undefined,
        status: columnMap.status ? String(row[columnMap.status] || '').trim() : undefined,
        notes: columnMap.notes ? String(row[columnMap.notes] || '').trim() : undefined,
      }));

      const result = await importApplications(rows);
      toast(result.message, 'success');
      if (result.errors?.length) {
        console.warn('Import errors:', result.errors);
      }
      setPreview(null);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <div className="card-title">Import from Excel</div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
          Upload your existing spreadsheet (.xlsx) to import application data. The tool will try to
          auto-detect columns for company name, job title, and URL.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleFile}
        />

        <div className="file-upload" onClick={() => fileRef.current?.click()}>
          <IconUpload />
          <div style={{ marginTop: 8, fontWeight: 500 }}>Click to upload Excel file (.xlsx)</div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Supports .xlsx, .xls, .csv</div>
        </div>
      </div>

      {/* Column Mapping */}
      {preview && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="card-header">
            <div className="card-title">Column Mapping</div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
            Map your spreadsheet columns to application fields. We've auto-detected what we can.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company Column *</label>
              <select className="select" value={columnMap.company || ''} onChange={(e) => setColumnMap({ ...columnMap, company: e.target.value })}>
                <option value="">-- Select --</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Job Title Column *</label>
              <select className="select" value={columnMap.title || ''} onChange={(e) => setColumnMap({ ...columnMap, title: e.target.value })}>
                <option value="">-- Select --</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">URL Column</label>
              <select className="select" value={columnMap.url || ''} onChange={(e) => setColumnMap({ ...columnMap, url: e.target.value })}>
                <option value="">-- None --</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Location Column</label>
              <select className="select" value={columnMap.location || ''} onChange={(e) => setColumnMap({ ...columnMap, location: e.target.value })}>
                <option value="">-- None --</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div style={{ marginTop: 'var(--space-md)' }}>
            <div className="card-title" style={{ marginBottom: 'var(--space-sm)' }}>Preview (first 10 rows)</div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Title</th>
                    <th>URL</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      <td>{row[columnMap.company] || '-'}</td>
                      <td>{row[columnMap.title] || '-'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row[columnMap.url] || '-'}
                      </td>
                      <td>{row[columnMap.location] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            <button className="btn btn-secondary" onClick={() => setPreview(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={importing || !columnMap.company || !columnMap.title}
              onClick={handleImport}
            >
              {importing ? 'Importing...' : 'Import All Rows'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
