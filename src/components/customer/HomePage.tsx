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
    <div className="min-h-screen bg-white">
      {/* Bannière principale - Format Paysage adaptatif (Mobile, Tablette, PC) */}
      <div className="w-full bg-white relative overflow-hidden">
        <img 
          src="/images/images.png" 
          alt="Bannière Maison M" 
          /* 
            - h-[35vh] sur mobile (paysage)
            - md:aspect-[16/9] ou md:h-[60vh] sur tablette/PC pour garder de belles proportions
            - object-cover pour que l'image remplisse l'espace sans se déformer
          */
          className="w-full h-[35vh] md:h-[60vh] lg:h-[70vh] object-cover object-center" 
        />
      </div>

      {/* Titre sous la bannière */}
      <div className="text-center py-8 sm:py-12 px-4 bg-white">
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#1A1A1A] tracking-widest uppercase">
          maison m 
        </h1>
      </div>

      {/* Produits en vedette (défilement) */}
      <section id="featured-products" className="py-8 sm:py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1A1A] mb-8 text-center tracking-wide">
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
      <section id="articles" className="py-8 sm:py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1A1A] mb-3">
              Nos Produits
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base font-sans">
              Parcourez notre sélection de qualité
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleViewDetails(product)}
                className="flex flex-col p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100"
              >
                <div className="w-full h-36 sm:h-48 md:h-56 overflow-hidden rounded-lg">
                  <img
                    src={product.images?.[0] || '/images/placeholder.jpg'}
                    alt={product.name}
                    className="w-full h-full object-cover" 
                  />
                </div>

                <h3 className="text-sm sm:text-base font-serif font-semibold text-[#1A1A1A] mt-3 truncate">
                  {product.name}
                </h3>

                <p className="text-gray-500 text-xs sm:text-sm mb-2 line-clamp-2 font-sans">
                  {product.description}
                </p>

                <p className="text-[#1A1A1A] font-bold mb-3 text-sm sm:text-base font-sans">
                  {new Intl.NumberFormat('fr-FR').format(product.price)} F CFA
                </p>

                <button
                  onClick={(e) => handleAddToCart(e, product)}
                  className="mt-auto bg-black text-white py-1.5 sm:py-2 px-3 sm:px-4 rounded-full hover:bg-gray-800 transition text-sm sm:text-base font-sans"
                >
                  Ajouter au panier
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="bg-white text-[#1A1A1A] py-10 sm:py-12 border-t border-gray-200 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-center md:text-left">
            <div className="flex justify-center md:justify-start">
              <img
                src="/images/m.jpg"
                alt="Maison M"
                className="h-10 sm:h-14 w-auto mb-4"
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold mb-3 sm:mb-4">Contact</h3>
              <p className="text-gray-500 mb-2 text-sm sm:text-base font-sans">Téléphone: +221 71 152 32 74

              </p>
              <p className="text-gray-500 text-sm sm:text-base font-sans">Adresse: Dakar, Sénégal</p>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold mb-3 sm:mb-4">Suivez-nous</h3>
              <p className="text-gray-500 text-sm sm:text-base font-sans">Instagram | TikTok | WhatsApp</p>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center">
            <p className="text-gray-400 text-xs sm:text-sm font-sans">
              &copy; 2024 Maison M. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}