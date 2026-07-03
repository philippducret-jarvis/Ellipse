/** Génère un WAV mono 8-bit minimal (beeps procéduraux, sans lib externe). */
export function generateToneWav(options: {
  frequencyHz?: number;
  durationMs?: number;
  sampleRate?: number;
  volume?: number;
}): Buffer {
  const sampleRate = options.sampleRate ?? 22050;
  const durationMs = options.durationMs ?? 120;
  const frequencyHz = options.frequencyHz ?? 440;
  const volume = options.volume ?? 0.35;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, (numSamples - i) / (sampleRate * 0.05));
    const sample = Math.sin(2 * Math.PI * frequencyHz * t) * 127 * volume * envelope + 128;
    buffer.writeUInt8(Math.max(0, Math.min(255, Math.round(sample))), 44 + i);
  }

  return buffer;
}

export const SFX_PRESETS: Record<string, { frequencyHz: number; durationMs: number }> = {
  jump: { frequencyHz: 520, durationMs: 90 },
  collect: { frequencyHz: 880, durationMs: 110 },
  hit: { frequencyHz: 180, durationMs: 140 },
  footstep: { frequencyHz: 260, durationMs: 40 },
};

export function generateSfxWav(event: string): Uint8Array {
  const preset = SFX_PRESETS[event] ?? { frequencyHz: 440, durationMs: 100 };
  return new Uint8Array(generateToneWav(preset));
}

export function generateMusicLoopWav(durationMs = 2000): Uint8Array {
  const sampleRate = 22050;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const notes = [262, 330, 392, 523];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = Math.floor(t * 2) % notes.length;
    const freq = notes[noteIdx]!;
    const sample = Math.sin(2 * Math.PI * freq * t) * 60 + 128;
    buffer.writeUInt8(Math.max(0, Math.min(255, Math.round(sample))), 44 + i);
  }

  return new Uint8Array(buffer);
}
