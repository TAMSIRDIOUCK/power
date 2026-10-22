// src/components/customer/CartPage.tsx
import { useState } from 'react';
import { Plus, Minus, Trash2, CheckCircle, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';

// ⚠️ Numéro WhatsApp de la boutique (format international, sans + ni espaces)
const VENDOR_WHATSAPP_NUMBER = '221711523274'; // ← À MODIFIER

export default function CartPage() {
  const { state, dispatch } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');

  // Infos client
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('fr-FR').format(price) + ' F CFA';

  // Calculs panier
  const subtotal = state.cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  const total = subtotal;

  // Vérifie si un produit en gros a une quantité < 15
  const hasInvalidWholesale = state.cart.some(
    (item) =>
      item.product.category &&
      item.product.category.toLowerCase().includes('gros') &&
      item.quantity < 15
  );

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: cartItemId });
    } else {
      dispatch({
        type: 'UPDATE_CART_QUANTITY',
        payload: { cartItemId, quantity },
      });
    }
  };

  const removeItem = (cartItemId: string) =>
    dispatch({ type: 'REMOVE_FROM_CART', payload: cartItemId });

  const updateVariant = (
    cartItemId: string,
    newSize: string,
    newColor: string
  ) => {
    const cartItem = state.cart.find((item) => item.cartItemId === cartItemId);
    if (!cartItem) return;

    const newVariant = cartItem.product.variants.find(
      (v) => v.size === newSize && v.color === newColor
    );

    if (newVariant && newVariant.stock >= cartItem.quantity) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: cartItemId });
      dispatch({
        type: 'ADD_TO_CART',
        payload: {
          productId: cartItem.product.id,
          variantId: newVariant.id,
          product: cartItem.product,
          variant: newVariant,
          quantity: cartItem.quantity,
        },
      });
    } else {
      alert("Cette variante n'est pas disponible en stock suffisant.");
    }
  };

  /**
   * Construit le message WhatsApp contenant toutes les infos de la commande
   */
  const buildWhatsAppMessage = (numOrder: string): string => {
    const lines: string[] = [];

    lines.push('🛍️ *NOUVELLE COMMANDE*');
    lines.push(`📦 N° : *${numOrder}*`);
    lines.push('');
    lines.push('👤 *CLIENT*');
    lines.push(`Nom : ${firstName} ${lastName}`);
    lines.push(`Téléphone : ${phone}`);
    if (email) lines.push(`Email : ${email}`);
    lines.push(`Adresse : ${address}, ${city}${region ? `, ${region}` : ''}`);
    lines.push('');
    lines.push('🛒 *ARTICLES*');

    state.cart.forEach((item, i) => {
      lines.push(
        `${i + 1}. ${item.product.name} — x${item.quantity} = ${formatPrice(
          item.product.price * item.quantity
        )}`
      );
      const details: string[] = [];
      if (item.variant?.size) details.push(`Taille : ${item.variant.size}`);
      if (item.variant?.color) details.push(`Couleur : ${item.variant.color}`);
      if (details.length) lines.push(`   ↳ ${details.join(' | ')}`);
    });

    lines.push('');
    lines.push(`💰 *TOTAL : ${formatPrice(total)}*`);
    lines.push('');
    lines.push('💳 Paiement à la livraison (espèces)');
    lines.push('');
    lines.push('Merci de confirmer la réception de cette commande 🙏');

    return lines.join('\n');
  };

  const handleOrderSubmit = async () => {
    if (state.cart.length === 0) {
      alert('Votre panier est vide.');
      return;
    }
    if (!firstName || !lastName || !phone || !address || !city) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (hasInvalidWholesale) {
      alert(
        "❗ Les produits en gros doivent être commandés avec une quantité d'au moins 15 unités."
      );
      return;
    }

    setIsLoading(true);

    try {
      // 1. Insertion de la commande dans Supabase (email retiré pour éviter l'erreur de cache)
      const { data: orderData, error: orderError } = await supabase
        .from('orders2')
        .insert([
          {
            first_name: firstName,
            last_name: lastName,
            phone,
            // email: email || null, // ⚠️ Retiré temporairement car non reconnu par le cache
            address: `${address}, ${city}, ${region || 'Sénégal'}`,
            total,
            delivery_fee: 0,
            is_paid: false,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (orderError || !orderData) {
        console.error('Erreur orders2:', orderError);
        alert(
          `Impossible de créer la commande: ${
            orderError?.message || 'Erreur inconnue'
          }`
        );
        return;
      }

      // 2. Insertion des articles
      const itemsToInsert = state.cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
        variant_size: item.variant?.size || null,
        variant_color: item.variant?.color || null,
        product_image: item.product.images?.[0] || null,
        created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase
        .from('order_items2')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Erreur order_items2:', itemsError);
        alert("Erreur lors de l'enregistrement des produits.");
        return;
      }

      // 3. Numéro de commande lisible
      const numOrder = `CMD-${String(orderData.id).padStart(5, '0')}`;
      setOrderNumber(numOrder);

      // 4. Construction et ouverture du lien WhatsApp
      const message = buildWhatsAppMessage(numOrder);
      const whatsappUrl = `https://wa.me/${VENDOR_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        message
      )}`;

      // Ouvre WhatsApp dans un nouvel onglet
      window.open(whatsappUrl, '_blank');

      // 5. Nettoyage + succès
      dispatch({ type: 'CLEAR_CART' });
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        window.location.href = '/';
      }, 6000);
    } catch (error: any) {
      console.error('Erreur inattendue:', error);
      alert('Une erreur inattendue est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
          Mon Panier ({state.cart.length} article
          {state.cart.length > 1 ? 's' : ''})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Liste des articles */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {state.cart.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center text-gray-500">
                Votre panier est vide.
              </div>
            )}

            {state.cart.map((item) => {
              const availableSizes = [
                ...new Set(
                  item.product.variants
                    .filter((v) => v.stock > 0 && v.size)
                    .map((v) => v.size)
                ),
              ];
              const availableColors = [
                ...new Set(
                  item.product.variants
                    .filter((v) => v.stock > 0 && v.color)
                    .map((v) => v.color)
                ),
              ];

              return (
                <div
                  key={item.cartItemId}
                  className="bg-white rounded-xl shadow-sm p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={item.product.images?.[0] || '/placeholder.png'}
                        alt={item.product.name}
                        className="w-full sm:w-32 h-40 sm:h-32 object-cover rounded-lg"
                      />
                    </div>

                    <div className="flex-1 space-y-3 sm:space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div>
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                            {item.product.name}
                          </h3>
                          <p className="text-gray-600 text-sm line-clamp-2 mt-1">
                            {item.product.description}
                          </p>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-blue-800 whitespace-nowrap">
                          {formatPrice(item.product.price)}
                        </p>
                      </div>

                      {/* Variantes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {availableSizes.length > 0 && (
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-1">
                              Taille
                            </label>
                            <select
                              value={item.variant?.size || ''}
                              onChange={(e) =>
                                updateVariant(
                                  item.cartItemId,
                                  e.target.value,
                                  item.variant?.color || ''
                                )
                              }
                              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                              {availableSizes.map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {availableColors.length > 0 && (
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-1">
                              Couleur
                            </label>
                            <select
                              value={item.variant?.color || ''}
                              onChange={(e) =>
                                updateVariant(
                                  item.cartItemId,
                                  item.variant?.size || '',
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                              {availableColors.map((color) => (
                                <option key={color} value={color}>
                                  {color}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Quantité et Supprimer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium">Quantité:</span>
                          <div className="flex items-center border rounded-lg">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.cartItemId,
                                  item.quantity - 1
                                )
                              }
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-3 sm:px-4 py-1 sm:py-2 text-base sm:text-lg font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.cartItemId,
                                  item.quantity + 1
                                )
                              }
                              disabled={
                                !!item.variant?.stock &&
                                item.quantity >= (item.variant.stock || 0)
                              }
                              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-40"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-500">
                            (Stock: {item.variant?.stock ?? 0})
                          </span>
                        </div>

                        <button
                          onClick={() => removeItem(item.cartItemId)}
                          className="flex items-center text-sm text-red-500 hover:text-red-700 self-start sm:self-auto"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Supprimer
                        </button>
                      </div>

                      <div className="text-right pt-2 border-t sm:border-0 mt-2 sm:mt-0">
                        <span className="text-base sm:text-lg font-semibold">
                          Sous-total:{' '}
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulaire + résumé */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 sticky top-4 sm:top-8">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
                Informations Client
              </h3>

              <div className="space-y-3 mb-4 sm:mb-6">
                <input
                  type="text"
                  placeholder="Prénom *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Nom *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="tel"
                  placeholder="Téléphone *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="email"
                  placeholder="Email (optionnel)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Adresse *"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Ville *"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Région"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Info livraison */}
              <div className="mb-4 sm:mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs sm:text-sm text-blue-800">
                🚚 Les frais de livraison seront convenus directement avec la
                boutique après validation de votre commande.
              </div>

              {/* Paiement */}
              <div className="mb-4 sm:mb-6">
                <h4 className="text-base sm:text-lg font-medium mb-2 sm:mb-3">Mode de paiement</h4>
                <div className="p-3 border border-blue-500 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-sm sm:text-base font-medium">
                      Paiement à la livraison
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1">
                    Vous payez à la réception de votre commande
                  </div>
                </div>
              </div>

              {/* Résumé */}
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
                Résumé
              </h3>
              <div className="space-y-2 sm:space-y-3 border-t pt-3 sm:pt-4">
                <div className="flex justify-between text-sm sm:text-base text-gray-600">
                  <span>
                    Sous-total (
                    {state.cart.reduce((sum, item) => sum + item.quantity, 0)}{' '}
                    article{state.cart.length > 1 ? 's' : ''})
                  </span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-lg sm:text-xl font-bold border-t pt-2 sm:pt-3">
                  <span>Total</span>
                  <span className="text-blue-800">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Bouton Commande */}
              <button
                onClick={handleOrderSubmit}
                disabled={isLoading || state.cart.length === 0}
                className={`w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3.5 sm:py-4 text-sm sm:text-base rounded-lg font-medium hover:bg-green-700 mt-4 sm:mt-6 transition-colors ${
                  isLoading || state.cart.length === 0
                    ? 'opacity-70 cursor-not-allowed'
                    : ''
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                {isLoading ? 'Enregistrement...' : 'Commander via WhatsApp'}
              </button>
              <p className="text-[11px] sm:text-xs text-gray-500 text-center mt-2 sm:mt-3 leading-relaxed">
                Votre commande sera enregistrée et la boutique sera notifiée
                via WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message confirmation */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center max-w-sm sm:max-w-md w-full animate-in fade-in zoom-in duration-300">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-green-700 mb-2">
              Commande confirmée 🎉
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              Merci {firstName}, votre commande <strong>{orderNumber}</strong> a
              bien été enregistrée.
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              La boutique a été notifiée via WhatsApp. Elle vous contactera
              rapidement pour confirmer la livraison.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs sm:text-sm text-green-800">
              📱 Si WhatsApp ne s'est pas ouvert automatiquement, vérifiez que
              les pop-ups sont autorisés.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}