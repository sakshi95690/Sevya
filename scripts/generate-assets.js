import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * SEVYA Asset Generation & Background Removal Script
 * Ensures all app logos, icons, and badges are 100% transparent (WhatsApp / Google Drive style)
 * with zero black, white, or colored background boxes.
 */
async function processLogo() {
  const publicDir = path.resolve('public');
  const sourcePath = path.join(publicDir, 'logo.jpeg');

  if (!fs.existsSync(sourcePath)) {
    console.error('Source logo.jpeg not found');
    return;
  }

  const { data, info } = await sharp(sourcePath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Detect background color from the 4 corners
  const samplePts = [
    [5, 5],
    [width - 5, 5],
    [5, height - 5],
    [width - 5, height - 5],
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  for (const [sx, sy] of samplePts) {
    const i = (sy * width + sx) * 3;
    bgR += data[i];
    bgG += data[i + 1];
    bgB += data[i + 2];
  }
  bgR /= samplePts.length;
  bgG /= samplePts.length;
  bgB /= samplePts.length;

  console.log(`Detected background average RGB: (${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`);

  function colorDist(r, g, b) {
    return Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
  }

  // BFS flood fill from all perimeter pixels
  const visited = new Uint8Array(width * height);
  const isBg = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    queue.push(0, y);
    queue.push(width - 1, y);
  }

  let qHead = 0;
  while (qHead < queue.length) {
    const x = queue[qHead++];
    const y = queue[qHead++];
    const idx = y * width + x;

    if (visited[idx]) continue;
    visited[idx] = 1;

    const pIdx = idx * 3;
    const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2];
    const dist = colorDist(r, g, b);

    if (dist < 40) {
      isBg[idx] = 1;
      if (x > 0 && !visited[idx - 1]) queue.push(x - 1, y);
      if (x < width - 1 && !visited[idx + 1]) queue.push(x + 1, y);
      if (y > 0 && !visited[idx - width]) queue.push(x, y - 1);
      if (y < height - 1 && !visited[idx + width]) queue.push(x, y + 1);
    }
  }

  // Also catch enclosed background pockets that match the background color
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!isBg[idx]) {
        const pIdx = idx * 3;
        const dist = colorDist(data[pIdx], data[pIdx + 1], data[pIdx + 2]);
        if (dist < 22) {
          isBg[idx] = 1;
        }
      }
    }
  }

  // Build RGBA buffer with alpha anti-aliasing and color despill
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 3;
      const outIdx = idx * 4;

      let r = data[pIdx];
      let g = data[pIdx + 1];
      let b = data[pIdx + 2];
      const dist = colorDist(r, g, b);

      if (isBg[idx] || dist < 16) {
        rgba[outIdx] = 0;
        rgba[outIdx + 1] = 0;
        rgba[outIdx + 2] = 0;
        rgba[outIdx + 3] = 0;
      } else if (dist < 36) {
        const alpha = (dist - 16) / 20; // 0..1
        const factor = 1 - alpha;
        r = Math.max(0, Math.min(255, Math.round(r - factor * bgR * 0.7)));
        g = Math.max(0, Math.min(255, Math.round(g - factor * bgG * 0.7)));
        b = Math.max(0, Math.min(255, Math.round(b - factor * bgB * 0.7)));

        rgba[outIdx] = r;
        rgba[outIdx + 1] = g;
        rgba[outIdx + 2] = b;
        rgba[outIdx + 3] = Math.round(alpha * 255);
      } else {
        rgba[outIdx] = r;
        rgba[outIdx + 1] = g;
        rgba[outIdx + 2] = b;
        rgba[outIdx + 3] = 255;
      }
    }
  }

  // Find tight crop of the foreground logo
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = rgba[(y * width + x) * 4 + 3];
      if (a > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const pad = 12;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2);

  const croppedBuf = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .png()
    .toBuffer();

  // Create clean square transparent canvas for app-logo styling (WhatsApp / Google Drive style)
  const squareLogo = await sharp(croppedBuf)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  // Write all transparent PNG icons
  await sharp(squareLogo).toFile(path.join(publicDir, 'logo.png'));
  await sharp(squareLogo).toFile(path.join(publicDir, 'sevya-logo.png'));
  await sharp(squareLogo).toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(squareLogo).resize(192, 192).toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(squareLogo).toFile(path.join(publicDir, 'icon-maskable-512.png'));
  await sharp(squareLogo).resize(192, 192).toFile(path.join(publicDir, 'icon-maskable-192.png'));
  await sharp(squareLogo).resize(192, 192).toFile(path.join(publicDir, 'favicon.png'));
  await sharp(squareLogo).resize(32, 32).toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(squareLogo).resize(48, 48).toFile(path.join(publicDir, 'favicon.ico'));
  await sharp(squareLogo).resize(180, 180).toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(squareLogo).resize(64, 64).toFile(path.join(publicDir, 'badge.png'));

  console.log('Clean transparent logos generated successfully without any background box!');
}

processLogo().catch(console.error);
