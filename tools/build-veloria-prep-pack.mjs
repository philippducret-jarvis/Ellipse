import { buildVeloriaPrepPack } from './lib/veloria/index.mjs';

buildVeloriaPrepPack()
  .then((result) => {
    console.log('Veloria prep pack generated.');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error('Failed to build Veloria prep pack:', error);
    process.exit(1);
  });
