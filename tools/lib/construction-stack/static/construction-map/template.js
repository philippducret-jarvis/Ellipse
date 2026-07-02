const manifestUrl = './construction-map.manifest.json';

const tabs = Array.from(document.querySelectorAll('.view-tabs button'));
const stage = document.getElementById('graph-stage');
const detailCard = document.getElementById('detail-card');
const viewTitle = document.getElementById('view-title');
const viewDescription = document.getElementById('view-description');

let graph = null;
let activeView = 'strata_flow';
let activeNodeId = null;

function workspaceFileUrl(path) {
  return '/workspaces/echoes-of-the-mushroom-realm/' + path.replace(/^\/+/, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function setDetail(payload) {
  const links = (payload.files ?? [])
    .map((file) => '<a href="' + workspaceFileUrl(file) + '" target="_blank" rel="noreferrer">' + escapeHtml(file) + '</a>')
    .join('');

  detailCard.innerHTML = [
    '<h3>' + escapeHtml(payload.title ?? 'Selection') + '</h3>',
    payload.meta ? '<p class="detail-meta">' + escapeHtml(payload.meta) + '</p>' : '',
    payload.description ? '<p>' + escapeHtml(payload.description) + '</p>' : '',
    payload.list && payload.list.length
      ? '<ul>' + payload.list.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>'
      : '',
    links ? '<div class="detail-links">' + links + '</div>' : '',
  ].join('');
}

function activateTab(viewId) {
  activeView = viewId;
  for (const tab of tabs) {
    tab.classList.toggle('active', tab.dataset.view === viewId);
  }
  renderView();
}

function selectNode(nodeId, payload) {
  activeNodeId = nodeId;
  setDetail(payload);
  renderView();
}

function renderStrataFlow(view) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flow-stack';

  for (const node of view.nodes) {
    const card = document.createElement('article');
    card.className = 'flow-node' + (activeNodeId === node.id ? ' active' : '');
    card.innerHTML = [
      '<div class="node-label"><strong>' + escapeHtml(node.label) + '</strong><span class="node-order">Layer</span></div>',
      '<p class="node-summary">' + escapeHtml(node.summary) + '</p>',
    ].join('');
    card.onclick = () => selectNode(node.id, {
      title: node.label,
      meta: node.group,
      description: node.summary,
      files: [node.file],
    });
    wrapper.appendChild(card);
  }

  if (!activeNodeId && view.nodes[0]) {
    setDetail({
      title: view.nodes[0].label,
      meta: view.nodes[0].group,
      description: view.nodes[0].summary,
      files: [view.nodes[0].file],
    });
  }

  return wrapper;
}

function renderAgentFlow(view) {
  const wrapper = document.createElement('div');
  wrapper.className = 'agent-layout';

  const grid = document.createElement('div');
  grid.className = 'agent-grid';

  const lanes = [0, 1, 2].map((laneId) => {
    const lane = document.createElement('div');
    lane.className = 'agent-lane';
    lane.dataset.lane = String(laneId);
    return lane;
  });

  for (const lane of lanes) grid.appendChild(lane);

  const nodeRefs = new Map();
  for (const node of view.nodes) {
    const card = document.createElement('article');
    card.className = 'agent-node' + (activeNodeId === node.id ? ' active' : '');
    card.dataset.nodeId = node.id;
    card.innerHTML = '<strong>' + escapeHtml(node.label) + '</strong><small>' + escapeHtml(node.id) + '</small>';
    card.onclick = () => {
      const links = view.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
      selectNode(node.id, {
        title: node.label,
        meta: 'agent',
        description: 'Agent involved in the construction pipeline.',
        list: links.map((edge) => edge.from + ' -> ' + edge.to + ' : ' + edge.label),
        files: [node.file],
      });
    };
    lanes[node.lane].appendChild(card);
    nodeRefs.set(node.id, card);
  }

  wrapper.appendChild(grid);

  requestAnimationFrame(() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'agent-svg');
    const stageRect = wrapper.getBoundingClientRect();

    for (const edge of view.edges) {
      const from = nodeRefs.get(edge.from);
      const to = nodeRefs.get(edge.to);
      if (!from || !to) continue;
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const x1 = a.right - stageRect.left;
      const y1 = a.top - stageRect.top + a.height / 2;
      const x2 = b.left - stageRect.left;
      const y2 = b.top - stageRect.top + b.height / 2;
      const cx = (x1 + x2) / 2;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'agent-link');
      path.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + cx + ' ' + y1 + ', ' + cx + ' ' + y2 + ', ' + x2 + ' ' + y2);
      svg.appendChild(path);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'agent-link-text');
      text.setAttribute('x', String(cx));
      text.setAttribute('y', String((y1 + y2) / 2 - 6));
      text.textContent = edge.label;
      svg.appendChild(text);
    }

    const previous = wrapper.querySelector('svg');
    if (previous) previous.remove();
    wrapper.appendChild(svg);
  });

  if (!activeNodeId && view.nodes[0]) {
    selectNode(view.nodes[0].id, {
      title: view.nodes[0].label,
      meta: 'agent',
      description: 'Agent involved in the construction pipeline.',
      files: [view.nodes[0].file],
    });
  }

  return wrapper;
}

function renderSequence(view) {
  const wrapper = document.createElement('div');
  wrapper.className = 'sequence-board';

  for (const lane of view.lanes) {
    const laneNode = document.createElement('div');
    laneNode.className = 'sequence-lane';
    laneNode.innerHTML = '<h3>' + escapeHtml(lane) + '</h3>';

    const steps = view.steps.filter((step) => step.lane === lane);
    for (const [index, step] of steps.entries()) {
      const nodeId = lane + ':' + index;
      const card = document.createElement('article');
      card.className = 'sequence-step' + (activeNodeId === nodeId ? ' active' : '');
      card.innerHTML = '<strong>' + escapeHtml(step.title) + '</strong><small>' + escapeHtml(step.detail) + '</small>';
      card.onclick = () => selectNode(nodeId, {
        title: step.title,
        meta: step.lane,
        description: step.detail,
        files: [step.file],
      });
      laneNode.appendChild(card);
    }

    wrapper.appendChild(laneNode);
  }

  if (!activeNodeId && view.steps[0]) {
    const step = view.steps[0];
    setDetail({
      title: step.title,
      meta: step.lane,
      description: step.detail,
      files: [step.file],
    });
  }

  return wrapper;
}

function renderWorkspaceSurfaces(view) {
  const wrapper = document.createElement('div');
  wrapper.className = 'surface-board';

  for (const group of view.groups) {
    const card = document.createElement('article');
    card.className = 'surface-card' + (activeNodeId === group.id ? ' active' : '');
    card.innerHTML = '<div class="node-label"><strong>' + escapeHtml(group.label) + '</strong><span class="node-chip">' + group.files.length + ' files</span></div>';

    const fileList = document.createElement('div');
    fileList.className = 'surface-files';
    for (const file of group.files) {
      const link = document.createElement('button');
      link.className = 'surface-file';
      link.textContent = file;
      link.onclick = (event) => {
        event.stopPropagation();
        selectNode(group.id + ':' + file, {
          title: file,
          meta: group.label,
          description: 'Workspace surface file',
          files: [file],
        });
      };
      fileList.appendChild(link);
    }
    card.appendChild(fileList);
    card.onclick = () => selectNode(group.id, {
      title: group.label,
      meta: 'workspace surface',
      description: 'Cluster of files used to drive one construction surface.',
      files: group.files,
    });
    wrapper.appendChild(card);
  }

  if (!activeNodeId && view.groups[0]) {
    selectNode(view.groups[0].id, {
      title: view.groups[0].label,
      meta: 'workspace surface',
      description: 'Cluster of files used to drive one construction surface.',
      files: view.groups[0].files,
    });
  }

  return wrapper;
}

function renderView() {
  const view = graph.views[activeView];
  if (!view) return;
  viewTitle.textContent = view.title;
  viewDescription.textContent = view.description;
  stage.innerHTML = '';

  let node = null;
  if (activeView === 'strata_flow') node = renderStrataFlow(view);
  if (activeView === 'agent_flow') node = renderAgentFlow(view);
  if (activeView === 'runtime_sequence') node = renderSequence(view);
  if (activeView === 'workspace_surfaces') node = renderWorkspaceSurfaces(view);
  if (node) stage.appendChild(node);
}

for (const tab of tabs) {
  tab.onclick = () => {
    activeNodeId = null;
    activateTab(tab.dataset.view);
  };
}

const manifest = await fetch(manifestUrl).then((res) => res.json());
graph = await fetch(manifest.graph_url).then((res) => res.json());
activateTab(activeView);
