// src/components/customer/ShopPage.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import ProductDetailPage from './ProductDetailPage';

export default function ShopPage() {
  const { state, dispatch } = useApp();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const alreadyInCart = state.cart.some((item) => item.productId === product.id);
    if (alreadyInCart) return;

    const defaultVariant = product.variants?.[0] || {
      id: `${product.id}-default`,
      size: 'Unique',
      color: 'Standard',
      stock: 10,
      sku: `${product.id}-default`,
    };

    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        productId: product.id,
        variantId: defaultVariant.id,
        quantity: 1,
        product: product,
        variant: defaultVariant,
      },
    });
  };

  if (selectedProduct) {
    return (
      <ProductDetailPage
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 font-serif">
            Toute la Boutique
          </h1>
          <p className="text-gray-600">Découvrez tous nos produits disponibles.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {state.products.map((product) => (
            <div
              key={product.id}
              onClick={() => handleViewDetails(product)}
              className="flex flex-col p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition cursor-pointer"
            >
              <div className="w-full h-36 sm:h-48 md:h-56 overflow-hidden rounded-lg">
                <img
                  src={product.images?.[0] || '/images/placeholder.jpg'}
                  alt={product.name}
                  className="w-full h-full object-cover" 
                />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mt-2 truncate">
                {product.name}
              </h3>
              <p className="text-gray-800 font-medium mb-2 text-sm sm:text-base mt-auto pt-2">
                {new Intl.NumberFormat('fr-FR').format(product.price)} F CFA
              </p>
              <button
                onClick={(e) => handleAddToCart(e, product)}
                className="bg-black text-white py-1.5 sm:py-2 px-3 rounded-lg hover:bg-gray-800 transition text-sm"
              >
                Ajouter au panier
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}