#!/usr/bin/env node
/** Alias historique : tous les builds Veloria passent désormais par le flagship HD. */
import { buildVeloriaHd } from './build-veloria-hd.mjs';

buildVeloriaHd().catch((error) => {
  console.error('ÉCHEC build Veloria:', error);
  process.exitCode = 1;
});
