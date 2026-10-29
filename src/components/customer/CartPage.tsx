// src/components/customer/CartPage.tsx
import { useState } from 'react';
import { Plus, Minus, Trash2, CheckCircle, MessageCircle, Tag, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { Product } from '../../types';
import CountrySelect, { COUNTRIES, DEFAULT_COUNTRY_CODE } from './CountrySelect';

// ⚠️ Numéro WhatsApp de la boutique (format international, sans + ni espaces)
const VENDOR_WHATSAPP_NUMBER = '221711523274'; // ← À MODIFIER

const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');

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
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');

  // Codes promo
  const [promoInput, setPromoInput] = useState('');
  const [appliedCodes, setAppliedCodes] = useState<string[]>([]);
  const [promoMessage, setPromoMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('fr-FR').format(price) + ' F CFA';

  const country = COUNTRIES.find((c) => c.code === countryCode);

  // ----- Réductions -----
  // Un produit est remisé si la boutique a défini un pourcentage ET qu'un de ses codes a été saisi
  const getDiscountPercent = (product: Product): number => {
    const percent = product.discountPercent ?? 0;
    if (percent <= 0 || !product.discountCodes?.length) return 0;
    const unlocked = product.discountCodes.some((c) =>
      appliedCodes.includes(normalizeCode(c))
    );
    return unlocked ? Math.min(percent, 100) : 0;
  };

  const getUnitPrice = (product: Product): number => {
    const percent = getDiscountPercent(product);
    return Math.round((product.price * (100 - percent)) / 100);
  };

  const applyPromoCode = () => {
    const code = normalizeCode(promoInput);
    if (!code) return;

    if (appliedCodes.includes(code)) {
      setPromoMessage({ type: 'error', text: 'Ce code est déjà appliqué.' });
      return;
    }

    const matchingItems = state.cart.filter((item) =>
      item.product.discountCodes?.some((c) => normalizeCode(c) === code)
    );

    if (matchingItems.length === 0) {
      setPromoMessage({
        type: 'error',
        text: "Code invalide ou sans effet sur les articles de votre panier.",
      });
      return;
    }

    setAppliedCodes([...appliedCodes, code]);
    setPromoInput('');
    setPromoMessage({
      type: 'success',
      text: `Code ${code} appliqué à ${matchingItems.length} article${
        matchingItems.length > 1 ? 's' : ''
      }.`,
    });
  };

  const removePromoCode = (code: string) => {
    setAppliedCodes(appliedCodes.filter((c) => c !== code));
    setPromoMessage(null);
  };

  // Calculs panier
  const originalSubtotal = state.cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const subtotal = state.cart.reduce(
    (sum, item) => sum + getUnitPrice(item.product) * item.quantity,
    0
  );
  const discountTotal = originalSubtotal - subtotal;
  const total = subtotal;

  // Vérifie si un produit en gros a une quantité < 15
  const hasInvalidWholesale = state.cart.some(
    (item) =>
      (item.product.isWholesale ||
        (item.product.category &&
          item.product.category.toLowerCase().includes('gros'))) &&
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

  const fullAddress = () =>
    [address, city, region, country?.name].filter(Boolean).join(', ');

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
    lines.push(`Pays : ${country?.name ?? ''}`);
    lines.push(`Adresse : ${[address, city, region].filter(Boolean).join(', ')}`);
    lines.push('');
    lines.push('🛒 *ARTICLES*');

    state.cart.forEach((item, i) => {
      const percent = getDiscountPercent(item.product);
      const unit = getUnitPrice(item.product);
      lines.push(
        `${i + 1}. ${item.product.name} — x${item.quantity} = ${formatPrice(
          unit * item.quantity
        )}${percent > 0 ? ` (-${percent} %)` : ''}`
      );
      const details: string[] = [];
      if (item.variant?.size) details.push(`Taille : ${item.variant.size}`);
      if (item.variant?.color) details.push(`Couleur : ${item.variant.color}`);
      if (details.length) lines.push(`   ↳ ${details.join(' | ')}`);
    });

    lines.push('');
    if (discountTotal > 0) {
      lines.push(`🏷️ Codes promo : ${appliedCodes.join(', ')}`);
      lines.push(`Réduction : -${formatPrice(discountTotal)}`);
    }
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
    if (!firstName || !lastName || !phone || !countryCode || !address || !city) {
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
            address: fullAddress(),
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

      // 2. Insertion des articles (prix unitaire après réduction)
      const itemsToInsert = state.cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: getUnitPrice(item.product),
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

              const percent = getDiscountPercent(item.product);
              const unitPrice = getUnitPrice(item.product);

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
                        <div className="sm:text-right whitespace-nowrap">
                          {percent > 0 && (
                            <div className="flex sm:justify-end items-center gap-2">
                              <span className="text-sm text-gray-400 line-through">
                                {formatPrice(item.product.price)}
                              </span>
                              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                -{percent} %
                              </span>
                            </div>
                          )}
                          <p className="text-xl sm:text-2xl font-bold text-blue-800">
                            {formatPrice(unitPrice)}
                          </p>
                        </div>
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
                          Sous-total: {formatPrice(unitPrice * item.quantity)}
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

                {/* Pays avec drapeaux */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Pays *
                  </label>
                  <CountrySelect value={countryCode} onChange={setCountryCode} />
                </div>

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

              {/* Code promo */}
              <div className="mb-4 sm:mb-6">
                <h4 className="text-base sm:text-lg font-medium mb-2 sm:mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Code promo
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Entrez votre code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyPromoCode();
                      }
                    }}
                    className="flex-1 min-w-0 px-3 py-2.5 text-sm border rounded-lg uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={applyPromoCode}
                    disabled={!promoInput.trim()}
                    className="px-4 py-2.5 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Appliquer
                  </button>
                </div>

                {promoMessage && (
                  <p
                    className={`text-xs sm:text-sm mt-2 ${
                      promoMessage.type === 'success' ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {promoMessage.text}
                  </p>
                )}

                {appliedCodes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {appliedCodes.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-800 px-2.5 py-1 rounded-full"
                      >
                        {code}
                        <button
                          type="button"
                          onClick={() => removePromoCode(code)}
                          aria-label={`Retirer le code ${code}`}
                          className="hover:text-green-950"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                  <span>{formatPrice(originalSubtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-sm sm:text-base text-green-700">
                    <span>Réduction</span>
                    <span>-{formatPrice(discountTotal)}</span>
                  </div>
                )}
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