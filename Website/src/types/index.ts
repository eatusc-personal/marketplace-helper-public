// Type definitions for the Marketplace Helper Website

export interface Listing {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  fb_category_id: string | null
  nd_category_id: string | null
  cl_category_id: string | null
  condition_id: string | null
  sku: string | null
  location: string | null
  location_id: string | null
  video_url: string | null
  craigslist_email: string | null
  zip_code: string | null
  street: string | null
  cross_street: string | null
  created_at: string
  updated_at: string
  fb_category?: Category
  nd_category?: Category
  cl_category?: Category
  condition?: Condition
  photos?: ListingPhoto[]
}

export interface Category {
  id: string
  name: string
  platform: 'facebook' | 'nextdoor' | 'craigslist'
  category_type?: {
    slug: string
  }
  parent_id?: string | null
  created_at: string
  updated_at: string
}

export interface Condition {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface ListingPhoto {
  id: string
  listing_id: string
  photo_url: string
  position?: number
  created_at: string
  updated_at: string
}

export interface PhotoWithListing {
  id: string
  listing_id: string
  photo_url: string
  created_at: string
  updated_at: string
  listing: Listing
}

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}
