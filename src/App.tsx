// src/App.tsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { mockProducts } from "./data/mockData";

// UI
import Header from "./components/ui/Header";

// Pages
import HomePage from "./components/customer/HomePage";
import CartPage from "./components/customer/CartPage";
import VendorDashboard from "./components/vendor/VendorDashboard";

// ScrollToTop component
import { useLocation } from "react-router-dom";

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

  // Message de bienvenue automatique
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        "Yidam IA: Bienvenue chez Yidam Shop ! Je suis là pour répondre à vos questions sur les produits, la livraison ou vos commandes."
      ]);
    }
  }, [open]);

  const handleSend = () => {
    if (!input.trim()) return;

    // Ajouter le message utilisateur
    setMessages((prev) => [...prev, `Vous: ${input}`]);

    // Générer la réponse IA
    let reply = "Pour plus de détails, appelez le +221 XX XXX XX XX";
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes("livraison")) {
      reply =
        "Notre livraison prend 2-3 jours ouvrables. Pour plus d’infos, contactez le +221 XX XXX XX XX";
    } else if (lowerInput.includes("salut") || lowerInput.includes("bonjour")) {
      reply = "Salut ! Comment puis-je vous aider aujourd'hui ?";
    } else if (lowerInput.includes("commande")) {
      reply =
        "Vous pouvez suivre votre commande depuis votre compte ou contactez-nous au +221 XX XXX XX XX";
    }

    // Ajouter la réponse après un petit délai
    setTimeout(() => {
      setMessages((prev) => [...prev, `Yidam IA: ${reply}`]);
    }, 500);

    setInput("");
  };

  return (
    <>
      {/* Icône flottante WhatsApp */}
      <a
        href="https://wa.me/221786319536"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed right-6 bottom-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-all"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          className="w-6 h-6"
          fill="currentColor"
        >
          <path d="M16 0C7.163 0 0 7.163 0 16c0 2.847.746 5.65 2.163 8.102L.001 32l8.188-2.14A15.92 15.92 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm8.577 23.423c-.363.998-2.12 1.91-2.92 2.03-.8.12-1.56.363-5.26-1.12-4.44-1.75-7.23-6.06-7.45-6.34-.22-.28-1.78-2.37-1.78-4.52 0-2.15 1.13-3.22 1.53-3.67.4-.45.88-.56 1.18-.56.3 0 .6 0 .86.01.28.01.65-.1 1.02.77.363.88 1.23 3.02 1.34 3.24.11.22.18.5.04.8-.13.27-.2.48-.4.74-.2.27-.42.6-.6.8-.2.2-.4.43-.17.84.23.4 1.02 1.68 2.2 2.73 1.51 1.34 2.78 1.75 3.18 1.95.4.2.63.17.86-.1.23-.27.98-1.14 1.24-1.54.27-.4.5-.33.86-.2.36.1 2.3 1.08 2.7 1.28.4.2.67.3.77.47.1.17.1 1.03-.26 2.03z" />
        </svg>
      </a>

      {/* Boîte de chat */}
      {open && (
        <div className="fixed right-6 bottom-20 w-80 bg-white border rounded-xl shadow-lg z-50 flex flex-col overflow-hidden">
          <div className="bg-blue-800 text-white px-4 py-2 font-semibold flex justify-between items-center">
            Yidam IA
            <button onClick={() => setOpen(false)} className="text-white font-bold">
              ✕
            </button>
          </div>
          <div className="p-2 h-64 overflow-y-auto flex flex-col gap-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg ${
                  msg.startsWith("Vous:") ? "bg-gray-100 self-end" : "bg-blue-100 self-start"
                }`}
              >
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
            <button
              onClick={handleSend}
              className="bg-blue-800 text-white px-4 py-1 rounded-lg hover:bg-blue-900 transition"
            >
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

  useEffect(() => {
    dispatch({ type: "SET_PRODUCTS", payload: mockProducts });
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Header */}
      <Header />

      {/* Routes */}
      <main>
        <Routes>
          <Route
            path="/"
            element={state.currentView === "customer" ? <HomePage /> : <VendorDashboard />}
          />
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
