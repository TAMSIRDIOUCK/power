// src/context/AppContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { Product, Order, User, OrderStatus, CartItem, ProductVariant } from "../types";

interface AppState {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  user: User | null;
  currentView: "customer" | "vendor";
}

type AppAction =
  | { type: "SET_PRODUCTS"; payload: Product[] }
  | { type: "ADD_TO_CART"; payload: Omit<CartItem, "cartItemId"> & { cartItemId?: string } }
  | { type: "REMOVE_FROM_CART"; payload: string }
  | { type: "UPDATE_CART_QUANTITY"; payload: { cartItemId: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "ADD_ORDER"; payload: Order }
  | { type: "UPDATE_ORDER_STATUS"; payload: { orderId: string; status: OrderStatus } }
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_VIEW"; payload: "customer" | "vendor" }
  | { type: "ADD_PRODUCT"; payload: Product }
  | { type: "UPDATE_PRODUCT"; payload: Product }
  | { type: "DELETE_PRODUCT"; payload: string };

const initialState: AppState = {
  products: [],
  cart: [],
  orders: [],
  user: null,
  currentView: "customer",
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_PRODUCTS":
      return { ...state, products: action.payload };

    case "ADD_TO_CART": {
      // Générer un ID unique pour l'article du panier
      const cartItemId = action.payload.cartItemId || `${action.payload.variantId}-${Date.now()}-${Math.random()}`;
      
      const newCartItem: CartItem = {
        ...action.payload,
        cartItemId,
      };

      // Vérifier si le produit avec la même variante existe déjà
      const existingItemIndex = state.cart.findIndex(
        (item) => item.productId === newCartItem.productId && 
                  item.variantId === newCartItem.variantId
      );

      if (existingItemIndex !== -1) {
        // Mettre à jour la quantité si déjà existant
        const updatedCart = [...state.cart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + newCartItem.quantity,
        };
        return { ...state, cart: updatedCart };
      }

      // Ajouter nouvel article
      return { ...state, cart: [...state.cart, newCartItem] };
    }

    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter((item) => item.cartItemId !== action.payload),
      };

    case "UPDATE_CART_QUANTITY":
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          cart: state.cart.filter((item) => item.cartItemId !== action.payload.cartItemId),
        };
      }
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.cartItemId === action.payload.cartItemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };

    case "CLEAR_CART":
      return { ...state, cart: [] };

    case "ADD_ORDER":
      return { ...state, orders: [...state.orders, action.payload] };

    case "UPDATE_ORDER_STATUS":
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.payload.orderId
            ? { ...order, status: action.payload.status, updatedAt: new Date() }
            : order
        ),
      };

    case "SET_USER":
      return { ...state, user: action.payload };

    case "SET_VIEW":
      return { ...state, currentView: action.payload };

    case "ADD_PRODUCT":
      return { ...state, products: [...state.products, action.payload] };

    case "UPDATE_PRODUCT":
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.id ? action.payload : product
        ),
      };

    case "DELETE_PRODUCT":
      return {
        ...state,
        products: state.products.filter((product) => product.id !== action.payload),
      };

    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

// ✅ Fonction utilitaire pour convertir un produit de Supabase (products2) vers le format Product
export function convertSupabaseProductToProduct(supabaseProduct: any): Product {
  return {
    id: supabaseProduct.id,
    name: supabaseProduct.name,
    description: supabaseProduct.description || '',
    price: supabaseProduct.price,
    category: supabaseProduct.category,
    images: supabaseProduct.images || [],
    variants: (supabaseProduct.variants || []).map((v: any, index: number) => ({
      id: `${supabaseProduct.id}-variant-${index}`,
      size: v.size || '',
      color: v.color || '',
      stock: v.stock || 0,
      sku: `${supabaseProduct.id}-${v.size || 'nosize'}-${v.color || 'nocolor'}`,
    })),
    createdAt: new Date(supabaseProduct.created_at),
    updatedAt: new Date(supabaseProduct.updated_at || supabaseProduct.created_at),
    isWholesale: supabaseProduct.is_wholesale || false,
    shippingPrice: supabaseProduct.shipping_price || 0,
  };
}

// ✅ Fonction pour convertir un Product vers le format Supabase
export function convertProductToSupabaseProduct(product: Product): any {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    images: product.images,
    variants: product.variants.map(v => ({
      size: v.size,
      color: v.color,
      stock: v.stock,
    })),
    stock: product.variants.reduce((sum, v) => sum + v.stock, 0),
    is_wholesale: product.isWholesale || false,
    shipping_price: product.shippingPrice || 0,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString(),
  };
}