import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium} = await import('playwright').catch(() => import(new URL('../generated/browser-runtime/node_modules/playwright/index.mjs', import.meta.url).href));
const url = process.env.SHADOW_TRIAL_URL ?? 'http://localhost:4273/workspaces/shadow-echoes/07_exports/web/play.html';
const out = new URL('../tmp/shadow-echoes/', import.meta.url);
await mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true});
const errors = [], checks = [];
try {
  const page = await browser.newPage({viewport:{width:1440,height:1120}});
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);});
  await page.clock.install({time:new Date('2026-09-24T10:00:00Z')});
  await page.clock.pauseAt(new Date('2026-09-24T10:00:01Z'));
  await page.goto(url, {waitUntil:'networkidle'});
  assert.equal(await page.locator('#briefing').isVisible(), true);
  assert.equal(await page.locator('.member').count(), 4);
  await page.waitForFunction(() => [...document.querySelectorAll('.fighter img')].every(i => i.complete && i.naturalWidth > 0));
  await page.locator('#start').click();
  await page.locator('#auto').uncheck();
  await page.getByRole('button',{name:'Commander Nyxara',exact:true}).click();
  await page.clock.runFor(3200);
  assert.equal(await page.locator('#danger').isVisible(), true);
  await page.locator('.skill').nth(1).click();
  assert.equal(await page.locator('#danger').isVisible(), false);
  checks.push('Annonce ennemie et interruption de Nyxara via l’interface');
  await page.locator('#pause').click();
  const paused = await page.locator('#time').textContent();
  await page.clock.runFor(5000);
  assert.equal(await page.locator('#time').textContent(), paused);
  assert.equal(await page.locator('.skill').nth(0).isDisabled(), true);
  await page.getByRole('button',{name:'Commander Lysael',exact:true}).click();
  await page.locator('#resume').click();
  await page.locator('#auto').check();
  checks.push('Pause sans progression du temps, sélection tactique et reprise');
  let won = false;
  for (let step = 0; step < 240; step++) {
    if (await page.locator('#result').isVisible()) {
      const title = await page.locator('#result-title').textContent();
      if (title === 'Le serment est tenu.') {won = true; break;}
      assert.equal(title, 'La faille recule.', 'Une stratégie active doit gagner');
      await page.locator('#continue').click();
    }
    // Interact only through the real rendered controls; no simulation mutation or test cheat.
    await page.evaluate(() => {
      const members = [...document.querySelectorAll('.member')];
      for (const [i, member] of members.entries()) {
        member.click();
        const skills = document.querySelectorAll('.skill');
        const warning = !document.getElementById('danger').hidden;
        if (i !== 1 || warning) skills[1].click();
        skills[2].click();
      }
      if (!document.getElementById('danger').hidden) document.getElementById('guard').click();
    });
    await page.clock.runFor(500);
  }
  assert.ok(won, 'Victoire non atteinte');
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('shadow-echoes:trial:v1')));
  assert.equal(record.victories, 1);
  assert.ok(record.bestTime > 0); assert.ok(record.bestSurvivors > 0);
  await page.clock.runFor(5000);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('shadow-echoes:trial:v1')).victories), 1);
  await page.screenshot({path:fileURLToPath(new URL('trial-victory.png',out))});
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#saved-record').textContent(), /1 victoire/);
  checks.push('Trois phases gagnées, bilan sauvegardé une seule fois et restauré au rechargement');
  await page.locator('#start').click();
  await page.clock.runFor(3300);
  await page.screenshot({path:fileURLToPath(new URL('trial-desktop.png',out)),fullPage:true});
  await page.keyboard.press('p');
  assert.equal(await page.locator('#pause-banner').isVisible(), true);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#selected-name').textContent(), 'Nyxara');
  await page.keyboard.press('p');
  await page.keyboard.press('2');
  assert.equal(await page.locator('#danger').isVisible(), false);
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Débordement horizontal mobile');
  await page.screenshot({path:fileURLToPath(new URL('trial-mobile.png',out)),fullPage:true});
  checks.push('Raccourcis clavier, écran 1440 px, mobile 390 px et mouvements réduits');
  await page.evaluate(() => localStorage.setItem('shadow-echoes:trial:v1','invalid-json'));
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#saved-record').textContent(), /Première victoire/);
  checks.push('Sauvegarde invalide ignorée sans bloquer le jeu');
  await page.locator('#start').click();
  let lost = false;
  for (let i = 0; i < 30; i++) {
    await page.clock.runFor(5000);
    if (!(await page.locator('#result').isVisible())) continue;
    const title = await page.locator('#result-title').textContent();
    if (title === 'Une lumière s’éteint.') {lost = true; break;}
    assert.equal(title, 'La faille recule.');
    await page.locator('#continue').click();
  }
  assert.ok(lost, 'Sans décision tactique, cette épreuve doit rester un défi');
  assert.equal(await page.evaluate(() => localStorage.getItem('shadow-echoes:trial:v1')), 'invalid-json');
  await page.locator('#continue').click();
  assert.equal(await page.locator('#result').isVisible(), false);
  assert.equal(await page.locator('#phase-label').textContent(), 'ÉPREUVE · 1 / 3');
  checks.push('Défaite sans gestion tactique, aucune récompense et nouvelle tentative');
  assert.deepEqual(errors, []);
  await writeFile(new URL('trial-browser-report.json',out),JSON.stringify({passed:true,checks,record,errors},null,2));
  console.log(JSON.stringify({passed:true,checks,record,errors},null,2));
} finally {await browser.close();}
