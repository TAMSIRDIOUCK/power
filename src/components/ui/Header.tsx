// src/components/ui/Header.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Menu, X, ShoppingCart, TrendingUp, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {}

interface SearchResult {
  id: string | number;
  name: string;
  price?: number;
  image?: string;
  category?: string;
}

/** Normalise une chaîne : minuscules, sans accents, sans ponctuation */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distance de Levenshtein (tolérance aux fautes de frappe) */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

/** Score de pertinence d'un produit pour une requête (0 = pas pertinent) */
function scoreProduct(product: SearchResult, query: string): number {
  const q = normalize(query);
  if (!q) return 0;

  const name = normalize(product.name);
  const category = normalize(product.category ?? '');
  const words = q.split(' ').filter(Boolean);

  // 1. Correspondance exacte / début de mot → score maximal
  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.includes(q)) return 80;
  if (category.includes(q)) return 60;

  // 2. Tous les mots de la requête doivent apparaître (au moins partiellement)
  let allWordsMatch = true;
  let wordScore = 0;
  for (const word of words) {
    if (word.length < 2) continue;
    const target = name.includes(word) ? name : category;
    if (target.includes(word)) {
      wordScore += 10;
      continue;
    }
    // Tolérance aux fautes : distance <= 1 pour les petits mots, <= 2 sinon
    const tolerance = word.length <= 4 ? 1 : 2;
    const nameWords = name.split(' ');
    const hasCloseMatch = nameWords.some(
      (nw) => levenshtein(nw, word) <= tolerance
    );
    if (hasCloseMatch) {
      wordScore += 5;
    } else {
      allWordsMatch = false;
      break;
    }
  }
  if (allWordsMatch && wordScore > 0) return wordScore;

  // 3. Tolérance globale sur le nom complet
  const tolerance = q.length <= 4 ? 1 : 2;
  if (levenshtein(name, q) <= tolerance) return 30;

  return 0;
}

/** Met en évidence le terme recherché dans un texte */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = normalize(query);
  if (!q) return <>{text}</>;
  const normalizedText = normalize(text);
  const index = normalizedText.indexOf(q);
  if (index === -1) return <>{text}</>;

  // On retrouve la position dans le texte original (approximation sûre pour accents simples)
  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);
  return (
    <>
      {before}
      <mark className="bg-[#BCDAED] text-[#1A1A1A] rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

export default function Header({}: HeaderProps) {
  const { state, dispatch } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const navigate = useNavigate();

  // --- Recherche ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const cartItemsCount = state.cart.reduce((total, item) => total + item.quantity, 0);
  const VENDOR_CODE = 'AB123';

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

  // --- Charger l'historique des recherches ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  // --- Focus automatique quand on ouvre la recherche ---
  useEffect(() => {
    if (isSearchOpen) {
      // petit délai pour laisser l'animation démarrer
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isSearchOpen]);

  // --- Fermer la recherche au clic extérieur ---
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  // --- Raccourci clavier global : Ctrl/Cmd + K pour ouvrir la recherche ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // --- Produits disponibles (on suppose que state.products existe) ---
  const products: SearchResult[] = useMemo(() => {
    const raw = (state as any).products;
    if (!Array.isArray(raw)) return [];
    return raw.map((p: any) => ({
      id: p.id ?? p._id ?? p.name,
      name: p.name ?? '',
      price: p.price,
      image: p.image ?? p.images?.[0],
      category: p.category ?? p.categoryName,
    }));
  }, [state]);

  // --- Résultats intelligents triés par pertinence ---
  const results: SearchResult[] = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return products
      .map((p) => ({ product: p, score: scoreProduct(p, searchQuery) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((r) => r.product);
  }, [products, searchQuery]);

  // --- Enregistrer une recherche récente ---
  const saveRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem('recentSearches', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // --- Lancer la recherche ---
  const performSearch = useCallback(
    (term: string) => {
      const clean = term.trim();
      if (!clean) return;
      saveRecentSearch(clean);
      setIsSearchOpen(false);
      navigate(`/shop?search=${encodeURIComponent(clean)}`);
    },
    [navigate, saveRecentSearch]
  );

  // --- Gestion clavier dans la barre de recherche ---
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const listLength = results.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (listLength > 0) {
        setHighlightedIndex((i) => (i + 1) % listLength);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (listLength > 0) {
        setHighlightedIndex((i) => (i - 1 + listLength) % listLength);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        const r = results[highlightedIndex];
        performSearch(r.name);
      } else {
        performSearch(searchQuery);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

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

  const closeMenu = () => setIsMenuOpen(false);

  const scrollToFooter = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen(false);
    setTimeout(() => {
      const footer = document.getElementById('footer');
      if (footer) {
        footer.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm">
      {/* Message central (Alert) */}
      {alertMessage && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#8BB8D6] text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade text-center max-w-xs sm:max-w-sm">
          {alertMessage}
        </div>
      )}

      {/* 1. Bannière supérieure bleue défilante */}
      <div className="bg-[#BCDAED] text-[#1A1A1A] py-2 overflow-hidden relative w-full">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="mx-4 text-xs sm:text-sm font-medium tracking-wide">
             Découvrez nos nouveaux produits
          </span>
          <span className="mx-4 text-xs sm:text-sm font-medium tracking-wide">
             - Découvrez nos nouveaux produits
          </span>
        </div>
      </div>

      {/* 2. Barre de navigation principale */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          
          {/* Bouton Menu (Gauche) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 -ml-2 text-[#1A1A1A] hover:opacity-75 transition-opacity"
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" strokeWidth={1.5} /> : <Menu className="w-6 h-6" strokeWidth={1.5} />}
          </button>

          {/* Logo Centré (Maison M) */}
          <div 
            className="flex-1 flex justify-center cursor-pointer"
            onClick={() => navigate('/')}
          >
            <img 
              src="/images/m.jpg" 
              alt="Maison M Store" 
              className="h-24 w-auto sm:h-16 object-contain" 
            />
          </div>

          {/* Icônes (Droite) */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* Bouton Recherche */}
            <button
              onClick={() => setIsSearchOpen((v) => !v)}
              className="text-[#1A1A1A] hover:opacity-75 transition-opacity"
              aria-label="Rechercher"
              title="Rechercher (Ctrl+K)"
            >
              {isSearchOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
              ) : (
                <Search className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
              )}
            </button>
            
            <button
              onClick={() => navigate('/cart')}
              className="relative text-[#1A1A1A] hover:opacity-75 transition-opacity"
              aria-label="Panier"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#4A3224] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2bis. Panneau de recherche */}
      {isSearchOpen && (
        <div
          ref={searchContainerRef}
          className="border-t border-gray-200 bg-white shadow-md animate-search-slide"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            {/* Champ de recherche */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Rechercher un produit, une catégorie…"
                className="w-full pl-12 pr-10 py-3 rounded-full border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8BB8D6] focus:border-transparent"
                aria-label="Recherche"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls="search-results"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Effacer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Résultats */}
            {searchQuery.trim() && (
              <div id="search-results" className="mt-3 max-h-96 overflow-y-auto">
                {results.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {results.map((r, i) => (
                      <li key={r.id}>
                        <button
                          onMouseEnter={() => setHighlightedIndex(i)}
                          onClick={() => performSearch(r.name)}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-3 rounded-md transition-colors ${
                            highlightedIndex === i ? 'bg-[#BCDAED]/40' : 'hover:bg-gray-50'
                          }`}
                        >
                          {r.image ? (
                            <img
                              src={r.image}
                              alt={r.name}
                              className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Search className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1A1A1A] truncate">
                              <Highlight text={r.name} query={searchQuery} />
                            </p>
                            {r.category && (
                              <p className="text-xs text-gray-500 truncate">{r.category}</p>
                            )}
                          </div>
                          {typeof r.price === 'number' && (
                            <span className="text-sm font-semibold text-[#4A3224] flex-shrink-0">
                              {r.price.toFixed(2)} €
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-6 text-center text-sm text-gray-500">
                    Aucun résultat pour «&nbsp;{searchQuery}&nbsp;»
                  </div>
                )}
              </div>
            )}

            {/* Historique / suggestions quand vide */}
            {!searchQuery.trim() && recentSearches.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  Recherches récentes
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setSearchQuery(term);
                        searchInputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-[#BCDAED] rounded-full transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!searchQuery.trim() && recentSearches.length === 0 && (
              <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Astuce : utilisez les flèches ↑↓ puis Entrée pour naviguer dans les résultats.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Menu déroulant (Mobile & Desktop) */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white shadow-xl border-t border-gray-200 z-40 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center space-y-8">
            
            <nav className="flex flex-col items-center space-y-6 text-xl font-medium text-[#1A1A1A] w-full max-w-xs">
              
              <Link 
                to="/" 
                onClick={closeMenu} 
                className="nav-link relative group cursor-pointer w-full text-center py-2"
              >
                Accueil
              </Link>
              
              <Link 
                to="/shop" 
                onClick={closeMenu} 
                className="nav-link relative group cursor-pointer w-full text-center py-2"
              >
                Boutique
              </Link>
              
              <a 
                href="#footer" 
                onClick={scrollToFooter} 
                className="nav-link relative group cursor-pointer w-full text-center py-2"
              >
                Contact
              </a>
            </nav>

            <hr className="w-full max-w-xs border-gray-200" />

            <div className="flex flex-col items-center w-full max-w-xs">
              <button
                onClick={handleToggleViewClick}
                className="px-6 py-2 text-sm font-medium text-[#4A3224] border border-[#4A3224] rounded-full hover:bg-[#4A3224] hover:text-white transition-colors w-full"
              >
                {state.currentView === 'customer' ? 'Espace Vendeur' : 'Espace Client'}
              </button>

              {showCodeInput && state.currentView === 'customer' && (
                <form
                  onSubmit={handleSubmitCode}
                  className="mt-4 w-full flex flex-col gap-2 animate-fade-in"
                >
                  <input
                    type="text"
                    placeholder="Entrez le code vendeur"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="border border-gray-300 px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#8BB8D6] w-full"
                  />
                  <div className="flex justify-between gap-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-[#8BB8D6] text-white rounded-md hover:bg-[#7aa7c4] transition-colors text-sm"
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

      {/* Animations CSS */}
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 20s linear infinite;
          }

          @keyframes fade {
            0% { opacity: 0; transform: translateY(-10px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
          }
          .animate-fade {
            animation: fade 3s ease-in-out forwards;
          }
          .animate-fade-in {
            animation: fadeIn 0.3s ease-out forwards;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes searchSlide {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-search-slide {
            animation: searchSlide 0.2s ease-out forwards;
          }

          .nav-link {
            display: inline-block;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            letter-spacing: 0.05em;
          }

          .nav-link::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 0;
            height: 2px;
            background-color: #8BB8D6;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateX(-50%);
            border-radius: 2px;
          }

          .nav-link:hover {
            color: #8BB8D6;
            transform: translateY(-2px) scale(1.05);
            text-shadow: 0 4px 12px rgba(139, 184, 214, 0.3);
          }

          .nav-link:hover::after {
            width: 80%;
          }
        `}
      </style>
    </header>
  );
}