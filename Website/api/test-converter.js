// Local test script for HEIC converter
// Run with: node test-converter.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import heicConvert from 'heic-convert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test the converter locally
async function testConverter() {
  try {
    console.log('🧪 Testing HEIC converter locally...');

    // Check if test file exists
    const testFile = path.resolve(__dirname, '..', '..', 'test-files', 'IMG_0203.HEIC');
    if (!fs.existsSync(testFile)) {
      console.log('❌ Test file not found:', testFile);
      console.log('💡 Please add a HEIC test file to /test-files/IMG_0203.HEIC');
      return;
    }

    console.log('📁 Reading test file:', testFile);
    const fileBuffer = fs.readFileSync(testFile);
    const originalSize = fileBuffer.length;

    console.log(`📊 File size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

    // Convert to base64 (simulating what the plugin will send)
    const base64Data = fileBuffer.toString('base64');
    console.log(`📊 Base64 length: ${base64Data.length} characters`);

    console.log('🔄 Simulating API conversion...');

    // Perform conversion
    const jpegBuffer = await heicConvert({
      buffer: fileBuffer,
      format: 'JPEG',
      quality: 0.9
    });

    const convertedSize = jpegBuffer.length;
    const compressionRatio = ((1 - convertedSize / originalSize) * 100).toFixed(1);

    console.log(`✅ Conversion successful!`);
    console.log(`📊 Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 JPEG: ${(convertedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 Compression: ${compressionRatio}%`);

    // Save test output
    const outputPath = path.resolve(__dirname, '..', '..', 'test-files', 'test-converter-output.jpg');
    fs.writeFileSync(outputPath, jpegBuffer);
    console.log(`💾 Test output saved to: ${outputPath}`);

    console.log('🎉 Local test successful! Ready for deployment.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testConverter();
