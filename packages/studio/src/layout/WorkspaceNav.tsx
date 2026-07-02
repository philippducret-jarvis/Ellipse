import { WORKSPACE_NAV } from '../i18n/fr.js';
import type { WorkspaceTab } from '../store/studio-store.js';

interface Props {
  active: WorkspaceTab;
  onSelect: (tab: WorkspaceTab) => void;
}

export function WorkspaceNav({ active, onSelect }: Props) {
  return (
    <nav className="es-workspace-nav" aria-label="Sections du projet">
      {WORKSPACE_NAV.map((group) => (
        <div key={group.id} className="es-nav-group">
          <div className="es-nav-group-label">{group.label}</div>
          <div className="es-nav-group-tabs">
            {group.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`es-nav-tab ${active === tab.id ? 'is-active' : ''}`}
                onClick={() => onSelect(tab.id)}
                title={tab.hint}
                aria-current={active === tab.id ? 'page' : undefined}
              >
                <span className="es-nav-tab-icon" aria-hidden>
                  {tab.icon}
                </span>
                <span className="es-nav-tab-body">
                  <span className="es-nav-tab-label">{tab.label}</span>
                  <span className="es-nav-tab-hint">{tab.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
