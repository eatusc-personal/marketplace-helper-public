import { Category, CategoryWithPlatform } from '../types';

// Platform detection
export type Platform = 'facebook' | 'nextdoor' | 'craigslist' | 'other';

export function platformFromUrl(url: string): Platform {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return 'other';
  }

  if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com')) return 'facebook';
  if (hostname === 'nextdoor.com' || hostname.endsWith('.nextdoor.com')) return 'nextdoor';
  if (hostname === 'craigslist.org' || hostname.endsWith('.craigslist.org')) return 'craigslist';
  return 'other';
}

export function detectCurrentPlatform(): Promise<Platform> {
  try {
    // Get active tab URL from Chrome extension
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || '';
        console.log('🔍 Detecting platform from URL:', url);

        resolve(platformFromUrl(url));
      });
    });
  } catch (error) {
    console.warn('Platform detection failed, defaulting to other:', error);
    return Promise.resolve('other');
  }
}

// Mini SVG icons for platforms (12px)
export const platformIcons = {
  facebook: `<svg width="12" height="12" viewBox="0 0 24 24" fill="#1877f2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>`,
  nextdoor: `<svg width="12" height="12" viewBox="0 0 24 24" fill="#00b74a">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.556 1.556c-.126.126-.295.196-.472.196s-.346-.07-.472-.196L12 6.648 8.932 9.716c-.126.126-.295.196-.472.196s-.346-.07-.472-.196L6.432 8.16c-.26-.26-.26-.682 0-.942L11.058 2.592c.26-.26.682-.26.942 0l4.568 4.568c.26.26.26.682 0 .942zM17.568 15.84l-4.568 4.568c-.26.26-.682.26-.942 0L7.432 15.84c-.26-.26-.26-.682 0-.942l1.556-1.556c.126-.126.295-.196.472-.196s.346.07.472.196L12 16.41l3.068-3.068c.126-.126.295-.196.472-.196s.346.07.472.196l1.556 1.556c.26.26.26.682 0 .942z"/>
  </svg>`
};

// Process categories to handle duplicates and add platform icons
export function processCategoriesWithPlatforms(
  categories: Category[],
  currentPlatform: Platform = 'other'
): CategoryWithPlatform[] {
  // Group categories by name to find duplicates
  const categoryGroups = new Map<string, Category[]>();

  categories.forEach(category => {
    const name = category.name;
    if (!categoryGroups.has(name)) {
      categoryGroups.set(name, []);
    }
    categoryGroups.get(name)!.push(category);
  });

  const processedCategories: CategoryWithPlatform[] = [];

  categoryGroups.forEach((categoryList) => {
    if (categoryList.length === 1) {
      // Single category - add platform info
      const category = categoryList[0];
      const platformSlug = category.category_type?.slug || 'unknown';

      // Filter based on current platform
      if (currentPlatform !== 'other' && platformSlug !== currentPlatform) {
        return; // Skip categories not matching current platform
      }

      processedCategories.push({
        ...category,
        platforms: [platformSlug],
        icon: platformSlug === 'facebook' ? platformIcons.facebook :
              platformSlug === 'nextdoor' ? platformIcons.nextdoor : undefined
      });
    } else {
      // Duplicate categories - merge them
      const platforms = categoryList.map(cat => cat.category_type?.slug || 'unknown');
      const uniquePlatforms = [...new Set(platforms)];

      // For duplicates, always show when platform is 'other', otherwise filter
      if (currentPlatform !== 'other') {
        if (!uniquePlatforms.includes(currentPlatform)) {
          return; // Skip if current platform not in the duplicate group
        }
      }

      // Sort platforms to ensure consistent ordering: Facebook first, then Nextdoor, then others
      const sortedPlatforms = uniquePlatforms.sort((a, b) => {
        const order: { [key: string]: number } = { 'facebook': 1, 'nextdoor': 2, 'craigslist': 3 };
        return (order[a] || 999) - (order[b] || 999);
      });

      // Use the first category as base, but add all platform info
      const baseCategory = categoryList[0];
      const icons = sortedPlatforms.map(platform =>
        platform === 'facebook' ? platformIcons.facebook :
        platform === 'nextdoor' ? platformIcons.nextdoor : ''
      ).filter(Boolean);

      processedCategories.push({
        ...baseCategory,
        platforms: sortedPlatforms,
        icon: icons.join(' ') // Multiple icons for duplicates
      });
    }
  });

  // Sort alphabetically
  return processedCategories.sort((a, b) => a.name.localeCompare(b.name));
}

// Generate display name with icons for combo box
export function getCategoryDisplayName(category: CategoryWithPlatform): string {
  return category.name;
}

// Generate HTML for category option with icons
export function getCategoryOptionHTML(category: CategoryWithPlatform): string {
  const icons = category.icon || '';
  return `<span>${category.name} ${icons}</span>`;
}
