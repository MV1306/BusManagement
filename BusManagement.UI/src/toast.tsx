import { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string; }

interface ToastCtx { toast: (msg: string, type?: ToastType) => void; }

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() { return useContext(Ctx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

/** Drop-in replacement for window.confirm — returns a Promise<boolean> */
export function useConfirm() {
  const [state, setState] = useState<{ msg: string; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((msg: string) =>
    new Promise<boolean>(resolve => setState({ msg, resolve })), []);

  const handle = (v: boolean) => { state?.resolve(v); setState(null); }

  const Dialog = state ? (
    <div className="confirm-backdrop">
      <div className="confirm-dialog">
        <p className="confirm-msg">{state.msg}</p>
        <div className="confirm-actions">
          <button className="btn btn-subtle btn-sm" onClick={() => handle(false)}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={() => handle(true)}>Confirm</button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, Dialog };
}

interface PromptField { label: string; placeholder?: string; defaultValue?: string; }

/** Modal prompt for one or more text inputs — returns filled values or null on cancel */
export function usePrompt() {
  const [state, setState] = useState<{
    fields: PromptField[];
    values: string[];
    resolve: (v: string[] | null) => void;
  } | null>(null);

  const prompt = useCallback((fields: PromptField[]) =>
    new Promise<string[] | null>(resolve =>
      setState({ fields, values: fields.map(f => f.defaultValue ?? ''), resolve })
    ), []);

  const handleConfirm = () => {
    state?.resolve(state.values);
    setState(null);
  };
  const handleCancel = () => { state?.resolve(null); setState(null); };

  const PromptDialog = state ? (
    <div className="confirm-backdrop">
      <div className="confirm-dialog">
        {state.fields.map((f, i) => (
          <div key={i} className="form-group" style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{f.label}</label>
            <input
              autoFocus={i === 0}
              value={state.values[i]}
              placeholder={f.placeholder}
              onChange={e => setState(s => s ? { ...s, values: s.values.map((v, j) => j === i ? e.target.value : v) } : s)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') handleCancel(); }}
              style={{ width: '100%' }}
            />
          </div>
        ))}
        <div className="confirm-actions">
          <button className="btn btn-subtle btn-sm" onClick={handleCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleConfirm}
            disabled={state.values.some(v => !v.trim())}>Duplicate</button>
        </div>
      </div>
    </div>
  ) : null;

  return { prompt, PromptDialog };
}
