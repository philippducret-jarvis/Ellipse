import type { ProductionFile } from './types.js';

export function summarizeExecution(workOrder: ProductionFile['work_orders'][number]): string {
  return [...new Set([...workOrder.execution_profile, ...workOrder.assigned_agents])].join(' | ');
}

export function computeStageProgress(workOrder: ProductionFile['work_orders'][number]): number {
  if (workOrder.stages.length === 0) return 0;
  const readyCount = workOrder.stages.filter((stage) => stage.status === 'ready').length;
  return Math.round((readyCount / workOrder.stages.length) * 100);
}
