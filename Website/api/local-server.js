// Local Express server for testing HEIC converter
// Run with: node local-server.js
// Access at: http://localhost:3001/api/convert-heic

import express from 'express';
import cors from 'cors';
import heicConvert from 'heic-convert';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for testing

// Import the same logic from convert-heic.js
async function convertHeic(req, res) {
  try {
    const { fileData, fileName, fileType } = req.body;

    // Validate input
    if (!fileData || !fileName || !fileType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fileData, fileName, fileType'
      });
    }

    // Validate file type
    if (!fileType.toLowerCase().includes('heic') && !fileType.toLowerCase().includes('heif')) {
      return res.status(400).json({
        success: false,
        error: 'File type must be HEIC or HEIF'
      });
    }

    // Validate file size
    const base64Size = fileData.length;
    const estimatedFileSize = (base64Size * 3) / 4;

    if (estimatedFileSize > 4 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 4MB.'
      });
    }

    console.log(`🔄 Converting HEIC file: ${fileName} (${(estimatedFileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');
    const originalSize = fileBuffer.length;

    // Perform HEIC to JPEG conversion
    const jpegBuffer = await heicConvert({
      buffer: fileBuffer,
      format: 'JPEG',
      quality: 0.9
    });

    const convertedSize = jpegBuffer.length;
    const compressionRatio = ((1 - convertedSize / originalSize) * 100).toFixed(1);

    console.log(`✅ Conversion successful! Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB, JPEG: ${(convertedSize / 1024 / 1024).toFixed(2)} MB (${compressionRatio}% compression)`);

    // Convert JPEG buffer back to base64
    const jpegBase64 = jpegBuffer.toString('base64');

    // Generate new filename
    const newFileName = fileName.replace(/\.(heic|heif)$/i, '.jpg');

    // Return success response
    return res.status(200).json({
      success: true,
      jpeg: jpegBase64,
      originalSize: originalSize,
      convertedSize: convertedSize,
      fileName: newFileName,
      compressionRatio: compressionRatio
    });

  } catch (error) {
    console.error('❌ HEIC conversion error:', error);

    return res.status(500).json({
      success: false,
      error: 'HEIC conversion failed',
      details: error.message
    });
  }
}

// Routes
app.post('/api/convert-heic', convertHeic);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'HEIC Converter API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local HEIC Converter API running at http://localhost:${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/api/convert-heic`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`\n💡 Test with curl or your Chrome extension!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down local server...');
  process.exit(0);
});
