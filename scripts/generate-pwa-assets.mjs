// Generates the PWA image set from the YAFA logo mark:
//   src/app/apple-icon.png            180×180 iOS home-screen icon
//   public/icons/icon-192.png         manifest icon (rounded, transparent corners)
//   public/icons/icon-512.png
//   public/icons/icon-maskable-512.png full-bleed, glyph in the safe zone
//   public/splash/*.png               iOS startup images, light + dark, per device
//   src/lib/pwa-startup-images.json   the <link rel="apple-touch-startup-image"> list
//
// Colours come from the same Material 3 scheme as the app (seed #003A6C).
// Run: npm run pwa:assets   (Node needs the extensionless-ESM hook, see register-extensionless.mjs)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";

const SEED = "#003A6C";
const root = path.resolve(import.meta.dirname, "..");

function scheme(isDark) {
  const s = new SchemeTonalSpot(Hct.fromInt(argbFromHex(SEED)), isDark, 0);
  const hex = (c) => hexFromArgb(c.getArgb(s));
  return {
    primary: hex(MaterialDynamicColors.primary),
    onPrimary: hex(MaterialDynamicColors.onPrimary),
    surface: hex(MaterialDynamicColors.surface),
  };
}

const light = scheme(false);
const dark = scheme(true);

// The mark from src/components/logo.tsx with concrete colours.
// `radius` 0 gives a full-bleed square (iOS masks its own corners).
function markSvg({ size, radius, bg, fg, glyphScale = 1 }) {
  const inset = (1 - glyphScale) * 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28">
  <rect width="28" height="28" rx="${radius}" fill="${bg}"/>
  <g transform="translate(${inset} ${inset}) scale(${glyphScale})">
    <path d="M7.5 7.5 L13 14 L13 20.5 M18.5 7.5 L13 14" stroke="${fg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="21" cy="9" r="1.5" fill="${fg}"/>
  </g>
</svg>`;
}

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

// Device list: CSS width × height, device pixel ratio, and whether we
// also emit a landscape image (iPads launch in either orientation).
const DEVICES = [
  // iPhone
  { w: 440, h: 956, r: 3, name: "iPhone 16 Pro Max" },
  { w: 430, h: 932, r: 3, name: "iPhone 14/15 Pro Max, 15/16 Plus" },
  { w: 428, h: 926, r: 3, name: "iPhone 12/13 Pro Max, 14 Plus" },
  { w: 402, h: 874, r: 3, name: "iPhone 16 Pro" },
  { w: 393, h: 852, r: 3, name: "iPhone 14 Pro, 15, 15 Pro, 16" },
  { w: 390, h: 844, r: 3, name: "iPhone 12, 13, 14" },
  { w: 375, h: 812, r: 3, name: "iPhone X/XS/11 Pro, 12/13 mini" },
  { w: 414, h: 896, r: 3, name: "iPhone XS Max, 11 Pro Max" },
  { w: 414, h: 896, r: 2, name: "iPhone XR, 11" },
  { w: 375, h: 667, r: 2, name: "iPhone SE (2nd/3rd), 8" },
  // iPad
  { w: 1032, h: 1376, r: 2, landscape: true, name: "iPad Pro 13 (M4)" },
  { w: 1024, h: 1366, r: 2, landscape: true, name: "iPad Pro 12.9, Air 13" },
  { w: 834, h: 1210, r: 2, landscape: true, name: "iPad Pro 11 (M4)" },
  { w: 834, h: 1194, r: 2, landscape: true, name: "iPad Pro 11" },
  { w: 820, h: 1180, r: 2, landscape: true, name: "iPad 10th gen, Air 10.9/11" },
  { w: 834, h: 1112, r: 2, landscape: true, name: "iPad Air/Pro 10.5" },
  { w: 810, h: 1080, r: 2, landscape: true, name: "iPad 9th gen" },
  { w: 768, h: 1024, r: 2, landscape: true, name: "iPad 9.7, mini 5" },
  { w: 744, h: 1133, r: 2, landscape: true, name: "iPad mini 6" },
];

async function splash(pw, ph, colors, logo) {
  return sharp({
    create: { width: pw, height: ph, channels: 4, background: colors.surface },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const iconsDir = path.join(root, "public", "icons");
  const splashDir = path.join(root, "public", "splash");
  await mkdir(iconsDir, { recursive: true });
  await mkdir(splashDir, { recursive: true });

  // Icons
  const rounded = (size) =>
    markSvg({ size, radius: 8, bg: light.primary, fg: light.onPrimary });
  await writeFile(path.join(root, "src", "app", "apple-icon.png"), await png(markSvg({ size: 180, radius: 0, bg: light.primary, fg: light.onPrimary }), 180));
  await writeFile(path.join(iconsDir, "icon-192.png"), await png(rounded(192), 192));
  await writeFile(path.join(iconsDir, "icon-512.png"), await png(rounded(512), 512));
  await writeFile(
    path.join(iconsDir, "icon-maskable-512.png"),
    await png(markSvg({ size: 512, radius: 0, bg: light.primary, fg: light.onPrimary, glyphScale: 0.7 }), 512),
  );

  // Startup images
  const entries = [];
  for (const d of DEVICES) {
    const orientations = d.landscape ? ["portrait", "landscape"] : ["portrait"];
    for (const orientation of orientations) {
      const cw = orientation === "portrait" ? d.w : d.h;
      const ch = orientation === "portrait" ? d.h : d.w;
      const pw = cw * d.r;
      const ph = ch * d.r;
      const logoSize = Math.round(Math.min(pw, ph) * 0.22);
      for (const [mode, colors] of [["light", light], ["dark", dark]]) {
        const logo = await png(markSvg({ size: logoSize, radius: 8, bg: colors.primary, fg: colors.onPrimary }), logoSize);
        const file = `${pw}x${ph}-${mode}.png`;
        await writeFile(path.join(splashDir, file), await splash(pw, ph, colors, logo));
        entries.push({
          url: `/splash/${file}`,
          media: `screen and (device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.r}) and (orientation: ${orientation}) and (prefers-color-scheme: ${mode})`,
        });
      }
    }
  }
  await writeFile(
    path.join(root, "src", "lib", "pwa-startup-images.json"),
    JSON.stringify(entries, null, 2) + "\n",
  );

  console.log(`Wrote 4 icons and ${entries.length} startup images.`);
  console.log(`Colours — light: ${light.primary} on ${light.surface}; dark: ${dark.primary} on ${dark.surface}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
