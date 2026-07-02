/**
 * F2 — Rig 2D manipulable (parité Godot Skeleton2D simplifiée).
 */
import { Container, Sprite, Texture } from 'pixi.js';

export interface RigBoneSpec {
  id: string;
  parent: string | null;
  position: { x: number; y: number };
  rotation?: number;
}

export interface RigPartSpec {
  id: string;
  file?: string;
  pivot?: { x: number; y: number };
  bind_bone?: string;
}

export interface RigSpec {
  canvas?: { width: number; height: number };
  root?: string;
  bones: RigBoneSpec[];
  parts?: RigPartSpec[];
}

export interface Skeletal2DInstance {
  root: Container;
  dispose: () => void;
  setBoneRotation: (boneId: string, radians: number) => void;
  playPose: (pose: Record<string, { rotation?: number; offsetY?: number }>) => void;
}

export function parseRigSpec(raw: unknown): RigSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (Array.isArray(r.bones) && r.bones.length > 0 && typeof r.bones[0] === 'object') {
    return r as unknown as RigSpec;
  }

  if (Array.isArray(r.bones) && typeof r.bones[0] === 'string') {
    const names = r.bones as string[];
    const pivots = (r.pivots ?? {}) as Record<string, { x: number; y: number }>;
    const canvas = { width: 256, height: 320 };
    const boneSpecs: RigBoneSpec[] = names.map((id, i) => {
      const pv = pivots[id] ?? { x: 0.5, y: 0.5 };
      return {
        id,
        parent: i === 0 ? null : names[0] ?? null,
        position: { x: pv.x * canvas.width, y: pv.y * canvas.height },
      };
    });
    return { canvas, root: names[0], bones: boneSpecs, parts: [{ id: 'body', bind_bone: names[1] ?? names[0] }] };
  }

  if (Array.isArray(r.joints)) {
    const joints = r.joints as Array<{ id: string; pivot?: { x: number; y: number }; parent?: string | null }>;
    const canvas = { width: 256, height: 320 };
    const bones: RigBoneSpec[] = joints.map((j) => ({
      id: j.id,
      parent: j.parent ?? null,
      position: {
        x: (j.pivot?.x ?? 0.5) * canvas.width,
        y: (j.pivot?.y ?? 0.5) * canvas.height,
      },
    }));
    return {
      canvas,
      root: joints[0]?.id,
      bones,
      parts: joints.map((j) => ({ id: j.id, bind_bone: j.id, file: `${j.id}.png` })),
    };
  }

  return null;
}

/** Déduit l'URL rig.json depuis un atlas runtime. */
export function deriveRigUrlFromSprite(spriteUrl: string): string {
  return spriteUrl.replace(/\/06_exports\/runtime_atlas\.png$/i, '/04_rig/rig.json');
}

/** Déduit la silhouette cleanup depuis un atlas runtime. */
export function deriveSilhouetteUrlFromSprite(spriteUrl: string): string {
  return spriteUrl.replace(/\/06_exports\/runtime_atlas\.png$/i, '/03_cleanup/silhouette-clean.png');
}

/** Construit une hiérarchie Pixi depuis rig.json + textures parts (URLs). */
export async function createSkeletal2D(
  rig: RigSpec,
  partTextures: Record<string, string>,
): Promise<Skeletal2DInstance> {
  const root = new Container();
  const boneContainers = new Map<string, Container>();

  for (const bone of rig.bones) {
    const c = new Container();
    c.label = bone.id;
    if (bone.position) {
      c.position.set(bone.position.x, bone.position.y);
    }
    boneContainers.set(bone.id, c);
  }

  for (const bone of rig.bones) {
    const c = boneContainers.get(bone.id)!;
    if (bone.parent && boneContainers.has(bone.parent)) {
      boneContainers.get(bone.parent)!.addChild(c);
    } else {
      root.addChild(c);
    }
  }

  for (const part of rig.parts ?? []) {
    const url = part.file ? partTextures[part.id] ?? partTextures[part.file] : partTextures[part.id];
    if (!url) continue;
    try {
      const tex = await Texture.from(url);
      const spr = new Sprite(tex);
      spr.anchor.set(
        (part.pivot?.x ?? 0.5) / (rig.canvas?.width ?? tex.width),
        (part.pivot?.y ?? 0.5) / (rig.canvas?.height ?? tex.height),
      );
      const boneId = part.bind_bone ?? rig.root ?? 'root';
      const bone = boneContainers.get(boneId) ?? root;
      bone.addChild(spr);
    } catch {
      /* texture load fail — skip part */
    }
  }

  return {
    root,
    dispose: () => root.destroy({ children: true }),
    setBoneRotation(boneId, radians) {
      const c = boneContainers.get(boneId);
      if (c) c.rotation = radians;
    },
    playPose(pose) {
      for (const [boneId, p] of Object.entries(pose)) {
        const c = boneContainers.get(boneId);
        if (!c) continue;
        if (p.rotation != null) c.rotation = p.rotation;
        if (p.offsetY != null) c.y += p.offsetY;
      }
    },
  };
}

/** Pose idle légère — bob sur root/torso. */
export function idlePosePhase(phase: number): Record<string, { rotation?: number; offsetY?: number }> {
  return {
    torso: { offsetY: Math.sin(phase * 4) * 2 },
    head: { rotation: Math.sin(phase * 3) * 0.03 },
  };
}
