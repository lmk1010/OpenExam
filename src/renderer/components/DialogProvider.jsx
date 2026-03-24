import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const DialogContext = createContext(null);
const DEFAULTS = {
  alert: { title: '提示', confirmText: '我知道了', tone: 'info' },
  confirm: { title: '确认操作', confirmText: '确定', cancelText: '取消', tone: 'warning' },
  prompt: { title: '输入内容', confirmText: '确定', cancelText: '取消', tone: 'info' },
  toast: { title: '', tone: 'info', duration: 2600 },
};

const normalize = (type, options) => {
  const payload = typeof options === 'string' ? { message: options } : (options || {});
  return { ...DEFAULTS[type], ...payload, message: payload.message || payload.description || '' };
};

const toneClass = (tone) => tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'info';

const DialogIcon = ({ tone }) => {
  const stroke = tone === 'danger' ? 'var(--danger)' : tone === 'success' ? 'var(--success)' : tone === 'warning' ? 'var(--warning)' : 'var(--accent)';
  const path = tone === 'danger'
    ? <><path d="M12 8v5"/><path d="M12 16h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></>
    : tone === 'success'
      ? <><circle cx="12" cy="12" r="10"/><path d="m8.5 12.5 2.4 2.4 4.8-5.1"/></>
      : <><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>;
};

function DialogLayer({ item, onResolve }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState(item.defaultValue || '');
  const cancelValue = item.type === 'confirm' ? false : null;

  useEffect(() => {
    setValue(item.defaultValue || '');
  }, [item.id, item.defaultValue]);

  useEffect(() => {
    if (item.type !== 'prompt') return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [item.id, item.type]);

  const handleCancel = useCallback(() => onResolve(cancelValue), [cancelValue, onResolve]);
  const handleSubmit = useCallback(() => onResolve(item.type === 'prompt' ? value : true), [item.type, onResolve, value]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
      if (event.key === 'Enter' && item.type !== 'prompt') {
        event.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCancel, handleSubmit, item.type]);

  return (
    <div className="app-dialog-overlay" role="dialog" aria-modal="true" onClick={handleCancel}>
      <div className="app-dialog-panel" data-tone={item.tone} onClick={(event) => event.stopPropagation()}>
        <div className="app-dialog-icon"><DialogIcon tone={item.tone} /></div>
        <div className="app-dialog-copy">
          <h3 className="app-dialog-title">{item.title}</h3>
          {item.message ? <p className="app-dialog-message">{item.message}</p> : null}
        </div>
        {item.type === 'prompt' ? (
          <input
            ref={inputRef}
            className="app-dialog-input"
            value={value}
            maxLength={item.maxLength || 40}
            placeholder={item.placeholder || '请输入内容'}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleSubmit(); } }}
          />
        ) : null}
        <div className="app-dialog-actions">
          {item.type !== 'alert' ? <button className="app-dialog-btn secondary" onClick={handleCancel}>{item.cancelText}</button> : null}
          <button className={`app-dialog-btn primary ${item.tone === 'danger' ? 'danger' : ''}`} onClick={handleSubmit}>
            {item.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


function ToastItem({ item, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onClose(item.id), Math.max(1200, Number(item.duration) || 2600));
    return () => window.clearTimeout(timer);
  }, [item.duration, item.id, onClose]);

  return (
    <div className="app-toast" data-tone={toneClass(item.tone)}>
      <div className="app-toast-icon"><DialogIcon tone={item.tone} /></div>
      <div className="app-toast-copy">
        {item.title ? <div className="app-toast-title">{item.title}</div> : null}
        {item.message ? <div className="app-toast-message">{item.message}</div> : null}
      </div>
      <button className="app-toast-close" onClick={() => onClose(item.id)} aria-label="关闭提示">×</button>
      <div className="app-toast-bar" style={{ animationDuration: `${Math.max(1200, Number(item.duration) || 2600)}ms` }} />
    </div>
  );
}

function ToastViewport({ items, onClose }) {
  if (!items.length) return null;
  return (
    <div className="app-toast-viewport" aria-live="polite" aria-atomic="true">
      {items.map((item) => <ToastItem key={item.id} item={item} onClose={onClose} />)}
    </div>
  );
}

export function DialogProvider({ children }) {
  const queueRef = useRef([]);
  const currentRef = useRef(null);
  const toastIdRef = useRef(0);
  const [current, setCurrent] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showNext = useCallback((next) => {
    currentRef.current = next;
    setCurrent(next);
  }, []);

  const enqueue = useCallback((type, options) => new Promise((resolve) => {
    const item = { id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`, type, resolve, ...normalize(type, options) };
    if (currentRef.current) queueRef.current.push(item);
    else showNext(item);
  }), [showNext]);

  const handleResolve = useCallback((result) => {
    const active = currentRef.current;
    if (!active) return;
    active.resolve(result);
    const next = queueRef.current.shift() || null;
    showNext(next);
  }, [showNext]);

  const closeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options) => {
    const item = { id: `toast-${Date.now()}-${toastIdRef.current += 1}`, type: 'toast', ...normalize('toast', options) };
    setToasts((prev) => [item, ...prev].slice(0, 4));
    return item.id;
  }, []);

  const api = useMemo(() => ({
    alert: (options) => enqueue('alert', options),
    confirm: (options) => enqueue('confirm', options),
    prompt: (options) => enqueue('prompt', options),
    toast,
  }), [enqueue, toast]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      <ToastViewport items={toasts} onClose={closeToast} />
      {current ? <DialogLayer item={current} onResolve={handleResolve} /> : null}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const dialog = useContext(DialogContext);
  if (!dialog) throw new Error('useDialog must be used within DialogProvider');
  return dialog;
}
