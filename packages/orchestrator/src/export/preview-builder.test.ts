import { describe, expect, it } from 'vitest';
import { previewGdlRelativeUrl } from './preview-builder.js';

describe('preview builder merge drop', () => {
  it('resout le GDL depuis 07_exports/web vers 05_runtime/gdl', () => {
    const relative = previewGdlRelativeUrl('orbes-d-astra');
    const resolved = new URL(
      relative,
      'http://localhost/workspaces/orbes-d-astra/07_exports/web/preview.html',
    );

    expect(relative).toBe('../../05_runtime/gdl/orbes.preview.gdl.json');
    expect(resolved.pathname).toBe('/workspaces/orbes-d-astra/05_runtime/gdl/orbes.preview.gdl.json');
  });
});
