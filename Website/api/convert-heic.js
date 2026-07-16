// HEIC to JPEG Converter API
// Vercel Serverless Function
// Endpoint: /api/convert-heic

import heicConvert from 'heic-convert';

export default async function handler(req, res) {
  // Set CORS headers for Chrome extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

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

    // Validate file size (Vercel has 4.5MB limit for request body)
    const base64Size = fileData.length;
    const estimatedFileSize = (base64Size * 3) / 4; // Base64 is ~33% larger than binary

    if (estimatedFileSize > 4 * 1024 * 1024) { // 4MB limit to be safe
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
      quality: 0.9 // 90% quality for good balance of size/quality
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
