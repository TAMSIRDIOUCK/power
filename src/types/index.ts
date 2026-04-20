// src/types/index.ts
export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  variants: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
  isWholesale?: boolean;
  shippingPrice?: number;
}

// ⚠️ Ajout de cartItemId ici
export interface CartItem {
  cartItemId: string;  // ← Ajout de cette propriété
  productId: string;
  variantId: string;
  quantity: number;
  product: Product;
  variant: ProductVariant;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  customerInfo: CustomerInfo;
  shippingOption: ShippingOption;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  productName: string;
  variantDetails: {
    size: string;
    color: string;
  };
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: number;
  onlyForWholesale?: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'mobile' | 'card' | 'cash';
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface User {
  id: string;
  email: string;
  role: 'customer' | 'vendor';
  profile: CustomerInfo;
}