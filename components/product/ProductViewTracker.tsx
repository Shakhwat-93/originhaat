'use client';

import { useEffect } from 'react';
import { trackViewContent } from '@/lib/tracking';

interface ProductViewTrackerProps {
  product: {
    id: string;
    name_bn: string;
    price: number;
  };
}

export function ProductViewTracker({ product }: ProductViewTrackerProps) {
  useEffect(() => {
    trackViewContent(product);
  }, [product]);

  return null;
}
