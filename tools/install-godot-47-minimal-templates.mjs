#!/usr/bin/env node
/**
 * Installs only the Godot 4.7 export templates required by Orbes d'Astra.
 *
 * The official all-platform TPZ is ~1.28 GB. Godot 4.7's editor can download
 * selected templates interactively; this deterministic CLI equivalent reads
 * the official ZIP central directory with HTTP ranges and downloads only the
 * requested entries. It refuses servers that ignore Range to avoid silently
 * fetching the complete archive.
 */
import { inflateRawSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const SOURCE = 'https://godot-releases.nbg1.your-objectstorage.com/4.7-stable/Godot_v4.7-stable_export_templates.tpz';
const requestedPlatform = process.argv.includes('--android')
  ? 'android'
  : process.argv.includes('--web')
    ? 'web'
  : process.argv.includes('--all')
    ? 'all'
    : 'windows';
const targets = {
  windows: ['windows_release_x86_64.exe'],
  android: ['android_release.apk'],
  web: ['web_nothreads_release.zip', 'web_nothreads_debug.zip'],
  all: ['windows_release_x86_64.exe', 'android_release.apk', 'web_nothreads_release.zip', 'web_nothreads_debug.zip'],
}[requestedPlatform];

async function range(start, end) {
  const response = await fetch(SOURCE, { headers: { Range: `bytes=${start}-${end}` } });
  if (response.status !== 206) {
    throw new Error(`Official mirror did not honor HTTP Range (${response.status}); refusing a full 1.28 GB download.`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const head = await fetch(SOURCE, { method: 'HEAD' });
if (!head.ok) throw new Error(`Cannot inspect official Godot archive: ${head.status}`);
const totalSize = Number(head.headers.get('content-length'));
if (!Number.isFinite(totalSize) || totalSize < 1_000_000) throw new Error('Invalid archive size.');

const tailLength = Math.min(262_144, totalSize);
const tailStart = totalSize - tailLength;
const tail = await range(tailStart, totalSize - 1);
let eocd = -1;
for (let offset = tail.length - 22; offset >= 0; offset -= 1) {
  if (tail.readUInt32LE(offset) === 0x06054b50) {
    eocd = offset;
    break;
  }
}
if (eocd < 0) throw new Error('ZIP end-of-central-directory not found.');
const centralSize = tail.readUInt32LE(eocd + 12);
const centralOffset = tail.readUInt32LE(eocd + 16);
if (centralSize > 16 * 1024 * 1024) throw new Error(`Unexpected central directory size: ${centralSize}`);
const central = await range(centralOffset, centralOffset + centralSize - 1);

const entries = [];
let cursor = 0;
while (cursor + 46 <= central.length && central.readUInt32LE(cursor) === 0x02014b50) {
  const method = central.readUInt16LE(cursor + 10);
  const compressedSize = central.readUInt32LE(cursor + 20);
  const uncompressedSize = central.readUInt32LE(cursor + 24);
  const nameLength = central.readUInt16LE(cursor + 28);
  const extraLength = central.readUInt16LE(cursor + 30);
  const commentLength = central.readUInt16LE(cursor + 32);
  const localOffset = central.readUInt32LE(cursor + 42);
  const name = central.toString('utf8', cursor + 46, cursor + 46 + nameLength);
  entries.push({ name, method, compressedSize, uncompressedSize, localOffset });
  cursor += 46 + nameLength + extraLength + commentLength;
}

const selected = [];
for (const target of targets) {
  const match = entries.find((entry) => entry.name.endsWith(`/${target}`) || entry.name === target);
  if (!match) {
    const available = entries.filter((entry) => /windows.*x86_64|android.*\.apk|web.*release/i.test(entry.name)).map((entry) => entry.name);
    throw new Error(`Template ${target} not present. Candidates: ${available.join(', ')}`);
  }
  selected.push(match);
}
const versionEntry = entries.find((entry) => entry.name.endsWith('/version.txt') || entry.name === 'version.txt');
if (versionEntry) selected.push(versionEntry);

const templateDir = join(process.env.APPDATA ?? '', 'Godot', 'export_templates', '4.7.stable');
if (!process.env.APPDATA) throw new Error('APPDATA is required on Windows.');
await mkdir(templateDir, { recursive: true });
const installed = [];

for (const entry of selected) {
  const header = await range(entry.localOffset, entry.localOffset + 29);
  if (header.readUInt32LE(0) !== 0x04034b50) throw new Error(`Bad local header: ${entry.name}`);
  const nameLength = header.readUInt16LE(26);
  const extraLength = header.readUInt16LE(28);
  const dataOffset = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = await range(dataOffset, dataOffset + entry.compressedSize - 1);
  const output = entry.method === 0
    ? compressed
    : entry.method === 8
      ? inflateRawSync(compressed)
      : null;
  if (!output) throw new Error(`Unsupported ZIP method ${entry.method}: ${entry.name}`);
  if (output.length !== entry.uncompressedSize) {
    throw new Error(`Size mismatch for ${entry.name}: ${output.length}/${entry.uncompressedSize}`);
  }
  const outputName = basename(entry.name);
  await writeFile(join(templateDir, outputName), output);
  installed.push({
    sourceEntry: entry.name,
    output: join(templateDir, outputName),
    bytes: output.length,
  });
}

const report = {
  schemaVersion: 1,
  source: SOURCE,
  officialArchiveBytes: totalSize,
  downloadedCompressedBytes: selected.reduce((sum, entry) => sum + entry.compressedSize, 0),
  requestedPlatform,
  templateDir,
  installed,
};
const reportPath = join(process.cwd(), 'workspaces', 'orbes-d-astra', '04_runtime', 'godot', 'template-install-report.json');
await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
