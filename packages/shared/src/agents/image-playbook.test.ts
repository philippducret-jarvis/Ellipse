import { describe, it, expect } from 'vitest';
import { recommendImageOperation, formatImagePlaybookForAgents, IMAGE_OPERATION_RECIPES } from './image-playbook.js';

describe('image-playbook', () => {
  it('recommande procédural sans photo', () => {
    expect(recommendImageOperation({ hasPhoto: false })).toBe('create_procedural');
  });

  it('recommande inpaint si IoU intermédiaire', () => {
    expect(recommendImageOperation({ hasPhoto: true, iou: 0.6 })).toBe('retouch_inpaint_cpu');
  });

  it('formate le playbook pour character', () => {
    const text = formatImagePlaybookForAgents('character');
    expect(text).toContain('segment_floodfill');
    expect(IMAGE_OPERATION_RECIPES.some((r) => r.primaryAgent === 'character')).toBe(true);
  });
});
