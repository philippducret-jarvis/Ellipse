# Next-Gen Master Plan

This document records the current execution strategy for turning Ellipse from a rich concept-and-preview factory into a production-grade AI-native game creation platform.

## Files

- Shared canonical schemas:
  - `packages/shared/src/production-architecture.ts`
- Orchestrator workflow catalog:
  - `packages/orchestrator/src/durable-workflows.ts`
- Workspace strategy surfaces:
  - `workspaces/echoes-of-the-mushroom-realm/02_design/specs/next-gen-master-plan.md`
  - `workspaces/echoes-of-the-mushroom-realm/05_runtime/config/canonical-data-contracts.json`
  - `workspaces/echoes-of-the-mushroom-realm/05_runtime/config/durable-workflows.json`
  - `workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/master-execution-plan.json`

## Purpose

These files define:

- the strata the project must cover end-to-end,
- the canonical contracts shared by backend, frontend, agents, runtime, and workspace,
- the durable workflow templates required for long-running jobs,
- and the immediate execution order for the next development passes.

## Expected usage

1. Shared package exports the contract layer.
2. Orchestrator imports the workflow catalog to move toward resumable execution.
3. Studio and workspace surfaces can expose the plan without inventing their own model.
4. Validation scripts must fail when these master-plan surfaces disappear.

## Current scope

This pass formalizes the architecture and makes the repo operable against it. It does not yet replace the in-process execution loop with a full Temporal-backed runtime, but it creates the schema and workflow boundary needed to do so without redesigning the whole project again.
