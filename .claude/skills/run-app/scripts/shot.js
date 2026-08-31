#!/usr/bin/env node
/**
 * Captura una pantalla del admin, ya autenticado.
 *
 *   node shot.js /admin/clients                    escritorio + móvil
 *   node shot.js /admin/clients --only=desktop     sólo una
 *   node shot.js /admin/clients --out=/tmp/x       prefijo de salida
 *
 * El login se salta poniendo la cookie a mano. El middleware sólo mira que
 * exista `access_token`, así que pedirle el token a la API y plantarlo en el
 * navegador ahorra rellenar el formulario en cada captura — y de paso evita que
 * un cambio en la pantalla de login rompa capturas que no van de eso.
 *
 * Imprime los errores de consola de la página: una captura que "se ve bien"
 * pero llena de errores en rojo casi siempre significa que los datos no
 * cargaron y estás mirando el estado vacío.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API = process.env.API_URL || 'http://127.0.0.1:8010';
const WEB = process.env.WEB_URL || 'http://127.0.0.1:3010';
const USER = process.env.ADMIN_USER || 'admin@local.test';
const PASS = process.env.ADMIN_PASSWORD || 'Admin12345';

const route = process.argv[2] || '/admin/clients';
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};
const only = arg('only', 'both');
const out = arg('out', '/tmp/shot');

// playwright-core no está en el proyecto (el repo no usa Playwright), así que se
// instala aparte y se apunta al Chromium que ya trae el contenedor. Descargar
// otro sería lento y suele estar bloqueado.
function loadPlaywright() {
  const candidates = [
    () => require('playwright-core'),
    () => require('/tmp/pw/node_modules/playwright-core'),
  ];
  for (const load of candidates) {
    try { return load(); } catch { /* siguiente */ }
  }
  console.log('instalando playwright-core en /tmp/pw…');
  fs.mkdirSync('/tmp/pw', { recursive: true });
  // Sin un package.json propio, npm sube buscando uno y acaba instalando en el
  // directorio padre — y entonces el require de aquí abajo no encuentra nada.
  fs.writeFileSync('/tmp/pw/package.json', '{"name":"pw-shots","private":true}\n');
  execSync('npm install -s playwright-core', {
    cwd: '/tmp/pw',
    env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
    stdio: 'inherit',
  });
  return require('/tmp/pw/node_modules/playwright-core');
}

function chromiumPath() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const dir = fs.readdirSync(root).find((d) => d.startsWith('chromium-'));
  if (!dir) throw new Error(`no encuentro chromium en ${root}`);
  return path.join(root, dir, 'chrome-linux', 'chrome');
}

async function token() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Ojo: el campo es `username_or_email`, no `email`.
    body: JSON.stringify({ username_or_email: USER, password: PASS }),
  });
  const body = await res.json();
  if (!body.access_token) throw new Error(`login falló: ${JSON.stringify(body).slice(0, 200)}`);
  return body.access_token;
}

(async () => {
  const { chromium } = loadPlaywright();
  const access = await token();
  const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await ctx.addCookies([{ name: 'access_token', value: access, domain: '127.0.0.1', path: '/' }]);

  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`${WEB}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  const made = [];
  if (only !== 'mobile') {
    await page.screenshot({ path: `${out}-desktop.png` });
    made.push(`${out}-desktop.png`);
  }
  if (only !== 'desktop') {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}-mobile.png` });
    made.push(`${out}-mobile.png`);
  }

  console.log('url:', page.url());
  console.log('capturas:', made.join(', '));
  console.log('texto:', (await page.locator('body').innerText()).slice(0, 300).replace(/\n+/g, ' | '));
  console.log('errores de consola:', errors.length ? errors.slice(0, 5) : 'ninguno');
  await browser.close();
})().catch((e) => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
