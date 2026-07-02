import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BOARD_SOURCES } from './data.mjs';
import { PROJECT_TITLE, PUBLIC_WORKSPACE_ROOT, REFERENCES_ROOT } from './constants.mjs';
import { ensureDir, writeJson } from './io.mjs';

export async function importReferenceBoards() {
  await ensureDir(REFERENCES_ROOT);

  const copied = [];
  for (const board of BOARD_SOURCES) {
    const destination = join(REFERENCES_ROOT, board.workspace_file);
    await copyFile(board.source_path, destination);
    copied.push({
      id: board.id,
      role: board.role,
      label: board.label,
      source: board.source_path,
      workspace_file: `01_inputs/references/${board.workspace_file}`,
      url: `${PUBLIC_WORKSPACE_ROOT}/01_inputs/references/${board.workspace_file}`,
      concept_use: board.concept_use,
      tags: board.tags,
    });
  }

  const referenceIndex = {
    project: PROJECT_TITLE,
    imported_at: new Date().toISOString(),
    note: 'Canonical imported boards for Veloria. Use these as the single source of truth for art direction, systems, hub, environments, heroine roster and first production slice.',
    expected_boards: BOARD_SOURCES.map((board) => board.workspace_file),
    copied_references: copied,
  };

  await writeJson(join(REFERENCES_ROOT, 'reference-index.json'), referenceIndex);
  return referenceIndex;
}
