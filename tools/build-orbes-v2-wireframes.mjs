#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const preproduction = join(root, 'workspaces', 'orbes-d-astra', '01_preproduction');
const manifestsDir = join(preproduction, 'manifests');
const outputDir = join(preproduction, 'mockups', 'wireframes');
const screensPath = join(manifestsDir, 'ui-screens.json');

const screenDefinitions = {
  title: ['OR﻿BES D’ASTRA', 'Reprendre ou commencer sans masquer les options légales', 'CONTINUER', ['Nouvelle partie', 'Compte', 'Accessibilité']],
  onboarding: ['ÉVEIL DE L’ASTRAL', 'Apprendre déplacer, fusionner puis déclencher une compétence', 'ESSAYER', ['Étape 2/3', 'Démonstration interactive', 'Passer']],
  hub_pc: ['OBSERVATOIRE ASTRA', 'Choisir sa prochaine intention en moins de dix secondes', 'PARTIR EN MISSION', ['Escouade', 'Sanctuaire', 'Activités']],
  hub_mobile: ['OBSERVATOIRE', 'Hub vertical centré sur le Gardien actif', 'MISSION', ['Roster', 'Invocation', 'Menu']],
  world_map: ['CARTE DES FAILLES', 'Comparer régions, difficulté et récompenses avant l’engagement', 'OUVRIR LE PORT NOYÉ', ['Port noyé 8/30', 'Forge 0/30', 'Nuit verrouillée']],
  mission_brief: ['LÉVIATHAN — MARÉE I', 'Préparer équipe, réactions et conditions d’étoiles', 'COMBATTRE', ['Puissance 12 400', 'Objectifs', 'Butin']],
  combat_pc: ['COMBAT — PC', 'Fusion physique, boss lisible et trois Gardiens présents', 'SURPUISSANCE', ['Boss 68 %', 'Combo ×7', 'Rupture 42 %']],
  combat_mobile: ['COMBAT — MOBILE', 'Même profondeur tactique avec actions accessibles aux pouces', 'ULTIME', ['Boss 68 %', 'Prochaine Orbe', 'Changer']],
  boss_phase_3: ['LÉVIATHAN — PHASE III', 'Télégraphier la vague totale et son contre-jeu', 'BRISER LE CŒUR', ['Vague dans 4,2 s', 'Bouclier abyssal', 'Zone sûre']],
  guardian_switch: ['RELÈVE DE GARDIEN', 'Prévisualiser bonus, temps de recharge et position d’arrivée', 'PASSER À MIRA', ['Mira prête', 'Brann 6 s', 'Aster prête']],
  ultimate: ['ULTIME — MARÉE ZÉNITH', 'Ciné courte, skippable et immédiatement compréhensible', 'LIBÉRER', ['Dégâts ×3,2', 'Invulnérable 1,1 s', 'Passer']],
  overdrive: ['SURPUISSANCE D’ESCQUADE', 'Transformer deux jauges pleines en moment tactique spectaculaire', 'CONSTELLATION ABSOLUE', ['Synergie 100 %', 'Rupture garantie', 'Temps ralenti']],
  victory: ['VICTOIRE', 'Expliquer performance, progression et prochain choix', 'CONTINUER', ['3 étoiles', 'Record 02:41', 'Butin ×8']],
  defeat: ['ÉCHEC — ANALYSE', 'Donner une piste d’amélioration sans vendre une solution', 'RÉESSAYER', ['Cause : débordement', 'Conseil élémentaire', 'Changer équipe']],
  roster: ['CONSTELLATION DES GARDIENS', 'Filtrer 24 adultes et comparer rôles sans friction', 'VOIR LE GARDIEN', ['24/24', 'Filtre : Eau', 'Tri : synergie']],
  guardian_detail: ['MIRA — ORACLE DES MARÉES', 'Modèle 3D rotatif, statistiques, histoire et voix', 'ESSAYER', ['Niveau 60', 'Affinité 7', 'Tenues 3/4']],
  equipment: ['ÉQUIPEMENT ASTRAL', 'Comparer clairement gain, perte et coût de renforcement', 'ÉQUIPER', ['Astrolabe +12', '+8,4 % rupture', 'Set 2/4']],
  wardrobe: ['GARDE-ROBE CÉLESTE', 'Prévisualiser chaque tenue et ses matières sous trois éclairages', 'PORTER', ['Combat', 'Éveil', 'Soirée céleste']],
  bond: ['LIEN — MIRA', 'Développer relation et personnalité sans achat conditionnant l’intimité', 'SCÈNE SUIVANTE', ['Niveau 7/10', 'Souvenir obtenu', 'Choix de dialogue']],
  summon_single: ['INVOCATION SIMPLE', 'Afficher prix, taux et pity avant toute confirmation', 'INVOQUER ×1', ['160 éclats', 'Pity 34/80', 'Taux 5★ : 0,8 %']],
  summon_ten: ['INVOCATION ×10', 'Présenter garantie, coût total et option de révélation rapide', 'INVOQUER ×10', ['1 600 éclats', '4★ garanti', 'Historique']],
  shop: ['BOUTIQUE', 'Séparer achats directs, monnaie et offres sans urgence artificielle', 'VOIR LE DÉTAIL', ['Tenues directes', 'Packs', 'Monnaie']],
  rates_history: ['TAUX ET HISTORIQUE', 'Rendre règles, tirages passés et pity auditables', 'FERMER', ['5★ 0,8 %', 'Soft pity 65', 'Garantie 80']],
  rift: ['FAILLE ROGUELITE', 'Choisir risque, route et bénédiction entre chaque combat', 'ENTRER', ['Profondeur 4/12', 'Corruption 28 %', '3 reliques']],
  rhythm_game: ['DANSE DES CONSTELLATIONS', 'Lire quatre pistes, duo adulte animé et fenêtre de timing', 'LANCER LE DUO', ['BPM 128', 'Record S', 'Assistances']],
  astral_hunt: ['CHASSE ASTRALE', 'Viser des cibles 3D, gérer combo et priorités de vague', 'DÉMARRER', ['3 vagues', '90 secondes', 'Multiplicateur ×1']],
  outfit_workshop: ['ATELIER DES TENUES', 'Assembler patrons hexagonaux avec objectif et aperçu 3D', 'COUDRE', ['12 pièces', 'Bonus harmonie', 'Aucun hasard payant']],
  settings: ['PARAMÈTRES', 'Regrouper contrôle, audio, vidéo, compte et confidentialité', 'APPLIQUER', ['Graphismes', 'Audio', 'Commandes']],
  accessibility: ['ACCESSIBILITÉ', 'Rendre texte, couleurs, mouvement, audio et saisie configurables', 'TESTER', ['Taille 130 %', 'Réduction mouvement', 'Contraste élevé']],
  download_content: ['CONTENU ADDITIONNEL', 'Indiquer taille, réseau, espace et possibilité de reporter', 'TÉLÉCHARGER 1,8 GO', ['Wi-Fi recommandé', '4,2 Go libres', 'Jouer au prologue']],
  network_error: ['CONNEXION INTERROMPUE', 'Préserver la partie et proposer une reprise explicite', 'RÉESSAYER', ['Progression sauvegardée', 'Mode hors ligne', 'Code ASTRA-204']],
};

const artScreens = new Set([
  'title', 'hub_pc', 'hub_mobile', 'world_map', 'mission_brief', 'combat_pc',
  'combat_mobile', 'boss_phase_3', 'guardian_switch', 'ultimate', 'overdrive',
  'guardian_detail', 'wardrobe', 'bond', 'summon_single', 'summon_ten',
  'rift', 'rhythm_game', 'astral_hunt', 'outfit_workshop',
]);

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeFileName(value) {
  return value.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
}

function text(x, y, value, size, color = '#fff4dc', weight = 500, anchor = 'start') {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Inter,Segoe UI,sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

function fauxCharacter(cx, bottom, scale = 1, accent = '#67e8f9') {
  const headY = bottom - 300 * scale;
  return `
    <g opacity=".94">
      <ellipse cx="${cx}" cy="${bottom + 10}" rx="${95 * scale}" ry="${22 * scale}" fill="#050711" opacity=".7"/>
      <circle cx="${cx}" cy="${headY}" r="${42 * scale}" fill="#d7a98d"/>
      <path d="M ${cx - 45 * scale} ${headY - 8 * scale} Q ${cx} ${headY - 75 * scale} ${cx + 55 * scale} ${headY + 4 * scale} Q ${cx + 20 * scale} ${headY - 24 * scale} ${cx - 45 * scale} ${headY - 8 * scale}" fill="#20243b"/>
      <path d="M ${cx - 58 * scale} ${headY + 52 * scale} Q ${cx} ${headY + 20 * scale} ${cx + 62 * scale} ${headY + 52 * scale} L ${cx + 85 * scale} ${bottom - 55 * scale} Q ${cx} ${bottom - 15 * scale} ${cx - 82 * scale} ${bottom - 55 * scale} Z" fill="#181d35" stroke="${accent}" stroke-width="${3 * scale}"/>
      <path d="M ${cx - 51 * scale} ${headY + 58 * scale} L ${cx - 105 * scale} ${bottom - 110 * scale}" stroke="#d7a98d" stroke-width="${25 * scale}" stroke-linecap="round"/>
      <path d="M ${cx + 53 * scale} ${headY + 58 * scale} L ${cx + 112 * scale} ${bottom - 128 * scale}" stroke="#d7a98d" stroke-width="${25 * scale}" stroke-linecap="round"/>
      <path d="M ${cx - 36 * scale} ${bottom - 70 * scale} L ${cx - 50 * scale} ${bottom}" stroke="#111529" stroke-width="${34 * scale}" stroke-linecap="round"/>
      <path d="M ${cx + 36 * scale} ${bottom - 70 * scale} L ${cx + 50 * scale} ${bottom}" stroke="#111529" stroke-width="${34 * scale}" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${headY + 125 * scale}" r="${17 * scale}" fill="${accent}" filter="url(#glow)"/>
    </g>`;
}

function board(x, y, width, height, mobile) {
  const columns = mobile ? 5 : 7;
  const rows = mobile ? 7 : 5;
  const gap = 10;
  const radius = Math.min((width - gap * (columns + 1)) / columns, (height - gap * (rows + 1)) / rows) / 2;
  const colors = ['#67e8f9', '#a78bfa', '#f6c768', '#f472b6'];
  const balls = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      if ((row * 3 + col) % 5 === 0 && row < 2) continue;
      const cx = x + gap + radius + col * (radius * 2 + gap);
      const cy = y + height - gap - radius - row * (radius * 2 + gap);
      const color = colors[(row + col * 2) % colors.length];
      balls.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" opacity=".85" stroke="#fff4dc" stroke-opacity=".45"/>`);
      balls.push(`<circle cx="${cx - radius * .28}" cy="${cy - radius * .3}" r="${radius * .18}" fill="#fff" opacity=".5"/>`);
    }
  }
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="26" fill="#080c1b" stroke="#67e8f9" stroke-opacity=".5" stroke-width="3"/>${balls.join('')}</g>`;
}

function makeSvg(screen, variant) {
  const mobile = variant === 'mobile';
  const accessible = variant === 'accessible';
  const width = mobile ? 900 : 1600;
  const height = mobile ? 1600 : 900;
  const [titleLabel, purpose, primary, modules] = screenDefinitions[screen.id];
  const margin = mobile ? 54 : 70;
  const top = mobile ? 110 : 78;
  const navWidth = mobile ? 0 : 300;
  const stageX = margin + navWidth + (mobile ? 0 : 24);
  const stageY = mobile ? 280 : 150;
  const stageW = width - stageX - margin;
  const stageH = mobile ? 990 : 610;
  const accent = accessible ? '#ffe066' : '#67e8f9';
  const secondary = accessible ? '#ffffff' : '#a9a4b8';
  const bg = accessible ? '#000000' : '#050711';
  const surface = accessible ? '#111111' : '#111529';
  const large = accessible ? 1.16 : 1;
  const containsCombat = screen.id.includes('combat') || ['boss_phase_3', 'guardian_switch', 'ultimate', 'overdrive'].includes(screen.id);
  const containsCards = ['roster', 'equipment', 'wardrobe', 'shop', 'rates_history', 'rift', 'outfit_workshop'].includes(screen.id);
  const containsResults = ['victory', 'defeat', 'download_content', 'network_error', 'settings', 'accessibility'].includes(screen.id);

  let stage = '';
  if (containsCombat) {
    const boardW = mobile ? stageW - 80 : 440;
    const boardH = mobile ? 660 : 500;
    const boardX = mobile ? stageX + 40 : stageX + stageW / 2 - boardW / 2;
    const boardY = mobile ? stageY + 230 : stageY + 80;
    stage = `
      <path d="M ${stageX + 60} ${stageY + 190} Q ${stageX + stageW / 2} ${stageY - 90} ${stageX + stageW - 60} ${stageY + 190}" fill="#111b3d" stroke="#f472b6" stroke-opacity=".5"/>
      <ellipse cx="${stageX + stageW / 2}" cy="${stageY + 92}" rx="${mobile ? 150 : 190}" ry="${mobile ? 72 : 84}" fill="#42163d" stroke="#fb7185" stroke-width="4"/>
      ${text(stageX + stageW / 2, stageY + 100, 'BOSS 68 %  •  RUPTURE 42 %', mobile ? 26 : 24, '#fff4dc', 800, 'middle')}
      ${board(boardX, boardY, boardW, boardH, mobile)}
      ${mobile ? '' : fauxCharacter(stageX + 150, stageY + stageH - 20, .72, '#f6c768')}
      ${mobile ? '' : fauxCharacter(stageX + stageW - 150, stageY + stageH - 20, .72, '#a78bfa')}
      <rect x="${stageX + 30}" y="${stageY + stageH - 74}" width="${stageW - 60}" height="54" rx="27" fill="#211936" stroke="${accent}"/>
      <rect x="${stageX + 32}" y="${stageY + stageH - 72}" width="${(stageW - 64) * .74}" height="50" rx="25" fill="url(#gauge)"/>`;
  } else if (artScreens.has(screen.id)) {
    stage = `
      <circle cx="${stageX + stageW * .7}" cy="${stageY + stageH * .38}" r="${mobile ? 250 : 310}" fill="url(#portal)" opacity=".8"/>
      <path d="M ${stageX + 30} ${stageY + stageH - 100} Q ${stageX + stageW / 2} ${stageY + stageH - 220} ${stageX + stageW - 30} ${stageY + stageH - 90} L ${stageX + stageW - 30} ${stageY + stageH} L ${stageX + 30} ${stageY + stageH} Z" fill="#151b32"/>
      ${fauxCharacter(stageX + stageW * .68, stageY + stageH - 45, mobile ? 1.38 : 1.15, accent)}
      <rect x="${stageX + 38}" y="${stageY + 44}" width="${mobile ? stageW - 76 : 360}" height="${mobile ? 210 : 230}" rx="24" fill="${surface}" fill-opacity=".9" stroke="${accent}" stroke-opacity=".6"/>
      ${text(stageX + 72, stageY + 98, 'MODÈLE 3D / LIEU', mobile ? 28 : 22, accent, 800)}
      ${text(stageX + 72, stageY + 145, screen.id.toUpperCase().replaceAll('_', ' '), mobile ? 34 : 28, '#fff4dc', 700)}
      ${text(stageX + 72, stageY + 195, 'Caméra, lumière et animation', mobile ? 25 : 20, secondary)}`;
  } else if (containsCards) {
    const cols = mobile ? 2 : 3;
    const cardGap = mobile ? 22 : 28;
    const cardW = (stageW - cardGap * (cols + 1)) / cols;
    const cardH = mobile ? 250 : 210;
    const cards = [];
    for (let i = 0; i < cols * 2; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = stageX + cardGap + col * (cardW + cardGap);
      const y = stageY + 60 + row * (cardH + cardGap);
      cards.push(`<rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="22" fill="${surface}" stroke="${i === 0 ? accent : '#3a405d'}" stroke-width="${i === 0 ? 4 : 2}"/>`);
      cards.push(`<circle cx="${x + cardW / 2}" cy="${y + 82}" r="52" fill="${['#1c7690', '#5b3e91', '#9b6432'][i % 3]}"/>`);
      cards.push(text(x + 24, y + 165, `OPTION ${i + 1}`, mobile ? 24 : 20, '#fff4dc', 700));
      cards.push(text(x + 24, y + 200, i === 0 ? 'Sélectionnée' : 'Comparer', mobile ? 21 : 17, secondary));
    }
    stage = cards.join('');
  } else if (containsResults) {
    stage = `
      <circle cx="${stageX + stageW / 2}" cy="${stageY + 190}" r="${mobile ? 145 : 125}" fill="none" stroke="${accent}" stroke-width="18" stroke-dasharray="510 160"/>
      ${text(stageX + stageW / 2, stageY + 208, screen.id === 'victory' ? 'S' : '!', mobile ? 96 : 78, '#fff4dc', 900, 'middle')}
      <rect x="${stageX + 60}" y="${stageY + 360}" width="${stageW - 120}" height="${mobile ? 430 : 210}" rx="30" fill="${surface}" stroke="#3a405d"/>
      ${modules.map((module, index) => text(stageX + 105, stageY + 430 + index * (mobile ? 92 : 54), `◆  ${module}`, mobile ? 32 : 25, index === 0 ? accent : '#fff4dc', index === 0 ? 800 : 500)).join('')}`;
  } else {
    stage = `
      <path d="M ${stageX + 40} ${stageY + stageH - 70} C ${stageX + 220} ${stageY + 80}, ${stageX + stageW - 220} ${stageY + 80}, ${stageX + stageW - 40} ${stageY + stageH - 70}" fill="none" stroke="${accent}" stroke-width="4" stroke-dasharray="12 14"/>
      ${[0, 1, 2].map((i) => {
        const x = stageX + 120 + i * ((stageW - 240) / 2);
        const y = stageY + stageH / 2 + (i % 2 ? -120 : 80);
        return `<circle cx="${x}" cy="${y}" r="${mobile ? 70 : 62}" fill="${surface}" stroke="${i === 1 ? '#f6c768' : accent}" stroke-width="5"/>${text(x, y + 9, String(i + 1), mobile ? 34 : 28, '#fff4dc', 800, 'middle')}`;
      }).join('')}`;
  }

  const moduleY = mobile ? height - 250 : 730;
  const buttonY = mobile ? height - 145 : 792;
  const buttonW = mobile ? width - margin * 2 : 380;
  const buttonX = mobile ? margin : width - margin - buttonW;
  const nav = mobile ? '' : `
    <rect x="${margin}" y="${stageY}" width="${navWidth}" height="${stageH}" rx="26" fill="${surface}" stroke="#292f49"/>
    ${modules.map((module, index) => `
      <rect x="${margin + 24}" y="${stageY + 38 + index * 98}" width="${navWidth - 48}" height="70" rx="16" fill="${index === 0 ? '#1b3144' : '#0b0e1a'}" stroke="${index === 0 ? accent : '#292f49'}"/>
      ${text(margin + 47, stageY + 82 + index * 98, module, 20 * large, index === 0 ? '#fff4dc' : secondary, index === 0 ? 700 : 500)}
    `).join('')}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="portal"><stop offset="0" stop-color="#67e8f9" stop-opacity=".7"/><stop offset=".48" stop-color="#6d28d9" stop-opacity=".45"/><stop offset="1" stop-color="#050711" stop-opacity="0"/></radialGradient>
    <linearGradient id="gauge"><stop stop-color="#67e8f9"/><stop offset=".55" stop-color="#a78bfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="${bg}"/>
  <circle cx="${width * .78}" cy="${height * .16}" r="${mobile ? 370 : 430}" fill="#111c3c" opacity=".45"/>
  ${text(margin, top, titleLabel, (mobile ? 48 : 39) * large, '#fff4dc', 850)}
  ${text(margin, top + (mobile ? 55 : 42), purpose, (mobile ? 25 : 20) * large, secondary, 450)}
  ${text(width - margin, top, `${variant.toUpperCase()} • UX DRAFT`, mobile ? 22 : 18, accent, 800, 'end')}
  ${nav}
  <rect x="${stageX}" y="${stageY}" width="${stageW}" height="${stageH}" rx="30" fill="#090d1c" stroke="#252c47" stroke-width="2"/>
  ${stage}
  ${mobile ? modules.map((module, index) => {
    const chipW = (width - margin * 2 - 24) / 3;
    const x = margin + index * (chipW + 12);
    return `<rect x="${x}" y="${moduleY}" width="${chipW}" height="68" rx="20" fill="${surface}" stroke="${index === 0 ? accent : '#343a57'}"/>${text(x + chipW / 2, moduleY + 43, module, 18 * large, '#fff4dc', 650, 'middle')}`;
  }).join('') : ''}
  <rect x="${buttonX}" y="${buttonY}" width="${buttonW}" height="${mobile ? 82 : 62}" rx="${mobile ? 28 : 22}" fill="${accessible ? '#ffe066' : '#5f42a8'}" stroke="${accent}" stroke-width="3"/>
  ${text(buttonX + buttonW / 2, buttonY + (mobile ? 53 : 40), primary, (mobile ? 26 : 21) * large, accessible ? '#000' : '#fff4dc', 850, 'middle')}
  ${text(margin, height - 24, 'MAQUETTE UX — COMPOSITION ET HIÉRARCHIE, PAS UN ASSET FINAL', mobile ? 16 : 15, secondary, 600)}
</svg>`;
}

const uiManifest = JSON.parse(await readFile(screensPath, 'utf8'));
await mkdir(outputDir, { recursive: true });
const generated = [];

for (const screen of uiManifest.screens) {
  if (!screenDefinitions[screen.id]) throw new Error(`Missing screen definition: ${screen.id}`);
  for (const variant of ['pc', 'mobile', 'accessible']) {
    const fileName = `${safeFileName(screen.id)}--${variant}.svg`;
    await writeFile(join(outputDir, fileName), makeSvg(screen, variant), 'utf8');
    generated.push({
      screen: screen.id,
      variant,
      file: `mockups/wireframes/${fileName}`,
      width: variant === 'mobile' ? 900 : 1600,
      height: variant === 'mobile' ? 1600 : 900,
      status: 'draft',
    });
  }
  screen.pc = 'draft';
  screen.mobile = 'draft';
  screen.accessibleVariant = 'draft';
}

const cards = generated
  .map((entry) => `<article><a href="${entry.file.split('/').at(-1)}"><img src="${entry.file.split('/').at(-1)}" alt="${escapeXml(entry.screen)} ${entry.variant}"></a><strong>${escapeXml(entry.screen)}</strong><span>${entry.variant} — ${entry.width}×${entry.height}</span></article>`)
  .join('\n');

const gallery = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Orbes d’Astra V2 — 93 maquettes UX</title>
<style>
body{margin:0;background:#050711;color:#fff4dc;font:16px Inter,Segoe UI,sans-serif}header{padding:40px 5vw;border-bottom:1px solid #292f49}
h1{margin:0 0 10px;font:700 clamp(28px,4vw,54px) Georgia,serif}p{color:#a9a4b8;max-width:900px}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:24px;padding:32px 5vw 80px}
article{display:grid;gap:8px;background:#111529;border:1px solid #292f49;border-radius:18px;padding:12px}a{height:230px;display:grid;place-items:center;background:#080b16;border-radius:12px;overflow:hidden}
img{width:100%;height:100%;object-fit:contain}strong{font-size:18px}span{color:#67e8f9;font-size:14px}
</style></head><body><header><h1>Orbes d’Astra V2</h1><p>31 écrans × PC, mobile et variante accessible = 93 maquettes UX. Ces SVG valident composition, hiérarchie, flux et zones tactiles ; les six PNG de direction fixent la cible artistique.</p></header><main>${cards}</main></body></html>`;

await Promise.all([
  writeFile(screensPath, JSON.stringify(uiManifest, null, 2), 'utf8'),
  writeFile(join(manifestsDir, 'ui-mockup-manifest.json'), JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'ux_drafts_complete_art_approval_pending',
    screenCount: uiManifest.screens.length,
    variantCount: generated.length,
    generated,
  }, null, 2), 'utf8'),
  writeFile(join(outputDir, 'index.html'), gallery, 'utf8'),
]);

console.log(JSON.stringify({
  ok: true,
  screens: uiManifest.screens.length,
  variants: generated.length,
  gallery: join(outputDir, 'index.html'),
}, null, 2));
