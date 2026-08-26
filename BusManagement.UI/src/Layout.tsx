import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from './theme';
import { useKeyboardShortcuts } from './shortcuts';

const navItems = [
  { section: 'Overview' },
  { to: '/dashboard',  icon: <DashIcon />,   label: 'Dashboard',       key: '1' },
  { section: 'Management' },
  { to: '/stops',      icon: <StopIcon />,   label: 'Stops',           key: '2' },
  { to: '/routes',     icon: <RouteIcon />,  label: 'Routes',          key: '3' },
  { to: '/fares',      icon: <FareIcon />,   label: 'Fares',           key: '4' },
  { to: '/import',     icon: <ImportIcon />, label: 'Import',          key: '8' },
  { section: 'Search & Calculate' },
  { to: '/search',     icon: <SearchIcon />, label: 'Route Search',    key: '5' },
  { to: '/calculator', icon: <CalcIcon />,   label: 'Fare Calculator', key: '6' },
  { to: '/matrix',     icon: <MatrixIcon />, label: 'Fare Matrix',     key: '7' },
  { section: 'Maps & Reports' },
  { to: '/coverage',   icon: <MapIcon />,    label: 'Coverage Map',    key: '9' },
  { to: '/routecard',  icon: <CardIcon />,   label: 'Route Card',      key: '0' },
  { to: '/audit',      icon: <AuditIcon />,  label: 'Fare Audit',      key: '' },
  { to: '/export',        icon: <ExportIcon />, label: 'Export',           key: '' },
  { to: '/translations',  icon: <LangIcon />,   label: 'Translations',     key: '' },
];

const titles: Record<string, { label: string; icon: React.ReactNode }> = {
  '/dashboard':  { label: 'Dashboard',        icon: <DashIcon /> },
  '/stops':      { label: 'Stops',            icon: <StopIcon /> },
  '/routes':     { label: 'Routes',           icon: <RouteIcon /> },
  '/fares':      { label: 'Fares',            icon: <FareIcon /> },
  '/search':     { label: 'Route Search',     icon: <SearchIcon /> },
  '/calculator': { label: 'Fare Calculator',  icon: <CalcIcon /> },
  '/matrix':     { label: 'Fare Matrix',      icon: <MatrixIcon /> },
  '/import':     { label: 'Import',           icon: <ImportIcon /> },
  '/coverage':   { label: 'Coverage Map',     icon: <MapIcon /> },
  '/routecard':  { label: 'Route Card',       icon: <CardIcon /> },
  '/audit':      { label: 'Fare Audit Log',   icon: <AuditIcon /> },
  '/export':        { label: 'Export',           icon: <ExportIcon /> },
  '/translations':  { label: 'Translations',     icon: <LangIcon /> },
};

export default function Layout() {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('nav-collapsed') === '1');
  const base = '/' + pathname.split('/')[1];
  const page = titles[base] ?? { label: 'TransitOps', icon: <BusIcon /> };

  useKeyboardShortcuts();

  const toggleCollapse = () => setCollapsed(v => {
    localStorage.setItem('nav-collapsed', v ? '0' : '1');
    return !v;
  });

  return (
    <div className="layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon"><BusIcon /></div>
          {!collapsed && <div style={{ flex: 1 }}>
            <div className="sidebar-brand-text">TransitOps</div>
            <div className="sidebar-brand-sub">MTC · Chennai</div>
          </div>}
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
        </div>

        <nav>
          {navItems.map((item, i) =>
            'section' in item
              ? (!collapsed && <div key={i} className="nav-section">{item.section}</div>)
              : (
                <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => isActive ? 'active' : ''}>
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  {!collapsed && <span className="nav-shortcut">{item.key}</span>}
                </NavLink>
              )
          )}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-dot" />
          {!collapsed && <span className="sidebar-footer-text">System Online</span>}
        </div>
      </aside>

      <div className="main" style={{ marginLeft: collapsed ? 56 : undefined }}>
        <div className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <HamburgerIcon />
          </button>
          <button className="sidebar-collapse-btn" onClick={toggleCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <CollapseIcon collapsed={collapsed} />
          </button>

          <span style={{ color: 'var(--primary-light)', display: 'flex' }}>{page.icon}</span>
          <span className="topbar-title">{page.label}</span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="topbar-org">Metropolitan Transport Corporation</span>
            <button className="theme-toggle" onClick={toggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>

        <div className="page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return collapsed
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>;
}
function BusIcon()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 13h20"/><circle cx="7" cy="17" r="1"/><circle cx="17" cy="17" r="1"/></svg>; }
function DashIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>; }
function StopIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>; }
function RouteIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><line x1="5" y1="8" x2="5" y2="16"/><path d="M5 16c0 1.1.9 2 2 2h10"/></svg>; }
function FareIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v2M12 16v2"/></svg>; }
function SearchIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>; }
function CalcIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>; }
function MatrixIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function ImportIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function MapIcon()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>; }
function CardIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function AuditIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/><circle cx="17" cy="17" r="3"/><path d="m21 21-1.5-1.5"/></svg>; }
function ExportIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>; }
function LangIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>; }
function HamburgerIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
function SunIcon()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>; }
function MoonIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>; }
