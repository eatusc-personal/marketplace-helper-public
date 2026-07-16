import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      writeBundle() {
        // Copy manifest.json
        copyFileSync('manifest.json', 'dist/manifest.json');

        // Copy every icon referenced by the manifest and popup.
        try {
          cpSync('icons', 'dist/icons', { recursive: true });
        } catch (error) {
          console.log('Icons folder not found, skipping...', error);
        }

        // Copy images exposed through web_accessible_resources.
        try {
          cpSync('img', 'dist/img', { recursive: true });
        } catch (error) {
          console.log('Img folder not found, skipping...', error);
        }


        // Copy and update popup HTML to reference built JS and CSS
        try {
          const popupHtmlPath = 'popup/index.html';
          const distPopupHtmlPath = 'dist/popup/index.html';

          // Ensure dist/popup directory exists
          mkdirSync('dist/popup', { recursive: true });

          // Read the original HTML
          let popupHtml = readFileSync(popupHtmlPath, 'utf8');

          // Add CSS link before the closing </head> tag
          const cssLink = '<link rel="stylesheet" href="../assets/popup.css">';
          popupHtml = popupHtml.replace('</head>', `${cssLink}\n  </head>`);

          // Update the script src to reference the built JavaScript
          popupHtml = popupHtml.replace(
            '<script type="module" src="/popup/index.tsx"></script>',
            '<script type="module" src="../popup.js"></script>'
          );

          // Write the updated HTML to dist
          writeFileSync(distPopupHtmlPath, popupHtml);
          console.log('✅ Popup HTML updated with CSS and JS references');
        } catch (error) {
          console.log('Error updating popup HTML:', error);
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/index.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
        manualChunks: undefined, // Disable chunk splitting for cleaner output
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        name: 'popup',
        preserveModules: false,
      },
    },
  },
})
