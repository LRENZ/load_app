// Generates the app's original icon set as PNGs (no external deps).
// Glyph: a white calculator with a blue screen line and keypad on a blue field.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const BLUE = [0x2f, 0x6b, 0xff, 255];
const WHITE = [255, 255, 255, 255];
const LIGHT = [0xe7, 0xee, 0xff, 255];
const CLEAR = [0, 0, 0, 0];

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** glyph in unit coordinates (0..1), centred, scale = fraction of canvas */
function glyph(u, v) {
  // body
  if (!inRoundRect(u, v, 0.3, 0.22, 0.7, 0.78, 0.06)) return null;
  // screen
  if (inRoundRect(u, v, 0.36, 0.29, 0.64, 0.4, 0.025)) return 'screen';
  // keypad 3x3
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const x0 = 0.36 + c * 0.1, y0 = 0.46 + r * 0.1;
      if (inRoundRect(u, v, x0, y0, x0 + 0.075, y0 + 0.075, 0.018)) return r === 2 && c === 2 ? 'accent' : 'key';
    }
  return 'body';
}

function render(size, { bg, body, screen, key, accent, scale = 1, rounded = 0 }) {
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      // supersample 2x2 for smooth edges
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < 2; sy++)
        for (let sx = 0; sx < 2; sx++) {
          const fx = (x + (sx + 0.5) / 2) / size, fy = (y + (sy + 0.5) / 2) / size;
          let col = bg;
          if (rounded && !inRoundRect(fx, fy, 0, 0, 1, 1, rounded)) col = CLEAR;
          const u = 0.5 + (fx - 0.5) / scale, v = 0.5 + (fy - 0.5) / scale;
          const g = glyph(u, v);
          if (g) col = { body, screen, key, accent }[g];
          for (let i = 0; i < 4; i++) acc[i] += col[i] / 4;
        }
      px.set(acc.map(Math.round), (y * size + x) * 4);
    }
  return png(size, size, px);
}

const out = (f, b) => writeFileSync(new URL(`../assets/images/${f}`, import.meta.url), b);
out('icon.png', render(1024, { bg: BLUE, body: WHITE, screen: BLUE, key: LIGHT, accent: BLUE, scale: 1.25 }));
out('android-icon-background.png', render(432, { bg: BLUE, body: BLUE, screen: BLUE, key: BLUE, accent: BLUE, scale: 0.0001 }));
out('android-icon-foreground.png', render(432, { bg: CLEAR, body: WHITE, screen: BLUE, key: LIGHT, accent: BLUE, scale: 0.85 }));
out('android-icon-monochrome.png', render(432, { bg: CLEAR, body: WHITE, screen: CLEAR, key: CLEAR, accent: CLEAR, scale: 0.85 }));
out('splash-icon.png', render(512, { bg: CLEAR, body: BLUE, screen: WHITE, key: LIGHT, accent: WHITE, scale: 1.6 }));
out('favicon.png', render(48, { bg: BLUE, body: WHITE, screen: BLUE, key: LIGHT, accent: BLUE, scale: 1.25, rounded: 0.2 }));
console.log('icons written');
