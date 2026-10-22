import React from 'react';
import { ShoppingCart, Eye } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, variantId: string) => void;
  onViewDetails?: (productId: string) => void;
}

export default function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' F CFA';
  };

  const getAvailableSizes = () => {
    return product.variants.filter(v => v.stock > 0).map(v => v.size);
  };

  const getAvailableColors = () => {
    return [...new Set(product.variants.filter(v => v.stock > 0).map(v => v.color))];
  };

  const handleAddToCart = () => {
    const availableVariant = product.variants.find(v => v.stock > 0);
    if (availableVariant && onAddToCart) {
      onAddToCart(product.id, availableVariant.id);
    }
  };

  const isInStock = product.variants.some(v => v.stock > 0);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group">
      <div className="relative overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
            <button
              onClick={() => onViewDetails?.(product.id)}
              className="bg-white text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Eye className="w-5 h-5" />
            </button>
            {isInStock && (
              <button
                onClick={handleAddToCart}
                className="bg-blue-800 text-white p-2 rounded-full hover:bg-blue-900 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        {!isInStock && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Rupture de stock
          </div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {product.name}
        </h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-blue-800">
            {formatPrice(product.price)}
          </span>
          <div className="text-sm text-gray-500">
            {getAvailableSizes().length} tailles
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {getAvailableColors().slice(0, 3).map((color, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {color}
              </span>
            ))}
            {getAvailableColors().length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                +{getAvailableColors().length - 3}
              </span>
            )}
          </div>
          
          {isInStock && (
            <button
              onClick={handleAddToCart}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              Ajouter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}