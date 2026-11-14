// Bakes public/tex/rubber.png once: a 256x256 rubber-floor tile (fine grain plus
// 1-3 px flecks over ~3.5% of the area), and three faint whiteboard ghost SVGs.
// Pure Node: a seeded noise field written with a minimal PNG encoder.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const W = 256;
let seed = 1337;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const base = hex("#1A1A18");
const flecks = ["#4A4840", "#7A3B2C", "#4A5A3A"].map(hex);
const px = new Uint8Array(W * W * 3);
for (let i = 0; i < W * W; i++) {
  // 4-level grain keeps the tile small and the floor matte
  const g = rnd() < 0.045 ? 2 : 0;
  px[i * 3] = base[0] + g;
  px[i * 3 + 1] = base[1] + g;
  px[i * 3 + 2] = base[2] + g;
}
let covered = 0;
while (covered < W * W * 0.033) {
  const c = flecks[Math.floor(rnd() * 3)];
  const s = 1 + Math.floor(rnd() * 3);
  const x0 = Math.floor(rnd() * W), y0 = Math.floor(rnd() * W);
  for (let dy = 0; dy < s; dy++)
    for (let dx = 0; dx < s; dx++) {
      if (s === 3 && (dx === 0 || dx === 2) && (dy === 0 || dy === 2)) continue;
      const x = (x0 + dx) % W, y = (y0 + dy) % W, i = (y * W + x) * 3;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
      covered++;
    }
}
const raw = Buffer.alloc((W * 3 + 1) * W);
for (let y = 0; y < W; y++) {
  raw[y * (W * 3 + 1)] = 0;
  Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
}
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
mkdirSync("public/tex", { recursive: true });
writeFileSync("public/tex/rubber.png", png);
console.log("rubber.png", png.length, "bytes");

const ghosts = [
  "M30 60 C120 20 220 90 330 50 M60 140 C160 170 260 110 380 150 M40 220 L200 230",
  "M50 40 L180 52 M220 30 C300 80 360 60 420 90 M70 180 C150 140 250 210 360 190",
  "M20 100 C100 60 140 140 240 100 M260 200 C320 170 380 230 440 200 M80 250 L260 240",
];
ghosts.forEach((d, i) => writeFileSync(`public/tex/board-ghost-${i + 1}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 280"><path d="${d}" fill="none" stroke="#1D3A6B" stroke-width="7" stroke-linecap="round" opacity="0.06"/></svg>\n`));
