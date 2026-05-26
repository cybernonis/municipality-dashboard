import React from 'react';

export interface TabItem {
  key: string;
  label: string;
  icon: string;        // Tabler icon name e.g. 'ti-robot'
  badge?: number | string;
  badgeColor?: 'gold' | 'red' | 'green' | 'blue';
}

interface TabBarProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  variant?: 'pills' | 'cards';
}

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  gold:  { background: '#F6AE2D', color: '#1E3A5F' },
  red:   { background: '#E63946', color: '#fff' },
  green: { background: '#2D936C', color: '#fff' },
  blue:  { background: '#2E86AB', color: '#fff' },
};

const TabBar: React.FC<TabBarProps> = ({ tabs, active, onChange, variant = 'pills' }) => {
  if (variant === 'cards') {
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const isActive = tab.key === active;
          const badgeStyle = BADGE_STYLES[tab.badgeColor || 'gold'];
          return (
            <button key={tab.key} onClick={() => onChange(tab.key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                padding: '12px 20px', minWidth: '100px', cursor: 'pointer',
                borderRadius: '10px', transition: 'all 0.15s',
                border: isActive ? '2px solid #1E3A5F' : '1px solid rgba(0,0,0,0.1)',
                background: isActive ? '#1E3A5F' : '#fff',
                color: isActive ? '#fff' : '#6B7280',
                boxShadow: isActive ? '0 4px 12px rgba(30,58,95,0.2)' : 'none',
              }}>
              <i className={`ti ${tab.icon}`} style={{ fontSize: '20px' }} aria-hidden="true" />
              <span style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>{tab.label}</span>
              {tab.badge !== undefined && (
                <span style={{
                  ...badgeStyle,
                  fontSize: '11px', fontWeight: 700,
                  padding: '1px 8px', borderRadius: '20px',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Pills variant (default)
  return (
    <div style={{
      display: 'flex', gap: '4px', padding: '4px',
      background: 'rgba(0,0,0,0.05)', borderRadius: '10px',
      width: 'fit-content',
    }}>
      {tabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <button key={tab.key} onClick={() => onChange(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 18px', cursor: 'pointer',
              borderRadius: '8px', border: 'none', transition: 'all 0.15s',
              background: isActive ? '#1E3A5F' : 'transparent',
              color: isActive ? '#fff' : '#6B7280',
              fontSize: '13px', fontWeight: isActive ? 600 : 400,
              boxShadow: isActive ? '0 2px 8px rgba(30,58,95,0.25)' : 'none',
            }}>
            <i className={`ti ${tab.icon}`} style={{ fontSize: '15px' }} aria-hidden="true" />
            {tab.label}
            {tab.badge !== undefined && (
              <span style={{
                ...(BADGE_STYLES[tab.badgeColor || 'gold']),
                fontSize: '10px', fontWeight: 700,
                padding: '1px 6px', borderRadius: '20px',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabBar;
