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
    { id: 'settings',  icon: '⚙️', label: 'Settings' },
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
function PreviewTable({ data, showTranslated }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">Upload a file to see subtitle preview</div>
      </div>
    );
  }

  const rows = data.slice(0, 200);

  return (
    <div className="preview-scroll">
      <table className="preview-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Timecode</th>
            <th>Original (English)</th>
            {showTranslated && <th>Translated (Bengali)</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
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
      <div className="form-group">
        <label className="form-label">API Provider</label>
        <div className="toggle-group" id="api-provider-toggle">
          {['openai', 'omniroute'].map(p => (
            <div
              key={p}
              id={`provider-${p}`}
              className={`toggle-option ${config.apiProvider === p ? 'active' : ''}`}
              onClick={() => setConfig(c => ({ ...c, apiProvider: p }))}
            >
              {p === 'openai' ? '🤖 OpenAI' : '🏠 Local OmniRoute'}
            </div>
          ))}
        </div>
      </div>

      {config.apiProvider === 'openai' ? (
        <>
          <div className="form-group">
            <label className="form-label" htmlFor="api-key">OpenAI API Key</label>
            <input
              id="api-key"
              className="input"
              type="password"
              placeholder="sk-proj-..."
              value={config.apiKey}
              onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="model-select">Model</label>
            <select
              id="model-select"
              className="select"
              value={config.model}
              onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
            >
              <option value="gpt-4o-mini">GPT-4o mini (fast, cheap)</option>
              <option value="gpt-4o">GPT-4o (best quality)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (budget)</option>
            </select>
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label" htmlFor="api-url">API URL</label>
            <input
              id="api-url"
              className="input"
              type="text"
              placeholder="http://localhost:20128/api/v1/chat/completions"
              value={config.apiUrl}
              onChange={e => setConfig(c => ({ ...c, apiUrl: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="local-api-key">API Key</label>
            <input
              id="local-api-key"
              className="input"
              type="password"
              placeholder="sk-..."
              value={config.localApiKey}
              onChange={e => setConfig(c => ({ ...c, localApiKey: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="local-model">Model</label>
            <input
              id="local-model"
              className="input"
              type="text"
              placeholder="agy/gemini-3.5-flash-low"
              value={config.localModel}
              onChange={e => setConfig(c => ({ ...c, localModel: e.target.value }))}
            />
          </div>
        </>
      )}

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
    apiProvider:  'openai',
    apiKey:       '',
    model:        'gpt-4o-mini',
    apiUrl:       'http://localhost:20128/api/v1/chat/completions',
    localApiKey:  'sk-dcf89108ea6dab3c-ca8356-d02574f1',
    localModel:   'agy/gemini-3.5-flash-low',
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
    if (config.apiProvider === 'openai' && !config.apiKey) {
      addToast('Please set your OpenAI API key in Settings.', 'error');
      setActiveTab('settings');
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

    // Translate all chunks in parallel
    const promises = chunks.map((_, i) => {
      setChunkStates(prev => { const n=[...prev]; n[i]='loading'; return n; });

      return fetch('/api/translate-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitles: subtitles.map(s => ({ id: s.id, text: s.originalText })),
          chunkIndex: i,
          chunkSize: config.chunkSize,
          apiProvider: config.apiProvider,
          apiKey: config.apiProvider === 'openai' ? config.apiKey : config.localApiKey,
          apiUrl: config.apiUrl,
          model:  config.apiProvider === 'openai' ? config.model : config.localModel,
          targetLanguage: config.targetLanguage,
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.error) throw new Error(data.error);

          // Merge translated results into updatedSubs
          for (const t of data.translated) {
            const idx = updatedSubs.findIndex(s => s.id === t.id);
            if (idx !== -1) updatedSubs[idx] = { ...updatedSubs[idx], text: t.text };
          }

          completedCount++;
          setChunkStates(prev => { const n=[...prev]; n[i]='done'; return n; });
          addLog(`Chunk ${i+1}/${chunks.length} done ✓`, 'success');
        })
        .catch(err => {
          errorCount++;
          setChunkStates(prev => { const n=[...prev]; n[i]='error'; return n; });
          addLog(`Chunk ${i+1} error: ${err.message}`, 'error');
        });
    });

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
    settings:  'Settings',
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
                : activeTab === 'settings'
                ? 'Configure AI provider and translation options'
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

                    {/* Quick Settings Summary */}
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">
                          <div className="card-icon" style={{ background: 'rgba(6,182,212,0.2)' }}>⚙️</div>
                          Configuration
                        </div>
                        <button
                          id="open-settings-btn"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setActiveTab('settings')}
                        >
                          Edit Settings
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <span className="badge badge-purple">
                          {config.apiProvider === 'openai' ? '🤖 ' + config.model : '🏠 ' + config.localModel}
                        </span>
                        <span className="badge badge-cyan">🌐 {config.targetLanguage}</span>
                        <span className="badge badge-orange">🧩 {config.chunkSize} per chunk</span>
                        <span className={`badge ${config.apiKey || config.apiProvider === 'omniroute' ? 'badge-green' : 'badge-red'}`}>
                          {config.apiKey || config.apiProvider === 'omniroute' ? '🔑 Key set' : '⚠️ No API key'}
                        </span>
                      </div>
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
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="card">
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
                  <PreviewTable data={subtitles} showTranslated={status !== 'idle'} />
                  {subtitles.length > 200 && (
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Showing first 200 of {subtitles.length} subtitles
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── SETTINGS TAB ────────────────────────────────── */}
            {activeTab === 'settings' && (
              <div className="fade-in">
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon" style={{ background: 'rgba(245,158,11,0.2)' }}>⚙️</div>
                      API & Translation Settings
                    </div>
                    <button
                      id="save-settings-btn"
                      className="btn btn-primary btn-sm"
                      onClick={() => { addToast('Settings saved!', 'success'); setActiveTab('translate'); }}
                    >
                      ✓ Save & Return
                    </button>
                  </div>
                  <SettingsForm config={config} setConfig={setConfig} />
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
