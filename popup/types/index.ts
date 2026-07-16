export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  fb_category_id: string | null;
  nd_category_id: string | null;
  cl_category_id: string | null;
  condition_id: string | null;
  sku: string | null;
  location: string | null;
  location_id: string | null;
  video_url: string | null;
  craigslist_email: string | null;
  zip_code: string | null;
  street: string | null;
  cross_street: string | null;
  fb_listing_id: string | null;
  created_at: string;
  fb_category_name?: string;
  nd_category_name?: string;
  cl_category_name?: string;
  condition_name?: string;
  fb_category?: Category;
  nd_category?: Category;
  cl_category?: Category;
  condition?: Condition;
  photos?: ListingPhoto[];
}

export interface ListingPhoto {
  id: string;
  photo_url: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  category_type_id?: string;
  category_type?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CategoryWithPlatform extends Category {
  platforms: string[]; // ['facebook', 'nextdoor'] for duplicates
  icon?: string; // SVG icon string
}

export interface Condition {
  id: string;
  name: string;
}

export interface FormData {
  title: string;
  description: string;
  price: string;
  photos: FileList | null;
  video: File | null;
  fb_category_id: string | null;
  nd_category_id: string | null;
  cl_category_id: string | null;
  condition_id: string | null;
  sku: string;
  location: string;
  craigslist_email: string;
  zip_code: string;
  street: string;
  cross_street: string;
  fb_listing_id: string | null;
}