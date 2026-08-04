'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { srtToJson, jsonToSrt, chunkArray, formatBytes } from '@/lib/subtitle';

/* ─── HELPERS ────────────────────────────────────────────────── */
function now() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

/* ─── TOAST ──────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── SIDEBAR ────────────────────────────────────────────────── */
function Sidebar({ activeTab, setActiveTab }) {
  const nav = [
    { id: 'translate', icon: '⚡', label: 'Translate' },
    { id: 'preview',   icon: '👁️', label: 'Preview' },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎬</div>
        <span className="sidebar-logo-text gradient-text">SubTranslate</span>
      </div>

      <nav className="sidebar-nav">
        {nav.map(item => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 12px', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>SubTranslate v1.0</div>
          <div>AI-powered SRT subtitle</div>
          <div>translation tool</div>
        </div>
      </div>
    </aside>
  );
}

/* ─── HEADER ─────────────────────────────────────────────────── */
function Header({ title, subtitle, status, progress }) {
  return (
    <header className="header">
      <div className="header-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-actions">
        {status && (
          <span className={`badge badge-${status === 'translating' ? 'orange' : status === 'done' ? 'green' : 'purple'}`}>
            {status === 'translating' && <span className="spinner" style={{ width: 8, height: 8 }} />}
            {status}
          </span>
        )}
        {progress > 0 && progress < 100 && (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {progress}%
          </span>
        )}
      </div>
    </header>
  );
}

/* ─── UPLOAD ZONE ────────────────────────────────────────────── */
function UploadZone({ file, onFile }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDrag(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.srt')) onFile(dropped);
  }, [onFile]);

  const handleChange = e => {
    if (e.target.files[0]) onFile(e.target.files[0]);
  };

  return (
    <div
      id="upload-zone"
      className={`upload-zone ${drag ? 'drag-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".srt"
        style={{ display: 'none' }}
        id="file-input"
        onChange={handleChange}
      />
      {file ? (
        <>
          <div style={{ fontSize: 36 }}>✅</div>
          <div className="upload-title">{file.name}</div>
          <div className="upload-subtitle">{formatBytes(file.size)}</div>
          <button
            id="change-file-btn"
            className="btn btn-secondary btn-sm"
            onClick={e => { e.stopPropagation(); inputRef.current.click(); }}
          >
            Change file
          </button>
        </>
      ) : (
        <>
          <div className="upload-icon">📄</div>
          <div className="upload-title">Drop your .srt file here</div>
          <div className="upload-subtitle">or click to browse</div>
          <button id="browse-btn" className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); inputRef.current.click(); }}>
            Browse Files
          </button>
        </>
      )}
    </div>
  );
}

/* ─── PROGRESS PANEL ─────────────────────────────────────────── */
function ProgressPanel({ chunks, totalChunks, elapsed }) {
  const done  = chunks.filter(c => c === 'done').length;
  const pct   = totalChunks > 0 ? Math.round((done / totalChunks) * 100) : 0;

  return (
    <div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-stats">
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{done}</strong> / {totalChunks} chunks
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {pct}% · {elapsed}s elapsed
        </span>
      </div>
      <div className="chunks-grid">
        {chunks.map((state, i) => (
          <div key={i} className={`chunk-dot ${state}`} title={`Chunk ${i + 1}: ${state}`}>
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── PREVIEW TABLE ──────────────────────────────────────────── */
function PreviewTable({ data, showTranslated, targetLanguage }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">Upload a file to see subtitle preview</div>
      </div>
    );
  }

  return (
    <div className="preview-scroll">
      <table className="preview-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Timecode</th>
            <th>Original (English)</th>
            {showTranslated && <th>Translated ({targetLanguage})</th>}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id}>
              <td className="id-cell">{row.id}</td>
              <td className="time-cell">
                {row.startTime}<br />{row.endTime}
              </td>
              <td>{row.originalText || row.text}</td>
              {showTranslated && (
                <td style={{ color: row.text !== row.originalText ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                  {row.text || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>pending…</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── SETTINGS FORM ──────────────────────────────────────────── */
function SettingsForm({ config, setConfig }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="chunk-size">Chunk Size</label>
          <select
            id="chunk-size"
            className="select"
            value={config.chunkSize}
            onChange={e => setConfig(c => ({ ...c, chunkSize: Number(e.target.value) }))}
          >
            {[10, 20, 30, 50].map(n => (
              <option key={n} value={n}>{n} subtitles/chunk</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="target-language">Target Language</label>
          <select
            id="target-language"
            className="select"
            value={config.targetLanguage}
            onChange={e => setConfig(c => ({ ...c, targetLanguage: e.target.value }))}
          >
            <option value="Bengali (বাংলা)">Bengali (বাংলা)</option>
            <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
            <option value="Arabic (عربي)">Arabic (عربي)</option>
            <option value="Spanish (Español)">Spanish (Español)</option>
            <option value="French (Français)">French (Français)</option>
            <option value="Japanese (日本語)">Japanese (日本語)</option>
            <option value="Korean (한국어)">Korean (한국어)</option>
            <option value="Chinese (中文)">Chinese (中文)</option>
            <option value="German (Deutsch)">German (Deutsch)</option>
            <option value="Portuguese (Português)">Portuguese (Português)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* ─── LOG PANEL ──────────────────────────────────────────────── */
function LogPanel({ logs }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="log-panel" ref={ref} id="log-panel">
      {logs.length === 0 ? (
        <div className="log-entry">
          <span className="log-time">{now()}</span>
          <span className="log-msg info">Ready. Upload a .srt file to get started.</span>
        </div>
      ) : logs.map((l, i) => (
        <div key={i} className="log-entry">
          <span className="log-time">{l.time}</span>
          <span className={`log-msg ${l.type}`}>{l.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── STAT CARDS ─────────────────────────────────────────────── */
function StatCards({ subtitles, translated }) {
  const total    = subtitles.length;
  const done     = translated;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const chunks   = Math.ceil(total / 30);

  return (
    <div className="grid-3">
      {[
        { label: 'Total Subtitles', value: total || '—', icon: '📝', color: 'var(--accent-purple)' },
        { label: 'Translated',      value: done  || '—', icon: '✅', color: 'var(--accent-green)' },
        { label: 'Chunks',          value: chunks || '—', icon: '🧩', color: 'var(--accent-cyan)' },
      ].map(s => (
        <div key={s.label} className="stat-card fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="stat-label">{s.label}</span>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
          </div>
          <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────── */
export default function Home() {
  // ── State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState('translate');
  const [file,      setFile]            = useState(null);
  const [subtitles, setSubtitles]       = useState([]);   // [{id, startTime, endTime, text, originalText}]
  const [chunkStates, setChunkStates]   = useState([]);   // 'pending'|'loading'|'done'|'error'
  const [isRunning, setIsRunning]       = useState(false);
  const [elapsed,   setElapsed]         = useState(0);
  const [logs,      setLogs]            = useState([]);
  const [toasts,    setToasts]          = useState([]);
  const [status,    setStatus]          = useState('idle'); // idle|translating|done|error
  const [config, setConfig] = useState({
    apiUrl:       'http://localhost:20128/api/v1/chat/completions',
    apiKey:       'sk-dcf89108ea6dab3c-ca8356-d02574f1',
    model:        'agy/gemini-3.5-flash-low',
    chunkSize:    30,
    targetLanguage: 'Bengali (বাংলা)',
  });

  const timerRef = useRef(null);
  const startRef = useRef(null);

  // ── Helpers ─────────────────────────────────────────────────
  const addLog  = (msg, type = 'info') => setLogs(l => [...l, { time: now(), msg, type }]);
  const addToast = (message, type = 'info', ms = 3500) => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  };

  const translatedCount = subtitles.filter(s => s.text !== s.originalText).length;
  const totalChunks = Math.ceil(subtitles.length / config.chunkSize);
  const progress = totalChunks > 0
    ? Math.round((chunkStates.filter(c => c === 'done').length / totalChunks) * 100)
    : 0;

  // ── File upload ──────────────────────────────────────────────
  const handleFile = async (f) => {
    setFile(f);
    setSubtitles([]);
    setChunkStates([]);
    setLogs([]);
    setStatus('idle');
    setElapsed(0);

    const text  = await f.text();
    const parsed = srtToJson(text);
    const withOriginal = parsed.map(s => ({ ...s, originalText: s.text }));
    setSubtitles(withOriginal);

    const chunks = Math.ceil(parsed.length / config.chunkSize);
    setChunkStates(Array(chunks).fill('pending'));

    addLog(`Loaded "${f.name}" — ${parsed.length} subtitles, ${chunks} chunks.`, 'success');
    addToast(`Loaded ${parsed.length} subtitles from "${f.name}"`, 'success');
  };

  // ── Translate ────────────────────────────────────────────────
  const startTranslation = async () => {
    if (!file || subtitles.length === 0) {
      addToast('Please upload a .srt file first.', 'error');
      return;
    }

    setIsRunning(true);
    setStatus('translating');
    startRef.current = Date.now();

    // Timer
    timerRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - startRef.current) / 1000));
    }, 1000);

    const chunks = chunkArray(
      subtitles.map(s => ({ id: s.id, text: s.originalText })),
      config.chunkSize
    );
    setChunkStates(Array(chunks.length).fill('pending'));

    addLog(`Starting translation of ${chunks.length} chunks…`, 'info');

    let completedCount = 0;
    let errorCount = 0;
    const updatedSubs = [...subtitles];
    const MAX_RETRIES = 3;

    const translateChunk = async (i, attempt = 1) => {
      setChunkStates(prev => { const n=[...prev]; n[i]='loading'; return n; });

      try {
        const r = await fetch('/api/translate-chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subtitles: subtitles.map(s => ({ id: s.id, text: s.originalText })),
            chunkIndex: i,
            chunkSize: config.chunkSize,
            apiProvider: 'omniroute',
            apiKey: config.apiKey,
            apiUrl: config.apiUrl,
            model:  config.model,
            targetLanguage: config.targetLanguage,
          }),
        });
        const data = await r.json();
        if (data.error) throw new Error(data.error);

        for (const t of data.translated) {
          const idx = updatedSubs.findIndex(s => s.id === t.id);
          if (idx !== -1) updatedSubs[idx] = { ...updatedSubs[idx], text: t.text };
        }

        completedCount++;
        setChunkStates(prev => { const n=[...prev]; n[i]='done'; return n; });
        addLog(`Chunk ${i+1}/${chunks.length} done ✓`, 'success');
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          addLog(`Chunk ${i+1} failed (attempt ${attempt}/${MAX_RETRIES}), retrying…`, 'warning');
          await new Promise(res => setTimeout(res, 1000 * attempt));
          return translateChunk(i, attempt + 1);
        }
        errorCount++;
        setChunkStates(prev => { const n=[...prev]; n[i]='error'; return n; });
        addLog(`Chunk ${i+1} failed after ${MAX_RETRIES} attempts: ${err.message}`, 'error');
      }
    };

    // Translate all chunks in parallel
    const promises = chunks.map((_, i) => translateChunk(i));

    await Promise.all(promises);

    // Update subtitles state with all translations
    setSubtitles([...updatedSubs]);

    clearInterval(timerRef.current);
    setIsRunning(false);

    if (errorCount === 0) {
      setStatus('done');
      addLog(`All ${chunks.length} chunks translated successfully! 🎉`, 'success');
      addToast('Translation complete! Ready to download.', 'success');
    } else {
      setStatus('error');
      addLog(`Done with ${errorCount} error(s). Some chunks may not be translated.`, 'warning');
      addToast(`Translation finished with ${errorCount} error(s).`, 'error');
    }
  };

  // ── Download ──────────────────────────────────────────────────
  const downloadSrt = () => {
    const srt  = jsonToSrt(subtitles);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = file ? file.name.replace('.srt', `_${config.targetLanguage.split(' ')[0].toLowerCase()}.srt`) : 'translated.srt';
    a.click();
    URL.revokeObjectURL(url);
    addToast('SRT file downloaded!', 'success');
  };

  // ── Reset ─────────────────────────────────────────────────────
  const reset = () => {
    clearInterval(timerRef.current);
    setFile(null);
    setSubtitles([]);
    setChunkStates([]);
    setLogs([]);
    setStatus('idle');
    setElapsed(0);
    setIsRunning(false);
  };

  // ── Render ────────────────────────────────────────────────────
  const tabLabel = {
    translate: 'Translate',
    preview:   'Preview',
  };

  return (
    <>
      {/* BG Decorations */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="app-layout" style={{ position: 'relative', zIndex: 1 }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="main-content">
          <Header
            title={tabLabel[activeTab]}
            subtitle={
              activeTab === 'translate'
                ? file ? `Working on: ${file.name}` : 'Upload a .srt file to begin'
                : subtitles.length > 0 ? `${subtitles.length} subtitles loaded` : 'No file loaded'
            }
            status={status !== 'idle' ? status : undefined}
            progress={progress}
          />

          <main className="page-content">

            {/* ─── TRANSLATE TAB ─────────────────────────────────── */}
            {activeTab === 'translate' && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Stats */}
                <StatCards subtitles={subtitles} translated={translatedCount} />

                <div className="grid-2" style={{ alignItems: 'start' }}>
                  {/* Left column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Upload */}
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">
                          <div className="card-icon" style={{ background: 'rgba(139,92,246,0.2)' }}>📁</div>
                          Upload Subtitle File
                        </div>
                        {file && (
                          <button id="reset-btn" className="btn btn-danger btn-sm" onClick={reset}>
                            ✕ Reset
                          </button>
                        )}
                      </div>
                      <UploadZone file={file} onFile={handleFile} />
                    </div>

                    {/* Configuration */}
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">
                          <div className="card-icon" style={{ background: 'rgba(6,182,212,0.2)' }}>⚙️</div>
                          Configuration
                        </div>
                      </div>
                      <SettingsForm config={config} setConfig={setConfig} />
                    </div>
                  </div>

                  {/* Right column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Progress */}
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">
                          <div className="card-icon" style={{ background: 'rgba(16,185,129,0.2)' }}>📊</div>
                          Translation Progress
                        </div>
                        {status === 'done' && (
                          <span className="badge badge-green">🎉 Complete</span>
                        )}
                      </div>
                      {chunkStates.length > 0 ? (
                        <ProgressPanel chunks={chunkStates} totalChunks={totalChunks} elapsed={elapsed} />
                      ) : (
                        <div className="empty-state" style={{ padding: '24px' }}>
                          <div className="empty-state-icon">📊</div>
                          <div className="empty-state-text">No translation in progress</div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="card">
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          id="translate-btn"
                          className="btn btn-primary"
                          onClick={startTranslation}
                          disabled={isRunning || !file}
                          style={{ flex: 1 }}
                        >
                          {isRunning ? (
                            <><div className="spinner" />Translating…</>
                          ) : (
                            <>⚡ Start Translation</>
                          )}
                        </button>
                        <button
                          id="download-btn"
                          className="btn btn-success"
                          onClick={downloadSrt}
                          disabled={!file || subtitles.length === 0}
                          style={{ flex: 1 }}
                        >
                          ⬇️ Download SRT
                        </button>
                      </div>
                      {status === 'done' && (
                        <div style={{ marginTop: 12 }}>
                          <button
                            id="preview-btn"
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                            onClick={() => setActiveTab('preview')}
                          >
                            👁️ View Preview
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Log */}
                    <div className="card" style={{ padding: '20px 20px 16px' }}>
                      <div className="card-header" style={{ marginBottom: 12 }}>
                        <div className="card-title">
                          <div className="card-icon" style={{ background: 'rgba(245,158,11,0.2)' }}>🖥️</div>
                          Activity Log
                        </div>
                        <button
                          id="clear-log-btn"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setLogs([])}
                        >
                          Clear
                        </button>
                      </div>
                      <LogPanel logs={logs} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── PREVIEW TAB ─────────────────────────────────── */}
            {activeTab === 'preview' && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon" style={{ background: 'rgba(6,182,212,0.2)' }}>👁️</div>
                      Subtitle Preview
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {status === 'done' && (
                        <button id="preview-download-btn" className="btn btn-success btn-sm" onClick={downloadSrt}>
                          ⬇️ Download SRT
                        </button>
                      )}
                    </div>
                  </div>
                  <PreviewTable data={subtitles} showTranslated={status !== 'idle'} targetLanguage={config.targetLanguage} />
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      <Toast toasts={toasts} />
    </>
  );
}
