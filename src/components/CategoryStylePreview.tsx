import React from 'react';
import { Card } from '@/components/ui/card';

interface CategoryStylePreviewProps {
  name: string;
  icon?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'bold';
  textColor?: string;
  backgroundColor?: string;
  isGradient?: boolean;
  gradientStartColor?: string;
  gradientEndColor?: string;
}

const CategoryStylePreview: React.FC<CategoryStylePreviewProps> = ({
  name,
  icon,
  fontFamily = 'Inter',
  fontSize = 14,
  fontWeight = 'normal',
  textColor = '#000000',
  backgroundColor = '#FFFFFF',
  isGradient = false,
  gradientStartColor,
  gradientEndColor,
}) => {
  const getFontWeight = () => {
    switch (fontWeight) {
      case 'bold': return 700;
      case 'medium': return 500;
      default: return 400;
    }
  };

  const getBackground = () => {
    if (isGradient && gradientStartColor && gradientEndColor) {
      return `linear-gradient(135deg, ${gradientStartColor}, ${gradientEndColor})`;
    }
    return backgroundColor;
  };

  return (
    <Card className="p-4 space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Live Preview</p>
      <div className="flex items-center justify-center p-6 rounded-lg border bg-muted/50">
        <div
          className="px-4 py-2 rounded-lg shadow-sm transition-all"
          style={{
            fontFamily: fontFamily,
            fontSize: `${fontSize}px`,
            fontWeight: getFontWeight(),
            color: textColor,
            background: getBackground(),
          }}
        >
          {icon && <span className="mr-2">{icon}</span>}
          {name || 'Category Name'}
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        This is how your category will appear in the Customer App
      </p>
    </Card>
  );
};

export default CategoryStylePreview;
