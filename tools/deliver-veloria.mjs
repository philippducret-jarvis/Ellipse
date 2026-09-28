#!/usr/bin/env node
/** Livraison Veloria : build flagship reel + gate statique bloquant. */
import { buildVeloriaHd } from './build-veloria-hd.mjs';

async function main() {
  const { deliveryManifest } = await buildVeloriaHd();
  console.log(
    `Veloria livree : ${deliveryManifest.deliverable.status} - gate ${deliveryManifest.deliverable.checks}`,
  );
}

main().catch((error) => {
  console.error('ECHEC livraison Veloria:', error);
  process.exitCode = 1;
});
