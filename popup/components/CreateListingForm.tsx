import React, { useState, useEffect } from 'react';

import { supabase } from '../../src/supabase';
import { Listing, ListingPhoto, Category, Condition, FormData, CategoryWithPlatform } from '../types';
import ComboBox from './ComboBox';
import DragDropUpload from './DragDropUpload';
import LocationComboBox from './LocationComboBox';
import { detectCurrentPlatform, processCategoriesWithPlatforms, Platform } from '../utils/platformUtils';
import { useAuth } from '../contexts/AuthContext';
import { debugLog } from '../../src/shared/debug';

interface CreateListingFormProps {
  isEditing: boolean;
  editingListing: Listing | null;
  onSuccess: () => void;
  onCancel: () => void;
  addDebugLog?: (message: string) => void;
}

const CreateListingForm: React.FC<CreateListingFormProps> = ({
  isEditing,
  editingListing,
  onSuccess,
  onCancel,
  addDebugLog
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    price: '',
    photos: null,
    video: null,
    fb_category_id: '',
    nd_category_id: '',
    cl_category_id: '',
    condition_id: '',
    sku: '',
    location: '',
    craigslist_email: '',
    zip_code: '',
    street: '',
    cross_street: '',
    fb_listing_id: '',
  });
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [selectedConditionName, setSelectedConditionName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | 'warning' | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [processedCategories, setProcessedCategories] = useState<CategoryWithPlatform[]>([]);
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('other');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [craigslistCategories, setCraigslistCategories] = useState<Category[]>([]);
  const [facebookCategories, setFacebookCategories] = useState<Category[]>([]);


  // ===== Autosync State =====
  const [autosyncEnabled, setAutosyncEnabled] = useState(true);

  // Load autosync preference from localStorage
  useEffect(() => {
    const savedAutosync = localStorage.getItem('marketplace_autosync_enabled');
    if (savedAutosync !== null) {
      setAutosyncEnabled(savedAutosync === 'true');
    }
  }, []);

  // Save autosync preference to localStorage
  const toggleAutosync = () => {
    const newValue = !autosyncEnabled;
    setAutosyncEnabled(newValue);
    localStorage.setItem('marketplace_autosync_enabled', newValue.toString());
  };

  // Handle category selection for auto-sync
  const handleCategorySelect = (value: string, name: string) => {
    if (autosyncEnabled) {
      // Trigger auto-sync when a category is selected from dropdown
      // Pass the name of the category that was just selected and the selected value
      syncCategories(true, name, value);
    }
  };

  // ===== Category Sync Helpers =====
  const ALIASES: Record<string, string> = {
    'baby & kid stuff': 'baby and kids',
    'baby & kids': 'baby and kids',
    'clothing & accessories': 'clothing and accessories',
    'sports & outdoors': 'sporting goods',
    'sporting goods': 'sports and outdoors',
    'home decor': 'home goods',
    'home goods': 'home decor',
    'garden & outdoor': 'garden',
    'video gaming': 'video games',
    'toys & games': 'toys and games',
    'free stuff': 'free',
    'free': 'free stuff',
    'garage sales': 'garage & moving sales',
    'garage & moving sales': 'garage sales',
  };

  // Manual overrides derived from the reviewed table. Blanks default to per-platform "Other".
  // Names are compared case-insensitively after normalizeText.
  type OverrideRow = { fb: string; nd: string; cl: string };
  const OVERRIDE_ROWS: OverrideRow[] = [
    { fb: 'Accessories', nd: 'Clothing & accessories', cl: 'clothing & accessories' },
    { fb: 'Announcements', nd: 'Other', cl: 'general for sale' },
    { fb: 'Apartments for Rent', nd: 'Property rentals', cl: 'general for sale' },
    { fb: 'Appliances', nd: 'Appliances', cl: 'appliances' },
    { fb: 'Arts & Crafts', nd: 'Neighbor made', cl: 'arts & crafts' },
    { fb: 'Audio Equipment', nd: 'Electronics', cl: 'electronics' },
    { fb: 'Baby Gear', nd: 'Baby & kids', cl: 'baby & kid stuff' },
    { fb: 'Baby & Kids', nd: 'Baby & kids', cl: 'baby & kid stuff' },
    { fb: 'Bags', nd: 'Clothing & accessories', cl: 'clothing & accessories' },
    { fb: 'Bicycles', nd: 'Bicycles', cl: 'bicycles' },
    { fb: 'Boats', nd: 'Other', cl: 'boats' },
    { fb: 'Books, Movies & Music', nd: 'Other', cl: 'books & magazines' },
    { fb: 'Building Materials', nd: 'Tools', cl: 'materials' },
    { fb: 'Cameras & Photography', nd: 'Electronics', cl: 'photo/video' },
    { fb: 'Cars for Sale', nd: 'Automotive', cl: 'cars & trucks ($5)' },
    { fb: 'Cell Phones', nd: 'Electronics', cl: 'cell phones' },
    { fb: 'Clothing', nd: 'Clothing & accessories', cl: 'clothing & accessories' },
    { fb: 'Collectibles', nd: 'Other', cl: 'collectibles' },
    { fb: 'Computers', nd: 'Electronics', cl: 'computers' },
    { fb: 'Exercise Equipment', nd: 'Sports & outdoors', cl: 'sporting goods' },
    { fb: 'Flooring', nd: 'Home decor', cl: 'materials' },
    { fb: 'Free Stuff', nd: 'Free', cl: 'free stuff' },
    { fb: 'Furniture', nd: 'Furniture', cl: 'furniture' },
    { fb: 'Garden Supplies', nd: 'Garden', cl: 'farm & garden' },
    { fb: 'Grills', nd: 'Garden', cl: 'farm & garden' },
    { fb: 'Home Improvement Supplies', nd: 'Tools', cl: 'household items' },
    { fb: 'Houses for Rent', nd: 'Property rentals', cl: 'general for sale' },
    { fb: 'Jewelry & Watches', nd: 'Clothing & accessories', cl: 'jewelry' },
    { fb: "Kids' Clothing & Shoes", nd: 'Baby & kids', cl: 'clothing & accessories' },
    { fb: 'Kitchen & Bath', nd: 'Home decor', cl: 'household items' },
    { fb: 'Lost & Found', nd: 'In search of', cl: 'wanted' },
    { fb: 'Miscellaneous', nd: 'Other', cl: 'general for sale' },
    { fb: 'Motorcycles', nd: 'Automotive', cl: 'motorcycles/scooters ($5)' },
    { fb: 'Musical Instruments', nd: 'Musical instruments', cl: 'musical instruments' },
    { fb: 'Outdoor Furniture', nd: 'Garden', cl: 'furniture' },
    { fb: 'Outdoor Recreation', nd: 'Sports & outdoors', cl: 'sporting goods' },
    { fb: 'Parking & Storage', nd: 'Property rentals', cl: 'general for sale' },
    { fb: 'Powersports', nd: 'Automotive', cl: 'atvs, utvs, snowmobiles' },
    { fb: 'RVs & Campers', nd: 'Automotive', cl: 'rvs ($5)' },
    { fb: 'Shoes', nd: 'Clothing & accessories', cl: 'clothing & accessories' },
    { fb: 'Sports & Outdoors', nd: 'Sports & outdoors', cl: 'sporting goods' },
    { fb: 'Tickets', nd: 'Tickets', cl: 'tickets' },
    { fb: 'Tools', nd: 'Tools', cl: 'tools' },
    { fb: 'Toys & Games', nd: 'Toys & games', cl: 'toys & games' },
    { fb: 'TVs', nd: 'Electronics', cl: 'electronics' },
    { fb: 'Vacation Rentals', nd: 'Property rentals', cl: 'general for sale' },
    { fb: 'Vehicle Parts & Accessories', nd: 'Automotive', cl: 'auto parts' },
    { fb: 'Video Games & Consoles', nd: 'Electronics', cl: 'video gaming' }
  ];

  const FALLBACK_BY_PLATFORM: Record<'facebook' | 'nextdoor' | 'craigslist', string> = {
    facebook: 'Miscellaneous',
    nextdoor: 'Other',
    craigslist: 'general for sale'
  };

  const findCategoryIdByName = (platformSlug: 'facebook' | 'nextdoor' | 'craigslist', name: string, all: Category[]) => {
    const target = all.find(c => c.category_type?.slug === platformSlug && c.name.toLowerCase() === name.toLowerCase());
    return target?.id;
  };

  const applyOverrides = (
    sourcePlatform: 'facebook' | 'nextdoor' | 'craigslist',
    sourceName: string,
    all: Category[]
  ): Partial<FormData> | null => {
    const srcNorm = normalizeText(sourceName);
    // Try to locate matching row by any platform column
    const row = OVERRIDE_ROWS.find(r => {
      if (sourcePlatform === 'facebook') return normalizeText(r.fb) === srcNorm;
      if (sourcePlatform === 'nextdoor') return normalizeText(r.nd) === srcNorm;
      return normalizeText(r.cl) === srcNorm;
    });
    if (!row) return null;

    const result: Partial<FormData> = {};
    // Map names for each platform, falling back when blank
    const fbName = row.fb || FALLBACK_BY_PLATFORM.facebook;
    const ndName = row.nd || FALLBACK_BY_PLATFORM.nextdoor;
    const clName = row.cl || FALLBACK_BY_PLATFORM.craigslist;

    const fbId = findCategoryIdByName('facebook', fbName, all);
    const ndId = findCategoryIdByName('nextdoor', ndName, all);
    const clId = findCategoryIdByName('craigslist', clName, all);

    if (fbId) result.fb_category_id = fbId;
    if (ndId) result.nd_category_id = ndId;
    if (clId) result.cl_category_id = clId;
    return Object.keys(result).length ? result : null;
  };

  const normalizeText = (raw?: string) => {
    if (!raw) return '';
    const lowered = String(raw).toLowerCase().trim();
    const alias = ALIASES[lowered] ?? lowered;
    return alias
      .replace(/&/g, ' and ')
      .replace(/\$\)/g, 's)')
      .replace(/\$/g, 's')
      .replace(/[^a-z0-9\s\)]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const jaccardTokens = (a: string, b: string) => {
    const A = new Set(a.split(' ').filter(Boolean));
    const B = new Set(b.split(' ').filter(Boolean));
    const inter = Array.from(A).filter(x => B.has(x)).length;
    const union = new Set([...A, ...B]).size || 1;
    return inter / union;
  };

  const levenshtein = (a: string, b: string) => {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const dp = Array(n + 1).fill(0).map((_, j) => j);
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = Math.min(
          dp[j] + 1,
          dp[j - 1] + 1,
          prev + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        prev = tmp;
      }
    }
    return dp[n];
  };

  const similarityScore = (aRaw: string, bRaw: string) => {
    const a = normalizeText(aRaw);
    const b = normalizeText(bRaw);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.startsWith(b) || b.startsWith(a)) return 0.95;
    const jac = jaccardTokens(a, b);
    const lev = levenshtein(a, b);
    const levSim = 1 - (lev / Math.max(a.length, b.length));
    return 0.6 * jac + 0.4 * levSim;
  };

  const bestMatch = (text: string, candidates: Category[]) => {
    let best: Category | null = null;
    let bestScore = -1;
    for (const c of candidates) {
      const s = similarityScore(text, c.name);
      if (s > bestScore) { best = c; bestScore = s; }
    }
    return { match: best, score: bestScore };
  };

  // ===== Sync Categories Function =====
  const syncCategories = (isAutoSync = false, selectedCategoryName?: string, selectedCategoryValue?: string) => {
    try {
      if (isAutoSync) {
        addDebugLog?.('🔄 Auto-sync categories triggered');
      } else {
        addDebugLog?.('🔄 Sync categories clicked');
      }

      const fbSelected = categories.find(c => c.id === formData.fb_category_id);
      const ndSelected = categories.find(c => c.id === formData.nd_category_id);
      const clSelected = categories.find(c => c.id === formData.cl_category_id);

      // Prioritize the category that was just selected for auto-sync
      let source = null;
      if (isAutoSync && selectedCategoryName && selectedCategoryValue) {
        // Use the selected category value directly instead of relying on formData
        if (selectedCategoryName === 'fb_category_id') {
          source = categories.find(c => c.id === selectedCategoryValue);
        } else if (selectedCategoryName === 'nd_category_id') {
          source = categories.find(c => c.id === selectedCategoryValue);
        } else if (selectedCategoryName === 'cl_category_id') {
          source = categories.find(c => c.id === selectedCategoryValue);
        }
      }

      // Fallback to the original priority order if no specific category was selected
      if (!source) {
        source = fbSelected || ndSelected || clSelected || null;
      }

      addDebugLog?.(`🔍 SYNC DEBUG: Auto-sync triggered by: ${selectedCategoryName || 'manual'}`);
      if (selectedCategoryValue) {
        addDebugLog?.(`🔍 SYNC DEBUG: Selected category value: ${selectedCategoryValue}`);
      }
      addDebugLog?.(`🔍 SYNC DEBUG: Source category: ${source?.name} (${source?.category_type?.slug})`);
      addDebugLog?.(`🔍 SYNC DEBUG: Current formData: fb=${formData.fb_category_id}, nd=${formData.nd_category_id}, cl=${formData.cl_category_id}`);

      if (!source) {
        if (!isAutoSync) {
          setMessage('⚠️ Select at least one category to sync from.');
          setMessageType('error');
        }
        return;
      }

      const sourceText = source.name;
      const targetFacebook = categories.filter(c => c.category_type?.slug === 'facebook');
      const targetNextdoor = categories.filter(c => c.category_type?.slug === 'nextdoor');
      const targetCraigslist = categories.filter(c => c.category_type?.slug === 'craigslist');



      if (targetFacebook.length === 0 && targetNextdoor.length === 0 && targetCraigslist.length === 0) {
        if (!isAutoSync) {
          setMessage('⚠️ No categories are loaded to sync against. Please ensure categories exist.');
          setMessageType('error');
        }
        return;
      }

      // Overrides first, then fuzzy match, then fallback
      const sourcePlatform = (source.category_type?.slug as any) || 'facebook';
      const override = applyOverrides(sourcePlatform, sourceText, categories as any);
      const update: Partial<FormData> = override ? { ...override } : {};

      addDebugLog?.(`🔍 SYNC DEBUG: Override found: ${override ? 'YES' : 'NO'}`);
      if (override) {
        addDebugLog?.(`🔍 SYNC DEBUG: Override values: fb=${override.fb_category_id}, nd=${override.nd_category_id}, cl=${override.cl_category_id}`);
      }

      // Always try to sync to other platforms, regardless of source platform
      if (!update.fb_category_id && source.category_type?.slug !== 'facebook') {
        const { match, score } = bestMatch(sourceText, targetFacebook);
        addDebugLog?.(`🧭 FB match: ${match?.name || 'none'} (score=${(score ?? 0).toFixed(3)})`);
        if (match && (score ?? 0) >= 0.45) {
          update.fb_category_id = match.id;
          addDebugLog?.(`✅ FB category set to: ${match.name} (${match.id})`);
        }
        if (!update.fb_category_id) {
          const fbFallback = findCategoryIdByName('facebook', FALLBACK_BY_PLATFORM.facebook, categories as any);
          if (fbFallback) {
            update.fb_category_id = fbFallback;
            addDebugLog?.(`🔄 FB fallback set to: ${fbFallback}`);
          }
        }
      }

      if (!update.nd_category_id && source.category_type?.slug !== 'nextdoor') {
        const { match, score } = bestMatch(sourceText, targetNextdoor);
        addDebugLog?.(`🧭 ND match: ${match?.name || 'none'} (score=${(score ?? 0).toFixed(3)})`);
        if (match && (score ?? 0) >= 0.45) {
          update.nd_category_id = match.id;
          addDebugLog?.(`✅ ND category set to: ${match.name} (${match.id})`);
        }
        if (!update.nd_category_id) {
          const ndFallback = findCategoryIdByName('nextdoor', FALLBACK_BY_PLATFORM.nextdoor, categories as any);
          if (ndFallback) {
            update.nd_category_id = ndFallback;
            addDebugLog?.(`🔄 ND fallback set to: ${ndFallback}`);
          }
        }
      }

      if (!update.cl_category_id && source.category_type?.slug !== 'craigslist') {
        const { match, score } = bestMatch(sourceText, targetCraigslist);
        addDebugLog?.(`🧭 CL match: ${match?.name || 'none'} (score=${(score ?? 0).toFixed(3)})`);
        if (match && (score ?? 0) >= 0.45) {
          update.cl_category_id = match.id;
          addDebugLog?.(`✅ CL category set to: ${match.name} (${match.id})`);
        }
        if (!update.cl_category_id) {
          const clFallback = findCategoryIdByName('craigslist', FALLBACK_BY_PLATFORM.craigslist, categories as any);
          if (clFallback) {
            update.cl_category_id = clFallback;
            addDebugLog?.(`🔄 CL fallback set to: ${clFallback}`);
          }
        }
      }

      addDebugLog?.(`🔍 SYNC DEBUG: Final update object: ${JSON.stringify(update)}`);

      if (Object.keys(update).length === 0) {
        addDebugLog?.(`🔍 SYNC DEBUG: No updates to apply`);
        if (!isAutoSync) {
          setMessage('⚠️ No suitable category matches found to sync.');
          setMessageType('error');
        }
        return;
      }

      // If the computed values would not change anything, inform the user
      const willChange =
        (update.fb_category_id && update.fb_category_id !== formData.fb_category_id) ||
        (update.nd_category_id && update.nd_category_id !== formData.nd_category_id) ||
        (update.cl_category_id && update.cl_category_id !== formData.cl_category_id);

      addDebugLog?.(`🔍 SYNC DEBUG: Will change anything: ${willChange}`);
      addDebugLog?.(`🔍 SYNC DEBUG: Changes: fb=${update.fb_category_id !== formData.fb_category_id}, nd=${update.nd_category_id !== formData.nd_category_id}, cl=${update.cl_category_id !== formData.cl_category_id}`);

      if (!willChange) {
        addDebugLog?.(`🔍 SYNC DEBUG: No changes needed`);
        if (!isAutoSync) {
          setMessage('ℹ️ Categories already synced. No changes needed.');
          setMessageType('success');
        }
        return;
      }

      addDebugLog?.(`🔍 SYNC DEBUG: Applying updates to formData`);
      setFormData(prev => {
        const newData = { ...prev, ...update } as any;
        addDebugLog?.(`🔍 SYNC DEBUG: New formData: fb=${newData.fb_category_id}, nd=${newData.nd_category_id}, cl=${newData.cl_category_id}`);



        return newData;
      });

      if (!isAutoSync) {
        setMessage('✅ Categories synced successfully');
        setMessageType('success');
        setTimeout(() => { setMessage(''); setMessageType(''); }, 2000);
      }
    } catch (e) {
      console.error('Sync categories error:', e);
      if (!isAutoSync) {
        setMessage('❌ Sync categories failed');
        setMessageType('error');
      }
    }
  };


  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);


  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [editingPhotos, setEditingPhotos] = useState<ListingPhoto[]>([]);
  const [editingVideoUrl, setEditingVideoUrl] = useState<string | null>(null);

  // Load categories and conditions on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Detect current platform
        const platform = await detectCurrentPlatform();
        setCurrentPlatform(platform);
        debugLog('🔍 Detected platform:', platform);

        // Load categories with category types in a single query
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('mb_categories')
          .select(`
            *,
            category_type:mb_category_type(*)
          `)
          .order('name');

        // If the join isn't working, try a different approach
        if (!categoriesError && categoriesData && categoriesData.length > 0 && !categoriesData[0].category_type) {
          // Load categories and category types separately
          const { data: categoriesOnly } = await supabase
            .from('mb_categories')
            .select('*')
            .order('name');

          const { data: categoryTypes } = await supabase
            .from('mb_category_type')
            .select('*');

          if (categoriesOnly && categoryTypes) {
            // Manual join
            const manuallyJoinedCategories = categoriesOnly.map(category => ({
              ...category,
              category_type: categoryTypes.find(ct => ct.id === category.category_type_id)
            }));

            // Use the manually joined data
            setCategories(manuallyJoinedCategories);
            setCraigslistCategories(manuallyJoinedCategories.filter(c => c.category_type?.slug === 'craigslist'));
            setFacebookCategories(manuallyJoinedCategories.filter(c => c.category_type?.slug === 'facebook'));

            return; // Exit early since we handled it manually
          }
        }

        if (categoriesError) {
          console.error('Error loading categories:', categoriesError);
          setMessage(`Failed to load categories: ${categoriesError.message}`);
          setMessageType('error');
          return;
        }

        // Process the joined data
        setCategories(categoriesData || []);
        setCraigslistCategories((categoriesData || []).filter(c => c.category_type?.slug === 'craigslist'));
        setFacebookCategories((categoriesData || []).filter(c => c.category_type?.slug === 'facebook'));



        // Process categories with platform filtering and duplicate handling
        const processed = processCategoriesWithPlatforms(categoriesData || [], platform);
        setProcessedCategories(processed);
        debugLog(`🔍 Processed ${processed.length} categories for platform:`, platform);

        // Load conditions
        const { data: conditionsData, error: conditionsError } = await supabase
          .from('mb_conditions')
          .select('*')
          .order('name');

        if (conditionsError) {
          console.error('Error loading conditions:', conditionsError);
          setMessage(`Failed to load conditions: ${conditionsError.message}`);
          setMessageType('error');
          return;
        } else {
          setConditions(conditionsData || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setMessage(`Failed to load form data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setMessageType('error');
      }
    };

    loadData();
  }, []);

  // Set form data when editing
  useEffect(() => {
    if (isEditing && editingListing && categories.length > 0 && conditions.length > 0) {
      debugLog('🔍 EDIT LOAD DEBUG: Setting edit form data:', {
        editingListing,
        categoriesLength: categories.length,
        conditionsLength: conditions.length
      });
      addDebugLog?.('🔍 EDIT LOAD DEBUG: Setting edit form data');
      addDebugLog?.(`🔍 EDIT LOAD: editingListing.title = ${editingListing.title}`);
      addDebugLog?.(`🔍 EDIT LOAD: editingListing.fb_category_id = ${editingListing.fb_category_id}`);
      addDebugLog?.(`🔍 EDIT LOAD: editingListing.nd_category_id = ${editingListing.nd_category_id}`);
      addDebugLog?.(`🔍 EDIT LOAD: editingListing.condition_id = ${editingListing.condition_id}`);
      addDebugLog?.(`🔍 EDIT LOAD: categories.length = ${categories.length}`);
      addDebugLog?.(`🔍 EDIT LOAD: conditions.length = ${conditions.length}`);
      addDebugLog?.(`🔍 EDIT LOAD: currentPlatform = ${currentPlatform}`);

      // Find the category to debug platform mismatch
      const debugCategory = categories.find(cat => cat.id === editingListing.fb_category_id || cat.id === editingListing.nd_category_id);
      if (debugCategory) {
        addDebugLog?.(`🔍 EDIT LOAD: debugCategory.name = ${debugCategory.name}`);
        addDebugLog?.(`🔍 EDIT LOAD: debugCategory.category_type = ${debugCategory.category_type?.name}`);
        addDebugLog?.(`🔍 EDIT LOAD: debugCategory.parent_id = ${debugCategory.parent_id}`);
      } else {
        addDebugLog?.(`🔍 EDIT LOAD: debugCategory NOT FOUND in categories array`);
      }



      setFormData({
        title: editingListing.title,
        description: editingListing.description || '',
        price: editingListing.price.toString(),
        photos: null,
        video: null,
        fb_category_id: editingListing.fb_category_id || null,
        nd_category_id: editingListing.nd_category_id || null,
        cl_category_id: editingListing.cl_category_id || null,
        condition_id: editingListing.condition_id || null,
        sku: editingListing.sku || '',
        location: editingListing.location || '',
        craigslist_email: editingListing.craigslist_email || '',
        zip_code: editingListing.zip_code || '',
        street: editingListing.street || '',
        cross_street: editingListing.cross_street || '',
        fb_listing_id: editingListing.fb_listing_id || null,
      });

      // Find category and condition by ID
      const selectedCategory = categories.find(cat => cat.id === editingListing.fb_category_id || cat.id === editingListing.nd_category_id);
      const selectedCondition = conditions.find(cond => cond.id === editingListing.condition_id);

      debugLog('🔍 Found category/condition for edit:', {
        selectedCategory,
        selectedCondition,
        fb_category_id: editingListing.fb_category_id,
        nd_category_id: editingListing.nd_category_id,
        condition_id: editingListing.condition_id
      });

      // Set display names - prioritize actual names from relationships, then fallback to found names
      const categoryName = editingListing.fb_category_name || editingListing.nd_category_name || selectedCategory?.name || '';
      const conditionName = editingListing.condition_name || selectedCondition?.name || '';

      setSelectedCategoryName(categoryName);
      setSelectedConditionName(conditionName);
      setSelectedLocationId(editingListing.location_id || undefined);

      // Handle main category and subcategory logic based on platform
      if (selectedCategory) {
        if (selectedCategory.category_type?.name === 'Facebook') {
          // Facebook: Handle parent/child relationship
          if (selectedCategory.parent_id) {
            // It's a subcategory (has parent_id), find the main category
            const mainCategory = categories.find(cat => cat.id === selectedCategory.parent_id);
            setSelectedMainCategoryName(mainCategory?.name || '');

            // Set subcategories for this main category
            const subCats = categories.filter(cat => cat.parent_id === selectedCategory.parent_id);
            setSubCategories(subCats);
          } else {
            // It's a main category (no parent_id)
            setSelectedMainCategoryName(categoryName);
            setSubCategories([]);
          }
        } else {
          // Nextdoor or other platforms: No parent/child relationship
          setSelectedMainCategoryName('');
          setSubCategories([]);
        }
      } else {
        setSelectedMainCategoryName('');
        setSubCategories([]);
      }

      setEditingPhotos(editingListing.photos || []);
      setEditingVideoUrl(editingListing.video_url || null);
    }
  }, [isEditing, editingListing, categories, conditions]);

  // Reset form when transitioning from editing to non-editing mode
  useEffect(() => {
    if (!isEditing && !editingListing) {
      resetForm();
    }
  }, [isEditing, editingListing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleComboBoxChange = (value: string, name: string) => {
    debugLog('🔍 COMBO DEBUG: handleComboBoxChange called:', { value, name });
    addDebugLog?.(`🔍 COMBO DEBUG: handleComboBoxChange called: ${name} = ${value}`);

    if (name === 'main_category') {
      // For main category, value could be ID or name depending on selection method
      const selectedCategory = processedCategories.find(cat => cat.id === value || cat.name === value);
      const categoryName = selectedCategory?.name || value;
      const categoryId = selectedCategory?.id || '';

      addDebugLog?.(`🔍 COMBO DEBUG: Main category selected: ${categoryName} (ID: ${categoryId}) Platform: ${selectedCategory?.platforms?.join(', ') || 'unknown'}`);
      setSelectedMainCategoryName(categoryName);

      // Update subcategories based on selected main category ID (Facebook only)
      if (currentPlatform === 'facebook') {
        const subCats = categories.filter(cat => cat.parent_id === categoryId && cat.category_type?.name === 'Facebook');
        setSubCategories(subCats);
      }

      // Reset subcategory selection
      setSelectedCategoryName('');
      setFormData(prev => ({
        ...prev,
        category_id: ''
      }));
    } else if (name === 'fb_category_id') {
      debugLog('🔍 COMBO DEBUG: Facebook category selection:', { value, name });
      addDebugLog?.(`🔍 COMBO DEBUG: Facebook category selection: value=${value}, name=${name}`);

      // Find the selected Facebook category
      const selectedCategory = categories.find(cat => (cat.id === value || cat.name === value) && cat.category_type?.name === 'Facebook' && cat.parent_id);
      const categoryName = selectedCategory?.name || value;
      const categoryId = selectedCategory?.id || value;

      addDebugLog?.(`🔍 COMBO DEBUG: Facebook category selected: ${categoryName} (ID: ${categoryId})`);

      // Let auto-sync handle the cross-platform matching
      setFormData(prev => ({
        ...prev,
        fb_category_id: categoryId
      }));
    } else if (name === 'nd_category_id') {
      debugLog('🔍 COMBO DEBUG: Nextdoor category selection:', { value, name });
      addDebugLog?.(`🔍 COMBO DEBUG: Nextdoor category selection: value=${value}, name=${name}`);

      // Find the selected Nextdoor category
      const selectedCategory = categories.find(cat => (cat.id === value || cat.name === value) && cat.category_type?.name === 'Nextdoor');
      const categoryName = selectedCategory?.name || value;
      const categoryId = selectedCategory?.id || value;

      addDebugLog?.(`🔍 COMBO DEBUG: Nextdoor category selected: ${categoryName} (ID: ${categoryId})`);

      // Let auto-sync handle the cross-platform matching
      setFormData(prev => ({
        ...prev,
        nd_category_id: categoryId
      }));

      debugLog('🔍 Category selection completed:', { value, categoryId, selectedCategory });
      addDebugLog?.(`🔍 COMBOBOX DEBUG: Category formData updated with ID: ${categoryId}`);
    } else if (name === 'cl_category_id') {
      addDebugLog?.(`🔍 COMBO DEBUG: Craigslist category selection: value=${value}, name=${name}`);
      const selectedCategory = categories.find(cat => (cat.id === value || cat.name === value) && cat.category_type?.name === 'Craigslist');
      const categoryId = selectedCategory?.id || value;
      setFormData(prev => ({ ...prev, cl_category_id: categoryId }));
    } else if (name === 'condition_id') {
      debugLog('🔍 COMBO DEBUG: Condition selection starting:', { value, name });
      // For condition, value could be ID or name depending on selection method
      const selectedCondition = conditions.find(cond => cond.id === value || cond.name === value);
      const conditionName = selectedCondition?.name || value;
      const conditionId = selectedCondition?.id || value; // Use value as fallback for custom entries

      addDebugLog?.(`🔍 COMBO DEBUG: Condition selected: ${conditionName} (ID: ${conditionId})`);
      debugLog('🔍 COMBO DEBUG: Condition lookup result:', {
        inputValue: value,
        foundCondition: selectedCondition,
        finalName: conditionName,
        finalId: conditionId,
        allConditionsCount: conditions.length
      });

      setSelectedConditionName(conditionName);
      setFormData(prev => {
        const newFormData = {
          ...prev,
          condition_id: conditionId
        };
        debugLog('🔍 COMBO DEBUG: FormData updated for condition:', newFormData);
        return newFormData;
      });

      debugLog('🔍 Condition selection completed:', { value, conditionId, selectedCondition });
      addDebugLog?.(`🔍 COMBOBOX DEBUG: Condition formData updated with ID: ${conditionId}`);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleLocationChange = (value: string, locationId?: string) => {
    setFormData(prev => ({
      ...prev,
      location: value
    }));
    setSelectedLocationId(locationId);
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      photos: null,
      video: null,
      fb_category_id: '',
      nd_category_id: '',
      cl_category_id: '',
      condition_id: '',
      sku: '',
      location: '',
      craigslist_email: '',
      zip_code: '',
      street: '',
      cross_street: '',
      fb_listing_id: '',
    });
    setSelectedMainCategoryName('');
    setSelectedCategoryName('');
    setSelectedConditionName('');
    setSelectedLocationId(undefined);
    setSubCategories([]);
    setPhotoPreviewUrls([]);
    setVideoPreviewUrl(null);
    setEditingPhotos([]);
    setMessage('');
    setMessageType('');

    // Reset file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
    fileInputs.forEach(input => {
      input.value = '';
    });
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up photo preview URLs
      photoPreviewUrls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });

      // Clean up video preview URL
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [photoPreviewUrls, videoPreviewUrl]);



  {/* Video drag and drop handler - commented out, may be added back in the future */}
  /*
  const handleVideoDragDrop = (files: FileList | null) => {
    debugLog('🎥 VIDEO DEBUG: handleVideoDragDrop called with files:', files);
    addDebugLog?.(`🎥 VIDEO DEBUG: handleVideoDragDrop called with ${files?.length || 0} files`);

    if (files && files.length > 0) {
      const file = files[0]; // Only take the first video file
      debugLog('🎥 VIDEO DEBUG: Processing video file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        isVideo: file.type.startsWith('video/')
      });
      addDebugLog?.(`🎥 VIDEO DEBUG: Processing video file: ${file.name} (${file.type})`);

      setFormData(prev => ({
        ...prev,
        video: file
      }));

      // Generate video preview using data URL
      if (file && file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            setVideoPreviewUrl(dataUrl);
            debugLog('✅ Video preview created');
            addDebugLog?.(`✅ Video preview created for: ${file.name}`);
          }
        };
        reader.onerror = () => {
          console.error('❌ Failed to create video preview');
          addDebugLog?.(`❌ Failed to create video preview for: ${file.name}`);
        };
        reader.readAsDataURL(file);
      } else {
        debugLog('🎥 VIDEO DEBUG: File is not a video type');
        addDebugLog?.(`🎥 VIDEO DEBUG: File is not a video type: ${file.type}`);
      }
    } else {
      debugLog('🎥 VIDEO DEBUG: No files provided or empty file list');
      addDebugLog?.('🎥 VIDEO DEBUG: No files provided or empty file list');
    }
  };
  */

  // Photo management functions
  const removePhoto = (index: number) => {
    debugLog('🗑️ Removing photo at index:', index);
    addDebugLog?.(`🗑️ Removing photo at index: ${index}`);

    setFormData(prev => {
      const photos = prev.photos ? Array.from(prev.photos) : [];
      const newPhotos = photos.filter((_, i) => i !== index);

      debugLog('🗑️ Photo removal result:', {
        originalCount: photos.length,
        newCount: newPhotos.length,
        removedIndex: index
      });
      addDebugLog?.(`🗑️ Photo removal: ${photos.length} → ${newPhotos.length} photos`);

      return {
        ...prev,
        photos: newPhotos as any
      };
    });

    // Remove corresponding preview URL
    setPhotoPreviewUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index);
      debugLog('🗑️ Preview URL removal:', {
        originalCount: prev.length,
        newCount: newUrls.length,
        removedIndex: index
      });
      return newUrls;
    });
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    debugLog('🔄 Moving photo from index', fromIndex, 'to index', toIndex);
    addDebugLog?.(`🔄 Moving photo from index ${fromIndex} to index ${toIndex}`);

    setFormData(prev => {
      const photos = prev.photos ? Array.from(prev.photos) : [];
      const newPhotos = [...photos];
      const [movedPhoto] = newPhotos.splice(fromIndex, 1);
      newPhotos.splice(toIndex, 0, movedPhoto);

      debugLog('🔄 Photo reorder result:', {
        originalCount: photos.length,
        newCount: newPhotos.length,
        fromIndex,
        toIndex
      });
      addDebugLog?.(`🔄 Photo reorder: ${photos.length} photos, moved from ${fromIndex} to ${toIndex}`);

      return {
        ...prev,
        photos: newPhotos as any
      };
    });

    // Regenerate all preview URLs to ensure they remain valid after reordering
    setFormData(prev => {
      const photos = prev.photos ? Array.from(prev.photos) : [];
      if (photos.length > 0) {
        const regeneratePreviews = async () => {
          debugLog('🔄 Regenerating preview URLs after reorder');
          addDebugLog?.('🔄 Regenerating preview URLs after reorder');

          // Clean up existing blob URLs
          setPhotoPreviewUrls(prevUrls => {
            prevUrls.forEach(url => {
              if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
              }
            });
            return [];
          });

          // Generate new preview URLs for all files
          const generatePreviews = async (files: File[]) => {
            const createBlobPreview = (file: File): Promise<string> => {
              return new Promise((resolve, reject) => {
                if (!file.type.startsWith('image/')) {
                  reject(new Error('Not an image file'));
                  return;
                }

                try {
                  const blobUrl = URL.createObjectURL(file);
                  resolve(blobUrl);
                } catch (error) {
                  reject(error);
                }
              });
            };

            const createDataUrlPreview = (file: File): Promise<string> => {
              return new Promise((resolve, reject) => {
                if (!file.type.startsWith('image/')) {
                  reject(new Error('Not an image file'));
                  return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                  const dataUrl = e.target?.result as string;
                  if (dataUrl) {
                    resolve(dataUrl);
                  } else {
                    reject(new Error('No data URL generated'));
                  }
                };
                reader.onerror = () => reject(new Error('FileReader error'));
                reader.readAsDataURL(file);
              });
            };

            const tryAllTechniques = async (file: File): Promise<string> => {
              const techniques = [
                { name: 'blob', fn: createBlobPreview },
                { name: 'dataUrl', fn: createDataUrlPreview }
              ];

              for (const technique of techniques) {
                try {
                  const result = await technique.fn(file);
                  debugLog(`✅ Regenerated preview using ${technique.name} technique for ${file.name}`);
                  return result;
                } catch (error) {
                  debugLog(`❌ ${technique.name} technique failed for ${file.name}:`, error);
                }
              }
              throw new Error('All preview techniques failed');
            };

            const results = await Promise.all(
              files.map((file) =>
                tryAllTechniques(file).catch(error => {
                  console.error(`❌ Failed to regenerate preview for ${file.name}:`, error);
                  return null;
                })
              )
            );

            const newUrls = results.filter(url => url !== null) as string[];
            debugLog(`✅ Regenerated ${newUrls.length} preview URLs`);
            addDebugLog?.(`✅ Regenerated ${newUrls.length} preview URLs after reorder`);

            setPhotoPreviewUrls(newUrls);
          };

          generatePreviews(photos);
        };

        regeneratePreviews();
      }

      return prev;
    });
  };

  // Existing photo reordering functions
  const moveExistingPhoto = async (fromIndex: number, toIndex: number) => {
    debugLog('🔄 Moving existing photo from index', fromIndex, 'to index', toIndex);
    addDebugLog?.(`🔄 Moving existing photo from index ${fromIndex} to index ${toIndex}`);

    if (!isEditing || !editingListing) {
      console.error('❌ Cannot reorder photos: not in edit mode');
      addDebugLog?.('❌ Cannot reorder photos: not in edit mode');
      return;
    }

    try {
      // Create new array with reordered photos
      const newPhotos = [...editingPhotos];
      const [movedPhoto] = newPhotos.splice(fromIndex, 1);
      newPhotos.splice(toIndex, 0, movedPhoto);

      debugLog('🔄 Existing photo reorder result:', {
        originalCount: editingPhotos.length,
        newCount: newPhotos.length,
        fromIndex,
        toIndex,
        movedPhotoId: movedPhoto.id
      });
      addDebugLog?.(`🔄 Existing photo reorder: ${editingPhotos.length} photos, moved from ${fromIndex} to ${toIndex}`);

      // Update local state immediately for responsive UI
      setEditingPhotos(newPhotos);

      // Update positions in database
      const updatePromises = newPhotos.map((photo, index) =>
        supabase
          .from('mb_photos')
          .update({ position: index + 1 })
          .eq('id', photo.id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        console.error('❌ Failed to update some photo positions:', errors);
        addDebugLog?.(`❌ Failed to update some photo positions: ${errors.length} errors`);

        // Revert local state on error
        setEditingPhotos(editingPhotos);
        setMessage('❌ Failed to save photo order. Please try again.');
        setMessageType('error');
      } else {
        debugLog('✅ Successfully updated photo positions in database');
        addDebugLog?.('✅ Successfully updated photo positions in database');
        setMessage('✅ Photo order updated successfully!');
        setMessageType('success');

        // Clear success message after 3 seconds
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error reordering existing photos:', error);
      addDebugLog?.(`❌ Error reordering existing photos: ${error}`);

      // Revert local state on error
      setEditingPhotos(editingPhotos);
      setMessage('❌ Failed to reorder photos. Please try again.');
      setMessageType('error');
    }
  };

  const handleDeletePhoto = async (photo: ListingPhoto) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      setIsLoading(true);
      setMessage('🗑️ Deleting photo...');
      setMessageType('');

      // Extract file path from photo_url for storage deletion
      const url = new URL(photo.photo_url);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const filePath = `photos/${fileName}`;

      debugLog('🗑️ Deleting photo:', {
        photoId: photo.id,
        photoUrl: photo.photo_url,
        extractedFilePath: filePath
      });

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('mb_photos')
        .remove([filePath]);

      if (storageError) {
        console.error('❌ Storage deletion error:', storageError);
        // Continue with database deletion even if storage fails
      } else {
        debugLog('✅ Photo deleted from storage successfully');
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('mb_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) {
        throw new Error(`Failed to delete photo from database: ${dbError.message}`);
      }

      debugLog('✅ Photo deleted from database successfully');

      // Update local state by removing the deleted photo
      setEditingPhotos(prevPhotos =>
        prevPhotos.filter(p => p.id !== photo.id)
      );

      setMessage('✅ Photo deleted successfully!');
      setMessageType('success');

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);

    } catch (error) {
      console.error('❌ Error deleting photo:', error);
      setMessage(`❌ Error deleting photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!editingListing?.id || !editingVideoUrl) return;
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      setIsLoading(true);
      setMessage('🗑️ Deleting video...');
      setMessageType('');

      // Extract file path from video URL for storage deletion
      const url = new URL(editingVideoUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/'); // 'videos/filename.ext'

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('mb_videos')
        .remove([filePath]);
      if (storageError) {
        console.error('❌ Storage video deletion error:', storageError);
        // continue to clear DB even if storage deletion fails
      }

      // Clear video_url in database
      const { error: dbError } = await supabase
        .from('mb_listings')
        .update({ video_url: null })
        .eq('id', editingListing.id);
      if (dbError) throw new Error(`Failed to clear video_url: ${dbError.message}`);

      setEditingVideoUrl(null);
      setMessage('✅ Video deleted successfully!');
      setMessageType('success');
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);
    } catch (error) {
      console.error('❌ Error deleting video:', error);
      setMessage(`❌ Error deleting video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };





  const uploadPhotoToStorage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `photos/${fileName}`;

    try {
      const { error } = await supabase.storage
        .from('mb_photos')
        .upload(filePath, file);

      if (error) {
        throw new Error(`Failed to upload photo: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = await supabase.storage
        .from('mb_photos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      throw error;
    }
  };



  const uploadVideoToStorage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `videos/${fileName}`;

    const { error } = await supabase.storage
      .from('mb_videos')
      .upload(filePath, file);

    if (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('mb_videos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const insertListing = async (
    title: string,
    description: string,
    price: number,
    fbCategoryId: string | null,
    ndCategoryId: string | null,
    clCategoryId: string | null,
    conditionId: string | null,
    sku: string,
    location: string,
    craigslistEmail: string,
    zipCode: string,
    street: string,
    crossStreet: string,
    videoUrl?: string
  ) => {
    if (!user) {
      throw new Error('User must be authenticated to create listings');
    }

          debugLog('🔍 Creating listing with:', {
        title,
        fbCategoryId,
        ndCategoryId,
        conditionId,
        price,
        sku,
        location,
        locationId: selectedLocationId
      });

    const listingData: any = {
      user_id: user.id,
      title,
      description,
      price,
      fb_category_id: fbCategoryId || null,
      nd_category_id: ndCategoryId || null,
      cl_category_id: clCategoryId || null,
      condition_id: conditionId || null,
      sku: sku || null,
      location: location || null,
      location_id: selectedLocationId || null,
      craigslist_email: craigslistEmail || null,
      zip_code: zipCode || null,
      street: street || null,
      cross_street: crossStreet || null,
    };

    if (videoUrl) {
      listingData.video_url = videoUrl;
    }

    const { data, error } = await supabase
      .from('mb_listings')
      .insert(listingData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create listing: ${error.message}`);
    }

    return data;
  };

  const insertPhotoRecord = async (listingId: string, photoUrl: string, position: number) => {
    const photoData = {
      listing_id: listingId,
      photo_url: photoUrl,
      position: position
    };

    const { data, error } = await supabase
      .from('mb_photos')
      .insert(photoData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save photo record: ${error.message}`);
    }

    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setMessage('Please enter a title');
      setMessageType('error');
      return;
    }

    // Validate categories if they are selected
    if (formData.fb_category_id && !categories.find(cat => cat.id === formData.fb_category_id)) {
      setMessage('Selected Facebook category is not valid. Please select a valid category.');
      setMessageType('error');
      return;
    }

    if (formData.nd_category_id && !categories.find(cat => cat.id === formData.nd_category_id)) {
      setMessage('Selected Nextdoor category is not valid. Please select a valid category.');
      setMessageType('error');
      return;
    }

    if (formData.cl_category_id && !categories.find(cat => cat.id === formData.cl_category_id)) {
      setMessage('Selected Craigslist category is not valid. Please select a valid category.');
      setMessageType('error');
      return;
    }

    if (formData.condition_id && !conditions.find(cond => cond.id === formData.condition_id)) {
      setMessage('Selected condition is not valid. Please select a valid condition.');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setMessageType('');

    // Show loading message for photo uploads
    if (formData.photos && formData.photos.length > 0) {
      setMessage(`🔄 Creating listing\nand uploading ${formData.photos.length} photos...`);
      setMessageType('');
    } else {
      setMessage('🔄 Creating listing...');
      setMessageType('');
    }

    try {
      // Upload video if present
      let videoUrl: string | undefined;
      if (formData.video) {
        videoUrl = await uploadVideoToStorage(formData.video);
      }

      // Create the listing first
      const listing = await insertListing(
        formData.title,
        formData.description,
        parseFloat(formData.price) || 0,
        formData.fb_category_id,
        formData.nd_category_id,
        formData.cl_category_id,
        formData.condition_id,
        formData.sku,
        formData.location,
        formData.craigslist_email,
        formData.zip_code,
        formData.street,
        formData.cross_street,
        videoUrl
      );

      // Upload photos if any
      if (formData.photos && formData.photos.length > 0) {
        const photoUploadResults = [];

        for (let i = 0; i < formData.photos.length; i++) {
          const file = formData.photos[i];

          debugLog(`🔄 CREATE DEBUG: Processing photo ${i + 1}/${formData.photos.length}:`, {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
          });
          addDebugLog?.(`🔄 CREATE DEBUG: Processing photo ${i + 1}/${formData.photos.length}: ${file.name} (${file.type}, ${file.size} bytes)`);

          try {
            debugLog(`🎯 CREATE DEBUG: Step 1 - Uploading photo ${i + 1} to storage...`);
            addDebugLog?.(`🎯 CREATE DEBUG: Step 1 - Uploading photo ${i + 1} to storage...`);

            const photoUrl = await uploadPhotoToStorage(file);

            debugLog(`✅ CREATE DEBUG: Step 1 complete - Photo ${i + 1} uploaded to storage:`, photoUrl);
            addDebugLog?.(`✅ CREATE DEBUG: Step 1 complete - Photo ${i + 1} uploaded to storage: ${photoUrl}`);

            debugLog(`🎯 CREATE DEBUG: Step 2 - Creating database record for photo ${i + 1}...`);
            addDebugLog?.(`🎯 CREATE DEBUG: Step 2 - Creating database record for photo ${i + 1}...`);

            await insertPhotoRecord(listing.id, photoUrl, i + 1);

            debugLog(`✅ CREATE DEBUG: All steps complete - Photo ${i + 1} fully processed!`);
            addDebugLog?.(`✅ CREATE DEBUG: All steps complete - Photo ${i + 1} fully processed!`);

            photoUploadResults.push(`✅ Photo ${i + 1} uploaded successfully`);
          } catch (photoError) {
            const errorMessage = photoError instanceof Error ? photoError.message : String(photoError);
            console.error(`❌ CREATE DEBUG: Photo ${i + 1} failed:`, photoError);
            addDebugLog?.(`❌ CREATE DEBUG: Photo ${i + 1} failed: ${errorMessage}`);
            photoUploadResults.push(`❌ Photo ${i + 1} failed: ${errorMessage}`);
          }
        }

        const successCount = photoUploadResults.filter(result => result.startsWith('✅')).length;
        const failCount = photoUploadResults.filter(result => result.startsWith('❌')).length;

        if (failCount > 0) {
          setMessage(`⚠️ Listing created!\n${successCount} photos uploaded, ${failCount} failed.`);
          setMessageType('error');
        } else {
          setMessage(`✅ Listing created with ${successCount} photos!\nPhotos are being processed and will appear shortly.`);
          setMessageType('success');
        }
      } else {
        setMessage('✅ Listing created successfully!');
        setMessageType('success');
      }

      // Reset form
      resetForm();

      onSuccess();

    } catch (error) {
      console.error('Error creating listing:', error);
      setMessage(error instanceof Error ? error.message : 'An error occurred');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();

    debugLog('🔍 SAVE BUTTON CLICKED: handleUpdateListing called');
    addDebugLog?.('🔍 SAVE BUTTON CLICKED: handleUpdateListing called');
    addDebugLog?.(`🔍 EDIT SUBMIT: editingListing exists: ${!!editingListing}`);

    // Debug: Check if photos are selected
    debugLog('📷 SAVE DEBUG: Checking photos before processing:', {
      hasPhotos: !!(formData.photos && formData.photos.length > 0),
      photoCount: formData.photos?.length || 0,
      photosObject: formData.photos
    });
    addDebugLog?.(`📷 SAVE DEBUG: ${formData.photos?.length || 0} photos selected for upload`);

    if (!editingListing) return;

    if (!formData.title.trim()) {
      setMessage('Please enter a title');
      setMessageType('error');
      return;
    }

    // Validate categories if they are selected
    if (formData.fb_category_id && !categories.find(cat => cat.id === formData.fb_category_id)) {
      setMessage('Selected Facebook category is not valid. Please select a valid category.');
      setMessageType('error');
      return;
    }

    if (formData.nd_category_id && !categories.find(cat => cat.id === formData.nd_category_id)) {
      setMessage('Selected Nextdoor category is not valid. Please select a valid category.');
      setMessageType('error');
      return;
    }

    if (formData.condition_id && !conditions.find(cond => cond.id === formData.condition_id)) {
      setMessage('Selected condition is not valid. Please select a valid condition.');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setMessageType('');

    // Show loading message for uploads
    const hasPhotos = formData.photos && formData.photos.length > 0;
    const hasVideo = formData.video;

    if (hasPhotos || hasVideo) {
      let message = '🔄 Updating listing';
      if (hasPhotos && formData.photos) message += `\nand uploading ${formData.photos.length} photos`;
      if (hasVideo) message += `\nand uploading video`;
      message += '...';
      debugLog('🔍 MESSAGE DEBUG: Setting update message with photos:', message);
      setMessage(message);
      setMessageType('');
    } else {
      debugLog('🔍 MESSAGE DEBUG: Setting update message without photos');
      setMessage('🔄 Updating listing...');
      setMessageType('');
    }

    try {
      debugLog('🔍 EDIT DEBUG: Full form state before update:', {
        formData,
        selectedCategoryName,
        selectedConditionName,
        selectedMainCategoryName,
        selectedLocationId,
        editingListing: editingListing?.id
      });
      addDebugLog?.('🔍 EDIT SAVE DEBUG: Full form state before update');
      addDebugLog?.(`🔍 EDIT SAVE: formData.fb_category_id = ${formData.fb_category_id}`);
      addDebugLog?.(`🔍 EDIT SAVE: formData.nd_category_id = ${formData.nd_category_id}`);
      addDebugLog?.(`🔍 EDIT SAVE: formData.condition_id = ${formData.condition_id}`);
      addDebugLog?.(`🔍 EDIT SAVE: selectedCategoryName = ${selectedCategoryName}`);
      addDebugLog?.(`🔍 EDIT SAVE: selectedConditionName = ${selectedConditionName}`);
      addDebugLog?.(`🔍 EDIT SAVE: formData.video = ${formData.video ? formData.video.name : 'No video'}`);

      // Handle video upload if present
      let videoUrl: string | undefined;
      if (formData.video) {
        addDebugLog?.('🎥 VIDEO DEBUG: Uploading video during edit...');
        try {
          videoUrl = await uploadVideoToStorage(formData.video);
          addDebugLog?.(`🎥 VIDEO DEBUG: Video uploaded successfully: ${videoUrl}`);
        } catch (videoError) {
          console.error('🎥 VIDEO DEBUG: Video upload failed:', videoError);
          addDebugLog?.(`🎥 VIDEO DEBUG: Video upload failed: ${videoError}`);
          throw new Error(`Failed to upload video: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`);
        }
      }

      // Additional debugging to verify category/condition resolution
      if (selectedCategoryName) {
        const foundCategory = categories.find(cat => cat.name === selectedCategoryName);
        debugLog('🔍 EDIT DEBUG: Category lookup:', {
          selectedCategoryName,
          foundCategory,
          formDataFbCategoryId: formData.fb_category_id,
          formDataNdCategoryId: formData.nd_category_id,
          allCategories: categories.map(c => ({ id: c.id, name: c.name }))
        });
      }

      if (selectedConditionName) {
        const foundCondition = conditions.find(cond => cond.name === selectedConditionName);
        debugLog('🔍 EDIT DEBUG: Condition lookup:', {
          selectedConditionName,
          foundCondition,
          formDataConditionId: formData.condition_id,
          allConditions: conditions.map(c => ({ id: c.id, name: c.name }))
        });
      }

      const updateData: any = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        fb_category_id: formData.fb_category_id || null,
        nd_category_id: formData.nd_category_id || null,
        cl_category_id: formData.cl_category_id || null,
        condition_id: formData.condition_id || null,
        sku: formData.sku || null,
        location: formData.location || null,
        location_id: selectedLocationId || null,
        craigslist_email: formData.craigslist_email || null,
        zip_code: formData.zip_code || null,
        street: formData.street || null,
        cross_street: formData.cross_street || null,
      };

      addDebugLog?.('🔍 EDIT SAVE DEBUG: Form data before update:');
      addDebugLog?.(`🔍 EDIT SAVE: formData.fb_category_id = ${formData.fb_category_id}`);
      addDebugLog?.(`🔍 EDIT SAVE: formData.nd_category_id = ${formData.nd_category_id}`);
      addDebugLog?.(`🔍 EDIT SAVE: formData.condition_id = ${formData.condition_id}`);
      addDebugLog?.(`🔍 EDIT SAVE: selectedCategoryName = ${selectedCategoryName}`);
      addDebugLog?.(`🔍 EDIT SAVE: selectedConditionName = ${selectedConditionName}`);
      addDebugLog?.(`🔍 EDIT SAVE: selectedMainCategoryName = ${selectedMainCategoryName}`);
      addDebugLog?.(`🔍 EDIT SAVE: subCategories.length = ${subCategories.length}`);
      addDebugLog?.(`🔍 EDIT SAVE: categories.length = ${categories.length}`);
      addDebugLog?.(`🔍 EDIT SAVE: formData object = ${JSON.stringify(formData, null, 2)}`);

      // Add video URL if uploaded
      if (videoUrl) {
        updateData.video_url = videoUrl;
        addDebugLog?.(`🎥 VIDEO DEBUG: Adding video_url to update data: ${videoUrl}`);
      }

      debugLog('🔍 EDIT DEBUG: Update data being sent to database:', updateData);
      addDebugLog?.('🔍 EDIT SAVE DEBUG: Update data being sent to database');
      addDebugLog?.(`🔍 EDIT SAVE: updateData.fb_category_id = ${updateData.fb_category_id}`);
      addDebugLog?.(`🔍 EDIT SAVE: updateData.nd_category_id = ${updateData.nd_category_id}`);
      addDebugLog?.(`🔍 EDIT SAVE: updateData.condition_id = ${updateData.condition_id}`);

      const { error } = await supabase
        .from('mb_listings')
        .update(updateData)
        .eq('id', editingListing.id);

      if (error) {
        throw new Error(`Failed to update listing: ${error.message}`);
      }

      // Handle photo uploads if any
      debugLog('📷 UPLOAD CHECK: Checking for photos to upload:', {
        hasPhotos: !!(formData.photos && formData.photos.length > 0),
        photoCount: formData.photos?.length || 0,
        photosType: typeof formData.photos,
        photosIsArray: Array.isArray(formData.photos),
        photosKeys: formData.photos ? Object.keys(formData.photos) : 'no photos',
        photosConstructor: formData.photos?.constructor?.name,
        photosLength: formData.photos?.length,
        photosItem0: formData.photos?.[0] ? {
          name: formData.photos[0].name,
          type: formData.photos[0].type,
          size: formData.photos[0].size
        } : 'no first item'
      });
      addDebugLog?.(`📷 UPLOAD CHECK: Has photos: ${!!(formData.photos && formData.photos.length > 0)}, Count: ${formData.photos?.length || 0}`);
      addDebugLog?.(`📷 UPLOAD CHECK: Photos type: ${typeof formData.photos}, IsArray: ${Array.isArray(formData.photos)}`);
      if (formData.photos && formData.photos.length > 0) {
        addDebugLog?.(`📷 UPLOAD CHECK: First photo: ${formData.photos[0].name} (${formData.photos[0].type}, ${formData.photos[0].size} bytes)`);
      }

      if (formData.photos && formData.photos.length > 0) {
        debugLog('📷 UPLOAD START: Starting photo upload process...');
        addDebugLog?.('📷 UPLOAD START: Starting photo upload process...');
        const photoUploadResults = [];

        for (let i = 0; i < formData.photos.length; i++) {
          const file = formData.photos[i];

          debugLog(`🔄 UPLOAD DEBUG: Processing photo ${i + 1}/${formData.photos.length}:`, {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
          });
          addDebugLog?.(`🔄 UPLOAD DEBUG: Processing photo ${i + 1}/${formData.photos.length}: ${file.name} (${file.type}, ${file.size} bytes)`);

          try {
            debugLog(`🎯 UPLOAD DEBUG: Step 1 - Uploading photo ${i + 1} to storage...`);
            addDebugLog?.(`🎯 UPLOAD DEBUG: Step 1 - Uploading photo ${i + 1} to storage...`);

            const photoUrl = await uploadPhotoToStorage(file);

            debugLog(`✅ UPLOAD DEBUG: Step 1 complete - Photo ${i + 1} uploaded to storage:`, photoUrl);
            addDebugLog?.(`✅ UPLOAD DEBUG: Step 1 complete - Photo ${i + 1} uploaded to storage: ${photoUrl}`);

            debugLog(`🎯 UPLOAD DEBUG: Step 2 - Creating database record for photo ${i + 1}...`);
            addDebugLog?.(`🎯 UPLOAD DEBUG: Step 2 - Creating database record for photo ${i + 1}...`);

            // Calculate position: existing photos count + current photo index + 1
            const existingPhotosCount = editingPhotos.length;
            const newPosition = existingPhotosCount + i + 1;
            await insertPhotoRecord(editingListing.id, photoUrl, newPosition);

            debugLog(`✅ UPLOAD DEBUG: All steps complete - Photo ${i + 1} fully processed!`);
            addDebugLog?.(`✅ UPLOAD DEBUG: All steps complete - Photo ${i + 1} fully processed!`);

            photoUploadResults.push(`✅ Photo ${i + 1} uploaded successfully`);
          } catch (photoError) {
            const errorMessage = photoError instanceof Error ? photoError.message : String(photoError);
            console.error(`❌ UPLOAD DEBUG: Photo ${i + 1} failed:`, photoError);
            addDebugLog?.(`❌ UPLOAD DEBUG: Photo ${i + 1} failed: ${errorMessage}`);
            photoUploadResults.push(`❌ Photo ${i + 1} failed: ${errorMessage}`);
          }
        }

        const successCount = photoUploadResults.filter(result => result.startsWith('✅')).length;
        const failCount = photoUploadResults.filter(result => result.startsWith('❌')).length;

        if (failCount > 0) {
          setMessage(`⚠️ Listing updated!\n${successCount} photos uploaded, ${failCount} failed.`);
          setMessageType('error');
        } else {
          setMessage(`✅ Listing updated with ${successCount} photos!\nPhotos are being processed and will appear shortly.`);
          setMessageType('success');
        }
      } else {
        setMessage('✅ Listing updated successfully!');
        setMessageType('success');
      }

      // Keep editing state but clear photos
      setPhotoPreviewUrls([]);
      setVideoPreviewUrl(null);

      onSuccess();

    } catch (error) {
      console.error('Error updating listing:', error);
      setMessage(error instanceof Error ? error.message : 'An error occurred');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={isEditing ? handleUpdateListing : handleSubmit}>
      {/* High visibility message (same style as ViewListings) */}
      {message && (
        <div className={`user-message ${messageType || 'info'}`}>
          <div className="message-content">
            <span className="message-icon">
              {messageType === 'error' && '❌'}
              {messageType === 'success' && '✅'}
              {!messageType && 'ℹ️'}
            </span>
            <span className="message-text">{message}</span>
            <button
              className="message-close"
              onClick={() => setMessage('')}
              title="Dismiss message"
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Enter listing title"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe your item"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="price">Price ($)</label>
        <input
          type="number"
          id="price"
          name="price"
          value={formData.price}
          onChange={handleInputChange}
          placeholder="0.00"
          min="0"
          step="0.01"
          disabled={isLoading}
        />
      </div>

      {/* Category section with border and Sync button (wraps all three) */}
      <div className="form-group" style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 600, color: '#495057' }}>Categories</div>
          <button
            type="button"
            className="button"
            style={{ width: 'auto', padding: '6px 10px' }}
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                fb_category_id: '',
                nd_category_id: '',
                cl_category_id: ''
              }));
              setMessage('Categories cleared');
              setMessageType('success');
              setTimeout(() => { setMessage(''); setMessageType(''); }, 1500);
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className={`button ${autosyncEnabled ? 'secondary' : ''}`}
            style={{
              width: 'auto',
              padding: '6px 10px',
              marginLeft: 8,
              backgroundColor: autosyncEnabled ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none'
            }}
            onClick={toggleAutosync}
          >
            {autosyncEnabled ? 'Disable Autosync' : 'Enable Autosync'}
          </button>
        </div>

        {/* Facebook Category */}
        <div className="form-group">
          <label htmlFor="fb_category_id">Facebook Category</label>
          <ComboBox
            id="fb_category_id"
            name="fb_category_id"
            value={formData.fb_category_id}
            onChange={handleComboBoxChange}
            onSelect={handleCategorySelect}
            options={facebookCategories}
            placeholder="Select Facebook category..."
            disabled={isLoading}
            allowCustom={false}
          />

        </div>

        {/* Nextdoor Category */}
        <div className="form-group">
          <label htmlFor="nd_category_id">Nextdoor Category</label>
          <ComboBox
            id="nd_category_id"
            name="nd_category_id"
            value={formData.nd_category_id}
            onChange={handleComboBoxChange}
            onSelect={handleCategorySelect}
            options={categories.filter(cat => cat.category_type?.slug === 'nextdoor')}
            placeholder="Select Nextdoor category..."
            disabled={isLoading}
            allowCustom={false}
          />
        </div>

        {/* Craigslist Category */}
        <label htmlFor="cl_category_id">Craigslist Category</label>
        <ComboBox
          id="cl_category_id"
          name="cl_category_id"
          value={formData.cl_category_id as any}
          onChange={handleComboBoxChange}
          onSelect={handleCategorySelect}
          options={craigslistCategories}
          placeholder="Select Craigslist category..."
          disabled={isLoading}
          allowCustom={false}
        />
      </div>

      <div className="form-group">
        <label htmlFor="condition_id">Condition</label>
        <ComboBox
          id="condition_id"
          name="condition_id"
          value={formData.condition_id}
          onChange={handleComboBoxChange}
          options={conditions}
          placeholder="Select or type a condition..."
          disabled={isLoading}
          allowCustom={true}
        />
      </div>

      <div className="form-group">
        <label htmlFor="sku">SKU</label>
        <input
          type="text"
          id="sku"
          name="sku"
          value={formData.sku}
          onChange={handleInputChange}
          placeholder="Product SKU (optional)"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="location">Location</label>
        <LocationComboBox
          id="location"
          name="location"
          value={formData.location}
          onChange={handleLocationChange}
          onZipCodeChange={(zipCode) => {
            setFormData(prev => ({
              ...prev,
              zip_code: zipCode
            }));
            addDebugLog?.(`📍 ZIP code updated: ${zipCode}`);
          }}
          placeholder="Enter location or click 📍 to detect"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="craigslist_email">Craigslist Email</label>
        <input
          type="email"
          id="craigslist_email"
          name="craigslist_email"
          value={formData.craigslist_email}
          onChange={handleInputChange}
          placeholder="Email for Craigslist posting"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="zip_code">ZIP Code</label>
        <input
          type="text"
          id="zip_code"
          name="zip_code"
          value={formData.zip_code}
          onChange={handleInputChange}
          placeholder="ZIP code for Craigslist posting"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="street">Street Address</label>
        <input
          type="text"
          id="street"
          name="street"
          value={formData.street}
          onChange={handleInputChange}
          placeholder="Street address (optional)"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="cross_street">Cross Street</label>
        <input
          type="text"
          id="cross_street"
          name="cross_street"
          value={formData.cross_street}
          onChange={handleInputChange}
          placeholder="Cross street (optional)"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="photos">Photos</label>
        <DragDropUpload
          addDebugLog={addDebugLog}
          onFilesSelected={async (files) => {
            if (files && files.length > 0) {
              debugLog('📷 Files received:', files.length);
              addDebugLog?.(`📷 Files received: ${files.length}`);

              // Debug: Log details of each file received
              Array.from(files).forEach((file, index) => {
                addDebugLog?.(`🔍 FILE ${index + 1}: ${file.name} | Type: ${file.type} | Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
              });

              // Check file sizes (4MB limit)
              const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes
              const oversizedFiles = Array.from(files).filter(file => file.size > MAX_FILE_SIZE);

              if (oversizedFiles.length > 0) {
                const fileNames = oversizedFiles.map(f => f.name).join(', ');
                const message = `❌ File(s) too large (max 4MB): ${fileNames}. Please resize or compress your images.`;
                setMessage(message);
                setMessageType('error');
                debugLog('📷 SIZE CHECK: Files too large:', oversizedFiles.map(f => ({ name: f.name, size: f.size })));
                addDebugLog?.(`📷 SIZE CHECK: ${oversizedFiles.length} files exceed 4MB limit`);
                return; // Don't process oversized files
              }

              // Convert FileList to array and add to existing photos
              const newFiles = Array.from(files);
              setFormData(prev => {
                const existingPhotos = prev.photos ? Array.from(prev.photos) : [];
                const allPhotos = [...existingPhotos, ...newFiles];

                debugLog('📷 STORE DEBUG: Adding files to formData:', {
                  existingCount: existingPhotos.length,
                  newCount: newFiles.length,
                  totalCount: allPhotos.length,
                  fileNames: newFiles.map(f => f.name)
                });
                addDebugLog?.(`📷 STORE DEBUG: Adding ${newFiles.length} files to existing ${existingPhotos.length} photos`);

                return {
                  ...prev,
                  photos: allPhotos as any // Convert back to FileList-like object
                };
              });


              // Generate immediate previews for all files
              if (newFiles.length > 0) {
                const generatePreviews = async () => {
                  // TECHNIQUE 1: Try blob URLs first (most compatible)
                  const createBlobPreview = (file: File): Promise<string> => {
                    return new Promise((resolve, reject) => {
                      if (!file.type.startsWith('image/')) {
                        reject(new Error('Not an image file'));
                        return;
                      }

                      try {
                        const blobUrl = URL.createObjectURL(file);
                        resolve(blobUrl);
                      } catch (error) {
                        reject(error);
                      }
                    });
                  };

                  // TECHNIQUE 2: Data URL with explicit MIME type
                  const createDataUrlPreview = (file: File): Promise<string> => {
                    return new Promise((resolve, reject) => {
                      if (!file.type.startsWith('image/')) {
                        reject(new Error('Not an image file'));
                        return;
                      }

                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const dataUrl = e.target?.result as string;
                        if (dataUrl) {
                          resolve(dataUrl);
                        } else {
                          reject(new Error('No data URL generated'));
                        }
                      };
                      reader.onerror = () => reject(new Error('FileReader error'));
                      reader.readAsDataURL(file);
                    });
                  };

                  // TECHNIQUE 3: Canvas-based conversion (fallback)
                  const createCanvasPreview = (file: File): Promise<string> => {
                    return new Promise((resolve, reject) => {
                      if (!file.type.startsWith('image/')) {
                        reject(new Error('Not an image file'));
                        return;
                      }

                      const img = new Image();
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');

                      img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx?.drawImage(img, 0, 0);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        resolve(dataUrl);
                      };

                      img.onerror = () => reject(new Error('Image load failed'));

                      const reader = new FileReader();
                      reader.onload = (e) => {
                        img.src = e.target?.result as string;
                      };
                      reader.onerror = () => reject(new Error('FileReader error'));
                      reader.readAsDataURL(file);
                    });
                  };

                  // Try all techniques in sequence
                  const tryAllTechniques = async (file: File): Promise<string> => {
                    const techniques = [
                      { name: 'blob', fn: createBlobPreview },
                      { name: 'dataUrl', fn: createDataUrlPreview },
                      { name: 'canvas', fn: createCanvasPreview }
                    ];

                    for (const technique of techniques) {
                      try {
                        debugLog(`📷 PREVIEW DEBUG: Trying ${technique.name} technique for ${file.name}`);
                        addDebugLog?.(`📷 PREVIEW DEBUG: Trying ${technique.name} technique for ${file.name}`);
                        const result = await technique.fn(file);
                        debugLog(`✅ PREVIEW DEBUG: ${technique.name} technique succeeded for ${file.name}`);
                        addDebugLog?.(`✅ PREVIEW DEBUG: ${technique.name} technique succeeded for ${file.name}`);
                        return result;
                      } catch (error) {
                        debugLog(`❌ PREVIEW DEBUG: ${technique.name} technique failed for ${file.name}:`, error);
                        addDebugLog?.(`❌ PREVIEW DEBUG: ${technique.name} technique failed for ${file.name}: ${error}`);
                      }
                    }
                    throw new Error('All preview techniques failed');
                  };

                  // Process regular files with multiple techniques
                  const results = await Promise.all(
                    newFiles.map((file) =>
                      tryAllTechniques(file).catch(error => {
                        console.error(`❌ All preview techniques failed for ${file.name}:`, error);
                        addDebugLog?.(`❌ All preview techniques failed for ${file.name}: ${error.message}`);
                        return null;
                      })
                    )
                  );

                  const newUrls = results.filter((url): url is string => url !== null);
                  debugLog(`📷 PREVIEW DEBUG: Generated ${newUrls.length} preview URLs for regular files`);
                  addDebugLog?.(`📷 PREVIEW DEBUG: Generated ${newUrls.length} preview URLs for regular files`);

                  // Add new previews to existing ones
                  setPhotoPreviewUrls(prev => [...prev, ...newUrls]);
                }

                // Call generatePreviews to process regular files
                generatePreviews();
              }


              debugLog('📷 Processing', files.length, 'new files');
              addDebugLog?.(`📷 Processing ${files.length} new files`);
            }
          }}
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
          multiple={true}
          disabled={isLoading}
        >
          <div className="drag-drop-upload-icon">📷</div>
          <div className="drag-drop-upload-text">
            {formData.photos && formData.photos.length > 0
              ? `${formData.photos.length} photo${formData.photos.length > 1 ? 's' : ''} selected`
              : 'Drag & drop photos here'
            }
          </div>
          <div className="drag-drop-upload-hint">or click to select files</div>
                      <div className="drag-drop-upload-help">Multiple files allowed. Max 4MB per file.</div>
        </DragDropUpload>

        {/* Show existing photos in edit mode */}
        {isEditing && editingPhotos.length > 0 && (
          <div className="existing-photos">
            <div className="existing-photos-label">Existing Photos:</div>
            <div className="existing-photos-grid">
              {editingPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="existing-photo-container"
                  style={{ position: 'relative' }}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', index.toString());
                    e.dataTransfer.effectAllowed = 'move';
                    debugLog('🔄 Drag start for existing photo at index:', index);
                    addDebugLog?.(`🔄 Drag start for existing photo at index: ${index}`);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const toIndex = index;

                    if (fromIndex !== toIndex) {
                      debugLog('🔄 Drop detected: moving from index', fromIndex, 'to index', toIndex);
                      addDebugLog?.(`🔄 Drop detected: moving from index ${fromIndex} to index ${toIndex}`);
                      moveExistingPhoto(fromIndex, toIndex);
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.opacity = '0.7';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Photo controls overlay */}
                  <div className="photo-controls" style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    display: 'flex',
                    gap: '4px',
                    zIndex: 10
                  }}>
                    {/* Delete button */}
                    <button
                      type="button"
                      className="delete-photo-btn"
                      onClick={() => handleDeletePhoto(photo)}
                      disabled={isLoading}
                      title="Delete photo"
                      style={{
                        background: 'rgba(255, 0, 0, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Photo number indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}>
                    {index + 1}
                  </div>

                  {/* Drag handle indicator */}
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    cursor: 'grab'
                  }} title="Drag to reorder">
                    ⋮⋮
                  </div>

                  <img
                    src={photo.photo_url}
                    alt="Existing photo"
                    className="existing-photo"
                    style={{ cursor: 'grab' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
              💡 Drag photos to reorder them • Click × to delete
            </div>
          </div>
        )}

        {photoPreviewUrls.length > 0 && (
          <div className="photo-previews">
            <div className="preview-label">📷 New photos to upload:</div>
            <div className="preview-grid">
              {photoPreviewUrls.map((url, index) => (
                <div
                  key={index}
                  className="photo-preview"
                  style={{ position: 'relative' }}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', index.toString());
                    e.dataTransfer.effectAllowed = 'move';
                    debugLog('🔄 Drag start for new photo at index:', index);
                    addDebugLog?.(`🔄 Drag start for new photo at index: ${index}`);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const toIndex = index;

                    if (fromIndex !== toIndex) {
                      debugLog('🔄 Drop detected: moving from index', fromIndex, 'to index', toIndex);
                      addDebugLog?.(`🔄 Drop detected: moving from index ${fromIndex} to index ${toIndex}`);
                      movePhoto(fromIndex, toIndex);
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.opacity = '0.7';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Photo controls overlay */}
                  <div className="photo-controls" style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    display: 'flex',
                    gap: '4px',
                    zIndex: 10
                  }}>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      style={{
                        background: 'rgba(255, 0, 0, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove photo"
                    >
                      ×
                    </button>
                  </div>

                  {/* Photo number indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}>
                    {index + 1}
                  </div>

                  {/* Drag handle indicator */}
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    cursor: 'grab'
                  }} title="Drag to reorder">
                    ⋮⋮
                  </div>

                  {(() => {
                    return (
                      <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                          onError={(e) => {
                            console.error('📷 PREVIEW ERROR: Failed to load preview image for index', index, 'URL type:', url.startsWith('blob:') ? 'blob' : url.startsWith('data:') ? 'data' : 'unknown');
                            addDebugLog?.(`📷 PREVIEW ERROR: Failed to load preview image for index ${index} - URL type: ${url.startsWith('blob:') ? 'blob' : url.startsWith('data:') ? 'data' : 'unknown'}`);

                            // Try to show a fallback
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            const fallback = document.createElement('div');
                            fallback.textContent = 'Preview failed to load';
                            fallback.style.cssText = 'padding: 20px; text-align: center; color: #666; border: 1px dashed #ccc;';
                            img.parentNode?.appendChild(fallback);
                          }}
                          onLoad={() => {
                            debugLog('📷 PREVIEW SUCCESS: Preview image loaded for index', index, 'URL type:', url.startsWith('blob:') ? 'blob' : url.startsWith('data:') ? 'data' : 'unknown');
                            addDebugLog?.(`📷 PREVIEW SUCCESS: Preview image loaded for index ${index} - URL type: ${url.startsWith('blob:') ? 'blob' : url.startsWith('data:') ? 'data' : 'unknown'}`);
                          }}
                        />
                    );
                  })()}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
              💡 Drag & drop more photos to add them • Drag photos to reorder them • Click × to remove
            </div>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="video">Video</label>

        {/* Existing video (edit mode) */}
        {isEditing && editingVideoUrl && (
          <div className="existing-photos" style={{ marginBottom: '10px' }}>
            <div className="existing-photos-label">Existing Video:</div>
            <div className="existing-photo-container" style={{ maxWidth: '320px' }}>
              <video
                src={editingVideoUrl}
                controls
                style={{ width: '100%', borderRadius: '6px', border: '2px solid #e9ecef' }}
                preload="metadata"
              />
              <button
                type="button"
                className="delete-photo-btn"
                onClick={handleDeleteVideo}
                disabled={isLoading}
                title="Delete video"
              >
                ❌
              </button>
          </div>
        </div>
        )}

        {/* Video upload section - commented out, may be added back in the future */}
        {/*
        <DragDropUpload
          onFilesSelected={handleVideoDragDrop}
          accept="video/*"
          multiple={false}
          disabled={isLoading}
        >
          <div className="drag-drop-upload-icon">🎥</div>
          <div className="drag-drop-upload-text">
            {formData.video
              ? `Video selected: ${formData.video.name}`
              : 'Drag & drop video here'
            }
          </div>
          <div className="drag-drop-upload-hint">or click to select file</div>
          <div className="drag-drop-upload-help">Optional product demonstration video.</div>
        </DragDropUpload>
        */}

        {/* Video preview and debug sections - commented out, may be added back in the future */}
        {/*
        {videoPreviewUrl && (
          <div className="video-preview">
            <div className="preview-label">🎥 Video preview:</div>
            <div className="video-preview-container">
              <video
                src={videoPreviewUrl}
                controls={false}
                muted
                style={{ width: '100%', maxHeight: '120px' }}
                onLoadStart={() => {
                  debugLog('🎥 VIDEO DEBUG: Video element starting to load');
                  addDebugLog?.('🎥 VIDEO DEBUG: Video element starting to load');
                }}
                onLoadedData={() => {
                  debugLog('🎥 VIDEO DEBUG: Video data loaded successfully');
                  addDebugLog?.('🎥 VIDEO DEBUG: Video data loaded successfully');
                }}
                onError={(e) => {
                  console.error('🎥 VIDEO DEBUG: Video loading error:', e);
                  addDebugLog?.(`🎥 VIDEO DEBUG: Video loading error: ${e.type}`);
                }}
              />
            </div>
          </div>
        )}

        {formData.video && (
          <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
            🎥 DEBUG: Video file: {formData.video.name} | Preview URL: {videoPreviewUrl ? 'Generated' : 'Not generated'}
          </div>
        )}
        */}
      </div>

      {/* Message component removed - duplicate of the one at the top of the form */}

      <div className="button-group">
        {isEditing && (
          <button
            type="button"
            className="button secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel Edit
          </button>
        )}

        <button
          type="submit"
          className="button primary"
          disabled={isLoading}
        >
          {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Listing' : 'Create Listing')}
        </button>
      </div>
    </form>
  );
};

export default CreateListingForm;