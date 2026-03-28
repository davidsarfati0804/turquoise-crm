// netlify-deploy-loop.js
// Automatisation du déploiement Netlify avec contrôle d'erreur et boucle
// Nécessite NETLIFY_AUTH_TOKEN et SITE_ID en variables d'environnement

const fetch = require('node-fetch');

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const SITE_ID = process.env.SITE_ID;
const MAX_ATTEMPTS = 10;
const WAIT_BETWEEN_CHECKS = 15000; // 15s

if (!AUTH_TOKEN || !SITE_ID) {
  console.error('NETLIFY_AUTH_TOKEN et SITE_ID doivent être définis dans .env.local');
  process.exit(1);
}

async function triggerBuild() {
  const res = await fetch(`${NETLIFY_API}/sites/${SITE_ID}/builds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  if (!res.ok) throw new Error('Erreur lors du déclenchement du build Netlify');
  const data = await res.json();
  return data.id;
}

async function getBuildStatus(buildId) {
  const res = await fetch(`${NETLIFY_API}/sites/${SITE_ID}/builds/${buildId}`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  if (!res.ok) throw new Error('Erreur lors de la récupération du statut du build');
  return await res.json();
}

async function getBuildLog(buildId) {
  const res = await fetch(`${NETLIFY_API}/sites/${SITE_ID}/builds/${buildId}/log`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  if (!res.ok) return '';
  return await res.text();
}

function hasHtmlError(log) {
  return log.includes('<Html> should not be imported outside of pages/_document');
}

async function main() {
  let attempt = 1;
  while (attempt <= MAX_ATTEMPTS) {
    console.log(`\n--- Tentative #${attempt} de déploiement Netlify ---`);
    const buildId = await triggerBuild();
    let status = 'building';
    while (status === 'building' || status === 'enqueued') {
      await new Promise(r => setTimeout(r, WAIT_BETWEEN_CHECKS));
      const build = await getBuildStatus(buildId);
      status = build.state;
      process.stdout.write('.');
    }
    console.log(`\nBuild terminé avec le statut: ${status}`);
    if (status === 'error') {
      const log = await getBuildLog(buildId);
      if (hasHtmlError(log)) {
        console.error('Erreur <Html> détectée. Corrigez le code avant de relancer.');
        process.exit(2);
      } else {
        console.warn('Erreur de build, relance automatique...');
        attempt++;
        continue;
      }
    } else if (status === 'ready') {
      console.log('Déploiement Netlify réussi !');
      process.exit(0);
    }
    attempt++;
  }
  console.error('Nombre maximum de tentatives atteint.');
  process.exit(3);
}

main().catch(e => { console.error(e); process.exit(10); });
