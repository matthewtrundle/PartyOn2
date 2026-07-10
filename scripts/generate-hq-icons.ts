/**
 * Generate the Party On HQ PWA icon set from the design handoff spec:
 * navy #0A1F33 tile, "POD" monogram in Barlow Condensed 700 white, yellow
 * #F2D34F underline rule. Outputs:
 *
 *   public/hq-icon-192.png            (manifest, purpose "any")
 *   public/hq-icon-512.png            (manifest, purpose "any")
 *   public/hq-icon-512-maskable.png   (art inside the r=40% safe circle)
 *   src/app/ops/apple-icon.png        (180×180 OPAQUE — iOS composites
 *   src/app/admin/apple-icon.png       white under transparency)
 *
 * Barlow Condensed 700 is vendored at scripts/assets/barlow-condensed-700.ttf
 * and registered for librsvg via a temp fontconfig file, so the render is
 * reproducible on any machine. The script self-verifies output pixels
 * (white glyphs + yellow rule must both appear) — regenerating blind is how
 * you ship a blank navy square.
 *
 * Run: npx tsx scripts/generate-hq-icons.ts
 */

import { mkdtempSync, writeFileSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import sharp from 'sharp';

const NAVY = '#0A1F33';
const YELLOW = '#F2D34F';
const ROOT = path.resolve(__dirname, '..');
const FONT_SRC = path.join(__dirname, 'assets', 'barlow-condensed-700.ttf');

function setupFontconfig(): void {
  const dir = mkdtempSync(path.join(tmpdir(), 'hq-icons-'));
  const fontDir = path.join(dir, 'fonts');
  sharp.cache(false);
  // fontconfig wants a directory of fonts + a config pointing at it
  require('fs').mkdirSync(fontDir, { recursive: true });
  copyFileSync(FONT_SRC, path.join(fontDir, 'barlow-condensed-700.ttf'));
  const conf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontDir}</dir>
  <cachedir>${path.join(dir, 'cache')}</cachedir>
</fontconfig>`;
  const confPath = path.join(dir, 'fonts.conf');
  writeFileSync(confPath, conf);
  process.env.FONTCONFIG_FILE = confPath;
}

/**
 * The tile artwork. `inset` scales the monogram toward the center (maskable
 * icons must keep art inside a centered circle of radius 40% of width).
 */
function tileSvg(size: number, opts: { radius: number; inset: number }): string {
  const { radius, inset } = opts;
  const textSize = Math.round(size * 0.34 * inset);
  const textY = Math.round(size * 0.54);
  const ruleWidth = Math.round(size * 0.42 * inset);
  const ruleHeight = Math.max(4, Math.round(size * 0.045 * inset));
  const ruleY = Math.round(size * 0.63);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${NAVY}"/>
  <text x="50%" y="${textY}" text-anchor="middle" dominant-baseline="middle"
        font-family="Barlow Condensed" font-weight="700" font-size="${textSize}"
        letter-spacing="${Math.round(textSize * 0.06)}" fill="#FFFFFF">POD</text>
  <rect x="${(size - ruleWidth) / 2}" y="${ruleY}" width="${ruleWidth}" height="${ruleHeight}" rx="${Math.round(ruleHeight / 2)}" fill="${YELLOW}"/>
</svg>`;
}

/** Assert the rendered PNG actually contains white glyphs + the yellow rule. */
async function verify(file: string): Promise<void> {
  const { data, info } = await sharp(file)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let white = 0;
  let yellow = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r > 230 && g > 230 && b > 230) white++;
    if (r > 210 && g > 180 && b < 130) yellow++;
  }
  const total = info.width * info.height;
  if (white / total < 0.01) throw new Error(`${file}: monogram text did not render (white ${white}/${total})`);
  if (yellow / total < 0.005) throw new Error(`${file}: yellow rule did not render (${yellow}/${total})`);
  console.log(`  ✓ ${path.relative(ROOT, file)} — white ${(100 * white / total).toFixed(1)}%, yellow ${(100 * yellow / total).toFixed(1)}%`);
}

async function render(size: number, out: string, opts: { radius: number; inset: number }): Promise<void> {
  const svg = Buffer.from(tileSvg(size, opts));
  // No density override: the SVG carries explicit px dimensions and must
  // rasterize at exactly `size` (a DPI bump silently ships a 4× icon).
  await sharp(svg).resize(size, size).png().flatten({ background: NAVY }).toFile(out);
  const meta = await sharp(out).metadata();
  if (meta.width !== size || meta.height !== size) {
    throw new Error(`${out}: expected ${size}×${size}, got ${meta.width}×${meta.height}`);
  }
  await verify(out);
}

async function main(): Promise<void> {
  setupFontconfig();
  const pub = path.join(ROOT, 'public');

  await render(192, path.join(pub, 'hq-icon-192.png'), { radius: 0, inset: 1 });
  await render(512, path.join(pub, 'hq-icon-512.png'), { radius: 0, inset: 1 });
  // Maskable: full-bleed background, art pulled into the 40% safe circle
  await render(512, path.join(pub, 'hq-icon-512-maskable.png'), { radius: 0, inset: 0.72 });
  // Apple touch icon: 180, opaque (flatten already guarantees it)
  await render(180, path.join(ROOT, 'src/app/ops/apple-icon.png'), { radius: 0, inset: 1 });
  copyFileSync(
    path.join(ROOT, 'src/app/ops/apple-icon.png'),
    path.join(ROOT, 'src/app/admin/apple-icon.png'),
  );
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
