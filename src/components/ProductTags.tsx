import { Badge } from '@/components/ui/badge';
import { getTagColor } from '@/config/productTags';

interface ProductTagsProps {
  tags: string[];
  className?: string;
  maxTags?: number;
}

export const ProductTags = ({ tags, className = '', maxTags }: ProductTagsProps) => {
  if (!tags || tags.length === 0) return null;
  
  const displayTags = maxTags ? tags.slice(0, maxTags) : tags;
  const remainingCount = tags.length - displayTags.length;
  
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {displayTags.map((tag, index) => (
        <Badge
          key={`${tag}-${index}`}
          variant="outline"
          className={`text-xs px-2 py-0.5 rounded-full ${getTagColor(tag)}`}
        >
          {tag}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border-gray-300"
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
};
