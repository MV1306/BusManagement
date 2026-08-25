import { useEffect, useRef, useState } from 'react';
import type { Stop } from '../api';

interface Props {
  stops: Stop[];
  value: string;           // stopId as string
  onChange: (id: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function StopAutocomplete({ stops, value, onChange, placeholder = 'Search stop…', required }: Props) {
  const selected = stops.find(s => String(s.stopId) === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // sync display when value changes externally
  useEffect(() => { if (!open) setQuery(''); }, [value, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.length < 1
    ? stops.slice(0, 80)
    : stops.filter(s =>
        s.stopName.toLowerCase().includes(query.toLowerCase()) ||
        s.stopCode.toLowerCase().includes(query.toLowerCase()) ||
        (s.shortName ?? '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 40);

  const select = (s: Stop) => {
    onChange(String(s.stopId));
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
  };

  const clear = () => { onChange(''); setQuery(''); setOpen(false); setActiveIndex(-1); }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === 'ArrowDown') { setOpen(true); setActiveIndex(0); } return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => {
        const next = Math.min(i + 1, filtered.length - 1);
        listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => {
        const next = Math.max(i - 1, 0);
        listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filtered.length) select(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false); setActiveIndex(-1);
    }
  };

  return (
    <div ref={ref} className="autocomplete" style={{ position: 'relative' }}>
      <div className="autocomplete-input-wrap">
        <input
          className="autocomplete-input"
          value={open ? query : (selected ? selected.stopName : '')}
          placeholder={placeholder}
          required={required && !value}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {value && !open && (
          <button type="button" className="autocomplete-clear" onClick={clear} tabIndex={-1}>✕</button>
        )}
        <span className="autocomplete-chevron" style={{ pointerEvents: 'none' }}>▾</span>
      </div>

      {open && (
        <div className="autocomplete-dropdown" ref={listRef}>
          {filtered.length === 0
            ? <div className="autocomplete-empty">No stops found</div>
            : filtered.map((s, i) => (
              <div
                key={s.stopId}
                className={`autocomplete-option${String(s.stopId) === value ? ' selected' : ''}${i === activeIndex ? ' active' : ''}`}
                onMouseDown={() => select(s)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="autocomplete-option-name">{s.stopName}</span>
                <span className="autocomplete-option-code">{s.stopCode}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
