'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { srtToJson, jsonToSrt, adjustSubtitleTimings, formatBytes } from '@/lib/subtitle';
import Link from 'next/link';

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
function Sidebar() {
  const nav = [
    { id: 'translate', icon: '⚡', label: 'Translate', href: '/' },
    { id: 'timing', icon: '⏱️', label: 'Timing', href: '/timing' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎬</div>
        <span className="sidebar-logo-text gradient-text">SubTranslate</span>
      </div>

      <nav className="sidebar-nav">
        {nav.map(item => (
          <Link
            key={item.id}
            href={item.href}
            className={`nav-item ${item.id === 'timing' ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
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
function Header({ title, subtitle, file }) {
  return (
    <header className="header">
      <div className="header-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {file && (
        <span className="badge badge-purple">
          {file.name}
        </span>
      )}
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
        onChange={handleChange}
      />
      {file ? (
        <>
          <div style={{ fontSize: 36 }}>✅</div>
          <div className="upload-title">{file.name}</div>
          <div className="upload-subtitle">{formatBytes(file.size)}</div>
          <button
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
          <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); inputRef.current.click(); }}>
            Browse Files
          </button>
        </>
      )}
    </div>
  );
}

/* ─── TIMING ADJUSTMENT ──────────────────────────────────────── */
export default function TimingPage() {
  const [file, setFile] = useState(null);
  const [originalSubtitles, setOriginalSubtitles] = useState([]);
  const [adjustedSubtitles, setAdjustedSubtitles] = useState([]);
  const [offsetSeconds, setOffsetSeconds] = useState(0);
  const [offsetMs, setOffsetMs] = useState(0);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', ms = 3500) => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  };

  const handleFile = async (f) => {
    setFile(f);
    setOriginalSubtitles([]);
    setAdjustedSubtitles([]);
    setOffsetSeconds(0);
    setOffsetMs(0);

    const text = await f.text();
    const parsed = srtToJson(text);
    setOriginalSubtitles(parsed);
    setAdjustedSubtitles(parsed);
    addToast(`Loaded ${parsed.length} subtitles from "${f.name}"`, 'success');
  };

  // Auto-calculate preview when offset changes
  useEffect(() => {
    if (originalSubtitles.length > 0) {
      const totalOffsetMs = offsetSeconds * 1000 + offsetMs;
      const adjusted = adjustSubtitleTimings(originalSubtitles, totalOffsetMs);
      setAdjustedSubtitles(adjusted);
    }
  }, [originalSubtitles, offsetSeconds, offsetMs]);

  const handleApply = () => {
    const totalOffsetMs = offsetSeconds * 1000 + offsetMs;
    if (totalOffsetMs === 0) {
      addToast('No offset applied (0ms)', 'info');
      return;
    }

    addToast(`Timing adjusted by ${totalOffsetMs > 0 ? '+' : ''}${totalOffsetMs}ms`, 'success');
  };

  const handleReset = () => {
    setOffsetSeconds(0);
    setOffsetMs(0);
  };

  const downloadSrt = () => {
    const srt = jsonToSrt(adjustedSubtitles);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file ? file.name.replace('.srt', '_adjusted.srt') : 'adjusted.srt';
    a.click();
    URL.revokeObjectURL(url);
    addToast('SRT file downloaded!', 'success');
  };

  const presets = [
    { label: '-5s', value: -5000 },
    { label: '-1s', value: -1000 },
    { label: '-500ms', value: -500 },
    { label: '+500ms', value: 500 },
    { label: '+1s', value: 1000 },
    { label: '+5s', value: 5000 },
  ];

  const applyPreset = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const remainder = ms % 1000;
    setOffsetSeconds(seconds);
    setOffsetMs(remainder);
  };

  return (
    <>
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="app-layout" style={{ position: 'relative', zIndex: 1 }}>
        <Sidebar />

        <div className="main-content">
          <Header
            title="Time Adjustment"
            subtitle={file ? `Working on: ${file.name}` : 'Upload a .srt file to adjust timing'}
            file={file}
          />

          <main className="page-content">
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Upload */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <div className="card-icon" style={{ background: 'rgba(139,92,246,0.2)' }}>📁</div>
                        Upload Subtitle File
                      </div>
                    </div>
                    <UploadZone file={file} onFile={handleFile} />
                  </div>

                  {/* Adjustment Controls */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <div className="card-icon" style={{ background: 'rgba(139,92,246,0.2)' }}>⏱️</div>
                        Time Offset
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Manual Input with +/- Buttons */}
                      <div className="settings-grid">
                        <div className="form-group">
                          <label className="form-label" htmlFor="offset-seconds">Seconds</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setOffsetSeconds(s => s - 1)}
                              style={{ width: 40, padding: '8px' }}
                            >
                              −
                            </button>
                            <input
                              id="offset-seconds"
                              type="number"
                              className="select"
                              value={offsetSeconds}
                              onChange={e => setOffsetSeconds(Number(e.target.value))}
                              placeholder="0"
                              style={{ fontFamily: 'monospace', flex: 1, textAlign: 'center' }}
                            />
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setOffsetSeconds(s => s + 1)}
                              style={{ width: 40, padding: '8px' }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="offset-ms">Milliseconds</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setOffsetMs(ms => Math.max(-999, ms - 100))}
                              style={{ width: 40, padding: '8px' }}
                            >
                              −
                            </button>
                            <input
                              id="offset-ms"
                              type="number"
                              className="select"
                              value={offsetMs}
                              onChange={e => setOffsetMs(Number(e.target.value))}
                              placeholder="0"
                              min="-999"
                              max="999"
                              style={{ fontFamily: 'monospace', flex: 1, textAlign: 'center' }}
                            />
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setOffsetMs(ms => Math.min(999, ms + 100))}
                              style={{ width: 40, padding: '8px' }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Total Offset Display */}
                      <div style={{
                        padding: '12px 16px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--accent-cyan)'
                      }}>
                        Total Offset: {offsetSeconds * 1000 + offsetMs > 0 ? '+' : ''}{offsetSeconds * 1000 + offsetMs}ms
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <label className="form-label" style={{ marginBottom: 8 }}>Quick Presets</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          {presets.map(preset => (
                            <button
                              key={preset.label}
                              className="btn btn-secondary btn-sm"
                              onClick={() => applyPreset(preset.value)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          className="btn btn-primary"
                          onClick={handleApply}
                          disabled={adjustedSubtitles.length === 0}
                          style={{ flex: 1 }}
                        >
                          ✓ Apply Adjustment
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={handleReset}
                        >
                          Reset
                        </button>
                      </div>

                      {/* Download */}
                      {adjustedSubtitles.length > 0 && (
                        <button
                          className="btn btn-success"
                          onClick={downloadSrt}
                          style={{ width: '100%' }}
                        >
                          ⬇️ Download Adjusted SRT
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Column - Preview */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 600 }}>
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon" style={{ background: 'rgba(6,182,212,0.2)' }}>👁️</div>
                      Preview (First 10 Subtitles)
                    </div>
                  </div>
                  {adjustedSubtitles.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-text">Upload a file to preview timing adjustments</div>
                    </div>
                  ) : (
                    <div className="preview-scroll">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th style={{ width: 32 }}>#</th>
                            <th>Original Time</th>
                            <th>Adjusted Time</th>
                            <th>Text</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adjustedSubtitles.slice(0, 10).map((sub, idx) => (
                            <tr key={sub.id}>
                              <td className="id-cell">{sub.id}</td>
                              <td className="time-cell" style={{ color: 'var(--text-muted)' }}>
                                {originalSubtitles[idx].startTime}<br />{originalSubtitles[idx].endTime}
                              </td>
                              <td className="time-cell" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                                {sub.startTime}<br />{sub.endTime}
                              </td>
                              <td>{sub.text}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>

      <Toast toasts={toasts} />
    </>
  );
}
