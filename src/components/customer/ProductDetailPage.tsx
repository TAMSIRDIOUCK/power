// src/components/customer/ProductDetailPage.tsx
import React, { useState } from 'react';
import { ArrowLeft, ShoppingCart, Minus, Plus } from 'lucide-react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';

interface ProductDetailPageProps {
  product: Product;
  onClose: () => void;
}

export default function ProductDetailPage({ product, onClose }: ProductDetailPageProps) {
  const { state, dispatch } = useApp();
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' F CFA';
  };

  const availableSizes = [...new Set(product.variants.filter(v => v.stock > 0).map(v => v.size))];
  const availableColors = [...new Set(product.variants.filter(v => v.stock > 0).map(v => v.color))];

  const handleAddToCart = () => {
    // Vérifier si le produit est déjà dans le panier
    const exists = state.cart.some(
      (item) => item.productId === product.id && item.variantId === selectedVariant.id
    );

    if (exists) {
      alert('Ce produit est déjà dans le panier !');
      return;
    }

    if (selectedVariant && selectedVariant.stock >= quantity) {
      dispatch({
        type: 'ADD_TO_CART',
        payload: {
          productId: product.id,
          variantId: selectedVariant.id,
          quantity,
          product,
          variant: selectedVariant
        }
      });

      alert(`${product.name} a été ajouté au panier !`);
    }
  };

  const updateVariant = (size?: string, color?: string) => {
    const newVariant = product.variants.find(v => 
      (size ? v.size === size : v.size === selectedVariant.size) &&
      (color ? v.color === color : v.color === selectedVariant.color)
    );
    if (newVariant) {
      setSelectedVariant(newVariant);
      setQuantity(1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={onClose}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour aux produits
        </button>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Images */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={product.images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {product.images.length > 1 && (
                <div className="flex overflow-x-auto space-x-2 scrollbar-hide">
                  {product.images.map((image, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`min-w-[80px] h-20 rounded-lg overflow-hidden border-2 cursor-pointer ${
                        selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                  {product.description}
                </p>
              </div>

              <div className="text-3xl font-bold text-blue-800">
                {formatPrice(product.price)}
              </div>

              {/* Taille */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Taille</h3>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(size => (
                    <button
                      key={size}
                      onClick={() => updateVariant(size)}
                      className={`px-4 py-2 border rounded-xl font-medium transition-colors ${
                        selectedVariant.size === size
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Couleur */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Couleur</h3>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map(color => (
                    <button
                      key={color}
                      onClick={() => updateVariant(undefined, color)}
                      className={`px-4 py-2 border rounded-xl font-medium transition-colors ${
                        selectedVariant.color === color
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantité */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Quantité</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 border border-gray-300 rounded-lg font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={quantity >= selectedVariant.stock}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Stock disponible: {selectedVariant.stock}
                </p>
              </div>

              {/* Ajouter au panier */}
              <button
                onClick={handleAddToCart}
                disabled={selectedVariant.stock === 0}
                className="w-full bg-blue-800 text-white py-4 rounded-xl font-semibold hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {selectedVariant.stock === 0 ? 'Rupture de stock' : 'Ajouter au panier'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
