# HEIC Converter API - Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install with `npm i -g vercel`
3. **Git Repository**: Ensure your code is in a Git repository

## Deployment Steps

### 1. Install Dependencies

```bash
cd Website
npm install
```

### 2. Deploy to Vercel

```bash
# From the Website directory
vercel

# Follow the prompts:
# - Link to existing project or create new one
# - Set project name (e.g., "marketplace-heic-converter")
# - Confirm settings
```

### 3. Configure Environment (if needed)

```bash
# Set any environment variables
vercel env add VARIABLE_NAME
```

### 4. Test Deployed API

```bash
# Get the deployment URL from Vercel dashboard
curl -X POST https://your-project.vercel.app/api/convert-heic \
  -H "Content-Type: application/json" \
  -d '{"fileData":"base64-data","fileName":"test.heic","fileType":"image/heic"}'
```

## Vercel Configuration

The API will be automatically detected as a serverless function because:
- File is located at `/api/convert-heic.js`
- Exports a default function handler
- Follows Vercel's serverless function format

## Monitoring

- **Vercel Dashboard**: Monitor function invocations and performance
- **Function Logs**: View logs in Vercel dashboard
- **Analytics**: Track usage and response times

## Updates

To update the deployed function:

```bash
# Make changes to convert-heic.js
# Then redeploy
vercel --prod
```

## Cost Considerations

- **Free Tier**: 100GB-hours of execution time per month
- **Pro Tier**: $20/month for additional resources
- **HEIC Conversion**: Typically takes 1-3 seconds per image

## Troubleshooting

### Common Issues

1. **Function Timeout**: Increase timeout in Vercel settings
2. **Memory Issues**: Large HEIC files may need more memory
3. **CORS Errors**: Ensure CORS headers are set correctly

### Debug Mode

Enable debug logging by adding to your function:
```javascript
console.log('Debug info:', { fileSize, fileName, etc });
```

## Security

- ✅ CORS configured for Chrome extension
- ✅ File size limits enforced
- ✅ Input validation
- ✅ Error handling without sensitive data exposure
