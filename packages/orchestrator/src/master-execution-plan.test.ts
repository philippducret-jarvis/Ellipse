import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  CanonicalContractSurfaceSchema,
  DurableWorkflowSchema,
  MasterExecutionPlanSchema,
} from '@ellipse/shared';

async function readJson<T>(relativePath: string): Promise<T> {
  const fileUrl = new URL(relativePath, import.meta.url);
  return JSON.parse(await readFile(fileUrl, 'utf8')) as T;
}

describe('workspace master execution plan', () => {
  it('matches the shared schema and keeps internal references coherent', async () => {
    const masterPlan = MasterExecutionPlanSchema.parse(
      await readJson('../../../workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/master-execution-plan.json'),
    );

    const roadmapIds = new Set(masterPlan.roadmap.map((item) => item.id));
    const workflowIds = new Set(masterPlan.workflows.map((workflow) => workflow.id));
    const contractIds = new Set(masterPlan.canonical_contracts.map((contract) => contract.id));

    expect(contractIds.has('master_execution_plan')).toBe(true);
    expect(workflowIds.has('project_bootstrap')).toBe(true);
    expect(workflowIds.has('asset_family_pipeline')).toBe(true);
    expect(workflowIds.has('scene_assembly')).toBe(true);

    for (const item of masterPlan.roadmap) {
      for (const dependency of item.dependencies) {
        expect(roadmapIds.has(dependency)).toBe(true);
      }
    }

    for (const workflow of masterPlan.workflows) {
      const stepIds = new Set(workflow.steps.map((step) => step.id));
      for (const step of workflow.steps) {
        for (const dependency of step.depends_on) {
          expect(stepIds.has(dependency)).toBe(true);
        }
      }
    }
  });

  it('stays aligned with workspace contract and workflow registries', async () => {
    const masterPlan = MasterExecutionPlanSchema.parse(
      await readJson('../../../workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/master-execution-plan.json'),
    );
    const workspaceContractsDoc = await readJson<{
      contracts: unknown[];
    }>('../../../workspaces/echoes-of-the-mushroom-realm/05_runtime/config/canonical-data-contracts.json');
    const workspaceWorkflowsDoc = await readJson<{
      workflows: unknown[];
    }>('../../../workspaces/echoes-of-the-mushroom-realm/05_runtime/config/durable-workflows.json');
    const workspaceContracts = CanonicalContractSurfaceSchema.array().parse(workspaceContractsDoc.contracts);
    const workspaceWorkflows = DurableWorkflowSchema.array().parse(workspaceWorkflowsDoc.workflows);

    const masterContractIds = new Set(masterPlan.canonical_contracts.map((contract) => contract.id));
    const registryContractIds = new Set(workspaceContracts.map((contract) => contract.id));
    const masterWorkflowIds = new Set(masterPlan.workflows.map((workflow) => workflow.id));
    const registryWorkflowIds = new Set(workspaceWorkflows.map((workflow) => workflow.id));

    expect(masterContractIds).toEqual(registryContractIds);
    expect(masterWorkflowIds).toEqual(registryWorkflowIds);
  });
});
