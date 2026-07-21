// Craigslist platform-specific content script
import {
  SharedMsgAction,
  downloadImageAsFile,
  uploadFilesToInput
} from '../shared/utils';
import { debugLog } from '../shared/debug';

// Craigslist-specific message actions
export const CraigslistMsgAction = {
  ...SharedMsgAction,
  fillCraigslistForm: 'fillCraigslistForm',
  uploadCraigslistPhotos: 'uploadCraigslistPhotos',
  clickCraigslistPostAd: 'clickCraigslistPostAd',
  selectCraigslistPostingType: 'selectCraigslistPostingType',
  chooseCraigslistCategory: 'chooseCraigslistCategory',
  checkCraigslistPostingPage: 'checkCraigslistPostingPage'
} as const;

// Craigslist category mapping
const craigslistCategoryMapping: { [key: string]: string } = {
  'antiques': '150',
  'appliances': '149',
  'arts & crafts': '135',
  'atvs, utvs, snowmobiles': '191',
  'auto parts': '122',
  'auto wheels & tires': '203',
  'aviation': '208',
  'baby & kid stuff': '107',
  'barter': '42',
  'bicycle parts': '197',
  'bicycles': '68',
  'boat parts': '201',
  'boats': '119',
  'books & magazines': '92',
  'business/commercial': '134',
  'cars & trucks ($5)': '145',
  'cds / dvds / vhs': '117',
  'cell phones': '153',
  'clothing & accessories': '94',
  'collectibles': '95',
  'computer parts': '199',
  'computers': '7',
  'electronics': '96',
  'farm & garden': '133',
  'free stuff': '101',
  'furniture': '141',
  'garage & moving sales': '73',
  'general for sale': '5',
  'health and beauty': '152',
  'heavy equipment': '193',
  'household items': '97',
  'jewelry': '120',
  'materials': '136',
  'motorcycle parts': '195',
  'motorcycles/scooters ($5)': '69',
  'musical instruments': '98',
  'photo/video': '137',
  'rvs ($5)': '124',
  'sporting goods': '93',
  'tickets': '44',
  'tools': '118',
  'toys & games': '132',
  'trailers': '205',
  'video gaming': '151',
  'wanted': '20'
};

// Craigslist condition mapping
const craigslistConditionMapping: { [key: string]: string } = {
  'New': '10',
  'Used - Like New': '20', // Maps to 'like new'
  'Used - Good': '40',
  'Used - Fair': '50'
};

// Function to click the "post an ad" link
export const clickCraigslistPostAd = (): { success: boolean; message?: string; error?: string } => {
  try {
    debugLog('[DD] 🔍 Looking for "post an ad" link...');

    // Look for the post an ad link in the ul#postlks
    const postLink = document.querySelector('ul#postlks a#post[href*="post.craigslist.org"]') as HTMLAnchorElement;

    if (postLink) {
      debugLog('[DD] ✅ Found "post an ad" link, clicking it...');
      postLink.click();
      return { success: true, message: 'Clicked post an ad link' };
    } else {
      debugLog('[DD] ❌ "post an ad" link not found');
      return { success: false, error: 'Post an ad link not found' };
    }
  } catch (error) {
    console.error('[DD] ❌ Error clicking post ad link:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Function to select "for sale by owner"
export const selectCraigslistPostingType = (): { success: boolean; message?: string; error?: string } => {
  try {
    debugLog('[DD] 🔍 Looking for "for sale by owner" radio button...');

    // Look for the for sale by owner radio button
    const forSaleByOwnerRadio = document.querySelector('input[type="radio"][name="id"][value="fso"]') as HTMLInputElement;

    if (forSaleByOwnerRadio) {
      debugLog('[DD] ✅ Found "for sale by owner" radio, selecting it...');
      forSaleByOwnerRadio.checked = true;
      forSaleByOwnerRadio.click();

      // Click the continue button
      const continueButton = document.querySelector('button[type="submit"][name="go"][value="Continue"]') as HTMLButtonElement;
      if (continueButton) {
        debugLog('[DD] ✅ Found continue button, clicking it...');
        continueButton.click();
        return { success: true, message: 'Selected for sale by owner and clicked continue' };
      } else {
        return { success: true, message: 'Selected for sale by owner (continue button not found)' };
      }
    } else {
      debugLog('[DD] ❌ "for sale by owner" radio button not found');
      return { success: false, error: 'For sale by owner radio button not found' };
    }
  } catch (error) {
    console.error('[DD] ❌ Error selecting posting type:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Function to choose Craigslist category
export const chooseCraigslistCategory = (categoryName: string): { success: boolean; message?: string; error?: string } => {
  try {
    debugLog('[DD] 🔍 Looking for category selection page...');

    // Check if we're on the category selection page
    const categoryForm = document.querySelector('.json-form-item.select.id.category-select');
    if (!categoryForm) {
      debugLog('[DD] ❌ Not on category selection page');
      return { success: false, error: 'Not on category selection page' };
    }

    // Find the category value
    const categoryValue = craigslistCategoryMapping[categoryName.toLowerCase()];
    if (!categoryValue) {
      debugLog('[DD] ❌ Category not found in mapping:', categoryName);
      return { success: false, error: `Category "${categoryName}" not found in mapping` };
    }

    debugLog('[DD] 🔍 Looking for category radio button with value:', categoryValue);

    // Find the radio button for this category
    const categoryRadio = document.querySelector(`input[type="radio"][name="id"][value="${categoryValue}"]`) as HTMLInputElement;

    if (categoryRadio) {
      debugLog('[DD] ✅ Found category radio button, selecting it...');
      categoryRadio.checked = true;
      categoryRadio.click();

      // Click the continue button
      const continueButton = document.querySelector('button[type="submit"][name="go"][value="Continue"]') as HTMLButtonElement;
      if (continueButton) {
        debugLog('[DD] ✅ Found continue button, clicking it...');
        continueButton.click();
        return { success: true, message: `Selected category: ${categoryName}` };
      } else {
        return { success: true, message: `Selected category: ${categoryName} (continue button not found)` };
      }
    } else {
      debugLog('[DD] ❌ Category radio button not found for value:', categoryValue);
      return { success: false, error: `Category radio button not found for "${categoryName}"` };
    }
  } catch (error) {
    console.error('[DD] ❌ Error choosing category:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Function to check if we're on a Craigslist posting page
export const checkCraigslistPostingPage = (): { success: boolean; message?: string; error?: string } => {
  try {
    debugLog('[DD] 🔍 Checking if on Craigslist posting page...');

    // Check for various indicators that we're on a posting page
    const hasPostLink = document.querySelector('ul#postlks a#post[href*="post.craigslist.org"]');
    const hasForSaleRadio = document.querySelector('input[type="radio"][name="id"][value="fso"]');
    const hasCategoryForm = document.querySelector('.json-form-item.select.id.category-select');
    const hasTitleField = document.querySelector('input[name="PostingTitle"]');
    const hasDescriptionField = document.querySelector('textarea[name="PostingBody"]');
    const hasPhotoUpload = document.querySelector('input[type="file"][accept*="image"]') ||
                          document.querySelector('.uploader-fileinput') ||
                          document.querySelector('[data-testid="attachment-manager-drag-upload"]');

    // Check for city/area selection page by looking for the specific text in any span
    const allSpans = document.querySelectorAll('span');
    let hasCityAreaPage = false;
    for (const span of Array.from(allSpans)) {
      if (span.textContent?.trim() === 'which city / area would you like to post to?') {
        hasCityAreaPage = true;
        break;
      }
    }

    // Check for skip/re-use page by looking for buttons with specific text
    const skipButton = document.querySelector('button[type="submit"][name="brand_new_post"][value="1"]');
    const reuseButton = document.querySelector('button[type="submit"][name="continue"][value="1"]');
    const hasSkipOrReusePage = (skipButton && skipButton.textContent?.trim().toLowerCase() === 'skip') ||
                              (reuseButton && reuseButton.textContent?.trim().toLowerCase() === 're-use selected data');

    if (hasCityAreaPage) {
      return { success: true, message: 'On city/area selection page' };
    } else if (hasSkipOrReusePage) {
      return { success: true, message: 'On skip/re-use selected data page' };
    } else if (hasPostLink) {
      return { success: true, message: 'On Craigslist main page with post link' };
    } else if (hasForSaleRadio) {
      return { success: true, message: 'On posting type selection page' };
    } else if (hasCategoryForm) {
      return { success: true, message: 'On category selection page' };
    } else if (hasTitleField || hasDescriptionField) {
      return { success: true, message: 'On form details page' };
    } else if (hasPhotoUpload) {
      return { success: true, message: 'On photo upload page' };
    } else {
      return { success: false, error: 'Not on a recognized Craigslist posting page' };
    }
  } catch (error) {
    console.error('[DD] ❌ Error checking posting page:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Craigslist-specific form filling function
export const fillCraigslistForm = (data: any): { success: boolean; results?: string[]; error?: string } => {
  try {
    const results = [];
    debugLog('[DD] 🔍 Starting Craigslist form fill...');

    // Fill title - search by name "PostingTitle"
    if (data.title) {
      debugLog('[DD] 🔍 Looking for title field...');
      const titleField = document.querySelector('input[name="PostingTitle"]') as HTMLInputElement;

      if (titleField) {
        titleField.value = data.title;
        titleField.dispatchEvent(new Event('input', { bubbles: true }));
        titleField.dispatchEvent(new Event('change', { bubbles: true }));
        results.push('✓ Title filled');
        debugLog('[DD] ✅ Title filled:', data.title);
      } else {
        debugLog('[DD] ❌ Title field not found');
        results.push('✗ Title field not found');
      }
    }

    // Fill price - search by name "price"
    if (data.price) {
      debugLog('[DD] 🔍 Looking for price field...');
      const priceField = document.querySelector('input[name="price"]') as HTMLInputElement;

      if (priceField) {
        priceField.value = data.price;
        priceField.dispatchEvent(new Event('input', { bubbles: true }));
        priceField.dispatchEvent(new Event('change', { bubbles: true }));
        results.push('✓ Price filled');
        debugLog('[DD] ✅ Price filled:', data.price);
      } else {
        debugLog('[DD] ❌ Price field not found');
        results.push('✗ Price field not found');
      }
    }

    // Fill description - search by name "PostingBody"
    if (data.description) {
      debugLog('[DD] 🔍 Looking for description field...');
      const descField = document.querySelector('textarea[name="PostingBody"]') as HTMLTextAreaElement;

      if (descField) {
        descField.value = data.description;
        descField.dispatchEvent(new Event('input', { bubbles: true }));
        descField.dispatchEvent(new Event('change', { bubbles: true }));
        results.push('✓ Description filled');
        debugLog('[DD] ✅ Description filled');
      } else {
        debugLog('[DD] ❌ Description field not found');
        results.push('✗ Description field not found');
      }
    }

    // Fill zipcode - search by name "postal"
    if (data.zipcode) {
      debugLog('[DD] 🔍 Looking for zipcode field...');
      const zipField = document.querySelector('input[name="postal"]') as HTMLInputElement;

      if (zipField) {
        zipField.value = data.zipcode;
        zipField.dispatchEvent(new Event('input', { bubbles: true }));
        zipField.dispatchEvent(new Event('change', { bubbles: true }));
        results.push('✓ Zipcode filled');
        debugLog('[DD] ✅ Zipcode filled:', data.zipcode);
      } else {
        debugLog('[DD] ❌ Zipcode field not found');
        results.push('✗ Zipcode field not found');
      }
    }

    // Fill city/neighborhood - search by name "geographic_area"
    if (data.city) {
      debugLog('[DD] 🔍 Looking for city/neighborhood field...');
      const cityField = document.querySelector('input[name="geographic_area"]') as HTMLInputElement;

      if (cityField) {
        cityField.value = data.city;
        cityField.dispatchEvent(new Event('input', { bubbles: true }));
        cityField.dispatchEvent(new Event('change', { bubbles: true }));
        results.push('✓ City/neighborhood filled');
        debugLog('[DD] ✅ City/neighborhood filled:', data.city);
      } else {
        debugLog('[DD] ❌ City/neighborhood field not found');
        results.push('✗ City/neighborhood field not found');
      }
    }

    // Fill email - search by name "FromEMail"
    if (data.email) {
      debugLog('[DD] 🔍 Looking for email field...');
      const emailField = document.querySelector('input[name="FromEMail"]') as HTMLInputElement;

      if (emailField) {
        emailField.value = data.email;
        emailField.dispatchEvent(new Event('input', { bubbles: true }));
        emailField.dispatchEvent(new Event('change', { bubbles: true }));
        results.push('✓ Email filled');
        debugLog('[DD] ✅ Email filled:', data.email);
      } else {
        debugLog('[DD] ❌ Email field not found');
        results.push('✗ Email field not found');
      }
    }

    // Fill condition - search by name "condition"
    if (data.condition) {
      debugLog('[DD] 🔍 Looking for condition field...');
      debugLog('[DD] 📋 Condition data received:', data.condition);

      // This is a jQuery UI selectmenu widget - the select is hidden and controlled by a button
      const conditionSelect = document.querySelector('select[name="condition"]') as HTMLSelectElement;
      const conditionButton = document.querySelector('#ui-id-1-button') as HTMLElement;

      if (conditionSelect && conditionButton) {
        debugLog('[DD] ✅ Found condition select and button:', conditionSelect, conditionButton);
        debugLog('[DD] 📋 Available options:');
        Array.from(conditionSelect.options).forEach(option => {
          debugLog('[DD]   -', option.value, ':', option.textContent);
        });

        // Find the condition value from mapping
        let conditionValue = craigslistConditionMapping[data.condition];
        debugLog('[DD] 📋 Mapped condition value:', data.condition, '->', conditionValue);

        // Special handling for "Used - Like New" - try both like new and excellent
        if (data.condition === 'Used - Like New' && !conditionValue) {
          // Try like new first, then excellent
          const likeNewOption = conditionSelect.querySelector('option[value="20"]');
          const excellentOption = conditionSelect.querySelector('option[value="30"]');

          if (likeNewOption) {
            conditionValue = '20';
            debugLog('[DD] ✅ Found "like new" option for Used - Like New');
          } else if (excellentOption) {
            conditionValue = '30';
            debugLog('[DD] ✅ Found "excellent" option for Used - Like New');
          }
        }

        if (conditionValue) {
          // Set the value on the hidden select
          conditionSelect.value = conditionValue;

          // Update the button text to match the selected option
          const selectedOption = conditionSelect.querySelector(`option[value="${conditionValue}"]`) as HTMLOptionElement;
          if (selectedOption) {
            const buttonText = conditionButton.querySelector('.ui-selectmenu-text') as HTMLElement;
            if (buttonText) {
              buttonText.textContent = selectedOption.textContent || '';
            }
          }

          // Trigger events on both the select and button
          conditionSelect.dispatchEvent(new Event('change', { bubbles: true }));
          conditionButton.dispatchEvent(new Event('change', { bubbles: true }));

          results.push('✓ Condition filled');
          debugLog('[DD] ✅ Condition filled:', data.condition, '->', conditionValue);
        } else {
          debugLog('[DD] ❌ Condition not found in mapping or no suitable option:', data.condition);
          results.push('✗ Condition not found in mapping or no suitable option');
        }
      } else {
        debugLog('[DD] ❌ Condition select or button not found');
        debugLog('[DD]   - conditionSelect:', conditionSelect);
        debugLog('[DD]   - conditionButton:', conditionButton);
        results.push('✗ Condition field not found');
      }
    }

    return { success: true, results };
  } catch (error) {
    console.error('[DD] ❌ Error filling Craigslist form:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Craigslist-specific photo upload function
export const uploadCraigslistPhotos = async (photoUrls: string[]): Promise<{ success: boolean; count?: number; message?: string; error?: string }> => {
  try {
    debugLog('[DD] 🔍 Looking for Craigslist upload file input...');
    const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;

    if (!fileInput) {
      debugLog('[DD] ❌ Upload file input not found');
      return { success: false, error: 'Upload file input not found' };
    }

    debugLog('[DD] ✅ Found upload file input:', fileInput.tagName, fileInput.className);
    debugLog('[DD] 📸 Photo URLs to upload:', photoUrls);

    // Convert URLs to File objects and upload
    const uploadPromises = photoUrls.map((photoUrl, index) => downloadImageAsFile(photoUrl, index));

    // Wait for all photos to be processed
    const files = await Promise.all(uploadPromises);
    debugLog('[DD] ✅ All photos processed, files:', files.length);

    // Upload files to input
    if (uploadFilesToInput(fileInput, files)) {
      debugLog('[DD] ✅ Photos uploaded successfully!');
      return { success: true, count: files.length, message: 'Photos uploaded successfully' };
    } else {
      return { success: false, error: 'Failed to upload files to input' };
    }
  } catch (error) {
    console.error('[DD] ❌ Upload error:', error);
    return { success: false, error: (error as Error).message };
  }
};
