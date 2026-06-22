export interface Product {
  id: string;
  slug: string;
  name_bn: string;
  name_en: string;
  description_bn: string;
  short_description_bn: string;
  price: number;
  original_price: number;
  images: string[];
  category: string;
  category_slug: string;
  stock: number;
  is_featured: boolean;
  benefits: string[];
  faq: FAQ[];
  reviews: Review[];
  tags: string[];
  created_at: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Review {
  id: string;
  customer_name: string;
  location: string;
  rating: number;
  body: string;
  date: string;
  avatar?: string;
}

export interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  icon: string;
  image: string;
  product_count: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  district: string;
  items: CartItem[];
  total: number;
  delivery_charge: number;
  status: OrderStatus;
  payment_method: 'cod';
  whatsapp_confirmed: boolean;
  created_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'অপেক্ষমান',
  confirmed: 'নিশ্চিত',
  processing: 'প্রস্তুতি চলছে',
  shipped: 'পাঠানো হয়েছে',
  delivered: 'ডেলিভারি সম্পন্ন',
  cancelled: 'বাতিল',
};

export interface CheckoutFormData {
  name: string;
  phone: string;
  address: string;
  district: string;
  note?: string;
}

export interface RecentOrderNotification {
  name: string;
  location: string;
  product: string;
  time: string;
}
