// src/components/customer/HomePage.tsx
import React, { useEffect, useState } from 'react';
import ProductDetailPage from './ProductDetailPage';
import { supabase } from '../../lib/supabaseClient';
import { useApp, convertSupabaseProductToProduct } from '../../context/AppContext';
import { Product } from '../../types';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const { state, dispatch } = useApp();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products2')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur de récupération des produits:', error.message);
      } else {
        const convertedProducts = (data || []).map(p => convertSupabaseProductToProduct(p));
        setProducts(convertedProducts);
        dispatch({ type: 'SET_PRODUCTS', payload: convertedProducts });
      }
    };

    fetchProducts();
  }, [dispatch]);

  const filteredProducts =
    selectedCategory === 'tous'
      ? products.filter((product) => product.category !== 'gros')
      : products.filter((product) => {
          if (selectedCategory === 'chemises') {
            return product.category === 'chemises' || product.category === 'pantalons';
          }
          return product.category === selectedCategory;
        });

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();

    const alreadyInCart = state.cart.some(
      (item) => item.productId === product.id
    );

    if (alreadyInCart) {
      console.log(`Produit déjà dans le panier: ${product.name}`);
      return;
    }

    const defaultVariant = product.variants?.[0] || {
      id: `${product.id}-default`,
      size: 'Unique',
      color: 'Standard',
      stock: product.variants.reduce((sum, v) => sum + v.stock, 0),
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

    console.log(`Ajout au panier: ${product.name}`);
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
    <div className="min-h-screen bg-gray-50">
      {/* Bannière principale */}
      <section
        className="relative h-[60vh] sm:h-[90vh] bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/images.png)' }}  // ← Changez ici selon votre fichier réel
      >
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center px-4">
          <div className="text-center text-white">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 leading-snug">
             <br className="sm:hidden" /> 
            </h1>
            <p className="text-base sm:text-lg md:text-xl font-light max-w-md mx-auto">
              
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 w-full h-12 sm:h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </section>

      {/* Produits en vedette (défilement) */}
      <section id="featured-products" className="py-10 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 sm:mb-10 text-center font-serif tracking-wide">
            Produits en vedette
          </h2>

          <div className="overflow-hidden relative">
            <div
              className="flex space-x-4 animate-scroll"
              style={{ animation: 'scroll 8s linear infinite' }}
            >
              {products.slice(-10).map((product) => (
                <div
                  key={product.id}
                  className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 flex-shrink-0"
                >
                  <img
                    src={product.images?.[0] || '/images/placeholder.jpg'}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>

          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes scroll {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-100%); }
                }
              `,
            }}
          />
        </div>
      </section>

      {/* Liste des produits */}
      <section id="articles" className="py-10 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Nos Produits
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              Parcourez notre sélection de qualité
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
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

                <p className="text-gray-500 text-xs sm:text-sm mb-2 line-clamp-2">
                  {product.description}
                </p>

                <p className="text-gray-800 font-medium mb-2 text-sm sm:text-base">
                  {new Intl.NumberFormat('fr-FR').format(product.price)} F CFA
                </p>

                <button
                  onClick={(e) => handleAddToCart(e, product)}
                  className="mt-auto bg-black text-white py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-800 transition text-sm sm:text-base"
                >
                  Ajouter au panier
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 sm:py-12 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div>
              <img
                src="/images/image copy.png"
                alt="Power Curl"
                className="h-8 sm:h-12 w-auto mb-4"
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Contact</h3>
              <p className="text-gray-400 mb-2 text-sm sm:text-base">Téléphone: +221 77 474 86 03</p>
              <p className="text-gray-400 text-sm sm:text-base">Adresse: Dakar, Sénégal</p>
            </div>
            
          </div>
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center">
            <p className="text-gray-400 text-xs sm:text-sm">
              &copy; 2024 Power Curl. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}