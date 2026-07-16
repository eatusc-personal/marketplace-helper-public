// Complete test suite for HEIC converter
// Run with: node test-all.js

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 HEIC Converter - Complete Test Suite');
console.log('=====================================\n');

// Test 1: Basic conversion test
async function testBasicConversion() {
  console.log('📋 Test 1: Basic HEIC Conversion');
  console.log('--------------------------------');

  try {
    const testFile = path.resolve(__dirname, '..', '..', 'test-files', 'IMG_0203.HEIC');
    if (!fs.existsSync(testFile)) {
      console.log('❌ Test file not found:', testFile);
      console.log('💡 Please add a HEIC test file to /test-files/IMG_0203.HEIC');
      return false;
    }

    // Run the basic conversion test
    const result = await runCommand('node', [path.join(__dirname, 'test-converter.js')]);
    return result === 0;
  } catch (error) {
    console.log('❌ Basic conversion test failed:', error.message);
    return false;
  }
}

// Test 2: Local API server test
async function testLocalAPI() {
  console.log('\n📋 Test 2: Local API Server');
  console.log('----------------------------');

  try {
    // Start local server
    console.log('🚀 Starting local server...');
    const server = spawn('node', [path.join(__dirname, 'local-server.js')], {
      stdio: 'pipe',
      detached: false
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test the API
    console.log('🔄 Testing API endpoint...');
    const result = await runCommand('node', [path.join(__dirname, 'test-api-client.js')]);

    // Kill the server
    server.kill();

    return result === 0;
  } catch (error) {
    console.log('❌ Local API test failed:', error.message);
    return false;
  }
}

// Helper function to run commands
function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      resolve(code);
    });
  });
}

// Main test runner
async function runAllTests() {
  const results = [];

  // Test 1: Basic conversion
  results.push(await testBasicConversion());

  // Test 2: Local API
  results.push(await testLocalAPI());

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`✅ Basic Conversion: ${results[0] ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Local API Server: ${results[1] ? 'PASS' : 'FAIL'}`);

  const allPassed = results.every(result => result);

  if (allPassed) {
    console.log('\n🎉 All tests passed! Ready for Vercel deployment.');
  } else {
    console.log('\n❌ Some tests failed. Please fix issues before deployment.');
  }

  return allPassed;
}

// Run all tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
});
