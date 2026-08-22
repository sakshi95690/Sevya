import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * EXACT GEOMETRIC RECONSTRUCTION OF THE USER'S "S" LOGO:
 * 
 * The logo is a stylized modern letter "S" formed by two intertwined folding shapes:
 * 1. Top Section (Upper Loop of S):
 *    - Vertical rounded rectangle (top-left r=60)
 *    - Top-right has a swooping wing flap (tangent curve extending right)
 *    - Filled with warm golden saffron gradient (#FFA500 -> #FF7700)
 * 
 * 2. The Center White Ribbon:
 *    - An elegant diagonal white ribbon loop with rounded corner at top-right and sweeping through the center.
 * 
 * 3. The Central & Bottom Section (Spine & Lower Loop of S):
 *    - A diagonal pill/capsule (rotated -45 deg) with a smooth rounded bottom-left tip and center fold shadow.
 *    - Bottom-right base shape completing the bottom loop of the S.
 */

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <defs>
    <!-- Master Orange Gradient for the S -->
    <linearGradient id="sGrad" x1="120" y1="80" x2="380" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFA400" />
      <stop offset="35%" stop-color="#FF7B00" />
      <stop offset="70%" stop-color="#FF5900" />
      <stop offset="100%" stop-color="#FF4200" />
    </linearGradient>

    <!-- Top-Right Wing Gradient -->
    <linearGradient id="sWing" x1="280" y1="90" x2="435" y2="210" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFA812" />
      <stop offset="100%" stop-color="#FF7800" />
    </linearGradient>

    <!-- Central Floating Diagonal Capsule Gradient -->
    <linearGradient id="sCenterPill" x1="160" y1="180" x2="350" y2="360" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FF6B00" />
      <stop offset="100%" stop-color="#FF3E00" />
    </linearGradient>

    <!-- Depth Shadow under Central Fold -->
    <filter id="creaseShadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="-5" dy="8" stdDeviation="7" flood-color="#B83200" flood-opacity="0.35" />
    </filter>
  </defs>

  <g id="sevya-s-logo" transform="translate(0, 0)">
    <!-- 1. MAIN BACKGROUND S-BODY SILHOUETTE -->
    <!-- Top-left rounded corner (r=60), Top edge to x=380, right wing curve to (430,140), down to (360,220), straight down to (360,320), rounded bottom-right (r=50), bottom curve to (240,420), bottom-left rounded cap (r=55), up-left side to (150,280), straight up to (150,150), corner to (210,90) -->
    <path d="M 210 90
             C 165 90 150 115 150 155
             L 150 280
             C 150 295 142 308 132 318
             L 118 332
             C 92 358 92 400 118 426
             C 144 452 186 452 212 426
             L 252 386
             C 264 374 280 368 296 368
             L 310 368
             C 340 368 360 348 360 318
             L 360 215
             C 360 200 370 185 382 173
             L 415 140
             C 436 119 428 90 395 90
             L 210 90 Z"
          fill="url(#sGrad)" />

    <!-- 2. TOP RIGHT WING ACCENT -->
    <path d="M 280 90
             L 395 90
             C 428 90 436 119 415 140
             L 360 195
             C 360 145 330 90 280 90 Z"
          fill="url(#sWing)" />

    <!-- 3. WHITE RIBBON S-CURVE (Frame & Negative Space) -->
    <!-- This creates the distinct looping white ribbon of the letter S -->
    <path d="M 315 130
             C 350 130 360 158 360 190
             C 360 206 352 222 340 234
             L 220 354
             C 196 378 166 378 146 358
             C 126 338 126 308 150 284
             L 264 170
             C 280 154 298 130 315 130 Z"
          fill="#FFFFFF" />

    <!-- 4. INNER ORANGE PILL / FOLDED DIAGONAL SPINE -->
    <!-- Positioned diagonally across the center to form the folded ribbon S -->
    <g filter="url(#creaseShadow)">
      <rect x="195" y="180" width="105" height="195" rx="52.5"
            transform="rotate(-45 247.5 277.5)"
            fill="url(#sCenterPill)" />
    </g>

    <!-- 5. BOTTOM-LEFT ROUNDED CAP OF THE 'S' -->
    <path d="M 118 332
             C 92 358 92 400 118 426
             C 144 452 186 452 212 426
             L 252 386
             C 236 374 214 372 198 388
             L 156 430
             C 142 444 120 444 106 430
             C 92 416 92 394 106 380
             L 132 354
             L 118 332 Z"
          fill="url(#sGrad)" />
  </g>
</svg>`;

async function build() {
  const publicDir = path.resolve('public');
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgContent);
  console.log('Saved logo.svg');

  const buf = Buffer.from(svgContent);

  await sharp(buf).resize(512, 512).png().toFile(path.join(publicDir, 'logo.png'));
  await sharp(buf).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(buf).resize(512, 512).flatten({ background: '#FFFFFF' }).jpeg({ quality: 98 }).toFile(path.join(publicDir, 'logo.jpeg'));
  await sharp(buf).resize(512, 512).flatten({ background: '#FFFFFF' }).jpeg({ quality: 98 }).toFile(path.join(publicDir, 'favicon.jpeg'));
  await sharp(buf).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(buf).resize(192, 192).png().toFile(path.join(publicDir, 'favicon.png'));
  await sharp(buf).resize(180, 180).flatten({ background: '#FFFFFF' }).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(buf).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(buf).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.ico'));
  
  await sharp(buf).resize(380, 380).extend({ top: 66, bottom: 66, left: 66, right: 66, background: '#FFFFFF' }).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));
  await sharp(buf).resize(140, 140).extend({ top: 26, bottom: 26, left: 26, right: 26, background: '#FFFFFF' }).png().toFile(path.join(publicDir, 'icon-maskable-192.png'));

  console.log('All icons and favicons generated successfully!');
}

build().catch(console.error);
