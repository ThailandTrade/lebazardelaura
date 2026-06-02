// Génère les icônes PWA (mark « pile de livres » crème sur fond terracotta).
//   node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const TERRA = "#ad4a2b";
const CREAM = "#f4ede0";
const INK = "#2b251d";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${TERRA}"/>
  <g>
    <rect x="146" y="300" width="220" height="44" rx="10" fill="${CREAM}"/>
    <rect x="164" y="248" width="184" height="44" rx="10" fill="${CREAM}"/>
    <rect x="178" y="196" width="156" height="44" rx="10" fill="${CREAM}"/>
    <rect x="160" y="312" width="14" height="20" rx="3" fill="${INK}"/>
    <rect x="178" y="260" width="14" height="20" rx="3" fill="${INK}"/>
    <rect x="192" y="208" width="14" height="20" rx="3" fill="${INK}"/>
  </g>
</svg>`;

mkdirSync("public", { recursive: true });
const buf = Buffer.from(svg);
const out = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["public/apple-icon.png", 180],
];
for (const [file, size] of out) {
  await sharp(buf).resize(size, size).png().toFile(file);
  console.log("écrit", file);
}
