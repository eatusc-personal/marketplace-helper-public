// Shared utilities for all platform content scripts

import { debugLog } from './debug';

export type RuntimeMsg = {
  action: string;
  data?: any;
};

export const SharedMsgAction = {
  ping: 'ping',
  detectPage: 'detectPage',
  debugPage: 'debugPage'
} as const;

// Platform detection utilities
export const detectPlatform = (url: string): 'facebook' | 'nextdoor' | 'craigslist' | 'unknown' => {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return 'unknown';
  }

  if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com')) return 'facebook';
  if (hostname === 'nextdoor.com' || hostname.endsWith('.nextdoor.com')) return 'nextdoor';
  if (hostname === 'craigslist.org' || hostname.endsWith('.craigslist.org')) return 'craigslist';
  return 'unknown';
};

// Common DOM utilities
export const findFieldByLabel = (labelText: string, fieldType: 'input' | 'textarea' | 'select' = 'input'): HTMLElement | null => {
  const label = Array.from(document.querySelectorAll('span')).find(span =>
    span.textContent && span.textContent.trim() === labelText
  );

  if (label) {
    const labelContainer = label.closest('label');
    if (labelContainer) {
      return labelContainer.querySelector(fieldType) as HTMLElement;
    }
  }

  return null;
};

export const fillInputField = (field: HTMLElement, value: string): boolean => {
  try {
    field.focus();
    (field as HTMLInputElement).value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  } catch (error) {
    console.error('[DD] ❌ Error filling input field:', error);
    return false;
  }
};

export const fillTextareaField = (field: HTMLElement, value: string): boolean => {
  try {
    field.focus();
    (field as HTMLTextAreaElement).value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  } catch (error) {
    console.error('[DD] ❌ Error filling textarea field:', error);
    return false;
  }
};

// Photo upload utilities
export const downloadImageAsFile = async (photoUrl: string, index: number): Promise<File> => {
  debugLog(`[DD] 📸 Downloading photo ${index + 1}:`, photoUrl);

  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  const fileName = `photo_${index + 1}.jpg`;
  const file = new File([blob], fileName, { type: 'image/jpeg' });

  debugLog(`[DD] ✅ Photo ${index + 1} converted to file:`, file.name, file.size);
  return file;
};

export const uploadFilesToInput = (fileInput: HTMLInputElement, files: File[]): boolean => {
  try {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
  } catch (error) {
    console.error('[DD] ❌ Error uploading files:', error);
    return false;
  }
};

// Debug utilities
export const logAllInputs = (): void => {
  debugLog('[DD] 🔍 All inputs on page:');
  const allInputs = document.querySelectorAll('input, textarea');
  allInputs.forEach((input, index) => {
    debugLog(`[DD] Input ${index}:`, {
      tagName: input.tagName,
      type: (input as HTMLInputElement).type,
      placeholder: (input as HTMLInputElement).placeholder,
      ariaLabel: input.getAttribute('aria-label'),
      id: input.id,
      className: input.className
    });
  });
};

// Content script initialization utilities
export const initializeContentScript = (platform: string): void => {
  debugLog(`[DD] 🚀 ${platform} content script loading...`);
  debugLog('[DD] 📍 Current URL:', window.location.href);
  debugLog('[DD] 📍 Script execution started at:', new Date().toISOString());

  // Test if we can access the window object
  try {
    debugLog('[DD] 📍 Window object accessible:', typeof window !== 'undefined');
    debugLog('[DD] 📍 Document object accessible:', typeof document !== 'undefined');
    debugLog('[DD] 📍 Chrome runtime available:', typeof chrome !== 'undefined');
    debugLog('[DD] 📍 Chrome runtime onMessage available:', typeof chrome.runtime.onMessage !== 'undefined');
  } catch (error) {
    console.error('[DD] ❌ Error accessing basic objects:', error);
  }

  // Set ready flags immediately
  debugLog('[DD] 🎯 Setting ready flags immediately...');
  try {
    (window as any).marketplaceHelperReady = true;
    (window as any).__marketplaceHelperInitialized = true;
    debugLog('[DD] ✅ Ready flags set successfully!');
  } catch (error) {
    console.error('[DD] ❌ Error setting ready flags:', error);
  }

  // Add a global test function
  (window as any).testMarketplaceHelper = () => {
    debugLog('[DD] 🧪 Manual test function called!');
    debugLog('[DD] 📍 Current URL:', window.location.href);
    debugLog('[DD] 📍 Content script is working!');
    return 'Content script is loaded and working!';
  };

  // Check Chrome runtime availability
  debugLog('[DD] 📍 Chrome runtime available:', typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined');
  debugLog('[DD] 📍 Chrome runtime onMessage available:', typeof chrome.runtime.onMessage !== 'undefined');
};
