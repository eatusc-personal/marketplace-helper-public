import React, { useState, useEffect } from 'react';
import { supabase } from '../../src/supabase';
import { Listing } from '../types';
import ComboBox from './ComboBox';

/** --- Drag-&-Drop helpers --- */
const MIME_MAP: Record<string,string> = {
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png',
  webp:'image/webp', gif:'image/gif'
};

async function fetchSupabaseImage(url: string, retry = 2): Promise<File> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const ext = url.split('.').pop()?.toLowerCase() || 'jpg';
    const blob = await res.blob();
    return new File([blob], url.split('/').pop() || `photo.${ext}`, {
      type: MIME_MAP[ext] || blob.type || 'application/octet-stream'
    });
  } catch (e) {
    if (retry) return fetchSupabaseImage(url, retry - 1);
    throw e;
  }
}

function buildDataTransfer(files: File[]): DataTransfer {
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));

  // Extra formats for legacy fallback
  dt.setData('text/uri-list', files.map(f => f.name).join('\n'));
  dt.setData('text/plain',   files.map(f => f.name).join('\n'));
  dt.effectAllowed = 'copy';
  return dt;
}

interface LightboxProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

interface ViewListingsProps {
  onEditListing: (listing: Listing) => void;
  addDebugLog?: (message: string) => void;
}

interface ExpandedPhotos {
  [listingId: string]: boolean;
}

const Lightbox: React.FC<LightboxProps> = ({ isOpen, imageUrl, onClose }) => {
  console.log('🔍 Lightbox render:', { isOpen, imageUrl });

  if (!isOpen) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>×</button>
        <img src={imageUrl} alt="Enlarged view" className="lightbox-image" />
      </div>
    </div>
  );
};

const ViewListings: React.FC<ViewListingsProps> = ({ onEditListing, addDebugLog }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | 'warning' | ''>('');
	const [currentIndex, setCurrentIndex] = useState(0);
	const [searchValue, setSearchValue] = useState<string | null>(null);

  // Auto-dismiss info messages after 5 seconds
  useEffect(() => {
    if (message && messageType === 'info') {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; imageUrl: string }>({
    isOpen: false,
    imageUrl: ''
  });
  const [expandedPhotos, setExpandedPhotos] = useState<ExpandedPhotos>({});



  const loadListings = async () => {
    setIsLoadingListings(true);
    try {
      // Debug: Check current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 DEBUG: Current session in loadListings:', session?.user?.email);
      addDebugLog?.(`🔍 DEBUG: Current session: ${session?.user?.email || 'No session'}`);

      // Ensure session is set in the client
      if (session) {
        await supabase.auth.setSession(session);
        console.log('🔍 DEBUG: Session set in client');
        addDebugLog?.('🔍 DEBUG: Session set in client');
      }

      // Load listings with category and condition names
          const { data: listingsData, error: listingsError } = await supabase
        .from('mb_listings')
        .select(`
          *,
          fb_category:mb_categories!fb_category_id(name),
          nd_category:mb_categories!nd_category_id(name),
              cl_category:mb_categories!cl_category_id(name),
          condition:mb_conditions(name)
        `)
        .order('created_at', { ascending: false });

      if (listingsError) {
        console.error('Error loading listings:', listingsError);
        console.error('Error details:', {
          message: listingsError.message,
          details: listingsError.details,
          hint: listingsError.hint,
          code: listingsError.code
        });
        addDebugLog?.(`🔍 DEBUG: Error details: ${JSON.stringify(listingsError)}`);
        setMessage(`Failed to load listings: ${listingsError.message}`);
        setMessageType('error');
        return;
      }

      // Debug: Log the raw data from Supabase
      console.log('🔍 DEBUG: Raw listings data from Supabase:', listingsData);
      addDebugLog?.('🔍 DEBUG: Raw listings data from Supabase loaded');
      if (listingsData && listingsData.length > 0) {
        addDebugLog?.(`Found ${listingsData.length} listings`);
        const firstListing = listingsData[0];
        addDebugLog?.(`First listing: ${firstListing.title}`);
        addDebugLog?.(`Category object: ${JSON.stringify(firstListing.category)}`);
        addDebugLog?.(`Condition object: ${JSON.stringify(firstListing.condition)}`);
      }

      // Load photos for each listing
      const listingsWithPhotos = await Promise.all(
        (listingsData || []).map(async (listing: any) => {
          const { data: photosData, error: photosError } = await supabase
            .from('mb_photos')
            .select('*')
            .eq('listing_id', listing.id)
            .order('created_at');

          if (photosError) {
            console.error('Error loading photos for listing:', listing.id, photosError);
          }

          // Debug: Log the raw listing data to see the structure
          console.log('🔍 DEBUG: Raw listing data:', {
            id: listing.id,
            title: listing.title,
            fb_category_id: listing.fb_category_id,
            nd_category_id: listing.nd_category_id,
            fb_category_object: listing.fb_category,
            nd_category_object: listing.nd_category,
            condition_id: listing.condition_id,
            condition_object: listing.condition
          });
          addDebugLog?.(`🔍 DEBUG: Processing listing: ${listing.title}`);
          addDebugLog?.(`Facebook category object: ${JSON.stringify(listing.fb_category)}`);
          addDebugLog?.(`Nextdoor category object: ${JSON.stringify(listing.nd_category)}`);
          addDebugLog?.(`Condition object: ${JSON.stringify(listing.condition)}`);
          addDebugLog?.(`Video URL: ${listing.video_url || 'No video'}`);

          const mappedListing: any = {
            ...listing,
            fb_category_name: listing.fb_category?.name,
            nd_category_name: listing.nd_category?.name,
            cl_category_name: (listing as any).cl_category?.name,
            condition_name: listing.condition?.name,
            photos: photosData || []
          };

          // Debug: Log the mapped listing data
          console.log('🔍 DEBUG: Mapped listing data:', {
            id: mappedListing.id,
            title: mappedListing.title,
            fb_category_id: mappedListing.fb_category_id,
            nd_category_id: mappedListing.nd_category_id,
            fb_category_name: mappedListing.fb_category_name,
            nd_category_name: mappedListing.nd_category_name,
            condition_id: mappedListing.condition_id,
            condition_name: mappedListing.condition_name
          });
          addDebugLog?.(`  Mapped fb_category_name: ${mappedListing.fb_category_name}`);
          addDebugLog?.(`  Mapped nd_category_name: ${mappedListing.nd_category_name}`);
          addDebugLog?.(`  Mapped condition_name: ${mappedListing.condition_name}`);

          return mappedListing;
        })
      );

			setListings(listingsWithPhotos);
			// Reset to latest (index 0); keep search box blank by default
			setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading listings:', error);
      setMessage(`Failed to load listings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setIsLoadingListings(false);
    }
  };

  // Navigate between listings
	const goPrev = () => {
		setCurrentIndex(prev => {
			const total = listings.length;
			if (total === 0) return 0;
			const nextIndex = (prev - 1 + total) % total;
			return nextIndex;
		});
	};

	const goNext = () => {
		setCurrentIndex(prev => {
			const total = listings.length;
			if (total === 0) return 0;
			const nextIndex = (prev + 1) % total;
			return nextIndex;
		});
	};

  const currentListing = listings[currentIndex];

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    try {
      // First, get all photos for this listing to delete from storage
      const { data: photos, error: photosFetchError } = await supabase
        .from('mb_photos')
        .select('photo_url')
        .eq('listing_id', listingId);

      if (photosFetchError) {
        console.error('Error fetching photos:', photosFetchError);
      }

      // Delete photos from storage
      if (photos && photos.length > 0) {
        for (const photo of photos) {
          try {
            // Extract file path from URL
            const url = new URL(photo.photo_url);
            const pathParts = url.pathname.split('/');
            const filePath = pathParts.slice(-2).join('/'); // Get 'photos/filename.ext'

            const { error: storageError } = await supabase.storage
              .from('mb_photos')
              .remove([filePath]);

            if (storageError) {
              console.error('Error deleting photo from storage:', storageError);
            }
          } catch (photoError) {
            console.error('Error processing photo deletion:', photoError);
          }
        }
      }

      // Delete photo records from database
      const { error: photosDeleteError } = await supabase
        .from('mb_photos')
        .delete()
        .eq('listing_id', listingId);

      if (photosDeleteError) {
        console.error('Error deleting photo records:', photosDeleteError);
      }

      // Get listing to check if it has a video
      const { data: listing, error: listingFetchError } = await supabase
        .from('mb_listings')
        .select('video_url')
        .eq('id', listingId)
        .single();

      if (listingFetchError) {
        console.error('Error fetching listing:', listingFetchError);
      } else if (listing?.video_url) {
        try {
          // Extract file path from video URL
          const url = new URL(listing.video_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(-2).join('/'); // Get 'videos/filename.ext'

          const { error: videoStorageError } = await supabase.storage
            .from('mb_videos')
            .remove([filePath]);

          if (videoStorageError) {
            console.error('Error deleting video from storage:', videoStorageError);
          }
        } catch (videoError) {
          console.error('Error processing video deletion:', videoError);
        }
      }

      // Delete listing
      const { data: deletedListing, error } = await supabase
        .from('mb_listings')
        .delete()
        .eq('id', listingId)
        .select();

      if (error) {
        throw new Error(`Failed to delete listing: ${error.message}`);
      }

      if (!deletedListing || deletedListing.length === 0) {
        throw new Error('Failed to delete listing - no records were deleted');
      }

      setMessage('Listing deleted successfully!');
      setMessageType('success');

      // Reload listings
      await loadListings();

    } catch (error) {
      console.error('Error deleting listing:', error);
      setMessage(error instanceof Error ? error.message : 'An error occurred');
      setMessageType('error');
    }
  };









  const handleFacebookFormFilling = async (listing: Listing, tab: chrome.tabs.Tab) => {
    try {
      addDebugLog?.('🔍 === FACEBOOK FORM FILLING START ===');

      // STEP 1: UPLOAD PHOTOS (if any photos exist)
      let photoUploadSuccess = true;
      if (listing.photos && listing.photos!.length > 0) {
        addDebugLog?.('🔍 Step 1: Starting photo upload process...');
        addDebugLog?.(`📸 Found ${listing.photos!.length} photos to upload`);

        // Get photo URLs from the listing
        const photoUrls = (listing.photos || []).map(photo => photo.photo_url);
        addDebugLog?.(`📸 Extracting photo URLs...`);

        // Log each photo URL for debugging
        photoUrls.forEach((url, index) => {
          addDebugLog?.(`📸 Photo ${index + 1}: ${url}`);
        });

        try {
          addDebugLog?.('🔍 Step 1a: Sending photo upload request to content script...');
          const uploadResponse = await chrome.tabs.sendMessage(tab.id!, {
            action: 'uploadFacebookPhotos',
            data: photoUrls
          });

          const uploadResponseMsg = `📨 Photo upload response: ${JSON.stringify(uploadResponse)}`;
          console.log(uploadResponseMsg);
          addDebugLog?.(uploadResponseMsg);

          if (uploadResponse && uploadResponse.success) {
            const photoSuccessMsg = `✅ Successfully uploaded ${uploadResponse.uploadedCount} photos to Facebook!`;
            console.log(photoSuccessMsg);
            addDebugLog?.(photoSuccessMsg);

            // Wait a moment for photos to process
            addDebugLog?.('⏳ Waiting for photos to process before filling form...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            const photoErrorMsg = `⚠️ Photo upload failed: ${uploadResponse?.error || 'Unknown error'}`;
            console.warn(photoErrorMsg);
            addDebugLog?.(photoErrorMsg);
            addDebugLog?.('⚠️ Continuing with form filling despite photo upload failure...');
            photoUploadSuccess = false;
          }
        } catch (photoError) {
          const photoErrorMsg = `⚠️ Photo upload error: ${photoError}`;
          console.warn(photoErrorMsg);
          addDebugLog?.(photoErrorMsg);
          addDebugLog?.('⚠️ Continuing with form filling despite photo upload error...');
          photoUploadSuccess = false;
        }
      } else {
        addDebugLog?.('🔍 Step 1: No photos to upload, proceeding directly to form filling...');
      }

      // STEP 2: EXPAND "MORE DETAILS" IF NEEDED
      addDebugLog?.('🔍 Step 2: Checking if "More details" needs to be expanded...');
      const hasDescription = listing.description && listing.description.trim() !== '';
      const hasLocation = listing.location && listing.location!.trim() !== '';

      if (hasDescription || hasLocation) {
        addDebugLog?.(`📝 Has description: ${hasDescription ? 'Yes' : 'No'}`);
        addDebugLog?.(`📍 Has location: ${hasLocation ? 'Yes' : 'No'}`);
        addDebugLog?.('🔗 Clicking "More details" button to expand section...');

        try {
          const moreDetailsResponse = await chrome.tabs.sendMessage(tab.id!, {
            action: 'clickMoreDetails'
          });

          if (moreDetailsResponse && moreDetailsResponse.success) {
            addDebugLog?.('✅ Successfully clicked "More details" button');
            addDebugLog?.('⏳ Waiting for section to expand...');
            // Wait a moment for the section to expand
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            addDebugLog?.('❌ Failed to click "More details" button automatically');
            addDebugLog?.('⚠️ Please manually click "More details" on Facebook to expand the description/location fields');
            setMessage('⚠️ Please manually click "More details" on Facebook to expand the description/location fields, then try posting again.');
            setMessageType('error');
            return;
          }
        } catch (moreDetailsError) {
          addDebugLog?.(`❌ Error clicking "More details": ${moreDetailsError}`);
          addDebugLog?.('⚠️ Please manually click "More details" on Facebook to expand the description/location fields');
          setMessage('⚠️ Please manually click "More details" on Facebook to expand the description/location fields, then try posting again.');
          setMessageType('error');
          return;
        }
      } else {
        addDebugLog?.('🔍 Step 2: No description or location data - skipping "More details" expansion');
      }

      // STEP 3: FILL FORM FIELDS
      addDebugLog?.('🔍 Step 3: Starting form filling process...');
      addDebugLog?.('🔍 DEBUG: Listing object for Facebook:');
      addDebugLog?.(`  title: ${listing.title}`);
      addDebugLog?.(`  fb_category_id: ${listing.fb_category_id}`);
      addDebugLog?.(`  fb_category_name: ${listing.fb_category_name}`);
      addDebugLog?.(`  fb_category_object: ${JSON.stringify(listing.fb_category)}`);
      addDebugLog?.(`  condition_id: ${listing.condition_id}`);
      addDebugLog?.(`  condition_name: ${listing.condition_name}`);
      addDebugLog?.(`  condition_object: ${JSON.stringify(listing.condition)}`);

      // Check for missing data but don't stop the process
      const missingData = [];
      if (!listing.fb_category_name) missingData.push('Facebook category');
      if (!listing.condition_name) missingData.push('condition');

      if (missingData.length > 0) {
        const warningMsg = `⚠️ Missing data: ${missingData.join(', ')}. These fields will be skipped.`;
        console.warn(warningMsg);
        addDebugLog?.(warningMsg);
      }

      // Send listing data to content script to fill out the form
      const formData = {
        title: listing.title,
        description: listing.description || '',
        price: listing.price.toString(),
        category: listing.fb_category_name || null,
        condition: listing.condition_name || null,
        sku: listing.sku || '',
        location: listing.location || ''
      };

      addDebugLog?.('🔍 Step 3a: Sending form data to content script...');
      const response = await chrome.tabs.sendMessage(tab.id!, {
        action: 'fillFacebookForm',
        data: formData
      });

      const responseMsg = `📨 Content script response: ${JSON.stringify(response)}`;
      console.log(responseMsg);
      addDebugLog?.(responseMsg);

      if (response && response.success) {
        // Switch to the Facebook tab
        await chrome.tabs.update(tab.id!, { active: true });

        // Create comprehensive success message
        let successMsg = '✅ Facebook form filled successfully!\n';
        if (listing.photos && listing.photos!.length > 0) {
          if (photoUploadSuccess) {
            successMsg += `📸 ${listing.photos!.length} photos uploaded.\n\n`;
          } else {
            successMsg += `⚠️ Photo upload failed.\n\n`;
          }
        }

        successMsg += `Please select your category manually (Facebook has more specific categories), then click "Next" to complete your listing`;

        setMessage(successMsg);
        setMessageType('success');
        addDebugLog?.('Facebook form filled successfully');
        addDebugLog?.('🔍 Step 4: Process completed successfully!');

        // Log detailed results if available
        if (response.result && Array.isArray(response.result)) {
          response.result.forEach((result: string) => {
            addDebugLog?.(`  ${result}`);
          });
        }
      } else {
        const errorMsg = `❌ Form filling failed: ${response?.error || 'Unknown error'}`;
        console.error(errorMsg);
        addDebugLog?.(errorMsg);
        setMessage('❌ Could not fill Facebook form. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      const errorMsg = `❌ Error during Facebook form filling: ${error}`;
      console.error(errorMsg);
      addDebugLog?.(errorMsg);
      setMessage('❌ Could not complete Facebook form filling. Please refresh the Facebook page and try again.');
      setMessageType('error');
    }
  };

  // Listen for debug messages from background script
  useEffect(() => {
    const handleDebugMessage = (message: any) => {
      if (message.type === 'DEBUG_LOG') {
        addDebugLog?.(`🔧 BG: ${message.message}`);
      }
    };

    chrome.runtime.onMessage.addListener(handleDebugMessage);
    return () => chrome.runtime.onMessage.removeListener(handleDebugMessage);
  }, [addDebugLog]);







  const handlePostToFacebook = async (listing: Listing) => {
    try {
      const debugMsg = `🔄 Starting Facebook post process for listing: ${listing.title}`;
      console.log(debugMsg);
      addDebugLog?.(debugMsg);
      addDebugLog?.('🔍 === FACEBOOK POST PROCESS START ===');
      addDebugLog?.(`📋 Listing ID: ${listing.id}`);
      addDebugLog?.(`📋 Listing Title: ${listing.title}`);
      addDebugLog?.(`📋 Total Photos: ${listing.photos?.length || 0}`);

      // Get the active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        setMessage('❌ Could not access active tab');
        setMessageType('error');
        return;
      }

      // Check if we're already on the Facebook Marketplace create listing page
      const isOnCreatePage = activeTab.url?.includes('facebook.com/marketplace/create/listing');

      if (isOnCreatePage) {
        // We're on the create listing page - populate the form using existing logic
        addDebugLog?.('✅ Already on Facebook Marketplace create listing page - populating form...');

        try {
          // Test if content script is loaded
          const pingResponse = await chrome.tabs.sendMessage(activeTab.id!, { action: 'ping' });
          addDebugLog?.(`✅ Content script ping successful: ${JSON.stringify(pingResponse)}`);

          // Use the existing form filling logic that's already in the file
          await handleFacebookFormFilling(listing, activeTab);

        } catch (pingError) {
          addDebugLog?.(`❌ Content script not loaded: ${pingError}`);
          setMessage('❌ Please refresh the Facebook page and try again');
          setMessageType('error');
          return;
        }

      } else {
        // We're not on the create listing page - navigate to create listing page
        addDebugLog?.('🔍 Not on create listing page - navigating to create listing page...');

        await chrome.tabs.update(activeTab.id!, {
          url: 'https://www.facebook.com/marketplace/create/listing'
        });

        setMessage('🔄 Navigated to Facebook Marketplace!\n\nPlease wait for the page to load, then press the Facebook button again to populate the form');
        setMessageType('warning');
        addDebugLog?.('✅ Navigated to Facebook Marketplace create listing page');
        addDebugLog?.('💡 Waiting for user to click Facebook button again');
        return;
      }

      // The handleFacebookFormFilling function above handles all the form filling logic
      // when the user is already on the Facebook create page
    } catch (error) {
      const errorMsg = `❌ Error posting to Facebook: ${error}`;
      console.error(errorMsg);
      addDebugLog?.(errorMsg);
      addDebugLog?.('🔍 Error details:');
      addDebugLog?.(`   - Error type: ${typeof error}`);
      addDebugLog?.(`   - Error message: ${String(error)}`);
      setMessage('❌ Error opening Facebook Marketplace');
      setMessageType('error');
    } finally {
      addDebugLog?.('🔍 === FACEBOOK POST PROCESS END ===');
    }
  };

  const handlePostToNextdoor = async (listing: Listing) => {
    try {
      const debugMsg = `🔄 Starting Nextdoor post process for listing: ${listing.title}`;
      console.log(debugMsg);
      addDebugLog?.(debugMsg);
      addDebugLog?.('🔍 === NEXTDOOR POST PROCESS START ===');
      addDebugLog?.(`📋 Listing ID: ${listing.id}`);
      addDebugLog?.(`📋 Listing Title: ${listing.title}`);

      // Find active Nextdoor tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab?.url?.includes('nextdoor.com')) {
        // Not on Nextdoor at all - navigate to Nextdoor for sale page
        addDebugLog?.('🔍 Not on Nextdoor page, navigating to Nextdoor for sale page...');

        if (!activeTab?.id) {
          setMessage('❌ Cannot access active tab');
          setMessageType('error');
          return;
        }

        // Navigate to Nextdoor for sale page
        await chrome.tabs.update(activeTab.id, {
          url: 'https://nextdoor.com/for_sale_and_free/'
        });

        setMessage('🔄 Navigated to Nextdoor! Now:\n1. Click "Post" button\n2. Click "Skip" to go to listing form\n3. Then press the Nextdoor button again\n__\nOr press the green Nextdoor button!');
        setMessageType('warning');
        addDebugLog?.('✅ Navigated to Nextdoor for sale page');
        addDebugLog?.('💡 Waiting for user to click Post → Skip');
        return;
      }

      if (!activeTab.id) {
        setMessage('❌ Cannot access active tab');
        setMessageType('error');
        return;
      }

      addDebugLog?.(`📄 Found Nextdoor tab: ${activeTab.url}`);

      // Check if we're on the correct Nextdoor for sale page
      const isOnForSalePage = activeTab.url.includes('nextdoor.com/for_sale_and_free/');

      if (!isOnForSalePage) {
        addDebugLog?.('🔍 Not on Nextdoor for sale page, navigating...');

        // Navigate to the correct page
        await chrome.tabs.update(activeTab.id, {
          url: 'https://nextdoor.com/for_sale_and_free/'
        });

        setMessage('🔄 Navigated to Nextdoor! Now:\n1. Click "Post" button\n2. Click "Skip" to go to listing form\n3. Then press the Nextdoor button again\n__\nOr press the green Nextdoor button!');
        setMessageType('warning');
        addDebugLog?.('✅ Navigated to Nextdoor for sale page');
        addDebugLog?.('💡 Waiting for user to click Post → Skip');
        return;
      }

      addDebugLog?.('✅ Confirmed we are on Nextdoor for sale page');

      // Check if we're on the listing creation page by looking for "New listing" button or form elements
      addDebugLog?.('🔍 Checking if we are on the Nextdoor listing creation page...');

      try {
        // Try to detect if we're on the listing creation page
        const pageCheckResponse = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'checkNextdoorListingPage'
        });

        if (pageCheckResponse?.isOnListingPage) {
          addDebugLog?.('✅ Confirmed we are on Nextdoor listing creation page');
        } else {
          // Not on listing creation page - try to navigate automatically
          addDebugLog?.('🔄 Not on listing page, attempting automatic navigation...');

          const navigationResponse = await chrome.tabs.sendMessage(activeTab.id, {
            action: 'handleNextdoorNavigation'
          });

          if (navigationResponse?.success && navigationResponse?.status === 'form_ready') {
            addDebugLog?.('✅ Successfully navigated to listing form');
          } else if (navigationResponse?.status === 'form_not_ready') {
            // Navigation completed but form needs more time
            setMessage('🔄 Navigation completed! Please wait a moment and press the Nextdoor button again\n__\nOr press the green Nextdoor button!');
            setMessageType('warning');
            addDebugLog?.('⏳ Navigation completed, form may need more time');
            return;
          } else {
            // Navigation failed - show helpful warning
            setMessage('🔄 Automatic navigation failed. Please:\n1. Click "Post" button\n2. Click "Skip" to go to listing form\n3. Then press the Nextdoor button again\n__\nOr press the green Nextdoor button!');
            setMessageType('warning');
            addDebugLog?.('⚠️ Automatic navigation failed');
            addDebugLog?.(`📋 Navigation status: ${navigationResponse?.status || 'unknown'}`);
            return;
          }
        }
      } catch (error) {
        // Content script might not be loaded, try to inject and check
        addDebugLog?.('⚠️ Content script not loaded, attempting to inject for page detection...');

        try {
          // Inject the content script
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
          });
          addDebugLog?.('✅ Content script injected successfully');

          // Wait a moment for the script to load
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try the page check again
          const pageCheckResponse = await chrome.tabs.sendMessage(activeTab.id, {
            action: 'checkNextdoorListingPage'
          });

          if (pageCheckResponse?.isOnListingPage) {
            addDebugLog?.('✅ Confirmed we are on Nextdoor listing creation page');
          } else {
            // Not on listing creation page - try to navigate automatically
            addDebugLog?.('🔄 Not on listing page, attempting automatic navigation...');

            const navigationResponse = await chrome.tabs.sendMessage(activeTab.id, {
              action: 'handleNextdoorNavigation'
            });

            if (navigationResponse?.success && navigationResponse?.status === 'form_ready') {
              addDebugLog?.('✅ Successfully navigated to listing form');
            } else if (navigationResponse?.status === 'form_not_ready') {
              // Navigation completed but form needs more time
              setMessage('🔄 Navigation completed! Please wait a moment and press the Nextdoor button again\n__\nOr press the green Nextdoor button!');
              setMessageType('warning');
              addDebugLog?.('⏳ Navigation completed, form may need more time');
              return;
            } else {
              // Navigation failed - show helpful warning
              setMessage('🔄 Automatic navigation failed. Please:\n1. Click "Post" button\n2. Click "Skip" to go to listing form\n3. Then press the Nextdoor button again\n__\nOr press the green Nextdoor button!');
              setMessageType('warning');
              addDebugLog?.('⚠️ Automatic navigation failed');
              addDebugLog?.(`📋 Navigation status: ${navigationResponse?.status || 'unknown'}`);
              return;
            }
          }
        } catch (injectionError) {
          // If we can't inject or check, assume we're not on the right page and show warning
          setMessage('🔄 Please:\n1. Click "Post" button\n2. Click "Skip" to go to listing form\n3. Then press the Nextdoor button again\n__\nOr press the green Nextdoor button!');
          setMessageType('warning');
          addDebugLog?.('⚠️ Could not verify page status, showing warning');
          return;
        }
      }

      // Prepare data for Nextdoor form
      const nextdoorData = {
        title: listing.title,
        description: listing.description,
        price: listing.price || 0,
        category_id: listing.nd_category_name || '', // Use Nextdoor category
        location: listing.location || '',
        photos: listing.photos || []
      };

      addDebugLog?.(`📋 Sending data to Nextdoor: ${JSON.stringify(nextdoorData, null, 2)}`);

      // Send to content script with fallback injection
      let response;
      try {
        response = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'fillNextdoorForm',
          data: nextdoorData
        });
      } catch (error) {
        addDebugLog?.('⚠️ Content script not loaded, attempting to inject...');

        try {
          // Inject the content script
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
          });
          addDebugLog?.('✅ Content script injected successfully');

          // Wait a moment for the script to load
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try the request again
          response = await chrome.tabs.sendMessage(activeTab.id, {
            action: 'fillNextdoorForm',
            data: nextdoorData
          });
          addDebugLog?.('✅ Content script communication established after injection');
        } catch (injectionError) {
          throw new Error(`Failed to inject content script: ${injectionError}`);
        }
      }

      if (response?.success) {
        setMessage('✅ Nextdoor form filled successfully!\n__\nPlease click "Next" to continue');
        setMessageType('success');
        addDebugLog?.('✅ Nextdoor form filled successfully');

        // Log the detailed response
        if (response.logs) {
          response.logs.forEach((log: string) => addDebugLog?.(log));
        }
      } else {
        setMessage(`❌ Failed to fill Nextdoor form: ${response?.error || 'Unknown error'}`);
        setMessageType('error');
        addDebugLog?.(`❌ Failed to fill Nextdoor form: ${response?.error || 'Unknown error'}`);

        if (response?.logs) {
          response.logs.forEach((log: string) => addDebugLog?.(log));
        }
      }

    } catch (error) {
      const errorMsg = `❌ Error with Nextdoor posting: ${error}`;
      console.error(errorMsg);
      addDebugLog?.(errorMsg);
      setMessage('❌ Error with Nextdoor posting');
      setMessageType('error');
    } finally {
      addDebugLog?.('🔍 === NEXTDOOR POST PROCESS END ===');
    }
  };

  // Handle Craigslist posting
  const handlePostToCraigslist = async (listing: Listing) => {
    try {
      const debugMsg = `🔄 Starting Craigslist post process for listing: ${listing.title}`;
      console.log(debugMsg);
      addDebugLog?.(debugMsg);
      addDebugLog?.('🔍 === CRAIGSLIST POST PROCESS START ===');
      addDebugLog?.(`📋 Listing ID: ${listing.id}`);
      addDebugLog?.(`📋 Listing Title: ${listing.title}`);
      addDebugLog?.(`📋 Total Photos: ${listing.photos?.length || 0}`);

      // Find active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab?.url?.includes('craigslist.org')) {
        // Not on Craigslist at all - navigate to Craigslist main page
        addDebugLog?.('🔍 Not on Craigslist page, navigating to Craigslist.org...');

        if (!activeTab?.id) {
          setMessage('❌ Cannot access active tab');
          setMessageType('error');
          return;
        }

        // Navigate to Craigslist main page
        await chrome.tabs.update(activeTab.id, {
          url: 'https://www.craigslist.org/'
        });

        setMessage('🔄 Navigated to Craigslist! Now:\n1. Select your city/location\n2. Click "post to classifieds"\n3. Choose "for sale by owner"\n4. Get to the image upload step\n5. Then press the Craigslist button again\n__\nOr press the orange Craigslist button!');
        setMessageType('warning');
        addDebugLog?.('✅ Navigated to Craigslist main page');
        addDebugLog?.('💡 Waiting for user to navigate to posting page');
        return;
      }

      if (!activeTab.id) {
        setMessage('❌ Cannot access active tab');
        setMessageType('error');
        return;
      }

      addDebugLog?.(`📄 Found Craigslist tab: ${activeTab.url}`);

      let pageCheckResponse: any;
      try {
        pageCheckResponse = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'checkCraigslistPostingPage'
        });
      } catch (error) {
        addDebugLog?.('⚠️ Content script not loaded, attempting to inject for page detection...');

        // Inject content script
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content.js']
        });

        addDebugLog?.('✅ Content script injected successfully');

        // Wait for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try the check again
        pageCheckResponse = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'checkCraigslistPostingPage'
        });
      }

      if (!pageCheckResponse || !pageCheckResponse.success) {
        setMessage('Please navigate to a Craigslist posting page first');
        setMessageType('error');
        return;
      }

      addDebugLog?.(`📊 Page check response: ${JSON.stringify(pageCheckResponse)}`);

      // Check if on city/area selection page
      if (pageCheckResponse.message?.includes('city/area selection page')) {
        setMessage('Please make the selection and click \'continue\'');
        setMessageType('warning');
        addDebugLog?.('🔍 On city/area selection page - user needs to make selection and click continue');
        return;
      }

      // Check if on skip/re-use page
      if (pageCheckResponse.message?.includes('skip/re-use selected data page')) {
        setMessage('Please click \'Skip\' or \'re-use selected data\' to proceed');
        setMessageType('warning');
        addDebugLog?.('🔍 On skip/re-use page - user needs to click Skip or re-use selected data');
        return;
      }

      // Step 1: Click "post an ad" link if on main page
      if (pageCheckResponse.message?.includes('main page with post link')) {
        addDebugLog?.('🔍 Step 1: Clicking "post an ad" link...');
        const postAdResponse = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'clickCraigslistPostAd'
        });

        if (postAdResponse?.success) {
          setMessage('Clicked "post an ad"! Please wait for the page to load...\n__\nClick the orange Craigslist button to proceed');
          setMessageType('success');
          addDebugLog?.('✅ Successfully clicked "post an ad" link');
          return;
        } else {
          setMessage(`❌ Could not click "post an ad": ${postAdResponse?.error || 'Unknown error'}`);
          setMessageType('error');
          addDebugLog?.(`❌ Could not click "post an ad": ${postAdResponse?.error || 'Unknown error'}`);
          return;
        }
      }

      // Step 2: Select "for sale by owner" if on posting type page
      if (pageCheckResponse.message?.includes('posting type selection page')) {
        addDebugLog?.('🔍 Step 2: Selecting "for sale by owner"...');
        const postingTypeResponse = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'selectCraigslistPostingType'
        });

        if (postingTypeResponse?.success) {
          setMessage('Selected "for sale by owner"! Please wait for the page to load...\n__\nClick the orange Craigslist button to proceed');
          setMessageType('success');
          addDebugLog?.('✅ Successfully selected posting type');
          return;
        } else {
          setMessage(`❌ Could not select posting type: ${postingTypeResponse?.error || 'Unknown error'}`);
          setMessageType('error');
          addDebugLog?.(`❌ Could not select posting type: ${postingTypeResponse?.error || 'Unknown error'}`);
          return;
        }
      }

      // Step 3: Choose category if on category selection page
      if (pageCheckResponse.message?.includes('category selection page')) {
        addDebugLog?.('🔍 Step 3: Choosing category...');
        const categoryName = listing.cl_category_name || '';

        if (categoryName) {
          const categoryResponse = await chrome.tabs.sendMessage(activeTab.id, {
            action: 'chooseCraigslistCategory',
            data: categoryName
          });

          if (categoryResponse?.success) {
            setMessage(`Selected category: ${categoryName}! Please wait for the page to load...\n__\nClick the orange Craigslist button to proceed`);
            setMessageType('success');
            addDebugLog?.(`✅ Successfully selected category: ${categoryName}`);
            return;
          } else {
            setMessage(`❌ Could not select category: ${categoryResponse?.error || 'Unknown error'}`);
            setMessageType('error');
            addDebugLog?.(`❌ Could not select category: ${categoryResponse?.error || 'Unknown error'}`);
            return;
          }
        } else {
          setMessage('❌ No category set for this listing');
          setMessageType('error');
          addDebugLog?.('❌ No category set for this listing');
          return;
        }
      }

      // Step 4: Fill form details if on form page
      if (pageCheckResponse.message?.includes('form details page')) {
        addDebugLog?.('🔍 Step 4: Filling form details...');

        const formData = {
          title: listing.title,
          description: listing.description || '',
          price: listing.price.toString(),
          zipcode: listing.zip_code || '',
          city: listing.location || '',
          email: listing.craigslist_email || '',
          condition: listing.condition_name || ''
        };

        addDebugLog?.(`📋 Form data: ${JSON.stringify(formData)}`);

        const fillResponse = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'fillCraigslistForm',
          data: formData
        });

        if (fillResponse?.success) {
          addDebugLog?.('Craigslist form filled successfully');
          if (fillResponse.results) {
            fillResponse.results.forEach((result: string) => addDebugLog?.(result));
          }
          setMessage('✅ Craigslist form filled successfully!\n\nPlease review and continue to the next step');
          setMessageType('success');
        } else {
          addDebugLog?.(`❌ Craigslist form fill failed: ${fillResponse?.error || 'Unknown error'}`);
          setMessage(`Form fill failed: ${fillResponse?.error || 'Unknown error'}`);
          setMessageType('error');
        }
        return;
      }

      // Step 5: Upload photos if on photo upload page
      if (pageCheckResponse.message?.includes('photo upload page')) {
        addDebugLog?.('🔍 Step 5: Uploading photos...');

        if (listing.photos && listing.photos.length > 0) {
          addDebugLog?.(`📋 Photos to upload: ${listing.photos.length}`);

          const photoUrls = listing.photos.map(photo => photo.photo_url);

          const uploadResponse = await chrome.tabs.sendMessage(activeTab.id, {
            action: 'uploadCraigslistPhotos',
            data: photoUrls
          });

          if (uploadResponse?.success) {
            addDebugLog?.(`✅ Craigslist photo upload successful: ${uploadResponse.count || 0} photos uploaded`);
            setMessage(`Successfully uploaded ${uploadResponse.count || 0} photos to Craigslist\n\nClick "done with images" on Craigslist`);
            setMessageType('success');
          } else {
            addDebugLog?.(`❌ Craigslist photo upload failed: ${uploadResponse?.error || 'Unknown error'}`);
            setMessage(`Photo upload failed: ${uploadResponse?.error || 'Unknown error'}`);
            setMessageType('error');
          }
        } else {
          addDebugLog?.('📸 No photos to upload');
          setMessage('No photos to upload');
          setMessageType('info');
        }
        return;
      }

      // If we get here, we're on an unrecognized page
      setMessage('Please navigate to a Craigslist posting page first');
      setMessageType('error');
      addDebugLog?.('❌ Unrecognized Craigslist page');

     } catch (error) {
       addDebugLog?.(`❌ Craigslist posting error: ${error}`);
       setMessage(`Craigslist posting error: ${error}`);
       setMessageType('error');
     }
  };

  // Load listings on component mount
  useEffect(() => {
    loadListings();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const openLightbox = (imageUrl: string) => {
    console.log('🖼️ Opening lightbox for image:', imageUrl);
    addDebugLog?.(`🖼️ Opening lightbox for image: ${imageUrl}`);
    setLightbox({ isOpen: true, imageUrl });
  };

  const handlePhotoClick = (e: React.MouseEvent, imageUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🖼️ Photo clicked:', imageUrl);
    addDebugLog?.(`🖼️ Photo clicked: ${imageUrl}`);
    openLightbox(imageUrl);
  };

  const closeLightbox = () => {
    console.log('🖼️ Closing lightbox');
    addDebugLog?.('🖼️ Closing lightbox');
    setLightbox({ isOpen: false, imageUrl: '' });
  };

  const toggleExpandedPhotos = (listingId: string) => {
    console.log('📸 Toggling expanded photos for listing:', listingId);
    addDebugLog?.(`📸 Toggling expanded photos for listing: ${listingId}`);
    setExpandedPhotos(prev => ({
      ...prev,
      [listingId]: !prev[listingId]
    }));
  };

  return (
    <div className="listings-container">
      <Lightbox
        isOpen={lightbox.isOpen}
        imageUrl={lightbox.imageUrl}
        onClose={closeLightbox}
      />


      {message && (
        <div className={`user-message ${messageType}`}>
          <div className="message-content">
            <span className="message-icon">
              {messageType === 'error' && '❌'}
              {messageType === 'success' && '✅'}
              {messageType === 'info' && 'ℹ️'}
            </span>
            <span className="message-text">{message}</span>
            <button
              className="message-close"
              onClick={() => setMessage('')}
              title="Dismiss message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {isLoadingListings ? (
        <div className="loading">Loading listings...</div>
      ) : listings.length === 0 ? (
        <div className="no-listings">
          <p>No listings found. Create your first listing!</p>
        </div>
      ) : (
		<>
			{/* Search combobox under header */}
			<div style={{ margin: '8px 0 12px 0' }}>
				<ComboBox
					id="listingSearch"
					name="listingSearch"
					value={searchValue}
					onChange={(value) => {
						// value is the listing id from options
						setSearchValue(value);
						const idx = listings.findIndex(l => l.id === value);
						if (idx >= 0) setCurrentIndex(idx);
					}}
					options={listings.map(l => ({ id: l.id, name: l.title }))}
					placeholder="Search listings..."
					disabled={false}
					allowCustom={false}
				/>
			</div>

			{/* Single current listing card with top navigation row */}
			<div key={currentListing.id} className="listing-card" style={{ position: 'relative' }}>
				{/* Top navigation row: left / counter / right */}
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 6 }}>
					<button
						onClick={goPrev}
						title="Previous listing"
						style={{ width: 36, height: 36, borderRadius: '50%', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
						className="button secondary"
					>
						◀
					</button>
					<div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
						{currentIndex + 1} / {listings.length}
					</div>
					<button
						onClick={goNext}
						title="Next listing"
						style={{ width: 36, height: 36, borderRadius: '50%', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
						className="button secondary"
					>
						▶
					</button>
				</div>
              <div className="listing-header">
					<h3>{currentListing.title}</h3>
                <div className="listing-price">{formatPrice(currentListing.price)}</div>
              </div>

              <div className="listing-details">
                {currentListing.description && (
                  <p className="listing-description">{currentListing.description}</p>
                )}

                <div className="listing-meta">
                  {currentListing.fb_category_name && (
                    <span className="meta-item">📘 Facebook: {currentListing.fb_category_name}</span>
                  )}
                  {currentListing.nd_category_name && (
                    <span className="meta-item">📗 Nextdoor: {currentListing.nd_category_name}</span>
                  )}
                  {currentListing.cl_category_name && (
                    <span className="meta-item">🟧 Craigslist: {currentListing.cl_category_name}</span>
                  )}
                  {currentListing.condition_name && (
                    <span className="meta-item">🏷️ {currentListing.condition_name}</span>
                  )}
                  {currentListing.location && (
                    <span className="meta-item">📍 {currentListing.location}</span>
                  )}
                  {currentListing.sku && (
                    <span className="meta-item">🏷️ SKU: {currentListing.sku}</span>
                  )}
                </div>

                 <div className="listing-photos">
                   {currentListing.photos && currentListing.photos.length > 0 ? (
                     <div className="photo-grid">
                        {currentListing.photos.slice(0, expandedPhotos[currentListing.id] ? currentListing.photos.length : 8).map((photo, index) => (
                         <div
                           key={photo.id}
                           className="listing-photo-container"
                           draggable={true}
                            onClick={(e) => handlePhotoClick(e, photo.photo_url)}
                           onDragStart={async (e) => {
                             e.stopPropagation();
                             const url = photo.photo_url;
                             try {
                               addDebugLog?.(`[DD] 🚚 Drag start → ${url}`);
                               const file = await fetchSupabaseImage(url);
                               const dt   = buildDataTransfer([file]);

                               // Modern approach: use DataTransfer on the event
                               Object.defineProperty(e, 'dataTransfer', { value: dt, writable: false });

                               addDebugLog?.(`[DD] ✅ File ready (${file.type}, ${file.size} bytes)`);
                               addDebugLog?.(`[DD] 📋 DataTransfer files: ${dt.files.length}, types: ${Array.from(dt.files).map(f => f.type).join(', ')}`);
                               addDebugLog?.(`[DD] 📋 DataTransfer types: ${Array.from(dt.types).join(', ')}`);
                             } catch (err: any) {
                               addDebugLog?.(`[DD] ❌ Drag error: ${err.message || err}`);
                             }
                           }}
                         >
                           <img
                             src={photo.photo_url}
                             alt={`Photo ${index + 1}`}
                             className="listing-photo"
                             onClick={(e) => handlePhotoClick(e, photo.photo_url)}
                             style={{ cursor: 'pointer' }}
                           />
                           <div className="photo-drag-overlay">

                           </div>
                         </div>
                       ))}
                        {currentListing.photos.length > 8 && (
                         <div
                           className="photo-overlay clickable"
                            onClick={() => toggleExpandedPhotos(currentListing.id)}
                         >
                            {expandedPhotos[currentListing.id] ? 'Show Less' : `+${currentListing.photos.length - 8} more`}
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="no-photos">No photos</div>
                   )}
                 </div>

				{/* Video section - add video display */}
                {currentListing.video_url && (
                  <div className="listing-video">
                    <div className="video-label">🎥 Video:</div>
                    <div className="video-container">
                      <video
                        src={currentListing.video_url}
                        controls
                        style={{ width: '100%', maxHeight: '200px', borderRadius: '6px' }}
                        preload="metadata"
                      />
                    </div>
                  </div>
                )}

                <div className="listing-date">
                  Created: {formatDate(currentListing.created_at)}
                </div>
              </div>

				{/* Helper text above buttons */}
				<div style={{ width: '100%', textAlign: 'center', marginTop: 8, marginBottom: 6, fontSize: 12, opacity: 0.9, fontWeight: 600, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>post to your marketplaces below</div>
				{/* Social Media Buttons */}
				<div className="social-buttons">
                <button
                  className="social-button facebook"
                  onClick={() => handlePostToFacebook(currentListing)}
                  title="Post to Facebook Marketplace"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
                <button
                  className="social-button nextdoor"
                  onClick={() => handlePostToNextdoor(currentListing)}
                  title="Post to Nextdoor"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.556 1.556c-.126.126-.295.196-.472.196s-.346-.07-.472-.196L12 6.648 8.932 9.716c-.126.126-.295.196-.472.196s-.346-.07-.472-.196L6.432 8.16c-.26-.26-.26-.682 0-.942L11.058 2.592c.26-.26.682-.26.942 0l4.568 4.568c.26.26.26.682 0 .942zM17.568 15.84l-4.568 4.568c-.26.26-.682.26-.942 0L7.432 15.84c-.26-.26-.26-.682 0-.942l1.556-1.556c.126-.126.295-.196.472-.196s.346.07.472.196L12 16.41l3.068-3.068c.126-.126.295-.196.472-.196s.346.07.472.196l1.556 1.556c.26.26.26.682 0 .942z"/>
                  </svg>
                  Nextdoor
                </button>
                <button
                  className="social-button craigslist"
                  onClick={() => handlePostToCraigslist(currentListing)}
                  title="Post to Craigslist"
                >
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>C</span>
                  Craigslist
                </button>
              </div>

              <div className="listing-actions">
                <button
                    className="button primary"
                    onClick={() => {
                      console.log('🔍 EDIT BUTTON CLICKED: Starting edit for listing:', currentListing.title);
                      addDebugLog?.(`🔍 EDIT BUTTON CLICKED: Starting edit for listing: ${currentListing.title}`);
                      addDebugLog?.(`🔍 EDIT BUTTON: Listing data: fb_category_id=${currentListing.fb_category_id}, nd_category_id=${currentListing.nd_category_id}, condition_id=${currentListing.condition_id}`);
                      onEditListing(currentListing);
                    }}
                  >
                    ✏️ Edit
                  </button>
                   <button
                     className="button secondary"
                     onClick={() => handleDeleteListing(currentListing.id)}
                   >
                     🗑️ Delete
                   </button>
                 </div>
            </div>
        </>
      )}
    </div>
  );
};

export default ViewListings;