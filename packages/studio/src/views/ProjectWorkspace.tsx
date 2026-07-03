import { Suspense, lazy, useEffect, useState, startTransition } from 'react';
import { useStudioStore } from '../store/studio-store.js';
import { fetchGameProject } from '../api/client.js';
import { ProductionRecipePanel } from '../components/ProductionRecipePanel.js';
import { WorkspaceNav } from '../layout/WorkspaceNav.js';
import { ProjectCommandBar } from '../layout/ProjectCommandBar.js';
import { PreviewModal } from '../layout/PreviewModal.js';
import { resolvePreviewUrl } from '../lib/preview.js';
import { getTabDef } from '../i18n/fr.js';

const OverviewTab = lazy(async () => {
  const module = await import('./tabs/OverviewTab.js');
  return { default: module.OverviewTab };
});
const DocumentsTab = lazy(async () => {
  const module = await import('./tabs/DocumentsTab.js');
  return { default: module.DocumentsTab };
});
const SceneEditorTab = lazy(async () => {
  const module = await import('./tabs/SceneEditorTab.js');
  return { default: module.SceneEditorTab };
});
const AssetsTab = lazy(async () => {
  const module = await import('./tabs/AssetsTab.js');
  return { default: module.AssetsTab };
});
const ProductionTab = lazy(async () => {
  const module = await import('./tabs/ProductionTab.js');
  return { default: module.ProductionTab };
});
const GenerateTab = lazy(async () => {
  const module = await import('./tabs/GenerateTab.js');
  return { default: module.GenerateTab };
});
const WorkspaceTab = lazy(async () => {
  const module = await import('./tabs/WorkspaceTab.js');
  return { default: module.WorkspaceTab };
});
const AgentsTab = lazy(async () => {
  const module = await import('./tabs/AgentsTab.js');
  return { default: module.AgentsTab };
});
const BuildTab = lazy(async () => {
  const module = await import('./tabs/BuildTab.js');
  return { default: module.BuildTab };
});
const ObservabilityTab = lazy(async () => {
  const module = await import('./tabs/ObservabilityTab.js');
  return { default: module.ObservabilityTab };
});
const ExtractionTab = lazy(async () => {
  const module = await import('./tabs/ExtractionTab.js');
  return { default: module.ExtractionTab };
});

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const snap = useStudioStore((s) => s.activeSnapshot);
  const setSnap = useStudioStore((s) => s.setActiveSnapshot);
  const updateSnap = useStudioStore((s) => s.updateSnapshotInList);
  const tab = useStudioStore((s) => s.workspaceTab);
  const setTab = useStudioStore((s) => s.setWorkspaceTab);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    void fetchGameProject(projectId)
      .then((data) => startTransition(() => setSnap(data)))
      .catch(() => setSnap(null));
  }, [projectId, setSnap]);

  const onSnapshotUpdate = (updated: typeof snap) => {
    if (updated) updateSnap(updated);
  };

  const tabDef = getTabDef(tab);
  const previewUrl = resolvePreviewUrl(snap);

  return (
    <div className="es-workspace">
      <WorkspaceNav active={tab} onSelect={setTab} />
      <div className="es-workspace-main">
        {snap ? (
          <ProjectCommandBar snap={snap} onPreview={() => setPreviewOpen(true)} />
        ) : null}
        <div className="es-workspace-content">
          {!snap ? (
            <div className="es-workspace-loading">
              <span className="spinner" /> Chargement du projet…
            </div>
          ) : (
            <>
              {tabDef ? (
                <div className="es-tab-intro">
                  <div className="es-tab-intro-title">{tabDef.label}</div>
                  <div className="es-tab-intro-hint">{tabDef.hint}</div>
                </div>
              ) : null}
              <Suspense
                fallback={
                  <div className="es-workspace-loading">
                    <span className="spinner" /> Chargement de la section…
                  </div>
                }
              >
                {tab === 'overview' ? <OverviewTab snap={snap} onUpdate={onSnapshotUpdate} /> : null}
                {tab === 'documents' ? <DocumentsTab snap={snap} /> : null}
                {tab === 'scene' ? (
                  <SceneEditorTab snap={snap} onGdlSaved={() => setPreviewOpen(true)} />
                ) : null}
                {tab === 'assets' ? <AssetsTab snap={snap} onUpdate={onSnapshotUpdate} /> : null}
                {tab === 'production' ? (
                  <>
                    <ProductionRecipePanel genre={(snap.project as { genre?: string }).genre} />
                    <ProductionTab snap={snap} />
                  </>
                ) : null}
                {tab === 'generate' ? <GenerateTab projectId={projectId} snap={snap} onUpdate={onSnapshotUpdate} /> : null}
                {tab === 'workspace' ? <WorkspaceTab snap={snap} /> : null}
                {tab === 'agents' ? <AgentsTab snap={snap} /> : null}
                {tab === 'build' ? <BuildTab snap={snap} /> : null}
                {tab === 'extraction' ? <ExtractionTab projectId={projectId} onUpdate={onSnapshotUpdate} /> : null}
                {tab === 'observability' ? <ObservabilityTab snap={snap} /> : null}
              </Suspense>
            </>
          )}
        </div>
      </div>
      {previewOpen && previewUrl ? (
        <PreviewModal url={previewUrl} title={snap?.project.title ?? 'Jeu'} onClose={() => setPreviewOpen(false)} />
      ) : null}
    </div>
  );
}
