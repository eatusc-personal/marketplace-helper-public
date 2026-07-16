// Main message router for content script
// Imports all platform-specific modules and routes messages appropriately

import {
  detectPlatform,
  initializeContentScript,
  addTestElement
} from './shared/utils';



// Initialize the content script
const currentPlatform = detectPlatform(window.location.href);
initializeContentScript(currentPlatform);

console.log(`[DD] 🎉 ${currentPlatform} content script initialization complete!`);
addTestElement();
