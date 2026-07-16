// Nextdoor platform-specific content script
import {
  SharedMsgAction,
  downloadImageAsFile,
  uploadFilesToInput
} from '../shared/utils';

// Nextdoor category mapping
const nextdoorCategoryMapping: { [key: string]: string } = {
  // Our database -> Nextdoor categories
  'Appliances': 'Appliances',
  'Automotive': 'Automotive',
  'Baby & kids': 'Baby & kids',
  'Bicycles': 'Bicycles',
  'Clothing & accessories': 'Clothing & accessories',
  'Electronics': 'Electronics',
  'Furniture': 'Furniture',
  'Garden': 'Garden',
  'Home decor': 'Home decor',
  'Musical instruments': 'Musical instruments',
  'Pet supplies': 'Pet supplies',
  'Sports & outdoors': 'Sports & outdoors',
  'Tickets': 'Tickets',
  'Tools': 'Tools',
  'Toys & games': 'Toys & games',

  // Facebook-only categories -> Best Nextdoor match
  'Free': 'Other',
  'Free Stuff': 'Other', // Free items still need a category on Nextdoor
  'Classifieds': 'Other', // Classifieds maps to Other on Nextdoor
  'Vehicles': 'Automotive',
  'Property Rentals': 'Property rentals',
  'Home & Garden': 'Garden',
  'Musical Instruments': 'Musical instruments',
  'Baby & Kids': 'Baby & kids',
  'Sports & Outdoors': 'Sports & outdoors',
  'Toys & Games': 'Toys & games',
  'Pets': 'Pet supplies',
  'Miscellaneous': 'Other',

  // Default fallback
  'default': 'Other'
};

// Nextdoor-specific message actions
export const NextdoorMsgAction = {
  ...SharedMsgAction,
  fillNextdoorForm: 'fillNextdoorForm',
  uploadNextdoorPhotos: 'uploadNextdoorPhotos',
  toggleFreeSwitch: 'toggleFreeSwitch',
  handleNextdoorNavigation: 'handleNextdoorNavigation',
  checkNextdoorListingPage: 'checkNextdoorListingPage'
} as const;

// Nextdoor-specific form filling function
export const fillNextdoorForm = async (data: any): Promise<{ success: boolean; result?: string[]; error?: string }> => {
  const results: string[] = [];
  const logs: string[] = [];
  const addLog = (message: string) => {
    console.log(`[ND] ${message}`);
    logs.push(message);
  };

  try {
    addLog('🎯 Starting Nextdoor form fill process');
    addLog(`📋 Data: ${JSON.stringify(data, null, 2)}`);

    // 1. Fill Title field
    if (data.title) {
      addLog('📝 Filling title field...');
      const titleInput = document.querySelector('input[aria-label="Title"]') as HTMLInputElement;
      if (titleInput) {
        titleInput.focus();
        titleInput.value = '';
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 100));

        titleInput.value = data.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        titleInput.dispatchEvent(new Event('blur', { bubbles: true }));
        results.push('✓ Title filled');
        addLog(`✅ Title filled: "${data.title}"`);
      } else {
        addLog('❌ Title input not found');
        results.push('✗ Title field not found');
      }
    }

    // 2. Fill Description field
    if (data.description) {
      addLog('📝 Filling description field...');
      const descTextarea = document.querySelector('textarea[aria-label="Describe your item"]') as HTMLTextAreaElement;
      if (descTextarea) {
        descTextarea.focus();
        descTextarea.value = '';
        descTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 100));

        descTextarea.value = data.description;
        descTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        descTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        descTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
        results.push('✓ Description filled');
        addLog(`✅ Description filled: "${data.description.substring(0, 50)}..."`);
      } else {
        addLog('❌ Description textarea not found');
        results.push('✗ Description field not found');
      }
    }

    // 3. Handle Price and Free toggle
    const isFreeListing = (
      typeof data.category_id === 'string' && ['free', 'free stuff'].includes(data.category_id.trim().toLowerCase())
    ) || (data.price !== undefined && parseFloat(data.price) === 0);

    if (isFreeListing) {
      // For free items, toggle the Free switch
      addLog('🆓 Free listing detected, toggling Free switch...');
      const freeToggle = document.querySelector('button[role="switch"][aria-checked="false"]') as HTMLButtonElement;
      if (freeToggle) {
        freeToggle.click();
        addLog('✅ Free toggle activated');
        await new Promise(resolve => setTimeout(resolve, 300));
        results.push('✓ Free toggle activated');
      } else {
        addLog('❌ Free toggle not found or already activated');
        results.push('✗ Free toggle not found');
      }
    } else if (data.price !== undefined) {
      // Fill price field for paid items
      const price = parseFloat(data.price) || 0;
      addLog(`💰 Processing price: ${price}`);
      addLog('📝 Filling price field...');
      const priceInput = document.querySelector('input[aria-label="Price"]') as HTMLInputElement;
      if (priceInput) {
        priceInput.focus();
        priceInput.value = '';
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 100));

        priceInput.value = price.toString();
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
        priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        priceInput.dispatchEvent(new Event('blur', { bubbles: true }));
        results.push('✓ Price filled');
        addLog(`✅ Price filled: $${price}`);
      } else {
        addLog('❌ Price input not found');
        results.push('✗ Price field not found');
      }
    }

    // 4. Handle Category (always select a category, even for free listings)
    if (data.category_id) {
      addLog('📝 Filling category field...');

      // Map the category using our mapping table
      const mappedCategory = nextdoorCategoryMapping[data.category_id] || nextdoorCategoryMapping['default'];
      addLog(`🗺️ Mapping "${data.category_id}" -> "${mappedCategory}"`);

      if (isFreeListing) {
        addLog('🆓 Free listing - still selecting category for Nextdoor requirements');
      }

      // Prefer the button that contains an input with aria-label="Category"
      const categoryInputEl = document.querySelector('input[aria-label="Category"]') as HTMLInputElement | null;
      let categoryButton: HTMLButtonElement | null = null;
      if (categoryInputEl) {
        categoryButton = categoryInputEl.closest('button') as HTMLButtonElement | null;
      }
      if (!categoryButton) {
        categoryButton = document.querySelector('button[aria-haspopup="menu"][aria-controls*="id-"]') as HTMLButtonElement | null;
      }

      if (categoryButton) {
        addLog('🔍 Found category dropdown button');

        // Open dropdown if not expanded
        if (categoryButton.getAttribute('aria-expanded') !== 'true') {
          categoryButton.click();
          await new Promise(resolve => setTimeout(resolve, 600));
        }

        const menuId = categoryButton.getAttribute('aria-controls') || '';
        addLog(`🔍 Looking for menu with ID: ${menuId}`);

        // Wait briefly for menu to attach to DOM
        const waitForMenu = async () => {
          for (let i = 0; i < 10; i++) {
            const menu = menuId ? document.getElementById(menuId) : null;
            if (menu) return menu;
            await new Promise(r => setTimeout(r, 100));
          }
          return null;
        };
        const menuEl = await waitForMenu();
        if (!menuEl) {
          addLog('⚠️ Menu container not found by ID, falling back to global query');
        }

        // Query options, scoped to menu when possible
        const queryIn = (root: ParentNode) => root.querySelectorAll(
          '[role="menuitemradio"], [role="menuitem"], [role="option"], button'
        );
        let dropdownOptions: NodeListOf<Element> = menuEl ? queryIn(menuEl) : document.querySelectorAll('[role="menuitemradio"], [role="menuitem"], [role="option"], button');

        addLog(`🔍 Found ${dropdownOptions.length} potential options`);
        if (dropdownOptions.length > 0) {
          // Log compact list
          Array.from(dropdownOptions).slice(0, 50).forEach((option, index) => {
            const txt = (option as HTMLElement).textContent?.trim() || '';
            if (txt && txt.length < 100) addLog(`${index + 1}: "${txt}"`);
          });

          const targetCategory = mappedCategory.toLowerCase();
          let categoryFound = false;
          for (const option of Array.from(dropdownOptions)) {
            const txt = ((option as HTMLElement).textContent || '').trim().toLowerCase();
            if (!txt) continue;
            if (txt === targetCategory || txt.includes(targetCategory)) {
              addLog(`✅ Found matching category option: "${(option as HTMLElement).textContent?.trim()}"`);
              (option as HTMLElement).click();
              categoryFound = true;
              await new Promise(r => setTimeout(r, 300));
              break;
            }
          }

          if (!categoryFound) {
            addLog(`⚠️ No exact/partial category match for "${mappedCategory}"`);
            results.push('✗ Category not found in dropdown');
          } else {
            results.push('✓ Category filled');
          }

          // Close the dropdown if still open
          if (categoryButton.getAttribute('aria-expanded') === 'true') {
            categoryButton.click();
            await new Promise(r => setTimeout(r, 200));
          }

          // Log resulting button text/value
          const btnText = categoryButton.textContent?.trim() || '';
          addLog(`🔍 Category button text after selection: "${btnText}"`);
        } else {
          addLog('❌ No dropdown options found after opening category menu');
          results.push('✗ No category options found');
        }

        addLog(`✅ Category handling completed for: "${data.category_id}"`);
      } else {
        addLog('❌ Category dropdown button not found');
        results.push('✗ Category dropdown not found');
      }
    }

    // 5. Handle Photo Upload
    if (data.photos && data.photos.length > 0) {
      addLog('📸 Processing photo upload...');
      addLog(`📋 Photos to upload: ${data.photos.length}`);

      const photoInput = document.querySelector('input[type="file"][aria-label="Add photos"]') as HTMLInputElement;
      if (photoInput) {
        addLog('✅ Found photo input element');

        try {
          // Fetch and convert photos to files
          addLog('📡 Fetching photos from Supabase...');
          const photoFiles = await Promise.all(data.photos.map(async (photo: any, index: number) => {
            const photoUrl = typeof photo === 'string' ? photo : photo.photo_url;
            addLog(`📸 Fetching photo ${index + 1}: ${photoUrl}`);

            const response = await fetch(photoUrl, {
              mode: 'cors',
              cache: 'no-cache',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status} for ${photoUrl}`);
            }

            const blob = await response.blob();
            const fileName = photoUrl.split('/').pop() || `photo_${index + 1}.jpg`;
            const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

            addLog(`✅ Photo ${index + 1} converted: ${fileName} (${file.size} bytes)`);
            return file;
          }));

          // Create DataTransfer object
          const dataTransfer = new DataTransfer();
          photoFiles.forEach((file, index) => {
            dataTransfer.items.add(file);
            addLog(`📋 Added photo ${index + 1} to DataTransfer: ${file.name}`);
          });

          // Set files on input
          Object.defineProperty(photoInput, 'files', {
            value: dataTransfer.files,
            writable: false
          });

          addLog('🎯 Simulating enhanced photo upload (preventing file dialog)...');

          // Find the upload container
          const uploadContainer = photoInput.closest('[data-testid="uploader"]') ||
                                photoInput.closest('.uploader-group') ||
                                photoInput.parentElement;

          if (uploadContainer) {
            addLog('✅ Found upload container, simulating drag & drop...');

            // Only simulate drag and drop events (more passive approach)
            const dragEvent = new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer
            });

            uploadContainer.dispatchEvent(dragEvent);
            addLog(`📤 Dispatched: drop event on upload container`);
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // Minimal event triggering to avoid file dialog
          addLog('🔇 Using minimal event triggering to prevent file dialog...');

          // Only trigger essential events without focusing the input
          const changeEvent = new Event('change', { bubbles: true });
          Object.defineProperty(changeEvent, 'target', { value: photoInput, writable: false });
          photoInput.dispatchEvent(changeEvent);
          addLog(`📤 Dispatched: change event`);

          // Wait and check if photos appear in UI
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Check for photo previews
          const photoPreviewSelectors = [
            'img[src*="blob:"]',
            'img[src*="data:"]',
            '.uploader img',
            '[data-testid*="photo"] img',
            '[data-testid*="image"] img'
          ];

          let foundPreviews = 0;
          for (const selector of photoPreviewSelectors) {
            const previews = document.querySelectorAll(selector);
            foundPreviews += previews.length;
          }

          addLog(`🔍 Found ${foundPreviews} photo preview elements in UI`);

          if (foundPreviews > 0) {
            results.push('✓ Photos uploaded');
            addLog(`✅ Photos uploaded successfully: ${photoFiles.length} files`);
          } else {
            results.push('✗ Photos upload failed');
            addLog(`⚠️ No photo previews found in UI`);
          }

        } catch (error) {
          addLog(`❌ Photo upload failed: ${error}`);
          results.push('✗ Photo upload failed');
        }
      } else {
        addLog('❌ Photo input not found');
        results.push('✗ Photo input not found');
      }
    } else {
      addLog('📸 No photos to upload');
    }

    // 6. Click the Next button
    addLog('🔍 Looking for Next button...');
    const nextButton = document.querySelector('button[aria-label="Next"]') as HTMLButtonElement;
    if (nextButton) {
      addLog('✅ Found Next button (not clicking automatically - user can review first)');
      results.push('✓ Next button found (not clicked)');
      addLog('✅ Next button found - user can review form before clicking');
    } else {
      addLog('❌ Next button not found');
      results.push('✗ Next button not found');
    }

    addLog('✅ Nextdoor form fill completed');
    return {
      success: true,
      result: results
    };

  } catch (error) {
    addLog(`❌ Error during form fill: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Nextdoor-specific photo upload function
export const uploadNextdoorPhotos = async (photoUrls: string[]): Promise<{ success: boolean; count?: number; message?: string; error?: string }> => {
  try {
    console.log('[DD] 🔍 Looking for Nextdoor upload zone...');
    const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;

    if (!fileInput) {
      console.log('[DD] ❌ Upload file input not found');
      return { success: false, error: 'Upload file input not found' };
    }

    console.log('[DD] ✅ Found upload file input:', fileInput.tagName, fileInput.className);
    console.log('[DD] 📸 Photo URLs to upload:', photoUrls);

    // Convert URLs to File objects and upload
    const uploadPromises = photoUrls.map((photoUrl, index) => downloadImageAsFile(photoUrl, index));

    // Wait for all photos to be processed
    const files = await Promise.all(uploadPromises);
    console.log('[DD] ✅ All photos processed, files:', files.length);

    // Upload files to input
    if (uploadFilesToInput(fileInput, files)) {
      console.log('[DD] ✅ Photos uploaded successfully!');
      return { success: true, count: files.length, message: 'Photos uploaded successfully' };
    } else {
      return { success: false, error: 'Failed to upload files to input' };
    }
  } catch (error) {
    console.error('[DD] ❌ Upload error:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Nextdoor-specific free switch toggle function
export const toggleFreeSwitch = (isFree: boolean): { success: boolean; error?: string } => {
  try {
    console.log('[DD] 🔍 Looking for free switch...');

    // Look for free switch by various selectors
    const freeSwitch = document.querySelector('input[type="checkbox"], [role="switch"], [data-testid*="free"]') as HTMLInputElement;

    if (freeSwitch) {
      if (freeSwitch.checked !== isFree) {
        freeSwitch.click();
        console.log('[DD] ✅ Free switch toggled to:', isFree);
      } else {
        console.log('[DD] ✅ Free switch already in correct state:', isFree);
      }
      return { success: true };
    } else {
      console.log('[DD] ❌ Free switch not found');
      return { success: false, error: 'Free switch not found' };
    }
  } catch (error) {
    console.error('[DD] ❌ Error toggling free switch:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Nextdoor navigation function to handle Post and Skip buttons
export const handleNextdoorNavigation = async (): Promise<{ success: boolean; status?: string; message?: string; error?: string }> => {
  try {
    console.log('[DD] 🔍 Starting Nextdoor navigation...');

    // First, check if we're already on the listing form
    const titleField = document.querySelector('input[aria-label="Title"]') as HTMLInputElement;
    const descField = document.querySelector('textarea[aria-label="Describe your item"]') as HTMLTextAreaElement;

    if (titleField || descField) {
      console.log('[DD] ✅ Already on listing form, no navigation needed');
      return { success: true, status: 'form_ready', message: 'Already on listing form' };
    }

    // Check if Post button is visible and click it
    const postButton = document.querySelector('div[data-part="button"] div[data-part="children"]') as HTMLElement;
    if (postButton && postButton.textContent?.trim() === 'Post') {
      console.log('[DD] 🔍 Found Post button, clicking it...');
      postButton.click();

      // Wait for the dialog to appear and then click Skip
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Now look for Skip button
      const skipButton = document.querySelector('button[aria-label="Skip"]') as HTMLButtonElement;
      if (skipButton) {
        console.log('[DD] 🔍 Found Skip button, clicking it...');
        skipButton.click();

        // Wait for the form to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if we're now on the listing form
        const newTitleField = document.querySelector('input[aria-label="Title"]') as HTMLInputElement;
        const newDescField = document.querySelector('textarea[aria-label="Describe your item"]') as HTMLTextAreaElement;

        if (newTitleField || newDescField) {
          console.log('[DD] ✅ Successfully navigated to listing form');
          return { success: true, status: 'form_ready', message: 'Successfully navigated to listing form' };
        } else {
          console.log('[DD] ⚠️ Navigation completed but form not ready yet');
          return { success: true, status: 'form_not_ready', message: 'Navigation completed, form may need more time' };
        }
      } else {
        console.log('[DD] ❌ Skip button not found after clicking Post');
        return { success: false, error: 'Skip button not found after clicking Post' };
      }
    }

    // If Post button not found, check if Skip button is directly available
    const skipButton = document.querySelector('button[aria-label="Skip"]') as HTMLButtonElement;
    if (skipButton) {
      console.log('[DD] 🔍 Found Skip button directly, clicking it...');
      skipButton.click();

      // Wait for the form to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if we're now on the listing form
      const newTitleField = document.querySelector('input[aria-label="Title"]') as HTMLInputElement;
      const newDescField = document.querySelector('textarea[aria-label="Describe your item"]') as HTMLTextAreaElement;

      if (newTitleField || newDescField) {
        console.log('[DD] ✅ Successfully navigated to listing form');
        return { success: true, status: 'form_ready', message: 'Successfully navigated to listing form' };
      } else {
        console.log('[DD] ⚠️ Navigation completed but form not ready yet');
        return { success: true, status: 'form_not_ready', message: 'Navigation completed, form may need more time' };
      }
    }

    console.log('[DD] ❌ Neither Post nor Skip button found');
    return { success: false, error: 'Neither Post nor Skip button found' };

  } catch (error) {
    console.error('[DD] ❌ Error in Nextdoor navigation:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Check if we're on the Nextdoor listing creation page
export const checkNextdoorListingPage = (): { success: boolean; isOnListingPage: boolean; message?: string } => {
  try {
    console.log('[DD] 🔍 Checking if on Nextdoor listing page...');

    // Look for form fields that indicate we're on the listing creation page
    const titleField = document.querySelector('input[aria-label="Title"]') as HTMLInputElement || document.querySelector('input[aria-label="What are you selling?"]') as HTMLInputElement;
    const priceField = document.querySelector('input[aria-label="Price"]') as HTMLInputElement || document.querySelector('input[aria-label="How much?"]') as HTMLInputElement;
    const descField = document.querySelector('textarea[aria-label="Description"]') as HTMLTextAreaElement || document.querySelector('textarea[aria-label="Tell us more"]') as HTMLTextAreaElement;

    const isOnListingPage = !!(titleField || priceField || descField);

    if (isOnListingPage) {
      console.log('[DD] ✅ Confirmed on Nextdoor listing creation page');
      return { success: true, isOnListingPage: true, message: 'On listing creation page' };
    } else {
      console.log('[DD] ❌ Not on Nextdoor listing creation page');
      return { success: true, isOnListingPage: false, message: 'Not on listing creation page' };
    }

  } catch (error) {
    console.error('[DD] ❌ Error checking Nextdoor listing page:', error);
    return { success: false, isOnListingPage: false, message: (error as Error).message };
  }
};
