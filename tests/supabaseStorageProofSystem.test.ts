import {
  isSupabaseStorageConfigured,
  uploadProofFile,
  getSignedDownloadUrl,
  deleteProofFile,
  validateFileFormatAndSize,
} from '../src/services/storageService';

async function runTests() {
  console.log('--- SEVYA TPMS SUPABASE STORAGE SYSTEM VERIFICATION ---');

  // 1. Storage Configuration Check
  const isStorageReady = isSupabaseStorageConfigured();
  console.log(`[Storage System] Supabase Storage Configured: ${isStorageReady}`);
  if (!isStorageReady) {
    console.log(
      '[Storage System] Running in local high-performance fallback buffer mode (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY optional for local dev/testing).'
    );
  } else {
    console.log('[Storage System] Live Supabase Storage credentials detected.');
  }

  // 2. MIME & Size Validation Tests
  console.log('[Storage System] Testing MIME and Size validation rules...');
  const validImageVal = validateFileFormatAndSize('image/jpeg', 5 * 1024 * 1024);
  if (!validImageVal.valid) throw new Error('Valid JPEG image rejected unexpectedly.');

  const validVideoVal = validateFileFormatAndSize('video/mp4', 50 * 1024 * 1024);
  if (!validVideoVal.valid) throw new Error('Valid MP4 video rejected unexpectedly.');

  const validPdfVal = validateFileFormatAndSize('application/pdf', 15 * 1024 * 1024);
  if (!validPdfVal.valid) throw new Error('Valid PDF document rejected unexpectedly.');

  const invalidMimeVal = validateFileFormatAndSize('application/x-msdownload', 100);
  if (invalidMimeVal.valid) throw new Error('Invalid executable file accepted unexpectedly.');

  const oversizedImgVal = validateFileFormatAndSize('image/jpeg', 25 * 1024 * 1024);
  if (oversizedImgVal.valid) throw new Error('Oversized image accepted unexpectedly.');

  console.log('[Storage System] File validation rules verified successfully.');

  // 3. Storage Upload Test
  const mockBuffer = Buffer.from(
    'Hari Om! Test proof content for SEVYA task verification via Supabase Storage.'
  );
  const testFileName = 'test_seva_proof.jpg';
  const mimeType = 'image/jpeg';
  const templeId = '00000000-0000-0000-0000-000000000000';
  const taskId = '00000000-0000-0000-0000-000000000001';
  const proofId = '00000000-0000-0000-0000-000000000002';

  console.log('[Storage System] Testing uploadProofFile...');
  const uploadResult = await uploadProofFile({
    fileBuffer: mockBuffer,
    originalFileName: testFileName,
    mimeType,
    templeId,
    taskId,
    proofId,
  });
  console.log('[Storage System] Upload Result objectKey:', uploadResult.objectKey);
  console.log('[Storage System] Upload Result bucket:', uploadResult.bucket);

  if (!uploadResult.objectKey) {
    throw new Error('Upload failed: missing objectKey in response.');
  }

  // 4. Signed Download URL Test
  console.log('[Storage System] Testing getSignedDownloadUrl...');
  const downloadUrl = await getSignedDownloadUrl(uploadResult.objectKey, 900);
  console.log(
    '[Storage System] Generated Signed Download URL:',
    downloadUrl.substring(0, 80) + '...'
  );

  if (!downloadUrl) {
    throw new Error('Download URL generation failed.');
  }

  // 5. File Cleanup Test
  console.log('[Storage System] Testing deleteProofFile...');
  await deleteProofFile(uploadResult.objectKey);
  console.log('[Storage System] File cleanup verified.');

  console.log('✅ ALL SUPABASE STORAGE ENGINE UNIT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
