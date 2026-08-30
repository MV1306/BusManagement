import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ── Types ────────────────────────────────────────────────────────────────────

export interface A11ySettings {
  fontSize: number;        // 1 = 100%, 1.15 = 115%, 1.3 = 130%
  highContrast: boolean;
  reducedMotion: boolean;
  dyslexiaFont: boolean;
  lineHeight: number;      // 1 = normal, 1.5 = relaxed, 2 = loose
}

const DEFAULTS: A11ySettings = {
  fontSize: 1,
  highContrast: false,
  reducedMotion: false,
  dyslexiaFont: false,
  lineHeight: 1,
};

const STORAGE_KEY = 'a11y';

// ── Context ──────────────────────────────────────────────────────────────────

interface A11yCtx {
  settings: A11ySettings;
  update: (patch: Partial<A11ySettings>) => void;
  reset: () => void;
}

const Ctx = createContext<A11yCtx>({ settings: DEFAULTS, update: () => {}, reset: () => {} });
export function useA11y() { return useContext(Ctx); }

function load(): A11ySettings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }; }
  catch { return DEFAULTS; }
}

function apply(s: A11ySettings) {
  const html = document.documentElement;
  html.style.setProperty('--a11y-font-scale', String(s.fontSize));
  html.style.setProperty('--a11y-line-height', String(s.lineHeight === 1 ? 1.6 : s.lineHeight === 1.5 ? 2 : 2.4));
  html.setAttribute('data-high-contrast', s.highContrast ? 'true' : 'false');
  html.setAttribute('data-dyslexia', s.dyslexiaFont ? 'true' : 'false');
  html.setAttribute('data-reduced-motion', s.reducedMotion ? 'true' : 'false');
}

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(load);

  useEffect(() => { apply(settings); localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }, [settings]);

  const update = (patch: Partial<A11ySettings>) => setSettings(s => ({ ...s, ...patch }));
  const reset  = () => setSettings(DEFAULTS);

  return <Ctx.Provider value={{ settings, update, reset }}>{children}</Ctx.Provider>;
}

// ── Panel ────────────────────────────────────────────────────────────────────

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {desc && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? 'var(--primary)' : 'var(--surface-3)',
          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
          outline: 'none',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', display: 'block',
          boxShadow: '0 1px 3px rgba(0,0,0,.3)',
        }} />
      </button>
    </div>
  );
}

function StepControl({ label, desc, value, options, format, onChange }: {
  label: string; desc?: string;
  value: number; options: number[];
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const idx = options.indexOf(value);
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{label}</div>
          {desc && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>}
        </div>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-light)' }}>{format(value)}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map((opt, i) => (
          <button key={opt} onClick={() => onChange(opt)} style={{
            flex: 1, padding: '5px 0', borderRadius: 'var(--radius-xs)',
            border: `1.5px solid ${i === idx ? 'var(--primary)' : 'var(--border-strong)'}`,
            background: i === idx ? 'var(--primary-dim)' : 'transparent',
            color: i === idx ? 'var(--primary-light)' : 'var(--text-3)',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}>
            {format(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface AccessibilityPanelProps { open: boolean; onClose: () => void; }

export function AccessibilityPanel({ open, onClose }: AccessibilityPanelProps) {
  const { settings, update, reset } = useA11y();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (open) setTimeout(() => panelRef.current?.focus(), 50);
  }, [open]);

  const isModified = JSON.stringify(settings) !== JSON.stringify(DEFAULTS);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,.45)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s',
        }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Accessibility Settings"
        aria-modal="true"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
          width: 320,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <A11yIcon />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Accessibility</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>Personalise your experience</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, borderRadius: 'var(--radius-xs)', display: 'flex' }} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Settings */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>

          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 0 4px' }}>Text</div>

          <StepControl
            label="Font Size"
            desc="Scale all text in the app"
            value={settings.fontSize}
            options={[0.9, 1, 1.15, 1.3]}
            format={v => v === 1 ? 'Default' : `${Math.round(v * 100)}%`}
            onChange={v => update({ fontSize: v })}
          />

          <StepControl
            label="Line Spacing"
            desc="Space between lines of text"
            value={settings.lineHeight}
            options={[1, 1.5, 2]}
            format={v => v === 1 ? 'Normal' : v === 1.5 ? 'Relaxed' : 'Loose'}
            onChange={v => update({ lineHeight: v })}
          />

          <Toggle
            label="Dyslexia-Friendly Font"
            desc="Uses OpenDyslexic for easier reading"
            checked={settings.dyslexiaFont}
            onChange={v => update({ dyslexiaFont: v })}
          />

          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 0 4px' }}>Display</div>

          <Toggle
            label="High Contrast"
            desc="Increases border and text contrast"
            checked={settings.highContrast}
            onChange={v => update({ highContrast: v })}
          />

          <Toggle
            label="Reduce Motion"
            desc="Disables transitions and animations"
            checked={settings.reducedMotion}
            onChange={v => update({ reducedMotion: v })}
          />

          {/* Preview */}
          <div style={{ marginTop: 20, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 6, fontWeight: 600 }}>PREVIEW</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Sample Route: 21G Central</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Royapuram → Koyambedu via Egmore</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <span style={{ padding: '2px 10px', borderRadius: 99, background: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>21G</span>
              <span style={{ padding: '2px 10px', borderRadius: 99, border: '1px solid var(--green)', color: 'var(--green)', fontSize: '0.72rem', fontWeight: 600 }}>Active</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={reset}
            disabled={!isModified}
            style={{
              background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
              color: isModified ? 'var(--text-2)' : 'var(--text-3)',
              cursor: isModified ? 'pointer' : 'default',
              padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            Reset to defaults
          </button>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>Auto-saved</div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Topbar button ────────────────────────────────────────────────────────────

export function A11yButton({ onClick }: { onClick: () => void }) {
  const { settings } = useA11y();
  const isModified = JSON.stringify(settings) !== JSON.stringify(DEFAULTS);
  return (
    <button
      className="theme-toggle"
      onClick={onClick}
      title="Accessibility settings"
      aria-label="Open accessibility settings"
      style={{ position: 'relative' }}
    >
      <A11yIcon />
      {isModified && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--primary)', border: '1px solid var(--surface)',
        }} />
      )}
    </button>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function A11yIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="1.5"/>
      <path d="M6 8h12"/>
      <path d="M12 8v5"/>
      <path d="M9 21l3-8 3 8"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
