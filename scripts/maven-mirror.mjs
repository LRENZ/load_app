// Local caching Maven mirror for networks where Java TLS through the proxy is
// unreliable. Gradle talks plain HTTP to 127.0.0.1; this process fetches each
// file once with curl (which honours HTTPS_PROXY), caches it on disk and
// serves it. Used only by scripts/android-build.ps1 -UseMirror.
//   node scripts/maven-mirror.mjs [port] [cacheDir]
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, renameSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const PORT = Number(process.argv[2] || 8899);
const CACHE = process.argv[3] || join(homedir(), '.gradle', 'curl-mirror');
export const UPSTREAMS = {
  central: 'https://repo.maven.apache.org/maven2',
  google: 'https://dl.google.com/dl/android/maven2',
  plugins: 'https://plugins.gradle.org/m2',
  jitpack: 'https://www.jitpack.io',
};
const inflight = new Map();
let served = 0, fetched = 0, missing = 0;

function run(args) {
  return new Promise((resolve) => {
    const p = spawn('curl', args);
    let outText = '';
    p.stdout.on('data', (d) => (outText += d));
    p.on('close', (code) => resolve({ code, out: outText }));
  });
}

/** Large files: HEAD for size/final URL, then 8 parallel ranges with stall detection. */
async function curlParallel(url, out) {
  const head = await run(['-sIL', '--max-time', '30', url]);
  const blocks = head.out.split(/\r?\n\r?\n/).filter((b) => /^HTTP\/\S+ \d/m.test(b) && !/Connection established/.test(b));
  const last = blocks[blocks.length - 1] || '';
  const status = Number(/^HTTP\/\S+ (\d+)/m.exec(last)?.[1] || 0);
  const len = Number(/content-length:\s*(\d+)/i.exec(last)?.[1] || 0);
  if (status !== 200 || len < 2_000_000) return null; // let the single-stream path handle it
  const locs = [...head.out.matchAll(/^location:\s*(\S+)/gim)].map((m) => m[1]);
  const finalUrl = locs.length ? new URL(locs[locs.length - 1], url).toString() : url;
  const parts = 8;
  const size = Math.ceil(len / parts);
  const bufs = await Promise.all(
    Array.from({ length: parts }, async (_, i) => {
      const start = i * size;
      const end = Math.min(len - 1, start + size - 1);
      const f = `${out}.r${i}`;
      for (let a = 0; a < 12; a++) {
        try { unlinkSync(f); } catch { /* none */ }
        const r = await run(['-sL', '--fail', '--speed-limit', '3000', '--speed-time', '15', '--max-time', '240', '-r', `${start}-${end}`, '-o', f, finalUrl]);
        if (r.code === 0 && existsSync(f) && statSync(f).size === end - start + 1) return f;
      }
      throw new Error(`range ${i} failed`);
    }),
  );
  const { readFileSync } = await import('node:fs');
  writeFileSync(out, Buffer.concat(bufs.map((f) => readFileSync(f))));
  bufs.forEach((f) => unlinkSync(f));
  return statSync(out).size === len ? 200 : 502;
}

async function curl(url, out) {
  if (/\.(jar|aar|zip)$/.test(url)) {
    try {
      const r = await curlParallel(url, out);
      if (r) return r;
    } catch {
      /* fall back to single stream */
    }
  }
  return new Promise((resolve) => {
    const tmp = `${out}.part${process.pid}${Math.random().toString(36).slice(2, 6)}`;
    const p = spawn('curl', ['-sL', '--retry', '8', '--retry-all-errors', '--retry-delay', '1', '--speed-limit', '2000', '--speed-time', '15', '--max-time', '300', '-o', tmp, '-w', '%{http_code}', url]);
    let code = '';
    p.stdout.on('data', (d) => (code += d));
    p.on('close', () => {
      const status = Number(code.trim().slice(-3));
      if (status === 200 && existsSync(tmp)) {
        renameSync(tmp, out);
        resolve(200);
      } else {
        try { unlinkSync(tmp); } catch { /* none */ }
        resolve(status || 502);
      }
    });
  });
}

async function ensure(key, path) {
  const file = join(CACHE, key, path);
  const miss = `${file}.404`;
  if (existsSync(file)) return { file };
  if (existsSync(miss) && Date.now() - statSync(miss).mtimeMs < 6 * 3600_000) return { status: 404 };
  const id = `${key}/${path}`;
  if (!inflight.has(id)) {
    inflight.set(id, (async () => {
      mkdirSync(dirname(file), { recursive: true });
      const status = await curl(`${UPSTREAMS[key]}/${path}`, file);
      if (status === 404 || status === 403 || status === 410) writeFileSync(miss, String(status));
      return status;
    })().finally(() => inflight.delete(id)));
  }
  const status = await inflight.get(id);
  if (status === 200) { fetched++; return { file }; }
  if (status === 404 || status === 403 || status === 410) missing++;
  return { status: status === 403 || status === 410 ? 404 : status };
}

createServer(async (req, res) => {
  const m = /^\/(\w+)\/(.+)$/.exec(decodeURIComponent((req.url || '').split('?')[0]));
  if (!m || !UPSTREAMS[m[1]] || m[2].includes('..')) {
    res.writeHead(404).end();
    return;
  }
  try {
    const r = await ensure(m[1], m[2]);
    if (!r.file) {
      res.writeHead(r.status).end();
      return;
    }
    const size = statSync(r.file).size;
    res.writeHead(200, { 'Content-Length': size, 'Content-Type': 'application/octet-stream' });
    served++;
    if (req.method === 'HEAD') res.end();
    else createReadStream(r.file).pipe(res);
  } catch (e) {
    res.writeHead(502).end(String(e));
  }
}).listen(PORT, '127.0.0.1', () => console.log(`maven mirror on http://127.0.0.1:${PORT} cache ${CACHE}`));

setInterval(() => console.log(`served=${served} fetched=${fetched} missing=${missing} inflight=${inflight.size}`), 60_000);
