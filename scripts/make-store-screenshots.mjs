// Google Play phone screenshots from emulator captures.
// Play rejects images whose long side is more than 2× the short side; the emulator captures are
// 1080×2400 (2.22:1), so each one is cropped to 1080×2160 (exactly 2:1) by trimming the status bar
// (top) and the gesture handle (bottom). Rendered with resvg (dev dependency).
//
//   node scripts/make-store-screenshots.mjs <capture.png> [...]   → assets/store/screenshots/NN-<name>.png
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const W = 1080;
const H = 2160;
const TOP = 150; // status bar
const outDir = new URL('../assets/store/screenshots/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node scripts/make-store-screenshots.mjs <capture.png> [...]');
  process.exit(1);
}
files.forEach((f, i) => {
  const png = readFileSync(f);
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  if (w !== W || h < H + TOP) throw new Error(`${f}: expected ${W}×≥${H + TOP}, got ${w}×${h}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 ${TOP} ${W} ${H}"><image width="${w}" height="${h}" xlink:href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
  const out = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  const name = `${String(i + 1).padStart(2, '0')}-${basename(f, '.png')}.png`;
  writeFileSync(new URL(name, outDir), out);
  console.log('wrote assets/store/screenshots/' + name, `${W}x${H}`);
});
