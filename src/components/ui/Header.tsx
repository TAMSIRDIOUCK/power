// src/components/ui/Header.tsx
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {}

export default function Header({}: HeaderProps) {
  const { state, dispatch } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const navigate = useNavigate();

  const cartItemsCount = state.cart.reduce((total, item) => total + item.quantity, 0);
  const VENDOR_CODE = 'ABz123'; // Code pour l'accès Espace Vendeur

  // --- Persistance vue dans localStorage ---
  useEffect(() => {
    const savedView = localStorage.getItem('currentView') as 'customer' | 'vendor' | null;
    if (savedView === 'customer' || savedView === 'vendor') {
      dispatch({ type: 'SET_VIEW', payload: savedView });
    }
  }, [dispatch]);

  useEffect(() => {
    localStorage.setItem('currentView', state.currentView);
  }, [state.currentView]);

  // --- Message temporaire ---
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => setAlertMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === VENDOR_CODE) {
      dispatch({ type: 'SET_VIEW', payload: 'vendor' });
      setAlertMessage('Bienvenue dans l’Espace Vendeur !');
      setShowCodeInput(false);
      setCode('');
    } else {
      setAlertMessage("Accès refusé. Tu n'es pas un vendeur !");
    }
  };

  const handleToggleViewClick = () => {
    if (state.currentView === 'customer') {
      setShowCodeInput(true);
    } else {
      dispatch({ type: 'SET_VIEW', payload: 'customer' });
    }
  };

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      {/* Message central */}
      {alertMessage && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade text-center max-w-xs sm:max-w-sm">
          {alertMessage}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <img src="/images/image copy.png" alt="Style Ndawal" className="h-12 w-auto" />
          </div>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex space-x-8">
            
          </nav>

          <div className="flex-1"></div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Desktop: Espace Vendeur / Client */}
            <div className="hidden md:block relative">
              <button
                onClick={handleToggleViewClick}
                className="px-3 py-2 text-sm font-medium text-blue-800 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                {state.currentView === 'customer' ? 'Espace Vendeur' : 'Espace Client'}
              </button>

              {showCodeInput && state.currentView === 'customer' && (
                <form
                  onSubmit={handleSubmitCode}
                  className="absolute top-12 left-0 bg-white p-3 shadow-lg rounded-lg flex space-x-2 z-50 w-64"
                >
                  <input
                    type="text"
                    placeholder="Code vendeur"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="border border-gray-300 px-2 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                  >
                    OK
                  </button>
                </form>
              )}
            </div>

            {/* Panier */}
            <button
              onClick={() => navigate('/cart')}
              className="relative p-2 text-gray-700 hover:text-blue-800 transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Menu mobile */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-blue-800 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-4">
              <nav className="flex flex-col space-y-2">
               
              </nav>

              {/* Formulaire vendeur adapté mobile */}
              <div className="relative">
                <button
                  onClick={handleToggleViewClick}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-800 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {state.currentView === 'customer' ? 'Espace Vendeur' : 'Espace Client'}
                </button>

                {showCodeInput && state.currentView === 'customer' && (
                  <form
                    onSubmit={handleSubmitCode}
                    className="mt-3 bg-white p-4 shadow-lg rounded-lg flex flex-col gap-2 z-50"
                  >
                    <input
                      type="text"
                      placeholder="Entrez le code vendeur"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    />
                    <div className="flex justify-between gap-2">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCodeInput(false);
                          setCode('');
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Animations */}
      <style>
        {`
          @keyframes fade {
            0% { opacity: 0; transform: translateY(-10px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
          }
          .animate-fade {
            animation: fade 3s ease-in-out forwards;
          }
        `}
      </style>
    </header>
  );
}
