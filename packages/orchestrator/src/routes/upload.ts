import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import { registerUpload } from '@ellipse/db';
import type { ServerContext } from './context.js';

export function registerUploadRoutes(app: FastifyInstance, ctx: ServerContext): void {
  app.post('/api/upload', async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'Fichier requis' });

    const buffer = await data.toBuffer();
    const assetId = uuidv4();
    const ext = data.filename?.split('.').pop() ?? 'bin';
    const filename = `${assetId}.${ext}`;
    const storagePath = join(ctx.uploadDir, filename);

    await writeFile(storagePath, buffer);
    await registerUpload({
      id: assetId,
      originalName: data.filename ?? filename,
      storagePath,
      mimeType: data.mimetype,
      sizeBytes: buffer.length,
    });

    return {
      id: assetId,
      path: storagePath,
      url: `/uploads/${filename}`,
      originalName: data.filename,
    };
  });
}
