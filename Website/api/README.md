# HEIC Converter API

A Vercel serverless function that converts HEIC/HEIF images to JPEG format.

## Overview

This API endpoint is designed to be used by the Chrome extension plugin to convert HEIC images to JPEG format before uploading to Supabase storage.

## Endpoint

**POST** `/api/convert-heic`

## Request Format

```json
{
  "fileData": "base64-encoded-heic-file",
  "fileName": "image.heic",
  "fileType": "image/heic"
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "jpeg": "base64-encoded-jpeg-file",
  "originalSize": 2048576,
  "convertedSize": 1024288,
  "fileName": "image.jpg",
  "compressionRatio": "50.0"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Features

- ✅ HEIC/HEIF to JPEG conversion
- ✅ 90% quality JPEG output
- ✅ File size validation (4MB limit)
- ✅ CORS headers for Chrome extension
- ✅ Comprehensive error handling
- ✅ Compression ratio reporting

## Local Testing

### Local API Server
1. Install dependencies from the `Website` directory:
   ```bash
   cd Website
   npm install
   ```

2. Start the local API server:
   ```bash
   npm run api
   ```
   Server runs at: `http://localhost:3001`

### Vercel Local Development
```bash
# Install Vercel CLI globally
npm i -g vercel

# From Website directory
cd ..
vercel dev
```
Access at: `http://localhost:3000/api/convert-heic`

## Deployment

This API is deployed as a Vercel serverless function. The endpoint will be available at:
`https://your-domain.vercel.app/api/convert-heic`

## Usage in Chrome Extension

The Chrome extension will:
1. Detect HEIC files during upload
2. Convert to base64
3. Send POST request to this API
4. Receive converted JPEG as base64
5. Upload JPEG to Supabase storage

## Error Handling

- **400**: Missing required fields or invalid file type
- **413**: File too large (>4MB)
- **405**: Invalid HTTP method
- **500**: Conversion failed

## Dependencies

- `heic-convert`: HEIC/HEIF to JPEG conversion library
