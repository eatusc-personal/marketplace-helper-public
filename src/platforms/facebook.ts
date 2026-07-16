// Facebook platform-specific content script
import {
  SharedMsgAction,
  findFieldByLabel,
  fillInputField,
  fillTextareaField,
  downloadImageAsFile,
  uploadFilesToInput,
  logAllInputs
} from '../shared/utils';

// Facebook-specific message actions
export const FacebookMsgAction = {
  ...SharedMsgAction,
  fillFacebookForm: 'fillFacebookForm',
  uploadFacebookPhotos: 'uploadFacebookPhotos',
  clickMoreDetails: 'clickMoreDetails'
} as const;

// Facebook-specific form filling function
export const fillFacebookForm = (data: any): string[] => {
  const results = [];
  logAllInputs();

  // Fill title - search by label text "Title"
  if (data.title) {
    console.log('[DD] 🔍 Looking for title field...');
    const titleField = findFieldByLabel('Title', 'input');

    if (titleField) {
      if (fillInputField(titleField, data.title)) {
        results.push('✓ Title filled');
        console.log('[DD] ✅ Title filled:', data.title);
      } else {
        results.push('✗ Title fill failed');
      }
    } else {
      console.log('[DD] ❌ Title field not found');
      results.push('✗ Title field not found');
    }
  }

  // Fill price - search by label text "Price"
  if (data.price) {
    console.log('[DD] 🔍 Looking for price field...');
    const priceField = findFieldByLabel('Price', 'input');

    if (priceField) {
      if (fillInputField(priceField, data.price)) {
        results.push('✓ Price filled');
        console.log('[DD] ✅ Price filled:', data.price);
      } else {
        results.push('✗ Price fill failed');
      }
    } else {
      console.log('[DD] ❌ Price field not found');
      results.push('✗ Price field not found');
    }
  }

  // Fill description - search by label text "Description"
  if (data.description) {
    console.log('[DD] 🔍 Looking for description field...');
    const descField = findFieldByLabel('Description', 'textarea');

    if (descField) {
      if (fillTextareaField(descField, data.description)) {
        results.push('✓ Description filled');
        console.log('[DD] ✅ Description filled');
      } else {
        results.push('✗ Description fill failed');
      }
    } else {
      console.log('[DD] ❌ Description field not found');
      results.push('✗ Description field not found');
    }
  }



  // Fill condition - search by aria-label "Condition" or aria-labelledby with "Condition" text
  if (data.condition) {
    console.log('[DD] 🔍 Looking for condition field...');

    // Debug: Log all potential condition field candidates
    console.log('[DD] 🔍 DEBUG: Searching for condition field candidates...');

    // Try multiple selectors for condition field
    let conditionField = document.querySelector('input[aria-label="Condition"], [role="combobox"][aria-label="Condition"]') as HTMLInputElement;
    console.log('[DD] 🔍 DEBUG: Found by aria-label="Condition":', conditionField);

    // If not found, try to find by aria-labelledby that points to a span containing "Condition"
    if (!conditionField) {
      // Use JavaScript to find spans containing "Condition" text
      const allSpans = document.querySelectorAll('span');
      let conditionLabel = null;

      for (const span of Array.from(allSpans)) {
        if (span.textContent && span.textContent.trim() === 'Condition') {
          conditionLabel = span;
          break;
        }
      }

      console.log('[DD] 🔍 DEBUG: Found condition label span:', conditionLabel);
      if (conditionLabel) {
        const labelId = conditionLabel.getAttribute('id');
        console.log('[DD] 🔍 DEBUG: Label ID:', labelId);
        if (labelId) {
          conditionField = document.querySelector(`[aria-labelledby="${labelId}"]`) as HTMLInputElement;
          console.log('[DD] 🔍 DEBUG: Found by aria-labelledby:', conditionField);
        }
      }
    }

    // If still not found, try to find the label element with role="combobox" that contains "Condition" text
    if (!conditionField) {
      const conditionLabels = document.querySelectorAll('label[role="combobox"]');
      console.log('[DD] 🔍 DEBUG: Found combobox labels:', conditionLabels.length);
      for (const label of Array.from(conditionLabels)) {
        const span = label.querySelector('span');
        console.log('[DD] 🔍 DEBUG: Checking label span text:', span?.textContent);
        if (span && span.textContent && span.textContent.trim() === 'Condition') {
          conditionField = label as any; // Treat the label as the field
          console.log('[DD] 🔍 DEBUG: Found condition label by text search:', conditionField);
          break;
        }
      }
    }

    if (conditionField) {
      console.log('[DD] 🔍 Filling condition:', data.condition);
      console.log('[DD] 🔍 DEBUG: Condition field element:', conditionField.tagName, conditionField.className);
      conditionField.focus();
      conditionField.click();

      // For label elements, we need to handle them differently
      if (conditionField.tagName === 'LABEL') {
        // Just click the label to open the dropdown
        console.log('[DD] ✅ Clicked condition label to open dropdown');
      } else {
        // Clear existing value and set new one for input elements
        conditionField.value = '';
        conditionField.dispatchEvent(new Event('input', { bubbles: true }));
        conditionField.value = data.condition;
        conditionField.dispatchEvent(new Event('input', { bubbles: true }));
        conditionField.dispatchEvent(new Event('change', { bubbles: true }));
        conditionField.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      // Try to find and click the dropdown option
      setTimeout(() => {
        const options = document.querySelectorAll('[role="option"], [data-testid*="option"]');
        console.log('[DD] 🔍 Looking for condition options, found:', options.length);

        for (const option of Array.from(options)) {
          console.log('[DD] 🔍 Checking option:', option.textContent);
          if (option.textContent && option.textContent.includes(data.condition)) {
            (option as HTMLElement).click();
            console.log('[DD] ✅ Clicked condition option:', data.condition);
            break;
          }
        }
      }, 500);

      results.push('✓ Condition filled');
      console.log('[DD] ✅ Condition filled:', data.condition);
    } else {
      console.log('[DD] ❌ Condition field not found');
      console.log('[DD] 🔍 DEBUG: All potential condition field selectors failed');
      results.push('✗ Condition field not found');
    }
  }

  // Click category field LAST - after all other fields are filled
  // This ensures the user sees the complete form before focusing on category selection
  if (data.category) {
    console.log('[DD] 🔍 Looking for category field...');
    const categoryField = document.querySelector('input[aria-label="Category"], [role="combobox"][aria-label="Category"]') as HTMLInputElement;

    if (categoryField) {
      console.log('[DD] 🔍 Clicking category field LAST to open dropdown for manual selection...');
      categoryField.focus();
      categoryField.click();

      // Don't fill the value - just open dropdown to indicate user should select manually
      // This is because Facebook has more granular categories than our database

      results.push('✓ Category dropdown opened LAST (manual selection required)');
      console.log('[DD] ✅ Category dropdown opened LAST - user should select category manually');
    } else {
      console.log('[DD] ❌ Category field not found');
      results.push('✗ Category field not found');
    }
  }

  return results;
};

// Facebook-specific photo upload function
export const uploadFacebookPhotos = async (photoUrls: string[]): Promise<{ success: boolean; count?: number; message?: string; error?: string }> => {
  try {
    console.log('[DD] 🔍 Looking for Facebook upload zone...');
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

// Facebook-specific "More Details" button click function
export const clickMoreDetailsButton = (): { success: boolean; expandedAfterClick?: boolean; alreadyExpanded?: boolean; error?: string } => {
  try {
    console.log('[DD] 🔍 Checking if More details section is already expanded...');

    // First, check if the section is already expanded by looking for expanded form fields
    const expandedFields = document.querySelectorAll('[aria-expanded="true"]');
    const hasExpandedFields = Array.from(expandedFields).some(field =>
      field.getAttribute('aria-label')?.includes('Condition') ||
      field.getAttribute('aria-label')?.includes('Category')
    );

    if (hasExpandedFields) {
      console.log('[DD] ✅ More details section is already expanded');
      return { success: true, expandedAfterClick: false, alreadyExpanded: true };
    }

    // Look for "More details" button with various selectors
    const moreDetailsButton = document.querySelector('[aria-label*="More details"], [aria-label*="more details"], [data-testid*="more"], button[role="button"]');

    // Also try to find by text content
    if (!moreDetailsButton) {
      const allButtons = document.querySelectorAll('button');
      for (const button of Array.from(allButtons)) {
        if (button.textContent && button.textContent.toLowerCase().includes('more details')) {
          (button as HTMLElement).click();
          console.log('[DD] ✅ Clicked More details button by text content');

          // Wait a moment for the expansion to complete
          setTimeout(() => {
            console.log('[DD] ✅ More details section should now be expanded');
          }, 1000);

          return { success: true, expandedAfterClick: true, alreadyExpanded: false };
        }
      }
    }

    if (moreDetailsButton) {
      (moreDetailsButton as HTMLElement).click();
      console.log('[DD] ✅ Clicked More details button');

      // Wait a moment for the expansion to complete
      setTimeout(() => {
        console.log('[DD] ✅ More details section should now be expanded');
      }, 1000);

      return { success: true, expandedAfterClick: true, alreadyExpanded: false };
    } else {
      console.log('[DD] ⚠️ More details button not found, but section might already be expanded');
      return { success: true, expandedAfterClick: false, alreadyExpanded: true };
    }
  } catch (error) {
    console.error('[DD] ❌ Error clicking More details:', error);
    return { success: false, error: (error as Error).message };
  }
};
