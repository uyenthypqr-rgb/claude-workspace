#!/usr/bin/env node
/**
 * QA check PNG output từ design renderer.
 *
 * Checks:
 *  - File exists + valid PNG header
 *  - Dimensions match expected (allow @2x scale)
 *  - File size in [30KB, 8MB]
 *  - Brand gold color presence > 0.5%
 *  - Pure white pixels < 60% (detect blank render)
 *
 * Output: JSON with status pass|warn|fail + per-check details
 * Exit code: 0 = pass/warn, 1 = fail
 */

const fs = require('fs');
const zlib = require('zlib');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

function readPngDimensions(buf) {
  // PNG magic: 89 50 4E 47 0D 0A 1A 0A
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(sig)) return null;
  // IHDR chunk starts at byte 8 (4 bytes length + 4 bytes "IHDR" + data)
  // Width at byte 16-19, Height at byte 20-23 (big-endian)
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25);
  return { width, height, bitDepth, colorType };
}

/**
 * Lightweight PNG decoder for IDAT chunks (raw RGBA pixels).
 * Returns { width, height, pixels: Uint8ClampedArray (RGBA) } or null on error.
 * Supports color type 2 (RGB) and 6 (RGBA), bit depth 8.
 */
function decodePng(buf) {
  const meta = readPngDimensions(buf);
  if (!meta) return null;
  if (meta.bitDepth !== 8) return null;
  const channelsBySrc = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const srcCh = channelsBySrc[meta.colorType];
  if (!srcCh) return null;
  if (meta.colorType === 3) return null; // skip palette for simplicity

  // Concatenate all IDAT chunks
  const idatParts = [];
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idatParts.push(buf.subarray(pos + 8, pos + 8 + len));
    if (type === 'IEND') break;
    pos += 12 + len;
  }
  const compressed = Buffer.concat(idatParts);
  let raw;
  try {
    raw = zlib.inflateSync(compressed);
  } catch {
    return null;
  }

  // Apply PNG filter unfilter
  const { width, height } = meta;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const stride = width * srcCh;
  let prevRow = Buffer.alloc(stride);
  let rawPos = 0;
  for (let y = 0; y < height; y++) {
    const filterType = raw[rawPos++];
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const byte = raw[rawPos++];
      const left = x >= srcCh ? row[x - srcCh] : 0;
      const up = prevRow[x];
      const upLeft = x >= srcCh ? prevRow[x - srcCh] : 0;
      let val;
      switch (filterType) {
        case 0: val = byte; break;
        case 1: val = (byte + left) & 0xff; break;
        case 2: val = (byte + up) & 0xff; break;
        case 3: val = (byte + Math.floor((left + up) / 2)) & 0xff; break;
        case 4: { // Paeth
          const p = left + up - upLeft;
          const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
          let pred;
          if (pa <= pb && pa <= pc) pred = left;
          else if (pb <= pc) pred = up;
          else pred = upLeft;
          val = (byte + pred) & 0xff;
          break;
        }
        default: val = byte;
      }
      row[x] = val;
    }
    // Convert row → RGBA pixels
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const rsi = x * srcCh;
      if (srcCh === 3) {
        pixels[pi] = row[rsi];
        pixels[pi + 1] = row[rsi + 1];
        pixels[pi + 2] = row[rsi + 2];
        pixels[pi + 3] = 255;
      } else if (srcCh === 4) {
        pixels[pi] = row[rsi];
        pixels[pi + 1] = row[rsi + 1];
        pixels[pi + 2] = row[rsi + 2];
        pixels[pi + 3] = row[rsi + 3];
      } else if (srcCh === 1) {
        pixels[pi] = pixels[pi + 1] = pixels[pi + 2] = row[rsi];
        pixels[pi + 3] = 255;
      }
    }
    prevRow = row;
  }
  return { width, height, pixels };
}

/**
 * Sample pixels (every N pixels) and count gold + white.
 * Gold = within 30 RGB units of #B99A44 (185,154,68) OR #DDC96C (221,201,108).
 * White = all channels >= 245.
 */
function analyzePixels(decoded, sampleStride = 7) {
  const { pixels, width, height } = decoded;
  let goldCount = 0;
  let whiteCount = 0;
  let totalSampled = 0;
  for (let y = 0; y < height; y += sampleStride) {
    for (let x = 0; x < width; x += sampleStride) {
      const i = (y * width + x) * 4;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      totalSampled++;
      if (r >= 245 && g >= 245 && b >= 245) whiteCount++;
      // Gold #B99A44 = 185,154,68 ; #DDC96C = 221,201,108 ; #966C26 = 150,108,38
      const isGold =
        (Math.abs(r - 185) < 35 && Math.abs(g - 154) < 35 && Math.abs(b - 68) < 35) ||
        (Math.abs(r - 221) < 35 && Math.abs(g - 201) < 35 && Math.abs(b - 108) < 35) ||
        (Math.abs(r - 150) < 35 && Math.abs(g - 108) < 35 && Math.abs(b - 38) < 35);
      if (isGold) goldCount++;
    }
  }
  return {
    gold_pct: (goldCount / totalSampled) * 100,
    white_pct: (whiteCount / totalSampled) * 100,
    sampled: totalSampled,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.file) {
    console.error('Usage: node qa-check.js --file <path> [--expected-width 1080] [--expected-height 1350]');
    process.exit(1);
  }
  const expW = parseInt(args['expected-width'] || '1080', 10);
  const expH = parseInt(args['expected-height'] || '1350', 10);
  const maxSizeMb = parseFloat(args['max-size-mb'] || '8');

  const checks = [];
  const issues = [];

  // 1. File exists
  if (!fs.existsSync(args.file)) {
    console.log(JSON.stringify({ status: 'fail', issues: ['File not found: ' + args.file] }, null, 2));
    process.exit(1);
  }
  checks.push({ name: 'file_exists', result: 'pass' });

  const buf = fs.readFileSync(args.file);
  const sizeKb = Math.round(buf.length / 1024);

  // 2. PNG header + dimensions
  const meta = readPngDimensions(buf);
  if (!meta) {
    console.log(JSON.stringify({ status: 'fail', issues: ['Not a valid PNG file'] }, null, 2));
    process.exit(1);
  }
  // Allow @2x scale (real width = expected * 2)
  const dimMatch =
    (meta.width === expW && meta.height === expH) ||
    (meta.width === expW * 2 && meta.height === expH * 2);
  if (dimMatch) {
    checks.push({
      name: 'dimensions',
      result: 'pass',
      actual: `${meta.width}x${meta.height}${meta.width === expW * 2 ? ' (=' + expW + 'x' + expH + ' @2x)' : ''}`,
    });
  } else {
    checks.push({
      name: 'dimensions',
      result: 'fail',
      actual: `${meta.width}x${meta.height}`,
      expected: `${expW}x${expH} or ${expW * 2}x${expH * 2}`,
    });
    issues.push(`Dimensions mismatch: got ${meta.width}x${meta.height}, expected ${expW}x${expH}`);
  }

  // 3. File size
  if (sizeKb < 30) {
    checks.push({ name: 'file_size_min', result: 'warn', actual_kb: sizeKb });
    issues.push(`File too small (${sizeKb} KB) — possible blank render`);
  } else if (sizeKb > maxSizeMb * 1024) {
    checks.push({ name: 'file_size_max', result: 'warn', actual_kb: sizeKb, limit_mb: maxSizeMb });
    issues.push(`File too large (${sizeKb} KB > ${maxSizeMb} MB) — Facebook may reject`);
  } else {
    checks.push({ name: 'file_size', result: 'pass', actual_kb: sizeKb, limit_mb: maxSizeMb });
  }

  // 4. Pixel analysis (gold presence + whitespace)
  const decoded = decodePng(buf);
  if (decoded) {
    const analysis = analyzePixels(decoded);
    if (analysis.gold_pct >= 0.5) {
      checks.push({
        name: 'brand_color_gold',
        result: 'pass',
        gold_pixel_pct: parseFloat(analysis.gold_pct.toFixed(2)),
      });
    } else {
      checks.push({
        name: 'brand_color_gold',
        result: 'warn',
        gold_pixel_pct: parseFloat(analysis.gold_pct.toFixed(2)),
      });
      issues.push(`Brand gold color rare (${analysis.gold_pct.toFixed(2)}%) — verify logo/accent rendered`);
    }
    if (analysis.white_pct < 60) {
      checks.push({
        name: 'whitespace',
        result: 'pass',
        white_pixel_pct: parseFloat(analysis.white_pct.toFixed(2)),
      });
    } else {
      checks.push({
        name: 'whitespace',
        result: 'warn',
        white_pixel_pct: parseFloat(analysis.white_pct.toFixed(2)),
      });
      issues.push(`Too much white (${analysis.white_pct.toFixed(2)}%) — possible blank/cream render`);
    }
  } else {
    checks.push({ name: 'pixel_analysis', result: 'skip', reason: 'PNG decode failed (unsupported format)' });
  }

  // Determine overall status
  const hasFail = checks.some((c) => c.result === 'fail');
  const hasWarn = checks.some((c) => c.result === 'warn');
  const status = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';

  console.log(JSON.stringify({ status, checks, issues }, null, 2));
  process.exit(hasFail ? 1 : 0);
}

main();
