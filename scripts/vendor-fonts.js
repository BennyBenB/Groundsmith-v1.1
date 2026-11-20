'use strict';
// Downloads the Google Fonts the game uses (Inter, Silkscreen) into app/fonts and
// points app/index.html at the local copy, so the game looks right offline.
// Needs internet once, at build time. Safe to run repeatedly.
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'app', 'index.html');
const OUT = path.join(ROOT, 'app', 'fonts');
const LINK_RE = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2[^"]*">/;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return resolve(get(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(url + ' -> HTTP ' + res.statusCode));
      const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// Pure helper (exported for testing): rewrite remote font URLs to local files.
function localise(css, nameFor) {
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map((m) => m[1]))];
  let out = css;
  for (const u of urls) out = out.split(u).join('./' + nameFor(u));
  return { css: out, urls };
}

async function main() {
  const html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(LINK_RE);
  if (!m) { console.log('fonts: already local (no Google Fonts link found)'); return; }
  const cssUrl = m[0].match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&');
  fs.mkdirSync(OUT, { recursive: true });
  const css = (await get(cssUrl)).toString('utf8');
  const names = new Map();
  const { css: local, urls } = localise(css, (u) => {
    if (!names.has(u)) names.set(u, 'f' + names.size + '.woff2');
    return names.get(u);
  });
  for (const u of urls) fs.writeFileSync(path.join(OUT, names.get(u)), await get(u));
  fs.writeFileSync(path.join(OUT, 'fonts.css'), local);
  fs.writeFileSync(HTML, html.replace(LINK_RE, '<link rel="stylesheet" href="./fonts/fonts.css">'));
  console.log('fonts: vendored ' + urls.length + ' files into app/fonts');
}

module.exports = { localise };
if (require.main === module) main().catch((e) => { console.error('fonts: FAILED - ' + e.message); process.exit(1); });
