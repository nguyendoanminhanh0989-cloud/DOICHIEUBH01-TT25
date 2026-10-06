import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ExternalLink, ChevronRight, ChevronLeft, Link2 } from 'lucide-react';

const LINKS = [
  { label: 'YHCT Time', desc: 'Y hoc co truyen', url: 'https://yhct-time.vercel.app/', dotColor: '#10b981', bgColor: '#ecfdf5', bgHover: '#a7f3d0', textColor: '#065f46' },
  { label: 'Check ICD-X', desc: 'Tra cuu ma benh ICD', url: 'https://check-icdx.vercel.app/', dotColor: '#3b82f6', bgColor: '#eff6ff', bgHover: '#bfdbfe', textColor: '#1e40af' },
  { label: 'Check XML3', desc: 'Kiem tra XML BHYT', url: 'https://check-xml3-anhit.vercel.app/', dotColor: '#8b5cf6', bgColor: '#f5f3ff', bgHover: '#ddd6fe', textColor: '#5b21b6' },
  { label: 'PDF24 Tools', desc: 'Cong cu PDF truc tuyen', url: 'https://tools.pdf24.org/vi/', dotColor: '#ef4444', bgColor: '#fef2f2', bgHover: '#fecaca', textColor: '#991b1b' },
  { label: 'MedFlow Cuu Long', desc: 'Quan ly y te', url: 'https://medflow-cuulong.web.app/', dotColor: '#f59e0b', bgColor: '#fffbeb', bgHover: '#fde68a', textColor: '#92400e' },
];

const SidebarContent: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  return (
    <div style={{ position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 9999, display: 'flex', alignItems: 'center', pointerEvents: 'auto' }}>
      <div style={{ width: collapsed ? 0 : 178, opacity: collapsed ? 0 : 1, overflow: 'hidden', transition: 'width 0.3s ease, opacity 0.25s ease', flexShrink: 0 }}>
        <div style={{ width: 178, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(226,232,240,0.9)', borderRight: 'none', boxShadow: '6px 0 24px rgba(0,0,0,0.15)', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6, borderBottom: '1px solid #f1f5f9', paddingLeft: 2 }}>
            <Link2 size={11} color="#94a3b8" />
            <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Lien ket nhanh</span>
          </div>
          {LINKS.map((link, idx) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
              onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, borderRadius: 10, padding: '6px 8px', background: hoveredIdx === idx ? link.bgHover : link.bgColor, textDecoration: 'none', transition: 'background 0.15s', cursor: 'pointer' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: link.dotColor, flexShrink: 0, display: 'inline-block' }} />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: link.textColor, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.label}</span>
                <span style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.desc}</span>
              </div>
              <ExternalLink size={10} color={link.textColor} style={{ opacity: hoveredIdx === idx ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }} />
            </a>
          ))}
        </div>
      </div>
      <button onClick={() => setCollapsed(v => !v)}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.95)'; }}
        title={collapsed ? 'Mo bang lien ket' : 'Thu gon'}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 60, borderRadius: '0 8px 8px 0', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '3px 0 10px rgba(0,0,0,0.1)', cursor: 'pointer', color: '#94a3b8', transition: 'background 0.15s', padding: 0, flexShrink: 0 }}>
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </div>
  );
};

const QuickLinksSidebar: React.FC = () => ReactDOM.createPortal(<SidebarContent />, document.body) as React.ReactElement;

export default QuickLinksSidebar;
