'use client';
import { useState } from 'react';
import { organizerFetch } from '../lib/browser';
import Icon from './Icon';

const FIELDS = [
  ['first_name',  'First Name / નામ'],
  ['father_name', 'Father Name / પિતાનું નામ'],
  ['surname',     'Surname / અટક'],
  ['mobile',      'Mobile / મોબાઇલ'],
  ['pincode',     'Pincode / પિનકોડ'],
  ['village',     'Village / ગામ'],
  ['taluka',      'Taluka / તાલુકો'],
  ['district',    'District / જિલ્લો'],
  ['address',     'Address / સરનામું'],
];

const standard = new Set(FIELDS.map((x) => x[0]));
const clean = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

function guess(field) {
  if (/mobile|phone|whatsapp|મોબાઇલ|મોબાઈલ|ફોન|contact|number/.test(field)) return 'mobile';
  if (/father|પિતા|પિતાનું|પિતાનુ|વાલી/.test(field))                         return 'father_name';
  if (/surname|last name|અટક/.test(field))                                   return 'surname';
  if (/first name|full name|નામ|name/.test(field))                            return 'first_name';
  if (/pin|પિન|zip/.test(field))                                             return 'pincode';
  if (/village|ગામ/.test(field))                                             return 'village';
  if (/taluka|તાલુકા|તાલુકો/.test(field))                                   return 'taluka';
  if (/district|જિલ્લો/.test(field))                                         return 'district';
  if (/address|સરનામું/.test(field))                                         return 'address';
  return 'ignore';
}

function quoteCSV(v) {
  const s = String(v ?? '');
  return `"${(/^[\s]*[=+@\-\t\r]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"`;
}

function downloadCredentials(creds, name) {
  const data = [
    'Member ID,Name,Mobile,Participant Password',
    ...creds.map((x) => [x.id, x.name, x.mobile, x.access_code].map(quoteCSV).join(',')),
  ].join('\r\n');
  const blob = new Blob(['\ufeff', data], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${name}-new-access-codes.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function ImportSheet({ event }) {
  const [fileName, setFileName] = useState('');
  const [headers,  setHeaders]  = useState([]);
  const [rows,     setRows]     = useState([]);
  const [mapping,  setMapping]  = useState({});
  const [busy,     setBusy]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [message,  setMessage]  = useState('');
  const [error,    setError]    = useState('');
  const [creds,    setCreds]    = useState([]);

  async function openFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    setMessage('');
    setCreds([]);
    setProgress(0);
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error('Maximum file size is 12 MB');
      const filename = file.name.toLowerCase();
      let sheet;
      if (filename.endsWith('.xlsx')) {
        const { readSheet } = await import('read-excel-file/browser');
        sheet = await readSheet(file);
      } else if (filename.endsWith('.csv')) {
        const Papa = (await import('papaparse')).default;
        sheet = await new Promise((resolve, reject) =>
          Papa.parse(file, {
            skipEmptyLines: true,
            complete: (r) => (r.errors.length ? reject(new Error(r.errors[0].message)) : resolve(r.data)),
            error: reject,
          })
        );
      } else {
        throw new Error('Choose a .xlsx or .csv file (old .xls is not supported)');
      }
      if (!sheet || sheet.length < 2) throw new Error('No data rows found');
      const head    = sheet[0].map((x) => String(x ?? '').trim());
      if (head.length > 100) throw new Error('Maximum 100 columns');
      const records = sheet.slice(1).filter((r) => Array.isArray(r) && r.some((x) => String(x ?? '').trim()));
      if (records.length > 100000) throw new Error('Maximum 100,000 rows per import');
      const mapped = {};
      const used   = new Set();
      head.forEach((label, i) => {
        let g = guess(clean(label));
        if (used.has(g) && g !== 'ignore') g = 'ignore';
        if (g !== 'ignore') used.add(g);
        mapped[i] = g;
      });
      setHeaders(head);
      setRows(records);
      setMapping(mapped);
      setFileName(file.name);
    } catch (err) {
      setError(err.message);
      setHeaders([]);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  function updateMapping(index, value) {
    setMapping((m) => ({ ...m, [index]: value }));
  }

  async function start() {
    const used = Object.values(mapping).filter((x) => standard.has(x));
    if (!used.includes('first_name') || !used.includes('mobile')) {
      setError('First Name અને Mobile બંને Column પસંદ કરો.');
      return;
    }
    if (used.length !== new Set(used).size) {
      setError('એક standard field માટે એક જ column પસંદ કરો.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    let result = [];
    try {
      const started = await organizerFetch('/api/organizer/import', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'start',
          eventId: event.id,
          filename: fileName,
          headers,
          mapping,
          totalRows: rows.length,
        }),
      });
      let created = 0, skipped = 0;
      const problems = [];
      for (let i = 0; i < rows.length; i += 150) {
        const batch = await organizerFetch('/api/organizer/import', {
          method: 'POST',
          body: JSON.stringify({
            mode: 'batch',
            eventId: event.id,
            batchId: started.batchId,
            rows: rows.slice(i, i + 150),
          }),
        });
        created += batch.created;
        skipped += batch.skipped;
        result  = [...result, ...batch.credentials];
        problems.push(...batch.errors.slice(0, 5));
        setCreds(result);
        setProgress(Math.min(rows.length, i + 150));
      }
      setMessage(
        `${created} નવા સભ્યો ઉમેરાયા, ${skipped} rows skip થયા. ${problems.slice(0, 3).join(' · ')} Participant password = last 4 mobile digits + 09.`
      );
    } catch (err) {
      setError(
        `${err.message}. Partial import may have completed. Existing mobile numbers are skipped on retry. Participant password = last 4 mobile digits + 09.`
      );
    } finally {
      setBusy(false);
    }
  }

  const mappedCount = Object.values(mapping).filter((v) => v !== 'ignore').length;

  return (
    <div className="card import-panel dashboard-panel">
      <h2>Excel / CSV → Member Import</h2>
      <p className="muted">
        The first row must contain column headings. File is parsed in your browser;
        only selected columns are sent in batches of 150.
      </p>
      <div className="info">
        Participant password = last 4 digits of their mobile number + 09.
        For example: 9876543210 → 321009. Passwords are set automatically;
        downloading or distributing separate codes is not required.
      </div>

      {/* ── Upload Zone ── */}
      <div className="upload-control">
        <div
          className="upload-zone"
          onClick={() => document.getElementById('file-upload')?.click()}
          style={{ cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          <span className="upload-zone-icon"><Icon name="upload" /></span>
          {fileName ? (
            <>
              <p><strong>{fileName}</strong></p>
              <p>{rows.length.toLocaleString()} rows · {headers.length} columns detected</p>
            </>
          ) : (
            <>
              <p><strong>Click to choose a file</strong> or drag and drop</p>
              <p>.xlsx or .csv — max 12 MB, 100,000 rows</p>
            </>
          )}
        </div>
        <input
          id="file-upload"
          className="upload-input"
          aria-label="Choose Excel or CSV file"
          type="file"
          accept=".xlsx,.csv"
          disabled={busy}
          onChange={openFile}
          style={{ display: 'none' }}
        />
      </div>

      {/* ── Column Mapping ── */}
      {headers.length > 0 && (
        <>
          <div className="notice" style={{ marginTop: 'var(--space-5)' }}>
            <strong>{rows.length.toLocaleString()} rows found.</strong> Map{' '}
            <strong>First Name</strong> and <strong>Mobile</strong>. Select "Custom field"
            to save other useful columns.
          </div>

          <div className="table-wrap mapping-table-wrap" role="region" aria-label="Import column mapping" tabIndex={0} style={{ marginTop: 'var(--space-4)' }}>
            <table className="mapping-table" role="table" aria-label="Import column mapping">
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">Sheet Column</th>
                  <th scope="col" role="columnheader">Preview (Row 1)</th>
                  <th scope="col" role="columnheader">Save As</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {headers.map((h, i) => (
                  <tr key={i} role="row">
                    <td role="cell" data-label="Sheet Column"><strong>{h || `Column ${i + 1}`}</strong></td>
                    <td role="cell" data-label="Preview (Row 1)" style={{ color: 'var(--ink-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {String(rows[0]?.[i] ?? '').slice(0, 70)}
                    </td>
                    <td role="cell" data-label="Save As">
                      <select
                        aria-label={`Save ${h || `Column ${i + 1}`} as`}
                        value={mapping[i] ?? 'ignore'}
                        onChange={(e) => updateMapping(i, e.target.value)}
                        style={{ minWidth: 0, minHeight: 'var(--tap-target)', padding: 'var(--space-2) var(--space-8) var(--space-2) var(--space-3)' }}
                      >
                        <option value="ignore">— Ignore</option>
                        {FIELDS.map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                        <option value={`extra:${h || 'Column ' + (i + 1)}`}>
                          Custom field: {h || `Column ${i + 1}`}
                        </option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row-space" style={{ marginTop: 'var(--space-4)' }}>
            <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              <strong>{mappedCount}</strong> fields selected
            </div>
            <button
              className="btn-primary"
              onClick={start}
              disabled={busy}
            >
              {busy ? (
                <><span className="spinner spinner-sm" /> Import running…</>
              ) : (
                'Start Import'
              )}
            </button>
          </div>

          {/* Progress bar */}
          {busy && rows.length > 0 && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div className="progress-wrap" role="progressbar" aria-label="Import progress" aria-valuemin={0} aria-valuemax={rows.length} aria-valuenow={progress}>
                <div
                  className="progress-bar"
                  style={{ width: `${Math.round((progress / rows.length) * 100)}%` }}
                />
              </div>
              <div className="input-hint" style={{ textAlign: 'left' }}>
                Imported {progress.toLocaleString()} / {rows.length.toLocaleString()} rows
              </div>
            </div>
          )}
        </>
      )}

      {error   && <div className="error" role="alert">{error}</div>}
      {message && <div className="msg" role="status">{message}</div>}

      {/* ── Download credentials button ── */}
      {creds.length > 0 && (
        <div className="card credentials-panel" style={{ background: 'var(--blue-light)', borderColor: 'var(--blue-mid)', marginTop: 'var(--space-4)' }}>
          <div className="row-space">
            <div>
              <h4 style={{ color: 'var(--blue)', marginBottom: 'var(--space-1)' }}>
                {creds.length} Participant Passwords Set
              </h4>
              <p className="input-hint" style={{ marginBottom: 0 }}>
                Each password is the last 4 mobile digits followed by 09.
                Downloading this list is optional. Do not share the full file publicly.
              </p>
            </div>
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => downloadCredentials(creds, event.slug)}
              style={{ flexShrink: 0 }}
            >
              Download CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
