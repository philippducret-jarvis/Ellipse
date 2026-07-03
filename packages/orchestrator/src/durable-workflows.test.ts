import { describe, expect, it } from 'vitest';
import { DurableWorkflowSchema } from '@ellipse/shared';
import { DURABLE_WORKFLOW_TEMPLATES, getDurableWorkflowCatalog } from './durable-workflows.js';

describe('durable workflow catalog', () => {
  it('matches the shared contract schema', () => {
    expect(() => DurableWorkflowSchema.array().parse(DURABLE_WORKFLOW_TEMPLATES)).not.toThrow();
  });

  it('contains the required workflow lanes', () => {
    const ids = getDurableWorkflowCatalog().map((workflow) => workflow.id);
    expect(ids).toContain('project_bootstrap');
    expect(ids).toContain('asset_family_pipeline');
    expect(ids).toContain('scene_assembly');
    expect(ids).toContain('runtime_integration');
    expect(ids).toContain('gacha_liveops_pipeline');
    expect(ids).toContain('qa_release_gate');
  });
});
