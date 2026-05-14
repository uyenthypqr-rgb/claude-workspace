#!/usr/bin/env node
/**
 * Render HTML template → PNG via headless Chrome.
 *
 * Usage:
 *   node render.js --template <path> --content <path> --out <path> [--width N] [--height N] [--scale N]
 *
 * - Replaces {{ field }} placeholders with content JSON values
 * - Replaces {{#cards}}...{{/cards}} blocks for arrays
 * - Replaces {{ASSETS}} with absolute path to pqr-brand-designer/assets/ (file:// URL)
 * - Uses puppeteer-core + system Chrome at /Applications/Google Chrome.app
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ASSETS_DIR = path.resolve(
  __dirname,
  '..',
  'pqr-brand-designer',
  'assets'
);
const ASSETS_URL = 'file://' + ASSETS_DIR + '/';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  process.env.CHROME_PATH || '',
];

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (p && fs.existsSync(p)) return p;
  }
  throw new Error('Chrome không tìm thấy. Set CHROME_PATH env hoặc cài Chrome.');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1];
      args[key] = val;
      i++;
    }
  }
  return args;
}

/**
 * Mustache-lite template engine.
 * Supports:
 *   {{ key }}                — simple substitution (HTML-escaped)
 *   {{{ key }}}              — raw (no escape, for HTML content)
 *   {{#array}}...{{/array}}  — repeat block per item, item fields available as {{ field }}
 *   {{^key}}...{{/key}}      — render block if key is falsy/missing
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplate(tpl, data) {
  // Sections: {{#key}}...{{/key}} and inverse {{^key}}...{{/key}}
  tpl = tpl.replace(
    /\{\{([#^])\s*([\w.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g,
    (match, type, key, body) => {
      const val = data[key];
      const truthy = Array.isArray(val) ? val.length > 0 : Boolean(val);
      if (type === '#') {
        if (!truthy) return '';
        if (Array.isArray(val)) {
          return val.map((item) => renderTemplate(body, { ...data, ...item })).join('');
        }
        return renderTemplate(body, { ...data, ...val });
      } else {
        return truthy ? '' : renderTemplate(body, data);
      }
    }
  );

  // Triple-brace raw {{{ key }}}
  tpl = tpl.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (m, key) => {
    const v = data[key];
    return v == null ? '' : String(v);
  });

  // Double-brace escaped {{ key }}
  tpl = tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    if (key === 'ASSETS') return ASSETS_URL;
    const v = data[key];
    return v == null ? '' : escapeHtml(v);
  });

  return tpl;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.template || !args.content || !args.out) {
    console.error(
      'Usage: node render.js --template <path> --content <path> --out <path>'
    );
    process.exit(1);
  }

  const width = parseInt(args.width || '1080', 10);
  const height = parseInt(args.height || '1350', 10);
  const scale = parseFloat(args.scale || '2');

  const tplPath = path.resolve(args.template);
  const contentPath = path.resolve(args.content);
  const outPath = path.resolve(args.out);

  if (!fs.existsSync(tplPath)) {
    console.error(`❌ Template không tồn tại: ${tplPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(contentPath)) {
    console.error(`❌ Content JSON không tồn tại: ${contentPath}`);
    process.exit(1);
  }

  const tpl = fs.readFileSync(tplPath, 'utf-8');
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));

  // Inject ASSETS_URL into content automatically
  content.ASSETS = ASSETS_URL;

  const html = renderTemplate(tpl, content);

  console.log(`▶ Template : ${path.basename(tplPath)}`);
  console.log(`  Content  : ${path.basename(contentPath)}`);
  console.log(`  Viewport : ${width}×${height} @${scale}x`);
  console.log(`  Output   : ${outPath}`);

  const t0 = Date.now();

  const chromePath = findChrome();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--allow-file-access-from-files',
      '--disable-web-security',
    ],
  });

  // Write rendered HTML to temp file so file:// asset paths resolve correctly
  const tmpHtml = path.join(
    require('os').tmpdir(),
    `render-${Date.now()}.html`
  );
  fs.writeFileSync(tmpHtml, html, 'utf-8');

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: scale });
    await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluateHandle('document.fonts.ready');

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await page.screenshot({
      path: outPath,
      omitBackground: false,
      fullPage: false,
      clip: { x: 0, y: 0, width, height },
    });
  } finally {
    await browser.close();
    try { fs.unlinkSync(tmpHtml); } catch {}
  }

  const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
  const ms = Date.now() - t0;
  console.log(`✅ Render OK in ${ms}ms — ${sizeKB} KB`);
}

main().catch((e) => {
  console.error('❌ Render failed:', e.message);
  process.exit(1);
});
