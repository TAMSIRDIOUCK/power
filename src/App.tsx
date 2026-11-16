// src/App.tsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { supabase } from "./lib/supabaseClient";

// UI
import Header from "./components/ui/Header";

// Pages
import HomePage from "./components/customer/HomePage";
import ShopPage from "./components/customer/ShopPage";
import CartPage from "./components/customer/CartPage";
import VendorDashboard from "./components/vendor/VendorDashboard";

// ScrollToTop component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// ================== Boîte IA ==================
const AIChatBox: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        "Yidam IA: Bienvenue chez Maison M ! Je suis là pour répondre à vos questions sur les produits, la livraison ou vos commandes."
      ]);
    }
  }, [open, messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, `Vous: ${input}`]);

    let reply = "Pour plus de détails, appelez le +221 77 474 86 03";
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes("livraison")) {
      reply = "Notre livraison prend 2-3 jours ouvrables. Pour plus d’infos, contactez le +221 77 474 86 03";
    } else if (lowerInput.includes("salut") || lowerInput.includes("bonjour")) {
      reply = "Salut ! Comment puis-je vous aider aujourd'hui ?";
    } else if (lowerInput.includes("commande")) {
      reply = "Vous pouvez suivre votre commande depuis votre compte ou contactez-nous au +221 77 474 86 03";
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, `Yidam IA: ${reply}`]);
    }, 500);

    setInput("");
  };

  return (
    <>
      {/* Icône flottante WhatsApp */}
     

      {open && (
        <div className="fixed right-6 bottom-20 w-80 bg-white border rounded-xl shadow-lg z-50 flex flex-col overflow-hidden">
          <div className="bg-blue-800 text-white px-4 py-2 font-semibold flex justify-between items-center">
            Yidam IA
            <button onClick={() => setOpen(false)} className="text-white font-bold">✕</button>
          </div>
          <div className="p-2 h-64 overflow-y-auto flex flex-col gap-2">
            {messages.map((msg, i) => (
              <div key={i} className={`p-2 rounded-lg ${msg.startsWith("Vous:") ? "bg-gray-100 self-end" : "bg-blue-100 self-start"}`}>
                {msg}
              </div>
            ))}
          </div>
          <div className="flex p-2 border-t">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez un message..."
              className="flex-1 border rounded-lg px-2 py-1 mr-2"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend} className="bg-blue-800 text-white px-4 py-1 rounded-lg hover:bg-blue-900 transition">
              Envoyer
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ================== Contenu de l'app ==================
function AppContent() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupération des produits depuis Supabase (table products2)
        const { data: products, error: productsError } = await supabase
          .from("products2")
          .select("*")
          .order("created_at", { ascending: false });

        if (productsError) throw productsError;
        
        if (products) {
          // On utilise convertSupabaseProductToProduct si nécessaire, sinon on passe directement
          // Ici, on suppose que le HomePage s'en occupe déjà, donc on peut laisser vide ou faire un dispatch basique
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données Supabase:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg font-medium text-gray-600 animate-pulse">Chargement de la boutique...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative flex flex-col">
      {/* Header */}
      <Header />

      {/* Routes */}
      <main className="flex-grow">
        <Routes>
          <Route
            path="/"
            element={state.currentView === "customer" ? <HomePage /> : <VendorDashboard />}
          />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </main>

      {/* Boîte IA flottante */}
      {state.currentView === "customer" && <AIChatBox />}
    </div>
  );
}

// ================== App global ==================
export default function App() {
  return (
    <AppProvider>
      <Router>
        <ScrollToTop />
        <AppContent />
      </Router>
    </AppProvider>
  );
}