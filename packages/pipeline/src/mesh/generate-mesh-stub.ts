import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface MeshStubInput {
  outputDir: string;
  sessionId: string;
  label?: string;
}

export async function generateMeshStubGlb(input: MeshStubInput): Promise<{ path: string; url: string }> {
  const sessionDir = join(input.outputDir, input.sessionId);
  await mkdir(sessionDir, { recursive: true });
  const filename = 'hero.glb';
  const path = join(sessionDir, filename);

  const gltf = {
    asset: { version: '2.0', generator: 'ellipse-mesh-v0-stub' },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: input.label ?? 'hero' }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
          },
        ],
      },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', max: [1, 1, 0], min: [-1, -1, 0] },
      { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 6 },
    ],
    buffers: [{ byteLength: 42, uri: 'data:application/octet-stream;base64,AAAAAAAAAAAAAAAAAACAPwAAAAAAAIA/AAAAAAAAAAAAAAAAAAAAAA==AAABAAI=' }],
  };

  await writeFile(path, JSON.stringify(gltf), 'utf8');
  return { path, url: `/generated/${input.sessionId}/${filename}` };
}
