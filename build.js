#!/usr/bin/env node
// ============================================================================
// build.js — Script de build para CHRONOS: La Guerra por la Memoria
// Uso: npm run build
// Genera: dist/bundle.min.js, dist/styles.min.css, dist/index.html
// ============================================================================

const { spawnSync } = require('child_process');
const fs = require('fs');

// Orden de carga de módulos (mismo orden que los <script defer> en index.html)
const JS_FILES = [
  'js/config.js',
  'js/hex.js',
  'js/map.js',
  'js/renderer.js',
  'js/resources.js',
  'js/buildings.js',
  'js/units.js',
  'js/tech.js',
  'js/ai.js',
  'js/events.js',
  'js/turns.js',
  'js/audio.js',
  'js/save.js',
  'js/ui.js',
  'js/game.js',
];

if (!fs.existsSync('dist')) fs.mkdirSync('dist');

// ── 1. Concatenar + minificar JS ──────────────────────────────────────────
console.log('⚙️  Minificando JS…');
const combined = JS_FILES.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const jsResult = spawnSync(
  'npx', ['esbuild', '--minify', '--loader=js', '--log-level=warning'],
  { input: combined, encoding: 'utf8' }
);

if (jsResult.status !== 0) {
  console.error('❌ Error minificando JS:\n', jsResult.stderr);
  process.exit(1);
}
fs.writeFileSync('dist/bundle.min.js', jsResult.stdout);
const jsSave = Math.round((1 - jsResult.stdout.length / combined.length) * 100);
console.log(`✅ dist/bundle.min.js (${(jsResult.stdout.length / 1024).toFixed(1)} KB, −${jsSave}%)`);

// ── 2. Minificar CSS ──────────────────────────────────────────────────────
console.log('⚙️  Minificando CSS…');
const cssResult = spawnSync(
  'npx', ['esbuild', 'css/styles.css', '--minify', '--log-level=warning'],
  { encoding: 'utf8' }
);

if (cssResult.status !== 0) {
  console.error('❌ Error minificando CSS:\n', cssResult.stderr);
  process.exit(1);
}
fs.writeFileSync('dist/styles.min.css', cssResult.stdout);
const cssOrig = fs.readFileSync('css/styles.css', 'utf8').length;
const cssSave = Math.round((1 - cssResult.stdout.length / cssOrig) * 100);
console.log(`✅ dist/styles.min.css (${(cssResult.stdout.length / 1024).toFixed(1)} KB, −${cssSave}%)`);

// ── 3. Generar dist/index.html con referencias al bundle ──────────────────
console.log('⚙️  Generando dist/index.html…');
let html = fs.readFileSync('index.html', 'utf8');

// Reemplazar 15 tags <script defer> individuales por un único bundle
html = html.replace(
  /<script defer src="js\/config\.js"><\/script>[\s\S]*?<script defer src="js\/game\.js"><\/script>/,
  '<script defer src="bundle.min.js"></script>'
);

// Reemplazar referencia al CSS
html = html.replace('href="css/styles.css"', 'href="styles.min.css"');
html = html.replace('<link rel="preload" href="css/styles.css" as="style">', '<link rel="preload" href="styles.min.css" as="style">');

// Eliminar preloads de JS individuales (sustituidos por bundle)
html = html.replace(/  <link rel="preload" href="js\/(ui|renderer|game)\.js" as="script">\n/g, '');

// Añadir preload del bundle
html = html.replace(
  '  <script defer src="bundle.min.js"></script>',
  '  <link rel="preload" href="bundle.min.js" as="script">\n  <script defer src="bundle.min.js"></script>'
);

fs.writeFileSync('dist/index.html', html);
console.log('✅ dist/index.html');

// ── 4. Copiar assets estáticos ────────────────────────────────────────────
const COPY_FILES = [
  'cookie-consent.js',
  'favicon.svg',
  'manifest.json',
  'og-image.svg',
  'ads.txt',
  'robots.txt',
  'sitemap.xml',
];

for (const f of COPY_FILES) {
  if (fs.existsSync(f)) {
    fs.copyFileSync(f, `dist/${f}`);
    console.log(`✅ dist/${f}`);
  }
}

console.log('\n🚀 Build completado en dist/');
console.log('   Despliega el contenido de dist/ en tu servidor de producción.\n');
