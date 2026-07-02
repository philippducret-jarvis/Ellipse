import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { ExtractedElement } from './extract-elements.js';

export interface MeshFromSilhouetteInput {
  sourcePath: string;
  outputDir: string;
  sessionId: string;
  elements?: ExtractedElement[];
  textureSize?: number;
  depthStrength?: number;
}

export interface MeshFromSilhouetteResult {
  path: string;
  url: string;
  textureUrl: string;
  vertexCount: number;
  source: 'ellipse-lot0-mesh-v0';
}

export async function generateMeshFromSilhouette(
  input: MeshFromSilhouetteInput,
): Promise<MeshFromSilhouetteResult> {
  const sessionDir = join(input.outputDir, input.sessionId, 'lot0');
  await mkdir(sessionDir, { recursive: true });
  const meta = await sharp(input.sourcePath).rotate().metadata();
  const srcW = meta.width ?? 512;
  const srcH = meta.height ?? 512;
  const textureSize = input.textureSize ?? 1024;
  const depthStrength = input.depthStrength ?? 0.1;

  const texName = 'hero_texture.png';
  const texPath = join(sessionDir, texName);
  await sharp(input.sourcePath)
    .rotate()
    .resize(textureSize, textureSize, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(texPath);

  const positions = [-0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0];
  const uvs = [0, 0, 1, 0, 0, 1, 1, 1];
  const indices = [0, 1, 2, 1, 3, 2];

  const posBuf = Buffer.alloc(positions.length * 4);
  for (let i = 0; i < positions.length; i++) posBuf.writeFloatLE(positions[i]!, i * 4);

  const uvBuf = Buffer.alloc(uvs.length * 4);
  for (let i = 0; i < uvs.length; i++) uvBuf.writeFloatLE(uvs[i]!, i * 4);

  const idxBuf = Buffer.alloc(indices.length * 2);
  for (let i = 0; i < indices.length; i++) idxBuf.writeUInt16LE(indices[i]!, i * 2);

  const bin = Buffer.concat([posBuf, uvBuf, idxBuf]);
  const layerDefs = await buildLayerDefinitions(input.elements ?? [], { srcW, srcH, depthStrength });
  const images = await Promise.all([
    toImageDataUri(texPath),
    ...layerDefs.map((layer) => toImageDataUri(layer.texturePath)),
  ]);
  const baseAspect = srcW / Math.max(1, srcH);
  const baseHeight = 2;
  const baseWidth = Number((baseHeight * baseAspect).toFixed(4));
  const materials = [
    buildMaterial(0),
    ...layerDefs.map((_, index) => buildMaterial(index + 1)),
  ];
  const meshes = [
    {
      name: 'hero_base',
      primitives: [
        {
          attributes: { POSITION: 0, TEXCOORD_0: 1 },
          indices: 2,
          material: 0,
        },
      ],
    },
    ...layerDefs.map((layer, index) => ({
      name: `hero_${layer.label}_${index}`,
      primitives: [
        {
          attributes: { POSITION: 0, TEXCOORD_0: 1 },
          indices: 2,
          material: index + 1,
        },
      ],
    })),
  ];
  const nodes = [
    {
      name: 'hero_root',
      children: Array.from({ length: layerDefs.length + 1 }, (_, i) => i + 1),
      extras: {
        ellipseAnimation: 'turntable',
      },
    },
    {
      mesh: 0,
      name: 'hero_base_plane',
      scale: [baseWidth, baseHeight, 1],
      translation: [0, 0, -depthStrength * 0.8],
      extras: { ellipseLayer: 'base_full', bobStrength: 0.01 },
    },
    ...layerDefs.map((layer, index) => ({
      mesh: index + 1,
      name: `hero_layer_${layer.label}_${index + 1}`,
      scale: [layer.scaleX, layer.scaleY, 1],
      translation: [layer.translateX, layer.translateY, layer.translateZ],
      extras: {
        ellipseLayer: layer.label,
        bobStrength: layer.bobStrength,
        phase: layer.phase,
      },
    })),
  ];

  const gltf = {
    asset: { version: '2.0', generator: 'ellipse-lot0-mesh-v1' },
    scenes: [{ nodes: [0] }],
    nodes,
    materials,
    textures: images.map((_, index) => ({ source: index })),
    images: images.map((uri) => ({ mimeType: 'image/png', uri })),
    meshes,
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: 'VEC3', max: [0.5, 0.5, 0], min: [-0.5, -0.5, 0] },
      { bufferView: 1, componentType: 5126, count: 4, type: 'VEC2' },
      { bufferView: 2, componentType: 5123, count: 6, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBuf.length },
      { buffer: 0, byteOffset: posBuf.length, byteLength: uvBuf.length },
      { buffer: 0, byteOffset: posBuf.length + uvBuf.length, byteLength: idxBuf.length },
    ],
    buffers: [{ byteLength: bin.length, uri: `data:application/octet-stream;base64,${bin.toString('base64')}` }],
  };

  const filename = 'hero.gltf';
  const path = join(sessionDir, filename);
  await writeFile(path, JSON.stringify(gltf), 'utf8');

  return {
    path,
    url: `/generated/${input.sessionId}/lot0/${filename}`,
    textureUrl: `/generated/${input.sessionId}/lot0/${texName}`,
    vertexCount: 4 * (layerDefs.length + 1),
    source: 'ellipse-lot0-mesh-v0',
  };
}

function buildMaterial(textureIndex: number) {
  return {
    pbrMetallicRoughness: {
      baseColorTexture: { index: textureIndex },
      metallicFactor: 0,
      roughnessFactor: 0.92,
    },
    alphaMode: 'BLEND',
    doubleSided: true,
  };
}

async function toImageDataUri(path: string): Promise<string> {
  const file = await readFile(path);
  return `data:image/png;base64,${file.toString('base64')}`;
}

async function buildLayerDefinitions(
  elements: ExtractedElement[],
  input: { srcW: number; srcH: number; depthStrength: number },
): Promise<
  {
    label: string;
    texturePath: string;
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
    translateZ: number;
    bobStrength: number;
    phase: number;
  }[]
> {
  const usable = elements.filter((element) => element.prominence >= 0.15);
  const depthMap: Record<string, number> = {
    head: input.depthStrength * 1.35,
    torso: input.depthStrength * 0.55,
    base: -input.depthStrength * 0.15,
    accent: input.depthStrength * 1.6,
  };
  const bobMap: Record<string, number> = {
    head: 0.045,
    torso: 0.025,
    base: 0.012,
    accent: 0.06,
  };

  return usable.map((element, index) => {
    const widthRatio = element.bounds.width / Math.max(1, input.srcW);
    const heightRatio = element.bounds.height / Math.max(1, input.srcH);
    const centerX = (element.bounds.x + element.bounds.width / 2) / Math.max(1, input.srcW);
    const centerY = (element.bounds.y + element.bounds.height / 2) / Math.max(1, input.srcH);
    const scaleX = Number(Math.max(0.22, widthRatio * 2).toFixed(4));
    const scaleY = Number(Math.max(0.16, heightRatio * 2).toFixed(4));
    const translateX = Number(((centerX - 0.5) * 1.2).toFixed(4));
    const translateY = Number(((0.5 - centerY) * 2).toFixed(4));
    const translateZ = Number(((depthMap[element.label] ?? input.depthStrength * 0.3) + index * 0.002).toFixed(4));
    return {
      label: element.label,
      texturePath: element.path,
      scaleX,
      scaleY,
      translateX,
      translateY,
      translateZ,
      bobStrength: bobMap[element.label] ?? 0.03,
      phase: index * 0.7,
    };
  });
}
