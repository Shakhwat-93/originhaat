import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product } from '@/types';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity?: number, selectedVariant?: string) => void;
  removeItem: (productId: string, selectedVariant?: string) => void;
  updateQuantity: (productId: string, quantity: number, selectedVariant?: string) => void;
  clearCart: () => void;
  setIsOpen: (open: boolean) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getDeliveryCharge: () => number;
  getGrandTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product: Product, quantity = 1, selectedVariant?: string) => {
        const items = get().items;
        const existing = items.find(
          (item) => item.product.id === product.id && item.selectedVariant === selectedVariant
        );

        const variantObj = product.variants?.find((v) => v.name === selectedVariant);
        const maxStock =
          variantObj && variantObj.stock !== undefined && variantObj.stock !== null
            ? variantObj.stock
            : product.stock;

        if (existing) {
          set({
            items: items.map((item) =>
              item.product.id === product.id && item.selectedVariant === selectedVariant
                ? { ...item, quantity: Math.min(item.quantity + quantity, maxStock) }
                : item
            ),
          });
        } else {
          set({ items: [...items, { product, quantity, selectedVariant }] });
        }
      },

      removeItem: (productId: string, selectedVariant?: string) => {
        set({
          items: get().items.filter(
            (item) => !(item.product.id === productId && item.selectedVariant === selectedVariant)
          ),
        });
      },

      updateQuantity: (productId: string, quantity: number, selectedVariant?: string) => {
        if (quantity <= 0) {
          get().removeItem(productId, selectedVariant);
          return;
        }

        set({
          items: get().items.map((item) => {
            if (item.product.id === productId && item.selectedVariant === selectedVariant) {
              const variantObj = item.product.variants?.find((v) => v.name === selectedVariant);
              const maxStock =
                variantObj && variantObj.stock !== undefined && variantObj.stock !== null
                  ? variantObj.stock
                  : item.product.stock;
              return { ...item, quantity: Math.min(quantity, maxStock) };
            }
            return item;
          }),
        });
      },

      clearCart: () => set({ items: [] }),

      setIsOpen: (open: boolean) => set({ isOpen: open }),

      getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      getTotalPrice: () =>
        get().items.reduce((sum, item) => {
          const variantObj = item.product.variants?.find((v) => v.name === item.selectedVariant);
          const price =
            variantObj && variantObj.price && variantObj.price > 0
              ? variantObj.price
              : item.product.price;
          return sum + price * item.quantity;
        }, 0),

      getDeliveryCharge: () => {
        return 0;
      },

      getGrandTotal: () => get().getTotalPrice() + get().getDeliveryCharge(),
    }),
    {
      name: 'originhaat-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
