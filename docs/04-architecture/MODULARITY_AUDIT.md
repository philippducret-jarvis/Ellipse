# Modularity Audit

Date: 2026-06-19

## Objective

Keep Ellipse operable by AI and agents without monolithic scripts, hidden coupling, or ambiguous responsibilities.

## Refactored this pass

### Master execution architecture

Before:
- the repo had strong design and workspace surfaces, but no shared master-plan contract for strata, workflows, and canonical surfaces
- durable workflow intent lived only in audit notes and implied architecture

After:
- `packages/shared/src/production-architecture.ts`
  - shared schemas for project strata, canonical contracts, durable workflows, and roadmap items
- `packages/orchestrator/src/durable-workflows.ts`
  - reusable workflow catalog for bootstrap, asset, scene, runtime, and QA release flows
- `workspaces/echoes-of-the-mushroom-realm/02_design/specs/next-gen-master-plan.md`
  - human-readable architecture plan
- `workspaces/echoes-of-the-mushroom-realm/05_runtime/config/canonical-data-contracts.json`
  - contract registry for workspace/runtime surfaces
- `workspaces/echoes-of-the-mushroom-realm/05_runtime/config/durable-workflows.json`
  - workspace-level durable workflow registry
- `workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/master-execution-plan.json`
  - machine-readable execution plan

### Generate tab surface

Before:
- `packages/studio/src/views/tabs/GenerateTab.tsx` mixed:
  - prompt panel
  - upload UI
  - timeline rendering
  - session export panel
  - preview loading
- preview dependencies were loaded with the generation tab payload

After:
- `GenerateTab.tsx`
  - orchestration only
- `generate/GeneratePromptPanel.tsx`
  - prompt, uploads, status, generate action
- `generate/AgentTimelinePanel.tsx`
  - pipeline rendering
- `generate/SessionResultPanel.tsx`
  - export surface
- `generate/GeneratePreviewPanel.tsx`
  - lazy preview boundary
- `generate/helpers.ts`
  - display-only icon maps

### Studio API showcase fallback

Before:
- `packages/studio/src/api/client.ts` mixed:
  - HTTP client functions
  - showcase constants
  - showcase tasks
  - showcase workspace path registry
  - workspace tree generation
  - showcase snapshot builders

After:
- `packages/studio/src/api/client.ts`
  - network access layer and exported client contracts only
- `packages/studio/src/api/showcase/constants.ts`
  - showcase ids, task seeds, workspace path registry
- `packages/studio/src/api/showcase/types.ts`
  - showcase manifest typing
- `packages/studio/src/api/showcase/helpers.ts`
  - fetch helpers, file-kind inference, tree builders
- `packages/studio/src/api/showcase/project.ts`
  - showcase project and snapshot builders
- `packages/studio/src/api/showcase/workspace.ts`
  - workspace overview and file builders

### Preview runtime boundary

Before:
- `packages/studio/src/components/PreviewPanel.tsx` imported:
  - 2D preview runtime
  - 3D model viewer
  - preview data extraction

After:
- `packages/studio/src/components/PreviewPanel.tsx`
  - preview routing only
- `packages/studio/src/components/preview/extract-model-preview.ts`
  - preview model-data extraction
- `packages/studio/src/components/preview/PlayablePreviewSurface.tsx`
  - lazy 2D runtime surface
- `packages/studio/src/components/preview/PhotoModelPreviewSurface.tsx`
  - lazy 3D runtime surface

### 3D model preview

Before:
- `packages/studio/src/components/ModelPreview.tsx` mixed:
  - React state
  - Three.js scene setup
  - GLTF loading
  - animation loop
  - disposal
  - preview metadata rendering

After:
- `packages/studio/src/components/ModelPreview.tsx`
  - composition only
- `packages/studio/src/components/model-preview/types.ts`
  - prop and learning contracts
- `packages/studio/src/components/model-preview/scene.ts`
  - Three.js runtime creation and disposal
- `packages/studio/src/components/model-preview/use-model-preview.ts`
  - React lifecycle hook
- `packages/studio/src/components/model-preview/PreviewMeta.tsx`
  - metadata pill rendering

### Construction stack generator

Before:
- `tools/sync-echoes-construction-stack.mjs` was a large mixed-responsibility generator carrying:
  - workspace IO
  - design/foundation builders
  - systems and triggers builders
  - operating model builders
  - docs generation
  - web surface templates
  - file emission

After:
- `tools/sync-echoes-construction-stack.mjs`
  - thin entrypoint only
- `tools/lib/construction-stack/io.mjs`
  - workspace and static-template IO
- `tools/lib/construction-stack/foundation.mjs`
  - design/runtime foundation builders
- `tools/lib/construction-stack/graph.mjs`
  - construction graph and surface manifests
- `tools/lib/construction-stack/systems.mjs`
  - addable elements, triggers, asset-call graph, interaction schema
- `tools/lib/construction-stack/operating.mjs`
  - progression, save, accessibility, localization, quest, telemetry
- `tools/lib/construction-stack/docs.mjs`
  - spec markdown builders
- `tools/lib/construction-stack/web.mjs`
  - static web surface loaders
- `tools/lib/construction-stack/file-plan.mjs`
  - artifact-to-file mapping
- `tools/lib/construction-stack/index.mjs`
  - orchestration only

### Production HQ generator

Before:
- `tools/sync-echoes-production-hq.mjs` was a single large script mixing:
  - workspace IO
  - taxonomy logic
  - model routing
  - work-order planning
  - web template generation
  - file emission

After:
- `tools/sync-echoes-production-hq.mjs`
  - thin entrypoint only
- `tools/lib/production-hq/io.mjs`
  - workspace read/write primitives
- `tools/lib/production-hq/catalog.mjs`
  - canonical families, synthetic slots, stage folders
- `tools/lib/production-hq/routing.mjs`
  - role-to-pipeline routing and official tool sources
- `tools/lib/production-hq/builders.mjs`
  - taxonomy, routing matrix, work-order builders
- `tools/lib/production-hq/file-plan.mjs`
  - artifact-to-file mapping
- `tools/lib/production-hq/web-template.mjs`
  - static web surface generation
- `tools/lib/production-hq/index.mjs`
  - orchestration only

### Studio production surface

Before:
- `packages/studio/src/views/tabs/ProductionTab.tsx` carried:
  - data loading
  - parsing
  - view switching
  - family rendering
  - routing rendering
  - work-order rendering
  - progress math

After:
- `ProductionTab.tsx`
  - orchestration and top-level composition
- `production/types.ts`
  - contracts and JSON parsing
- `production/helpers.ts`
  - execution/progress helpers
- `production/FamilyGrid.tsx`
  - family rendering
- `production/RoutingGrid.tsx`
  - routing rendering
- `production/WorkOrderGrid.tsx`
  - work-order rendering

### Echoes workspace seeder

Before:
- `tools/seed-echoes-workspace.mjs` mixed:
  - project seed data
  - reference-copy logic
  - preview GDL generation
  - preview HTML/CSS/JS templates
  - workspace file plan
  - artifact emission

After:
- `tools/seed-echoes-workspace.mjs`
  - thin entrypoint only
- `tools/lib/seed-echoes/io.mjs`
  - copy/write/static-template IO
- `tools/lib/seed-echoes/data.mjs`
  - composition layer only
- `tools/lib/seed-echoes/data/project.mjs`
  - core project seed contracts
- `tools/lib/seed-echoes/data/documents.mjs`
  - design/spec document surfaces
- `tools/lib/seed-echoes/data/content.mjs`
  - structured workspace payloads
- `tools/lib/seed-echoes/data/references.mjs`
  - reference-copy declarations
- `tools/lib/seed-echoes/data/text-content.mjs`
  - markdown and text seed bodies
- `tools/lib/seed-echoes/preview.mjs`
  - preview GDL builder and preview web-template loading
- `tools/lib/seed-echoes/file-plan.mjs`
  - workspace file emission plan
- `tools/lib/seed-echoes/index.mjs`
  - orchestration only

### Hero runtime pack pipeline

Before:
- `packages/pipeline/src/asset-factory/hero-runtime-pack.ts` mixed:
  - image analysis
  - part extraction
  - atlas assembly
  - rig-spec writing
  - QA report creation
  - source snapshot emission

After:
- `packages/pipeline/src/asset-factory/hero-runtime-pack.ts`
  - orchestration and exported API only
- `packages/pipeline/src/asset-factory/hero-runtime/types.ts`
  - contracts and shared types
- `packages/pipeline/src/asset-factory/hero-runtime/constants.ts`
  - part definitions and animation frame transforms
- `packages/pipeline/src/asset-factory/hero-runtime/image-analysis.ts`
  - segmentation heuristics, bounds, palette, QA builders
- `packages/pipeline/src/asset-factory/hero-runtime/assembly.ts`
  - clean cutout composition and atlas generation
- `packages/pipeline/src/asset-factory/hero-runtime/file-outputs.ts`
  - PNG writes, rig/motion outputs, QA/snapshot emission

### Studio styles entrypoint

Before:
- `packages/studio/src/styles.css` carried the whole Studio visual system in one file.

After:
- `packages/studio/src/styles.css`
  - CSS entrypoint with imports only
- `packages/studio/src/styles/base.css`
  - tokens and base resets
- `packages/studio/src/styles/shell.css`
  - global shell, status and panel primitives
- `packages/studio/src/styles/factory.css`
  - factory CSS entrypoint only
- `packages/studio/src/styles/factory-layouts.css`
  - factory layouts and panel scaffolding
- `packages/studio/src/styles/factory-prompt.css`
  - create/generation prompt surfaces
- `packages/studio/src/styles/factory-flow.css`
  - generation progress, agents and history flow
- `packages/studio/src/styles/factory-preview.css`
  - preview and responsive viewer surfaces
- `packages/studio/src/styles/factory-agents.css`
  - compact work-offering panel styling
- `packages/studio/src/styles/studio-shell.css`
  - topbar, sidebar, modal and workspace scaffolding
- `packages/studio/src/styles/overview.css`
  - overview tab
- `packages/studio/src/styles/documents.css`
  - documents tab
- `packages/studio/src/styles/assets.css`
  - assets tab
- `packages/studio/src/styles/generate.css`
  - generate tab
- `packages/studio/src/styles/build.css`
  - build tab and responsive extensions

### Workspace and agents tabs

Before:
- `packages/studio/src/views/tabs/WorkspaceTab.tsx` mixed:
  - workspace loading
  - preferred-file logic
  - tree flattening
  - tree rendering
  - hero/stats rendering
  - browser/viewer rendering
- `packages/studio/src/views/tabs/AgentsTab.tsx` mixed:
  - static factory-agent catalog
  - task-status aggregation
  - factory agent rendering
  - runtime agent rendering

After:
- `packages/studio/src/views/tabs/WorkspaceTab.tsx`
  - tab orchestration only
- `packages/studio/src/views/tabs/workspace/helpers.ts`
  - tree flattening, preferred-file selection, size formatting
- `packages/studio/src/views/tabs/workspace/TreeView.tsx`
  - recursive tree rendering
- `packages/studio/src/views/tabs/workspace/WorkspaceHero.tsx`
  - workspace hero actions
- `packages/studio/src/views/tabs/workspace/WorkspaceStats.tsx`
  - workspace stat strip
- `packages/studio/src/views/tabs/workspace/WorkspaceBrowser.tsx`
  - explorer, search and file viewer
- `packages/studio/src/views/tabs/AgentsTab.tsx`
  - tab orchestration only
- `packages/studio/src/views/tabs/agents/data.ts`
  - factory agent catalog
- `packages/studio/src/views/tabs/agents/helpers.ts`
  - task-status summaries
- `packages/studio/src/views/tabs/agents/FactoryAgentsSection.tsx`
  - factory agent surface
- `packages/studio/src/views/tabs/agents/RuntimeAgentsSection.tsx`
  - runtime/generation agent surface

### Studio tab loading

Before:
- `packages/studio/src/views/ProjectWorkspace.tsx` imported every tab eagerly.

After:
- `packages/studio/src/views/ProjectWorkspace.tsx`
  - lazy tab loading through `React.lazy` and `Suspense`
  - tab bundles now split per surface

### Overview and orchestrator contract tests

Before:
- workflow metrics and overview summaries were implicit UI logic
- workspace scaffold and workflow catalog had no targeted regression tests

After:
- `packages/studio/src/views/tabs/overview/helpers.ts`
  - extracted workflow and task summary builders
- `packages/studio/src/views/tabs/overview/helpers.test.ts`
  - targeted overview regression coverage
- `packages/orchestrator/src/durable-workflows.test.ts`
  - durable workflow schema and required-id validation
- `packages/orchestrator/src/workspace-scaffold.test.ts`
  - scaffold contract surface validation

### Master plan coherence tests

Before:
- `master-execution-plan.json`, `canonical-data-contracts.json`, and `durable-workflows.json` could drift independently
- no automated check ensured their IDs or contract surfaces stayed aligned

After:
- `packages/orchestrator/src/master-execution-plan.test.ts`
  - validates the shared schema
  - checks roadmap and workflow dependency integrity
  - verifies alignment with workspace contract and workflow registries
- `workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/master-execution-plan.json`
  - now includes the full canonical contract matrix and all durable workflow lanes
- `workspaces/echoes-of-the-mushroom-realm/05_runtime/config/canonical-data-contracts.json`
  - aligned the master-plan contract id with the shared schema naming

### Studio chunk strategy

Before:
- frontend split by tab, but large runtime/viewer bundles still travelled through broad default chunking

After:
- `packages/studio/vite.config.ts`
  - explicit `manualChunks` for:
    - `three-core`
    - `three-extras`
    - `pixi-runtime`
  - clearer bundle ownership and better cacheability for heavy runtime dependencies

### Build, workspace, agents and production styles

Before:
- `packages/studio/src/styles/build.css` acted as a mixed style bucket for:
  - build tab
  - workspace tab
  - agents tab
  - production tab
  - overview/topbar/responsive leftovers

After:
- `packages/studio/src/styles/build.css`
  - entrypoint only
- `packages/studio/src/styles/build-tab.css`
  - build tab styles only
- `packages/studio/src/styles/workspace.css`
  - workspace browser and stat surfaces
- `packages/studio/src/styles/agents.css`
  - agents cockpit surfaces
- `packages/studio/src/styles/production.css`
  - production cockpit surfaces
- `packages/studio/src/styles/overview.css`
  - overview-specific hero, task, workflow and iteration styling
- `packages/studio/src/styles/studio-shell.css`
  - topbar action styles and shell responsive behavior
- `packages/studio/src/styles/generate.css`
  - generate-specific responsive behavior
- `packages/studio/src/styles/documents.css`
  - documents-specific responsive behavior

### Playable preview runtime boundary

Before:
- `packages/studio/src/GamePreview.tsx` owned React lifecycle plus direct engine construction/import

After:
- `packages/studio/src/GamePreview.tsx`
  - composition only
- `packages/studio/src/components/game-preview/use-ellipse-preview.ts`
  - lifecycle only
- `packages/studio/src/components/game-preview/runtime.ts`
  - isolated lazy runtime bootstrap for the Pixi preview engine
- `packages/studio/src/components/game-preview/PreviewStage.tsx`
  - view-only canvas shell
- `packages/studio/src/components/game-preview/constants.ts`
  - preview dimensions

### Assets styles split

Before:
- `packages/studio/src/styles/assets.css` grouped toolbar, creation form, cards, previews, and variant rows in one file

After:
- `packages/studio/src/styles/assets.css`
  - entrypoint only
- `packages/studio/src/styles/assets-toolbar.css`
  - asset creation and toolbar controls
- `packages/studio/src/styles/assets-cards.css`
  - asset grid, cards, previews, and variant styling

### Generate and documents styles split

Before:
- `packages/studio/src/styles/generate.css` grouped layout, prompt, timeline, result, and preview states
- `packages/studio/src/styles/documents.css` grouped layout, sidebar, viewer, and markdown presentation

After:
- `packages/studio/src/styles/generate.css`
  - entrypoint only
- `packages/studio/src/styles/generate-layout.css`
  - tab layout and responsive split
- `packages/studio/src/styles/generate-prompt.css`
  - prompt, upload, and plan-summary controls
- `packages/studio/src/styles/generate-timeline.css`
  - agent pipeline rendering
- `packages/studio/src/styles/generate-session.css`
  - session result and export controls
- `packages/studio/src/styles/generate-preview.css`
  - empty and loading preview state
- `packages/studio/src/styles/documents.css`
  - entrypoint only
- `packages/studio/src/styles/documents-layout.css`
  - tab grid and responsive layout
- `packages/studio/src/styles/documents-sidebar.css`
  - document navigation rail
- `packages/studio/src/styles/documents-viewer.css`
  - viewer header, markdown, and empty state

### Studio smoke coverage

Before:
- Studio tests only covered pure helper functions
- no jsdom render check asserted that the overview cockpit still mounted correctly

After:
- `packages/studio/src/views/tabs/OverviewTab.test.tsx`
  - jsdom smoke test for cockpit rendering and workflow metrics
- `packages/studio/src/views/tabs/DocumentsTab.test.tsx`
  - document switching and markdown viewer smoke coverage
- `packages/studio/src/views/tabs/WorkspaceTab.test.tsx`
  - workspace explorer and file preview smoke coverage
- `packages/studio/src/views/tabs/AgentsTab.test.tsx`
  - factory/runtime agent cockpit smoke coverage
- `packages/studio/src/views/tabs/ProductionTab.test.tsx`
  - production families and view switching smoke coverage
- `packages/studio/src/views/tabs/AssetsTab.test.tsx`
  - asset family filtering and showcase-mode behavior coverage
- `packages/studio/src/views/tabs/BuildTab.test.tsx`
  - build target listing and generation-run detail coverage
- `packages/studio/src/views/tabs/GenerateTab.test.tsx`
  - generation websocket lifecycle, plan summary, session result, and preview-state coverage
- `packages/studio/package.json`
  - test runtime now includes `jsdom` and `@testing-library/react`

### Workspace surface contract tests

Before:
- production, systems-board, and construction-graph manifests could point to workspace files without automated existence checks

After:
- `packages/orchestrator/src/workspace-surface-links.test.ts`
  - validates Production HQ links, work-order roots, systems-board file surfaces, and construction-graph clickable targets

### Studio navigation smoke

Before:
- frontend verification relied on ad hoc manual checks or local one-off scripts

After:
- `tools/studio-navigation-smoke.mjs`
  - reusable Playwright smoke for Documents, Assets, Production, Build, Workspace, and Agents tabs
- `package.json`
  - `studio:smoke` script entrypoint
- `generated/studio-navigation-smoke.png`
  - latest verified navigation capture on the built Studio

## Current anti-monolith rules

- one file = one dominant responsibility
- orchestration must stay thin
- data contracts live outside rendering when reusable
- generated workspace outputs must be reproducible from dedicated builders
- runtime-facing asset folders keep isolated stage directories

## Next refactor targets

Priority 1:
- reduce `pixi-runtime` bundle weight below the large-chunk warning threshold
- reduce `three-core` bundle weight below the large-chunk warning threshold

Priority 2:
- CI wiring for `studio:smoke` on build artifacts
- deeper interaction smoke beyond navigation-only verification

Priority 3:
- add contract tests for remaining cross-manifest surfaces beyond the master-plan layer
- deeper authored test fixtures for runtime preview and asset-stage mutations

## Done criteria for future passes

- split builders from templates from IO
- reduce cross-file knowledge duplication
- expose stable contracts for agents
- add targeted validation after each new module boundary
