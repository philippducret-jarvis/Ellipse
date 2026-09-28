/**
 * ELLISPHERE — dialogue avec le studio en ligne de commande :
 *   pnpm forge:chat                      # REPL interactif
 *   pnpm forge:chat -- "ta question"     # un seul tour
 *
 * Vrai LLM (keyless par défaut), avec outils réels. Tape 'exit' pour quitter.
 */
import readline from 'node:readline';
import { ellisphereTurn } from './lib/forge/brain/agent.mjs';
import { pickBrain } from './lib/forge/brain/providers.mjs';

const oneShot = process.argv.slice(2).filter((a) => a !== '--').join(' ').trim();

const brain = await pickBrain();
if (!brain) {
  console.error('✗ Aucun cerveau conversationnel joignable (hors-ligne ?). Voies : Pollinations (keyless), Ollama local, ANTHROPIC_API_KEY.');
  process.exit(1);
}
console.log(`✦ Ellisphere en ligne (cerveau : ${brain.name}). ${oneShot ? '' : 'Écris ton message — « exit » pour quitter.'}\n`);

let history = [];

async function turn(input) {
  history.push({ role: 'user', content: input });
  process.stdout.write('… ');
  const t0 = Date.now();
  const { reply, actions, history: h } = await ellisphereTurn(history);
  history = h;
  process.stdout.write('\r');
  for (const a of actions) console.log(`   ⚙ ${a.tool}(${JSON.stringify(a.args)})`);
  console.log(`\n✦ ${reply}   \x1b[2m(${((Date.now() - t0) / 1000).toFixed(1)}s)\x1b[0m\n`);
}

if (oneShot) {
  await turn(oneShot);
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'toi › ' });
rl.prompt();
rl.on('line', async (line) => {
  const input = line.trim();
  if (!input) return rl.prompt();
  if (['exit', 'quit', 'q'].includes(input.toLowerCase())) { rl.close(); return; }
  try { await turn(input); } catch (e) { console.error(`✗ ${e.message}\n`); }
  rl.prompt();
});
rl.on('close', () => { console.log('À bientôt.'); process.exit(0); });
