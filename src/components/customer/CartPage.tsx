// src/components/customer/CartPage.tsx
import { useState } from "react";
import { Plus, Minus, Trash2, CheckCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { shippingOptions } from "../../data/mockData";
import { supabase } from "../../lib/supabaseClient";

export default function CartPage() {
  const { state, dispatch } = useApp();

  // États
  const [selectedShipping, setSelectedShipping] = useState(shippingOptions[0]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash"); // uniquement cash
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Infos client
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fr-FR").format(price) + " F CFA";

  // Calculs panier
  const subtotal = state.cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  const shippingCost = selectedShipping.price;
  const total = subtotal + shippingCost;

  // Vérifie si un produit en gros a une quantité < 15
  const hasInvalidWholesale = state.cart.some(
    (item) =>
      item.product.category &&
      item.product.category.toLowerCase().includes("gros") &&
      item.quantity < 15
  );

  // Mise à jour quantité
  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch({ type: "REMOVE_FROM_CART", payload: cartItemId });
    } else {
      dispatch({
        type: "UPDATE_CART_QUANTITY",
        payload: { cartItemId, quantity },
      });
    }
  };

  const removeItem = (cartItemId: string) =>
    dispatch({ type: "REMOVE_FROM_CART", payload: cartItemId });

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
      dispatch({ type: "REMOVE_FROM_CART", payload: cartItemId });
      dispatch({
        type: "ADD_TO_CART",
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

  // Soumission commande - paiement à la livraison uniquement
  const handleOrderSubmit = async () => {
    if (state.cart.length === 0) {
      alert("Votre panier est vide.");
      return;
    }
    if (!firstName || !lastName || !phone || !address || !city) {
      alert("Veuillez remplir tous les champs obligatoires.");
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
      // Insertion dans orders2
      const { data: orderData, error: orderError } = await supabase
        .from("orders2")
        .insert([
          {
            first_name: firstName,
            last_name: lastName,
            phone,
            address: `${address}, ${city}, ${region || "Sénégal"}`,
            total,
            delivery_fee: shippingCost,
            is_paid: false, // paiement à la livraison
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (orderError || !orderData) {
        console.error("Erreur orders2:", orderError);
        alert(`Impossible de créer la commande: ${orderError?.message || "Erreur inconnue"}`);
        return;
      }

      // Insertion dans order_items2
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
        .from("order_items2")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Erreur order_items2:", itemsError);
        alert("Erreur lors de l'enregistrement des produits.");
        return;
      }

      dispatch({ type: "CLEAR_CART" });
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        window.location.href = "/";
      }, 3000);
    } catch (error: any) {
      console.error("Erreur inattendue:", error);
      alert("Une erreur inattendue est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Mon Panier ({state.cart.length} article
          {state.cart.length > 1 ? "s" : ""})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Liste des articles */}
          <div className="lg:col-span-2 space-y-6">
            {state.cart.map((item) => {
              const availableSizes = [
                ...new Set(
                  item.product.variants.filter((v) => v.stock > 0).map((v) => v.size)
                ),
              ];
              const availableColors = [
                ...new Set(
                  item.product.variants.filter((v) => v.stock > 0).map((v) => v.color)
                ),
              ];

              return (
                <div
                  key={item.cartItemId}
                  className="bg-white rounded-xl shadow-sm p-6"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={item.product.images?.[0] || "/placeholder.png"}
                        alt={item.product.name}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    </div>

                    <div className="flex-1 space-y-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {item.product.name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {item.product.description}
                      </p>
                      <p className="text-2xl font-bold text-blue-800 mt-2">
                        {formatPrice(item.product.price)}
                      </p>

                      {/* Variantes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Taille
                          </label>
                          <select
                            value={item.variant?.size || ""}
                            onChange={(e) =>
                              updateVariant(
                                item.cartItemId,
                                e.target.value,
                                item.variant?.color || ""
                              )
                            }
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            {availableSizes.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Couleur
                          </label>
                          <select
                            value={item.variant?.color || ""}
                            onChange={(e) =>
                              updateVariant(
                                item.cartItemId,
                                item.variant?.size || "",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            {availableColors.map((color) => (
                              <option key={color} value={color}>
                                {color}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Quantité */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium">Quantité:</span>
                          <div className="flex items-center border rounded-lg">
                            <button
                              onClick={() =>
                                updateQuantity(item.cartItemId, item.quantity - 1)
                              }
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-4 py-2 text-lg font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.cartItemId, item.quantity + 1)
                              }
                              disabled={
                                !!item.variant?.stock &&
                                item.quantity >= (item.variant.stock || 0)
                              }
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-sm text-gray-500">
                            (Stock: {item.variant?.stock ?? 0})
                          </span>
                        </div>

                        <button
                          onClick={() => removeItem(item.cartItemId)}
                          className="flex items-center text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Supprimer
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-semibold">
                          Sous-total: {formatPrice(item.product.price * item.quantity)}
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
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              <h3 className="text-xl font-semibold mb-6">Informations Client</h3>

              <div className="space-y-3 mb-6">
                <input type="text" placeholder="Prénom *" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
                <input type="text" placeholder="Nom *" value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
                <input type="tel" placeholder="Téléphone *" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
                <input type="email" placeholder="Email (optionnel)" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
                <input type="text" placeholder="Adresse *" value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
                <input type="text" placeholder="Ville *" value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
                <input type="text" placeholder="Région (optionnel)" value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>

              {/* Livraison */}
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-4">Livraison</h4>
                <div className="space-y-3">
                  {shippingOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`p-3 border rounded-lg cursor-pointer ${
                        selectedShipping.id === option.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedShipping(option)}
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{option.name}</div>
                          <div className="text-sm text-gray-500">
                            {option.estimatedDays} jours
                          </div>
                        </div>
                        <div className="font-semibold">
                          {formatPrice(option.price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Paiement - uniquement à la livraison */}
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-4">Mode de paiement</h4>
                <div className="p-3 border border-blue-500 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="font-medium">Paiement à la livraison (espèces)</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Vous payez à la réception de votre commande
                  </div>
                </div>
              </div>

              {/* Résumé */}
              <h3 className="text-xl font-semibold mb-6">Résumé de la commande</h3>
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>
                    Sous-total (
                    {state.cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                    article{state.cart.length > 1 ? "s" : ""})
                  </span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Livraison</span>
                  <span>{formatPrice(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-3">
                  <span>Total</span>
                  <span className="text-blue-800">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Bouton Commande */}
              <button
                onClick={async () => {
                  if (isLoading) return;
                  if (!firstName || !lastName || !phone || !address || !city) {
                    alert("Veuillez remplir toutes les informations client avant de continuer.");
                    return;
                  }
                  if (hasInvalidWholesale) {
                    alert(
                      "❗ Les produits en gros doivent être commandés avec une quantité d'au moins 15 unités."
                    );
                    return;
                  }
                  await handleOrderSubmit();
                }}
                className={`w-full bg-blue-800 text-white py-4 rounded-lg font-medium hover:bg-blue-900 mt-6 ${
                  isLoading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? "Enregistrement..." : "Passer la commande"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message confirmation */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center animate-bounce">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              Commande confirmée 🎉
            </h2>
            <p className="text-gray-600">
              Merci {firstName}, votre commande a bien été enregistrée.
            </p>
            <p className="text-gray-600">
              Un SMS de confirmation vous sera envoyé.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}