// Test client for the local HEIC converter API
// Run with: node test-api-client.js
// Make sure local-server.js is running first

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test the API endpoint
async function testAPI() {
  try {
    console.log('🧪 Testing HEIC Converter API...');

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

    // Convert to base64
    const base64Data = fileBuffer.toString('base64');
    console.log(`📊 Base64 length: ${base64Data.length} characters`);

    // Prepare request data
    const requestData = {
      fileData: base64Data,
      fileName: 'IMG_0203.HEIC',
      fileType: 'image/heic'
    };

    const postData = JSON.stringify(requestData);

    // API endpoint (local server)
    const apiUrl = 'http://localhost:3001/api/convert-heic';

    console.log(`🔄 Sending request to: ${apiUrl}`);

    // Make HTTP request
    const response = await makeRequest(apiUrl, postData);

    if (response.success) {
      console.log('✅ API test successful!');
      console.log(`📊 Original size: ${(response.originalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📊 Converted size: ${(response.convertedSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📊 Compression: ${response.compressionRatio}%`);
      console.log(`📊 New filename: ${response.fileName}`);

      // Save the converted image
      const jpegBuffer = Buffer.from(response.jpeg, 'base64');
      const outputPath = path.resolve(__dirname, '..', '..', 'test-files', 'test-api-output.jpg');
      fs.writeFileSync(outputPath, jpegBuffer);
      console.log(`💾 Converted image saved to: ${outputPath}`);

    } else {
      console.log('❌ API test failed:', response.error);
      if (response.details) {
        console.log('📋 Details:', response.details);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Helper function to make HTTP request
async function makeRequest(url, postData, method = 'POST') {
  const response = await fetch(url, {
    method,
    headers: postData ? { 'Content-Type': 'application/json' } : undefined,
    body: postData || undefined,
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response (${response.status}): ${text}`);
  }
}

// Check if local server is running
async function checkServer() {
  try {
    const response = await makeRequest('http://localhost:3001/health', '', 'GET');
    if (response.status === 'OK') {
      console.log('✅ Local server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Local server is not running');
    console.log('💡 Start the local server first: node local-server.js');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if local server is running...');
  const serverRunning = await checkServer();

  if (serverRunning) {
    await testAPI();
  }
}

main();
