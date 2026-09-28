import {spawnSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadEnv} from '../packages/shared/dist/load-env.js';
import {getPool,getDatabaseUrl,closePool} from '../packages/db/dist/client.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const container='postgres-ellisphere';
const volume='ellipse-postgres-data';

export function isManagedDatabase(raw) {
  const url=new URL(raw);
  return ['localhost','127.0.0.1','[::1]'].includes(url.hostname)
    && url.port==='5435' && url.pathname==='/ellisphere';
}
function docker(args) {
  const result=spawnSync('docker',args,{cwd:root,windowsHide:true,encoding:'utf8',timeout:30000});
  if(result.error) throw new Error('Docker est indisponible. Ouvrez Docker Desktop puis relancez Ellipse.');
  return result;
}
async function probe() {
  try {await getPool().query('SELECT 1');return {ok:true};}
  catch(error) {return {ok:false,code:error.code ?? error.errors?.[0]?.code ?? 'CONNECTION_ERROR'};}
}
export async function ensureDatabase() {
  loadEnv();
  const first=await probe();
  if(first.ok) {console.log('• PostgreSQL : connexion vérifiée');return;}
  if(!isManagedDatabase(getDatabaseUrl())) throw new Error(`La BDD configurée ne répond pas (${first.code}). Aucune modification de cette instance non gérée.`);
  const engine=docker(['info','--format','{{.ServerVersion}}']);
  if(engine.status!==0) throw new Error('Docker ne répond pas. Ouvrez Docker Desktop puis relancez Ellipse.');
  const inspect=docker(['inspect','--type','container',container,'--format','{{json .}}']);
  if(inspect.status===0) {
    const data=JSON.parse(inspect.stdout);
    const managed=data.Mounts?.some(m=>m.Name===volume && m.Destination==='/var/lib/postgresql/data');
    if(!managed) throw new Error('Le conteneur postgres-ellisphere utilise un volume inconnu ; démarrage automatique annulé.');
    if(!data.State.Running) {
      console.log('• PostgreSQL : redémarrage du conteneur existant');
      if(docker(['start',container]).status!==0) throw new Error('Impossible de redémarrer PostgreSQL.');
    }
  } else {
    if(docker(['volume','inspect',volume]).status!==0) throw new Error('Volume Ellipse absent. Restaurer une sauvegarde ; aucune base vide créée.');
    console.log('• PostgreSQL : recréation du conteneur sur le volume conservé');
    if(docker(['compose','-f',join(root,'infra/compose/postgres-local.yml'),'up','-d']).status!==0) throw new Error('Impossible de recréer le conteneur PostgreSQL.');
  }
  const deadline=Date.now()+45000;
  do {
    const check=await probe();
    if(check.ok) {console.log('• PostgreSQL : connexion rétablie');return;}
    if(check.code==='28P01' || check.code==='3D000') throw new Error(`Configuration PostgreSQL à corriger (${check.code}). Identifiants et données laissés inchangés.`);
    await new Promise(resolve=>setTimeout(resolve,1000));
  } while(Date.now()<deadline);
  throw new Error('PostgreSQL ne répond pas après redémarrage ; consultez les journaux du conteneur.');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {await ensureDatabase();} catch(error) {console.error(error.message);process.exitCode=1;} finally {await closePool();}
}
