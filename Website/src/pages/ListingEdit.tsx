import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Listing, Category, Condition, ListingPhoto } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, X, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import PhotoManager from '@/components/PhotoManager'

export default function ListingEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [listing, setListing] = useState<Listing | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [photos, setPhotos] = useState<ListingPhoto[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  // ===== Autosync State =====
  const [autosyncEnabled, setAutosyncEnabled] = useState(true)

  // Load autosync preference from localStorage
  useEffect(() => {
    const savedAutosync = localStorage.getItem('marketplace_autosync_enabled')
    if (savedAutosync !== null) {
      setAutosyncEnabled(savedAutosync === 'true')
    }
  }, [])

  // Save autosync preference to localStorage
  const toggleAutosync = () => {
    const newValue = !autosyncEnabled
    setAutosyncEnabled(newValue)
    localStorage.setItem('marketplace_autosync_enabled', newValue.toString())
  }



  useEffect(() => {
    console.log('🔄 useEffect triggered, id:', id)
    console.log('🔄 id type:', typeof id, 'id value:', id)

    if (!id || id === 'new') {
      console.log('🆕 Creating new listing')
      // Initialize empty listing for new
      const newListing = {
        id: '',
        user_id: '',
        title: '',
        description: '',
        price: 0,
        fb_category_id: null,
        nd_category_id: null,
        cl_category_id: null,
        condition_id: null,
        sku: null,
        location: null,
        location_id: null,
        video_url: null,
        craigslist_email: null,
        zip_code: null,
        street: null,
        cross_street: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      setListing(newListing)
      setLoading(false)
      fetchCategories()
      fetchConditions()
    } else {
      console.log('📋 Fetching existing listing:', id)
      fetchListing()
    }
  }, [id])

  const fetchListing = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('mb_listings')
        .select(`
          *,
          fb_category:mb_categories!fb_category_id(*),
          nd_category:mb_categories!nd_category_id(*),
          cl_category:mb_categories!cl_category_id(*),
          condition:mb_conditions(*)
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      setListing(data)
      await fetchPhotos(data.id)
      await fetchCategories()
      await fetchConditions()
    } catch (error) {
      console.error('Error fetching listing:', error)
      toast({
        title: 'Error',
        description: 'Failed to load listing',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPhotos = async (listingId: string) => {
    try {
      const { data, error } = await supabase
        .from('mb_photos')
        .select('*')
        .eq('listing_id', listingId)
        .order('position', { ascending: true })

      if (error) throw error
      setPhotos(data || [])
    } catch (error) {
      console.error('Error fetching photos:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      // Load categories and category types separately to avoid join permission issues
      const [categoriesResult, categoryTypesResult] = await Promise.all([
        supabase
          .from('mb_categories')
          .select('*')
          .order('name'),
        supabase
          .from('mb_category_type')
          .select('*')
      ]);

      if (categoriesResult.error) {
        console.error('Error loading categories:', categoriesResult.error);
        return;
      }

      if (categoryTypesResult.error) {
        console.error('Error loading category types:', categoryTypesResult.error);
        return;
      }

      // Manually join the data
      const categoryTypes = categoryTypesResult.data || [];
      const categoriesData = (categoriesResult.data || []).map(category => ({
        ...category,
        category_type: categoryTypes.find(ct => ct.id === category.category_type_id)
      }));

      console.log('📋 Loaded categories with types:', categoriesData.length);
      console.log('📋 Category types available:', categoryTypes.map(ct => ({ id: ct.id, name: ct.name, slug: ct.slug })));

      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchConditions = async () => {
    try {
      const { data, error } = await supabase
        .from('mb_conditions')
        .select('*')
        .order('name')

      if (error) throw error
      setConditions(data || [])
    } catch (error) {
      console.error('Error fetching conditions:', error)
    }
  }

  // Category sync helpers
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
  }

  const FALLBACK_BY_PLATFORM = {
    facebook: 'Other',
    nextdoor: 'Other',
    craigslist: 'general for sale'
  }

  const normalizeText = (text: string): string => {
    return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  }

  const bestMatch = (sourceText: string, targetCategories: Category[]): { match: Category | null; score: number | null } => {
    const normalizedSource = normalizeText(sourceText);
    let bestMatch: Category | null = null;
    let bestScore = 0;

    for (const category of targetCategories) {
      const normalizedTarget = normalizeText(category.name);

      // Check for exact match first
      if (normalizedSource === normalizedTarget) {
        return { match: category, score: 1.0 };
      }

      // Check for alias match
      const alias = ALIASES[normalizedSource];
      if (alias && normalizeText(alias) === normalizedTarget) {
        return { match: category, score: 0.9 };
      }

      // Check for contains match
      if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) {
        const score = Math.min(normalizedSource.length, normalizedTarget.length) / Math.max(normalizedSource.length, normalizedTarget.length);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }
    }

    return { match: bestMatch, score: bestScore > 0.3 ? bestScore : null };
  }

  const findCategoryIdByName = (platform: string, categoryName: string, categories: Category[]): string | null => {
    const category = categories.find(c =>
      c.category_type?.slug === platform &&
      normalizeText(c.name) === normalizeText(categoryName)
    );
    return category?.id || null;
  }

  const applyOverrides = (_sourcePlatform: string, sourceText: string, categories: Category[]): any => {
    // Manual overrides for specific category mappings
    const overrides: Record<string, any> = {
      'Accessories': { fb_category_id: findCategoryIdByName('facebook', 'Accessories', categories) },
      'Cell Phones': {
        fb_category_id: findCategoryIdByName('facebook', 'Cell Phones', categories),
        nd_category_id: findCategoryIdByName('nextdoor', 'Electronics', categories),
        cl_category_id: findCategoryIdByName('craigslist', 'cell phones', categories)
      },
      'Computers': {
        fb_category_id: findCategoryIdByName('facebook', 'Computers', categories),
        nd_category_id: findCategoryIdByName('nextdoor', 'Electronics', categories),
        cl_category_id: findCategoryIdByName('craigslist', 'computers', categories)
      },
      'Furniture': {
        fb_category_id: findCategoryIdByName('facebook', 'Furniture', categories),
        nd_category_id: findCategoryIdByName('nextdoor', 'Furniture', categories),
        cl_category_id: findCategoryIdByName('craigslist', 'furniture', categories)
      }
    };

    const normalizedSource = normalizeText(sourceText);
    for (const [key, value] of Object.entries(overrides)) {
      if (normalizeText(key) === normalizedSource) {
        return value;
      }
    }
    return null;
  }

  const syncCategories = (isAutoSync = false) => {
    if (!listing) return;

    try {
      if (isAutoSync) {
        console.log('🔄 Auto-sync categories triggered');
      } else {
        console.log('🔄 Sync categories started');
      }
      console.log('📋 Available categories:', categories.length);
      console.log('📋 Categories by type:', {
        facebook: categories.filter(c => c.category_type?.slug === 'facebook').length,
        nextdoor: categories.filter(c => c.category_type?.slug === 'nextdoor').length,
        craigslist: categories.filter(c => c.category_type?.slug === 'craigslist').length
      });

      const fbSelected = categories.find(c => c.id === listing.fb_category_id);
      const ndSelected = categories.find(c => c.id === listing.nd_category_id);
      const clSelected = categories.find(c => c.id === listing.cl_category_id);
      const source = fbSelected || ndSelected || clSelected || null;

      console.log('🔍 Selected categories:', { fbSelected, ndSelected, clSelected, source });

      if (!source) {
        if (!isAutoSync) {
          toast({
            title: 'Warning',
            description: 'Select at least one category to sync from.',
            variant: 'destructive',
          });
        }
        return;
      }

      const sourceText = source.name;
      const targetFacebook = categories.filter(c => c.category_type?.slug === 'facebook' && c.parent_id);
      const targetNextdoor = categories.filter(c => c.category_type?.slug === 'nextdoor');
      const targetCraigslist = categories.filter(c => c.category_type?.slug === 'craigslist');

      console.log('🎯 Target categories:', {
        facebook: targetFacebook.length,
        nextdoor: targetNextdoor.length,
        craigslist: targetCraigslist.length
      });

      if (targetFacebook.length === 0 && targetNextdoor.length === 0 && targetCraigslist.length === 0) {
        if (!isAutoSync) {
          toast({
            title: 'Warning',
            description: 'No categories are loaded to sync against. Please ensure categories exist.',
            variant: 'destructive',
          });
        }
        return;
      }

      // Apply overrides first, then fuzzy match
      const sourcePlatform = (source.category_type?.slug as any) || 'facebook';
      const override = applyOverrides(sourcePlatform, sourceText, categories);
      const update: any = override ? { ...override } : {};

      // Facebook category sync
      if (!update.fb_category_id && (!fbSelected || source.category_type?.slug !== 'facebook')) {
        const { match, score } = bestMatch(sourceText, targetFacebook);
        if (match && (score ?? 0) >= 0.45) update.fb_category_id = match.id;
        if (!update.fb_category_id) {
          const fbFallback = findCategoryIdByName('facebook', FALLBACK_BY_PLATFORM.facebook, categories);
          if (fbFallback) update.fb_category_id = fbFallback;
        }
      }

      // Nextdoor category sync
      if (!update.nd_category_id && (!ndSelected || source.category_type?.slug !== 'nextdoor')) {
        const { match, score } = bestMatch(sourceText, targetNextdoor);
        if (match && (score ?? 0) >= 0.45) update.nd_category_id = match.id;
        if (!update.nd_category_id) {
          const ndFallback = findCategoryIdByName('nextdoor', FALLBACK_BY_PLATFORM.nextdoor, categories);
          if (ndFallback) update.nd_category_id = ndFallback;
        }
      }

      // Craigslist category sync
      if (!update.cl_category_id && (!clSelected || source.category_type?.slug !== 'craigslist')) {
        const { match, score } = bestMatch(sourceText, targetCraigslist);
        if (match && (score ?? 0) >= 0.45) update.cl_category_id = match.id;
        if (!update.cl_category_id) {
          const clFallback = findCategoryIdByName('craigslist', FALLBACK_BY_PLATFORM.craigslist, categories);
          if (clFallback) update.cl_category_id = clFallback;
        }
      }

      if (Object.keys(update).length === 0) {
        if (!isAutoSync) {
          toast({
            title: 'Info',
            description: 'No suitable category matches found to sync.',
          });
        }
        return;
      }

      // Check if changes would actually happen
      const willChange =
        (update.fb_category_id && update.fb_category_id !== listing.fb_category_id) ||
        (update.nd_category_id && update.nd_category_id !== listing.nd_category_id) ||
        (update.cl_category_id && update.cl_category_id !== listing.cl_category_id);

      if (!willChange) {
        if (!isAutoSync) {
          toast({
            title: 'Info',
            description: 'Categories already synced. No changes needed.',
          });
        }
        return;
      }

      setListing((prev: Listing | null) => prev ? { ...prev, ...update } : null);

      if (!isAutoSync) {
        toast({
          title: 'Success',
          description: 'Categories synced successfully',
        });
      }
    } catch (error) {
      console.error('Sync categories error:', error);
      toast({
        title: 'Error',
        description: 'Sync categories failed',
        variant: 'destructive',
      });
    }
  }

  const clearCategories = () => {
    setListing((prev: Listing | null) => prev ? {
      ...prev,
      fb_category_id: null,
      nd_category_id: null,
      cl_category_id: null
    } : null);
    toast({
      title: 'Success',
      description: 'Categories cleared',
    });
  }

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Geolocation is not supported in your browser',
        variant: 'destructive',
      });
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocoding using Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&extratags=1&namedetails=1`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();

      if (!data.address) throw new Error('No address found');

      const { city, town, village, state, postcode } = data.address;
      const cityName = city || town || village;
      const stateName = state;
      const zipCode = postcode;

      if (!cityName || !stateName) throw new Error('Incomplete address');

      const locationString = `${cityName}, ${stateName}`;
      setListing(prev => prev ? {
        ...prev,
        location: locationString,
        zip_code: zipCode || null
      } : null);

      const successMessage = zipCode
        ? `Location detected: ${locationString} (ZIP: ${zipCode})`
        : `Location detected: ${locationString}`;

      toast({
        title: 'Success',
        description: successMessage,
      });
    } catch (error) {
      console.error('Location detection error:', error);
      toast({
        title: 'Error',
        description: 'Failed to detect location',
        variant: 'destructive',
      });
    }
  }

  const validateListing = (listing: Listing): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!listing.title?.trim()) {
      errors.title = 'Title is required'
    }

    if (!listing.description?.trim()) {
      errors.description = 'Description is required'
    }

    if (!listing.price || listing.price <= 0) {
      errors.price = 'Price must be greater than 0'
    }

    if (!listing.location?.trim()) {
      errors.location = 'Location is required'
    }

    return errors
  }

  const handleSave = async () => {
    console.log('🔍 Save button clicked')
    console.log('📋 Current listing:', listing)

    if (!listing) {
      console.log('❌ No listing data')
      return
    }

    // Clear previous validation errors
    setValidationErrors({})

    // Validate the listing
    const errors = validateListing(listing)
    console.log('🔍 Validation errors:', errors)

    if (Object.keys(errors).length > 0) {
      console.log('❌ Validation failed, setting errors')
      setValidationErrors(errors)
      toast({
        title: 'Validation Error',
        description: 'Please fix the highlighted fields',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const updateData = {
        ...listing,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('mb_listings')
        .upsert(updateData)
        .select()
        .single()

      if (error) throw error

      // Update the listing with the returned data (includes the ID for new listings)
      setListing(data)

      toast({
        title: 'Success',
        description: 'Listing saved successfully',
      })

      // Navigate to the edit page for the saved listing
      navigate(`/listings/${data.id}`)
    } catch (error) {
      console.error('Error saving listing:', error)
      toast({
        title: 'Error',
        description: 'Failed to save listing',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }



  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">Loading listing...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/listings')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Listings
          </Button>
          <h1 className="text-3xl font-bold">
            {id === 'new' ? 'Create Listing' : 'Edit Listing'}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Listing'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential details about your listing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={listing?.title || ''}
                onChange={(e) => setListing(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="Enter listing title"
                className={validationErrors.title ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {validationErrors.title && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={listing?.description || ''}
                onChange={(e) => setListing(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="Describe your item"
                rows={4}
                className={validationErrors.description ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {validationErrors.description && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.description}</p>
              )}
            </div>

            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={listing?.price || ''}
                onChange={(e) => setListing(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                placeholder="0.00"
                className={validationErrors.price ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {validationErrors.price && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.price}</p>
              )}
            </div>

            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={listing?.sku || ''}
                onChange={(e) => setListing(prev => prev ? { ...prev, sku: e.target.value } : null)}
                placeholder="Stock keeping unit"
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories & Condition */}
        <Card>
          <CardHeader>
            <CardTitle>Categories & Condition</CardTitle>
            <CardDescription>Organize your listing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Actions */}
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCategories}
                disabled={!listing}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                type="button"
                variant={autosyncEnabled ? "outline" : "default"}
                size="sm"
                onClick={toggleAutosync}
                disabled={!listing}
                className={autosyncEnabled ? "" : "bg-green-600 hover:bg-green-700 text-white"}
              >
                {autosyncEnabled ? 'Disable Autosync' : 'Enable Autosync'}
              </Button>
            </div>
            <div>
              <Label htmlFor="fb_category">Facebook Category</Label>
              <select
                id="fb_category"
                value={listing?.fb_category_id || ''}
                onChange={(e) => {
                  setListing(prev => prev ? { ...prev, fb_category_id: e.target.value || null } : null)
                  if (autosyncEnabled && e.target.value) {
                    // Trigger auto-sync when a category is selected
                    setTimeout(() => syncCategories(true), 100)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Facebook category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="nd_category">Nextdoor Category</Label>
              <select
                id="nd_category"
                value={listing?.nd_category_id || ''}
                onChange={(e) => {
                  setListing(prev => prev ? { ...prev, nd_category_id: e.target.value || null } : null)
                  if (autosyncEnabled && e.target.value) {
                    // Trigger auto-sync when a category is selected
                    setTimeout(() => syncCategories(true), 100)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Nextdoor category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="cl_category">Craigslist Category</Label>
              <select
                id="cl_category"
                value={listing?.cl_category_id || ''}
                onChange={(e) => {
                  setListing(prev => prev ? { ...prev, cl_category_id: e.target.value || null } : null)
                  if (autosyncEnabled && e.target.value) {
                    // Trigger auto-sync when a category is selected
                    setTimeout(() => syncCategories(true), 100)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Craigslist category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="condition">Condition</Label>
              <select
                id="condition"
                value={listing?.condition_id || ''}
                onChange={(e) => setListing(prev => prev ? { ...prev, condition_id: e.target.value || null } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select condition</option>
                {conditions.map(condition => (
                  <option key={condition.id} value={condition.id}>
                    {condition.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Information */}
      <Card>
        <CardHeader>
          <CardTitle>Location Information</CardTitle>
          <CardDescription>Where is your item located?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="location">Location *</Label>
              <div className="relative">
                <Input
                  id="location"
                  value={listing?.location || ''}
                  onChange={(e) => setListing(prev => prev ? { ...prev, location: e.target.value } : null)}
                  placeholder="City, State or click 📍 to detect"
                  className={`pr-10 ${validationErrors.location ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={detectLocation}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  title="Detect current location"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {validationErrors.location && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.location}</p>
              )}
            </div>
            <div>
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                value={listing?.zip_code || ''}
                onChange={(e) => setListing(prev => prev ? { ...prev, zip_code: e.target.value } : null)}
                placeholder="12345"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <PhotoManager
        listingId={listing?.id}
        photos={photos}
        onPhotosChange={setPhotos}
      />

    </div>
  )
}
