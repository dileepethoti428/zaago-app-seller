export const TAG_CATEGORIES = {
  QUALITY_FRESHNESS: {
    label: 'Quality / Freshness Tags',
    tags: [
      'Fresh',
      'Farm Fresh',
      'New Stock',
      'Premium Quality',
      'Handpicked'
    ]
  },
  POPULARITY: {
    label: 'Popularity Tags',
    tags: [
      'Best Seller',
      'Top Rated',
      'Most Popular',
      'Trending',
      'Hot Item',
      'Fast Selling'
    ]
  },
  PRICE_DISCOUNT: {
    label: 'Price & Discount Tags',
    tags: [
      'Best Price',
      '50% Off',
      'Deal of the Day',
      'Combo Offer',
      'Save More',
      'Value Pack'
    ]
  },
  CATEGORY_SPECIFIC: {
    label: 'Category-Specific Tags',
    tags: [
      'Organic',
      'Pure & Natural',
      'No Preservatives',
      'Sugar-Free',
      'Gluten-Free',
      'Vegan',
      'Cold Pressed',
      'Freshly Baked',
      'Homemade'
    ]
  },
  URGENCY: {
    label: 'Urgency Tags',
    tags: [
      'Limited Stock',
      'Only Few Left',
      'Hurry! Selling Fast',
      'Restocking Soon'
    ]
  },
  NEW_PRODUCT: {
    label: 'New Product Tags',
    tags: [
      'New Arrival',
      'Just In',
      'New Launch'
    ]
  },
  USER_EXPERIENCE: {
    label: 'User Experience Tags',
    tags: [
      'Recommended',
      'Picked For You',
      'Frequently Bought',
      'Similar To Your Orders'
    ]
  },
  SAFETY: {
    label: 'Safety Tags',
    tags: [
      'FSSAI Approved',
      'Quality Checked',
      'Hygienically Packed'
    ]
  }
};

export const ALL_AVAILABLE_TAGS = Object.values(TAG_CATEGORIES)
  .flatMap(category => category.tags);

export interface AutoTaggingData {
  categoryName?: string;
  totalOrders?: number;
  stockQuantity?: number;
  createdAt?: string;
  averageRating?: number;
}

export const generateAutoTags = (data: AutoTaggingData): string[] => {
  const autoTags: string[] = [];
  
  // Rule 1: Fruits or Vegetables → "Fresh"
  const categoryName = data.categoryName?.toLowerCase() || '';
  if (categoryName.includes('fruit') || categoryName.includes('vegetable')) {
    autoTags.push('Fresh');
  }
  
  // Rule 2: Total orders > 50 → "Best Seller"
  if (data.totalOrders && data.totalOrders > 50) {
    autoTags.push('Best Seller');
  }
  
  // Rule 3: Stock < 10 → "Limited Stock"
  if (data.stockQuantity !== undefined && data.stockQuantity < 10) {
    autoTags.push('Limited Stock');
  }
  
  // Rule 4: Product added within last 7 days → "New Arrival"
  if (data.createdAt) {
    const createdDate = new Date(data.createdAt);
    const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation <= 7) {
      autoTags.push('New Arrival');
    }
  }
  
  // Rule 5: Rating > 4.5 → "Top Rated"
  if (data.averageRating && data.averageRating > 4.5) {
    autoTags.push('Top Rated');
  }
  
  return autoTags;
};

export const TAG_COLORS: Record<string, string> = {
  'Fresh': 'bg-green-100 text-green-800 border-green-300',
  'Farm Fresh': 'bg-green-100 text-green-800 border-green-300',
  'New Stock': 'bg-green-100 text-green-800 border-green-300',
  'Premium Quality': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Handpicked': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  
  'Best Seller': 'bg-purple-100 text-purple-800 border-purple-300',
  'Top Rated': 'bg-blue-100 text-blue-800 border-blue-300',
  'Most Popular': 'bg-purple-100 text-purple-800 border-purple-300',
  'Trending': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'Hot Item': 'bg-red-100 text-red-800 border-red-300',
  'Fast Selling': 'bg-orange-100 text-orange-800 border-orange-300',
  
  'Best Price': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  '50% Off': 'bg-orange-100 text-orange-800 border-orange-300',
  'Deal of the Day': 'bg-amber-100 text-amber-800 border-amber-300',
  'Combo Offer': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Save More': 'bg-amber-100 text-amber-800 border-amber-300',
  'Value Pack': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  
  'Organic': 'bg-teal-100 text-teal-800 border-teal-300',
  'Pure & Natural': 'bg-teal-100 text-teal-800 border-teal-300',
  'No Preservatives': 'bg-green-100 text-green-800 border-green-300',
  'Sugar-Free': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'Gluten-Free': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'Vegan': 'bg-green-100 text-green-800 border-green-300',
  'Cold Pressed': 'bg-teal-100 text-teal-800 border-teal-300',
  'Freshly Baked': 'bg-amber-100 text-amber-800 border-amber-300',
  'Homemade': 'bg-orange-100 text-orange-800 border-orange-300',
  
  'Limited Stock': 'bg-red-100 text-red-800 border-red-300',
  'Only Few Left': 'bg-red-100 text-red-800 border-red-300',
  'Hurry! Selling Fast': 'bg-orange-100 text-orange-800 border-orange-300',
  'Restocking Soon': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  
  'New Arrival': 'bg-blue-100 text-blue-800 border-blue-300',
  'Just In': 'bg-blue-100 text-blue-800 border-blue-300',
  'New Launch': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  
  'Recommended': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'Picked For You': 'bg-purple-100 text-purple-800 border-purple-300',
  'Frequently Bought': 'bg-violet-100 text-violet-800 border-violet-300',
  'Similar To Your Orders': 'bg-purple-100 text-purple-800 border-purple-300',
  
  'FSSAI Approved': 'bg-slate-100 text-slate-800 border-slate-300',
  'Quality Checked': 'bg-gray-100 text-gray-800 border-gray-300',
  'Hygienically Packed': 'bg-slate-100 text-slate-800 border-slate-300',
};

export const DEFAULT_TAG_COLOR = 'bg-gray-100 text-gray-800 border-gray-300';

export const getTagColor = (tag: string): string => {
  return TAG_COLORS[tag] || DEFAULT_TAG_COLOR;
};
