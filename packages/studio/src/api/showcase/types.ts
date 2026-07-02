import type { GameProject } from '@ellipse/shared';

export type ShowcaseManifest = {
  project: GameProject;
  workspace: { rootDir: string; relativeRoot: string; readmePath: string; contextPath: string };
  preview_gdl: string;
  copied_reference_count: number;
};
