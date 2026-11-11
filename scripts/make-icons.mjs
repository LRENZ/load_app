// Repayly brand assets, rendered from SVG with resvg (devDependency @resvg/resvg-js).
//
// Mark: a "payoff staircase" — three descending bars (a loan balance going down) and a mint check
// rising out of the last one (paid off). Brand blue matches the app's primary colour.
//
//   node scripts/make-icons.mjs
//
// Writes assets/images/* (app icon, Android adaptive layers, splash, favicon) and assets/brand/*
// (master SVGs, Play Store icon 512, feature graphic 1024×500).
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const BLUE_LIGHT = '#4C8BFF';
const BLUE_DARK = '#1B3FBF';
const MINT = '#2EE6B0';

/** The mark on a 1024 canvas, centred in Android's adaptive-icon safe zone (inner 66 %). */
function mark({ bars = '#FFFFFF', check = MINT, shadow = true } = {}) {
  const white = bars === '#FFFFFF' && check !== '#FFFFFF';
  return `
  <g${shadow ? ' filter="url(#soft)"' : ''}>
    <rect x="262" y="404" width="112" height="372" rx="34" fill="${bars}"/>
    <rect x="410" y="516" width="112" height="260" rx="34" fill="${bars}" fill-opacity="${white ? 0.92 : 1}"/>
    <rect x="558" y="628" width="112" height="148" rx="34" fill="${bars}" fill-opacity="${white ? 0.84 : 1}"/>
    <path d="M582 470 L654 542 L790 326" fill="none" stroke="${check}" stroke-width="78" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BLUE_LIGHT}"/>
      <stop offset="1" stop-color="${BLUE_DARK}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.22" cy="0.12" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#0B1E66" flood-opacity="0.35"/>
    </filter>
  </defs>`;

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${body}</svg>`;

/** Full icon: gradient field (square = full bleed for stores / legacy; rounded for splash / favicon). */
const fullIcon = (rx = 0) =>
  svg(1024, 1024, `
  <rect width="1024" height="1024" rx="${rx}" fill="url(#bg)"/>
  <rect width="1024" height="1024" rx="${rx}" fill="url(#glow)"/>
  ${mark()}`);

const adaptiveBackground = svg(1024, 1024, `
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>`);
// Adaptive layers are masked (a circle on many launchers: only the inner ~66 %, radius ≈ 341 px,
// shows). The mark's far points (check tip, bar corner) reach ~373 px from the centre → 84 %.
const SAFE = (inner) => `<g transform="translate(${512 * 0.16} ${512 * 0.16}) scale(0.84)">${inner}</g>`;
const adaptiveForeground = svg(1024, 1024, SAFE(mark()));
// Themed (monochrome) icon: Android tints it, so one flat colour and no shadow.
const monochrome = svg(1024, 1024, SAFE(mark({ bars: '#FFFFFF', check: '#FFFFFF', shadow: false })));

const featureGraphic = svg(1024, 500, `
  <rect width="1024" height="500" fill="url(#bg)"/>
  <rect width="1024" height="500" fill="url(#glow)"/>
  <g transform="translate(36 -6) scale(0.5)">${mark()}</g>
  <text x="560" y="236" font-family="Segoe UI, Roboto, Arial, sans-serif" font-weight="800" font-size="104" fill="#FFFFFF" letter-spacing="-2">Repayly</text>
  <text x="564" y="304" font-family="Segoe UI, Roboto, Arial, sans-serif" font-weight="600" font-size="38" fill="#DDE7FF">EMI &amp; loan calculator</text>
  <rect x="564" y="336" width="88" height="10" rx="5" fill="${MINT}"/>`);

function png(svgText, width) {
  return new Resvg(svgText, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true } }).render().asPng();
}

const img = (f) => new URL(`../assets/images/${f}`, import.meta.url);
const brand = (f) => new URL(`../assets/brand/${f}`, import.meta.url);
mkdirSync(new URL('../assets/brand/', import.meta.url), { recursive: true });

const files = [
  [img('icon.png'), fullIcon(0), 1024],
  [img('android-icon-background.png'), adaptiveBackground, 1024],
  [img('android-icon-foreground.png'), adaptiveForeground, 1024],
  [img('android-icon-monochrome.png'), monochrome, 1024],
  [img('splash-icon.png'), fullIcon(228), 512],
  [img('favicon.png'), fullIcon(228), 48],
  [brand('play-store-icon-512.png'), fullIcon(0), 512],
  [brand('feature-graphic-1024x500.png'), featureGraphic, 1024],
];
for (const [url, text, w] of files) {
  writeFileSync(url, png(text, w));
  console.log('wrote', decodeURIComponent(url.pathname).replace(/^\/[A-Z]:\/load_app\//i, ''), `${w}px`);
}
writeFileSync(brand('repayly-icon.svg'), fullIcon(228));
writeFileSync(brand('repayly-mark.svg'), adaptiveForeground);
writeFileSync(brand('feature-graphic.svg'), featureGraphic);
