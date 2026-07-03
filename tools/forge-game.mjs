/**
 * FORGE — un prompt → un vrai jeu HD 2D/2,5D généré, jouable, validé.
 *
 *   pnpm forge:game -- --prompt "une chevalière dans une citadelle gothique maudite"
 *   pnpm forge:game -- --prompt "..." --serve     # sert le jeu après build
 *
 * Chaîne : design (GDD→GDL) → assets GÉNÉRÉS (identité verrouillée, QA CPU,
 * rig squelettal, décors parallax par couche) → runtime générique → auto-play.
 * Sans GPU : backend Pollinations (keyless). Avec ComfyUI local : bascule auto.
 */
import { buildGame } from './lib/forge/build.mjs';

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return null;
  return args[i].includes('=') ? args[i].split('=').slice(1).join('=') : args[i + 1];
};

const prompt = getArg('prompt') ?? args.filter((a) => !a.startsWith('--')).join(' ');
const id = getArg('id'); // forcer le workspace cible (ex. slug projet orchestrateur)
if (!prompt || prompt.length < 8) {
  console.error('Usage : pnpm forge:game -- --prompt "décris ton jeu (univers, héros, ambiance)" [--id slug-projet]');
  process.exit(1);
}

const t0 = Date.now();
buildGame(prompt, { id })
  .then(async ({ report, runtimeDir, workspace }) => {
    console.log(`\n✔ « ${report.title} » forgé en ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    console.log(`  Jeu     : ${runtimeDir}\\index.html`);
    console.log(`  Rapport : ${workspace}\\forge-build.json`);
    if (args.includes('--serve')) {
      process.env.FORGE_SERVE_GAME = report.id;
      await import('./serve-forge.mjs');
    } else {
      console.log(`  Jouer   : pnpm forge:serve -- ${report.id}`);
    }
  })
  .catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
