import { Product, ShippingOption, PaymentMethod } from '../types';

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Chemise Classique Bleue',
    description:
      'Chemise élégante en coton premium, parfaite pour le bureau ou les occasions spéciales. Coupe moderne et confortable.',
    price: 25000,
    category: 'chemises',
    images: [
      'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    variants: [
      { id: '1-1', size: 'M', color: 'Bleu', stock: 10, sku: 'CHEM-BLU-M' },
      { id: '1-2', size: 'L', color: 'Bleu', stock: 8, sku: 'CHEM-BLU-L' },
      { id: '1-3', size: 'XL', color: 'Bleu', stock: 5, sku: 'CHEM-BLU-XL' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Pantalon Chino Beige',
    description:
      'Pantalon chino moderne en toile de coton, idéal pour un look décontracté chic. Disponible en plusieurs tailles.',
    price: 18000,
    category: 'pantalons',
    images: [
      'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    variants: [
      { id: '2-1', size: '32', color: 'Beige', stock: 12, sku: 'PANT-BEI-32' },
      { id: '2-2', size: '34', color: 'Beige', stock: 15, sku: 'PANT-BEI-34' },
      { id: '2-3', size: '36', color: 'Beige', stock: 8, sku: 'PANT-BEI-36' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Chemise Polo Noire',
    description:
      'Polo élégant en piqué de coton, parfait pour un style décontracté. Coupe ajustée et finitions soignées.',
    price: 15000,
    category: 'chemises',
    images: [
      'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    variants: [
      { id: '3-1', size: 'M', color: 'Noir', stock: 20, sku: 'POLO-NOI-M' },
      { id: '3-2', size: 'L', color: 'Noir', stock: 18, sku: 'POLO-NOI-L' },
      { id: '3-3', size: 'XL', color: 'Noir', stock: 12, sku: 'POLO-NOI-XL' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    name: 'Lot de 100 Ceintures Cuir (Gros)',
    description:
      'Lot de 100 ceintures en cuir véritable, parfait pour la revente. Livraison spéciale depuis la Chine.',
    price: 1200000,
    category: 'accessoires',
    images: [
      'https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    variants: [
      { id: '4-1', size: '95cm', color: 'Marron', stock: 5, sku: 'CEIN-GROS-95' }
    ],
    isWholesale: true,           // ✅ Produit en gros
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// ⚡ Livraison
export const shippingOptions: ShippingOption[] = [
  { id: 'standard-dakar', name: 'Livraison Standard Dakar', price: 2000, estimatedDays: 2 },
  { id: 'express-dakar', name: 'Livraison Express Dakar', price: 3500, estimatedDays: 1 },
  { id: 'regions', name: 'Livraison Régions', price: 5000, estimatedDays: 3 },
  {
    id: 'continental-china',
    name: 'Livraison Continentale depuis la Chine par kg',
    price: 15000,
    estimatedDays: 15,
    onlyForWholesale: true      // ✅ Marqué comme réservé aux achats en gros
  }
];

// ⚡ Paiement
export const paymentMethods: PaymentMethod[] = [
  { id: 'orange-money', name: 'Orange Money', type: 'mobile' },
  { id: 'wave', name: 'Wave', type: 'mobile' },
  { id: 'free-money', name: 'Free Money', type: 'mobile' },
  { id: 'card', name: 'Carte Bancaire', type: 'card' }
];

// ⚡ Catégories
export const categories = [
  { id: 'tous', name: 'Tous les produits', count: mockProducts.length },
  { id: 'articles', name: 'Articles', count: 3 },
  { id: 'accessoires', name: 'Accessoires', icon: 'WatchIcon' }
];
