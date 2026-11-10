// Minimal adb-based UI driver for emulator scenario tests (no extra deps).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const SDK = process.env.ANDROID_HOME || `${process.env.LOCALAPPDATA}\\Android\\Sdk`;
export const ADB = join(SDK, 'platform-tools', 'adb.exe');
export const SERIAL = process.env.ANDROID_SERIAL || 'emulator-5554';
export const PKG = 'com.lrenz.loadapp';

export function adb(args, opts = {}) {
  return execFileSync(ADB, ['-s', SERIAL, ...args], { encoding: opts.binary ? 'buffer' : 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: opts.timeout ?? 60_000 });
}
export const shell = (cmd, opts) => adb(['shell', cmd], opts);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function parseNodes(xml) {
  const nodes = [];
  const re = /<node ([^>]*?)\/?>/g;
  let m;
  while ((m = re.exec(xml))) {
    const attrs = {};
    for (const a of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#10;/g, '\n');
    const b = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(attrs.bounds || '');
    if (b) attrs.box = { x1: +b[1], y1: +b[2], x2: +b[3], y2: +b[4], cx: (+b[1] + +b[3]) >> 1, cy: (+b[2] + +b[4]) >> 1 };
    nodes.push(attrs);
  }
  return nodes;
}

function killUiautomator() {
  try {
    shell('pkill uiautomator', { timeout: 10_000 });
  } catch {
    /* none running */
  }
}
export function dump() {
  for (let i = 0; i < 4; i++) {
    try {
      shell('rm -f /sdcard/ui.xml; uiautomator dump /sdcard/ui.xml', { timeout: 25_000 });
      const xml = shell('cat /sdcard/ui.xml');
      if (xml.includes('<hierarchy')) return parseNodes(xml);
    } catch {
      /* fall through */
    }
    // A dump that timed out leaves uiautomator registered ("already registered!"),
    // which makes every later dump fail: clear it before retrying.
    killUiautomator();
  }
  throw new Error('uiautomator dump failed');
}

const idOf = (n) => (n['resource-id'] || '').replace(/^.*:id\//, '');
export function find(sel, nodes = dump()) {
  return nodes.find((n) => {
    if (sel.id) return idOf(n) === sel.id;
    if (sel.text) return n.text === sel.text || n['content-desc'] === sel.text;
    if (sel.contains) return (n.text || '').includes(sel.contains) || (n['content-desc'] || '').includes(sel.contains);
    return false;
  });
}
export function texts(nodes = dump()) {
  return nodes.map((n) => n.text).filter(Boolean);
}

export async function waitFor(sel, timeout = 15_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const n = find(sel);
    if (n) return n;
    await sleep(400);
  }
  throw new Error(`timeout waiting for ${JSON.stringify(sel)}`);
}

export async function tap(sel, timeout) {
  const n = await waitFor(sel, timeout);
  shell(`input tap ${n.box.cx} ${n.box.cy}`);
  await sleep(500);
  return n;
}
export async function longPress(sel) {
  const n = await waitFor(sel);
  shell(`input swipe ${n.box.cx} ${n.box.cy} ${n.box.cx} ${n.box.cy} 900`);
  await sleep(600);
}
export function typeText(s) {
  // adb input text: escape spaces and shell metacharacters
  const esc = s.replace(/([\\"'`$&|;<>()\s%])/g, '\\$1');
  shell(`input text ${esc}`);
}
export async function setField(id, value) {
  // Never tap through the keyboard: hide it, and bring low fields into the upper part of the screen.
  hideKeyboard();
  let node = await waitFor({ id });
  const h = Number(/(\d+)x(\d+)/.exec(shell('wm size'))[2]);
  for (let i = 0; i < 3 && node.box.cy > h * 0.55; i++) {
    shell(`input swipe ${node.box.cx} ${Math.round(h * 0.7)} ${node.box.cx} ${Math.round(h * 0.4)} 300`);
    await sleep(500);
    node = await waitFor({ id });
  }
  const n = await tap({ id });
  // clear: move to end and delete
  shell('input keyevent KEYCODE_MOVE_END');
  shell(`input keyevent ${Array(24).fill('KEYCODE_DEL').join(' ')}`);
  if (value) typeText(value);
  await sleep(300);
  return n;
}
export function back() {
  shell('input keyevent KEYCODE_BACK');
}
export function keyboardShown() {
  try {
    return /mIsImeShowing=true/.test(shell('dumpsys window | grep mIsImeShowing'));
  } catch {
    return false;
  }
}
export function hideKeyboard() {
  if (keyboardShown()) {
    back();
    execFileSync('powershell', ['-NoProfile', '-Command', 'Start-Sleep -Milliseconds 500']);
  }
}
export async function scrollDown(times = 1) {
  const size = /(\d+)x(\d+)/.exec(shell('wm size'));
  const w = +size[1], h = +size[2];
  for (let i = 0; i < times; i++) {
    shell(`input swipe ${w / 2} ${h * 0.7} ${w / 2} ${h * 0.35} 700`);
    await sleep(1000); // let any fling settle so the next tap presses instead of stopping a scroll
  }
}
export async function scrollUntil(sel, max = 6) {
  for (let i = 0; i < max; i++) {
    if (find(sel)) return;
    await scrollDown();
  }
}

let outDir = 'evidence';
export function setOutDir(d) {
  outDir = d;
  mkdirSync(join(outDir, 'screens'), { recursive: true });
}
export function screenshot(name) {
  const png = adb(['exec-out', 'screencap', '-p'], { binary: true, timeout: 30_000 });
  const file = join(outDir, 'screens', `${name}.png`);
  writeFileSync(file, png);
  return file;
}

export function launch({ clear = false } = {}) {
  if (clear) shell(`pm clear ${PKG}`);
  shell(`am force-stop ${PKG}`);
  shell(`monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
}
export function forceStop() {
  shell(`am force-stop ${PKG}`);
}

// ---------- result log ----------
const results = [];
let beforeEachHook = null;
export function setBeforeEach(fn) {
  beforeEachHook = fn;
}
let reached = !process.env.FROM;
export async function scenario(id, title, fn) {
  // FROM=<id> resumes a run at that scenario (e.g. after an emulator crash).
  if (!reached && id === process.env.FROM) reached = true;
  if (!reached) return;
  const t0 = Date.now();
  try {
    if (beforeEachHook) await beforeEachHook(id);
    await fn();
    results.push({ id, title, status: 'pass', ms: Date.now() - t0 });
    console.log(`PASS ${id} ${title}`);
  } catch (e) {
    let shot = '';
    try {
      shot = screenshot(`FAIL-${id}`);
    } catch {
      /* ignore */
    }
    results.push({ id, title, status: 'fail', ms: Date.now() - t0, error: String(e?.message || e), shot });
    console.log(`FAIL ${id} ${title}: ${e?.message || e}`);
  }
  appendFileSync(join(outDir, 'results.jsonl'), JSON.stringify(results[results.length - 1]) + '\n');
}
export function summary() {
  return results;
}
export function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}
