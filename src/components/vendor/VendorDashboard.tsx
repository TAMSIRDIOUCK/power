// src/components/vendor/VendorDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Package, ShoppingCart, TrendingUp, Plus, Tag,
  Trash2, Pencil, ChevronDown, ChevronUp, CheckCircle, Clock, Truck, XCircle,
  Wallet, ArrowDownToLine
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import AddProductForm from './AddProductForm';
import { Product } from '../../types';
import { convertSupabaseProductToProduct } from '../../context/AppContext';

interface OrderItem {
  id: string;
  quantity: number;
  variant_color?: string | null;
  variant_size?: string | null;
  product_image?: string | null;
  product_name: string;
  product_price: number;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  is_paid: boolean;
  paid_at?: string | null;
  status: string;
  payment_method?: string | null;
  order_items: OrderItem[];
}

const PAYDUNYA_FEE_PERCENT = 0.02;
const MIN_PAYOUT_AMOUNT = 500;

// 👇 SEULEMENT WAVE ET ORANGE MONEY 👇
const PAYOUT_MODES = [
  { value: 'orange-money-senegal', label: 'Orange Money' },
  { value: 'wave-senegal', label: 'Wave' },
];

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat('fr-FR').format(price)} F CFA`;

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente', color: 'bg-amber-100 text-amber-700',  icon: <Clock size={12} /> },
  shipped:   { label: 'Expédiée',   color: 'bg-blue-100 text-blue-700',    icon: <Truck size={12} /> },
  delivered: { label: 'Livrée',     color: 'bg-green-100 text-green-700',  icon: <CheckCircle size={12} /> },
  cancelled: { label: 'Annulée',    color: 'bg-red-100 text-red-700',      icon: <XCircle size={12} /> },
};

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products'>('overview');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // États pour le retrait
  const [withdrawPhone, setWithdrawPhone] = useState('778677650');
  const [withdrawMode, setWithdrawMode] = useState('orange-money-senegal');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products2')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setProducts((data || []).map(p => convertSupabaseProductToProduct(p)));
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from('orders2')
      .select(`
        id, created_at, total, first_name, last_name,
        phone, address, is_paid, paid_at, status,
        payment_method,
        order_items:order_items2 (
          id, quantity, variant_color, variant_size,
          product_image, product_name, product_price
        )
      `)
      .order('created_at', { ascending: false });

    if (error) { console.error(error); setLoadingOrders(false); return; }

    const formatted: Order[] = (data || []).map((o: any) => ({
      id: o.id,
      created_at: o.created_at,
      total: Number(o.total) || 0,
      first_name: o.first_name || '',
      last_name: o.last_name || '',
      phone: o.phone || '',
      address: o.address || '',
      is_paid: o.is_paid || false,
      paid_at: o.paid_at,
      status: o.status || 'pending',
      payment_method: o.payment_method || null,
      order_items: o.order_items || [],
    }));

    setOrders(formatted);
    setLoadingOrders(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders2')
      .update({ status })
      .eq('id', orderId);
    if (error) { console.error(error); return; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const togglePaid = async (orderId: string, currentPaid: boolean) => {
    const updates = {
      is_paid: !currentPaid,
      paid_at: !currentPaid ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from('orders2').update(updates).eq('id', orderId);
    if (error) { console.error(error); return; }
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, ...updates } : o
    ));
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setShowAddProduct(true);
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce produit ?')) return;
    const { error } = await supabase.from('products2').delete().eq('id', productId);
    if (error) { console.error(error); return; }
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const getTotalStock = (product: Product) =>
    product.variants.reduce((sum, v) => sum + v.stock, 0);

  const onlinePaidOrders = orders.filter(o => o.is_paid && o.payment_method === 'online');
  const totalOnlineBrut = onlinePaidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOnlineFees = totalOnlineBrut * PAYDUNYA_FEE_PERCENT;
  const totalOnlineNet = totalOnlineBrut - totalOnlineFees;

  const codPaidOrders = orders.filter(o => o.is_paid && o.payment_method === 'cod');
  const totalCod = codPaidOrders.reduce((sum, o) => sum + o.total, 0);

  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    totalOnlineNet,
    totalOnlineBrut,
    totalOnlineFees,
    totalCod,
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const handleWithdraw = async () => {
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const amount = Math.round(totalOnlineNet);
    const account = withdrawPhone.replace(/\D/g, '');

    if (!amount || amount < MIN_PAYOUT_AMOUNT) {
      setWithdrawError(`Le montant minimum de retrait est ${MIN_PAYOUT_AMOUNT} CFA`);
      return;
    }
    if (!/^\d{6,12}$/.test(account)) {
      setWithdrawError('Numéro de compte invalide (sans indicatif pays)');
      return;
    }

    setIsWithdrawing(true);

    try {
      // 👇 APPEL À LA FONCTION QUI EXISTE "paydunya-payout" 👇
      const { data, error } = await supabase.functions.invoke('paydunya-payout', {
        body: {
          amount: amount,
          phone: account,              // 👈 Paramètre attendu par paydunya-payout
          withdraw_mode: withdrawMode, // 👈 Paramètre attendu par paydunya-payout
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setWithdrawSuccess(`✅ ${amount.toLocaleString()} CFA envoyés avec succès !`);
      fetchOrders();

    } catch (err: any) {
      console.error("Erreur retrait:", err);
      
      if (err.message?.includes('Failed to send') || err.name === 'FunctionsFetchError') {
        setWithdrawError(`❌ Impossible de joindre la fonction "paydunya-payout".\nVérifiez sur Supabase qu'elle existe et qu'elle est déployée.`);
      } else {
        setWithdrawError(err.message || "Impossible d'effectuer le transfert.");
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (showAddProduct) {
    return (
      <AddProductForm
        productToEdit={editingProduct}
        onClose={() => {
          setShowAddProduct(false);
          setEditingProduct(null);
          fetchProducts();
        }}
      />
    );
  }

  const tabs = [
    { key: 'overview', label: "Vue d'ensemble" },
    { key: 'orders',   label: 'Commandes', badge: stats.pendingOrders },
    { key: 'products', label: 'Produits' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-black">Tableau de Bord</h1>

        <div className="mb-6 flex gap-4 sm:gap-6 border-b overflow-x-auto whitespace-nowrap">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2 flex items-center gap-2 text-sm sm:text-base ${
                activeTab === tab.key
                  ? 'border-b-2 border-black text-black font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {'badge' in tab && tab.badge > 0 && (
                <span className="bg-black text-white text-[10px] sm:text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              <StatCard title="Produits"         value={stats.totalProducts}          icon={Package}      />
              <StatCard title="Commandes"         value={stats.totalOrders}            icon={ShoppingCart} />
              <StatCard title="Catégories"        value={[...new Set(products.map(p => p.category))].length}  icon={Tag}          />
              <StatCard title="En attente"        value={stats.pendingOrders}          icon={Clock}        />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-black flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-black" /> Paiements en ligne
                  </h2>
                  <span className="text-[10px] sm:text-xs font-semibold bg-gray-100 text-black px-2 py-1 rounded">PayDunya</span>
                </div>
                <div className="space-y-2 text-xs sm:text-sm mb-4">
                  <div className="flex justify-between text-gray-500">
                    <span>Chiffre d'affaires brut</span>
                    <span>{formatPrice(stats.totalOnlineBrut)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Frais PayDunya ({(PAYDUNYA_FEE_PERCENT * 100).toFixed(0)}%)</span>
                    <span>-{formatPrice(stats.totalOnlineFees)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg sm:text-xl text-black border-t border-gray-200 pt-2 mt-2">
                    <span>Net à récupérer</span>
                    <span>{formatPrice(stats.totalOnlineNet)}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4 border-t border-gray-100 pt-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Mode de retrait</label>
                    <select
                      value={withdrawMode}
                      onChange={(e) => setWithdrawMode(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {PAYOUT_MODES.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Numéro de retrait (sans indicatif)</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="771234567"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>

                {withdrawError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 flex items-start gap-2 text-xs mb-3">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-words whitespace-pre-line">{withdrawError}</span>
                  </div>
                )}
                {withdrawSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-2.5 flex items-center gap-2 text-xs mb-3">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="break-words">{withdrawSuccess}</span>
                  </div>
                )}

                <button
                  onClick={handleWithdraw}
                  disabled={stats.totalOnlineNet <= 0 || isWithdrawing}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-lg font-bold transition-colors text-sm sm:text-base ${
                    stats.totalOnlineNet <= 0 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  <ArrowDownToLine className="w-5 h-5" />
                  {isWithdrawing ? 'Traitement...' : 'Récupérer mon argent'}
                </button>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-xl shadow border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-black flex items-center gap-2">
                    <Truck className="w-5 h-5 text-black" /> Paiement à la livraison
                  </h2>
                  <span className="text-[10px] sm:text-xs font-semibold bg-gray-100 text-black px-2 py-1 rounded">Espèces</span>
                </div>
                <div className="flex flex-col justify-center py-6 sm:h-[120px]">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Total encaissé en espèces</p>
                  <p className="text-2xl sm:text-3xl font-black text-black">{formatPrice(stats.totalCod)}</p>
                </div>
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs sm:text-sm text-gray-600">
                  💡 Cet argent est encaissé directement par le livreur.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {['all', 'pending', 'shipped', 'delivered', 'cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-colors ${
                    statusFilter === s
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-black'
                  }`}
                >
                  {s === 'all' ? 'Toutes' : STATUS_CONFIG[s]?.label ?? s}
                </button>
              ))}
            </div>

            {loadingOrders ? (
              <p className="text-center py-12 text-gray-400">Chargement des commandes…</p>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center py-12 text-gray-400">Aucune commande trouvée.</p>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => {
                  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['pending'];
                  const isExpanded = expandedOrder === order.id;
                  const customerName = `${order.first_name} ${order.last_name}`.trim() || '—';
                  const isOnline = order.payment_method === 'online';

                  return (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                        
                        <div className="flex-1 min-w-0 flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{customerName}</p>
                            <p className="text-xs text-gray-400">{order.phone}</p>
                          </div>
                          <div className="text-right sm:hidden">
                             <p className="font-bold text-gray-800 text-sm">{formatPrice(order.total)}</p>
                             <p className="text-[10px] text-gray-500">{formatDate(order.created_at)}</p>
                          </div>
                        </div>

                        <div className="hidden sm:block text-sm text-gray-500 w-28 shrink-0">
                          {formatDate(order.created_at)}
                        </div>

                        <div className="hidden sm:block text-sm text-gray-500 w-20 shrink-0">
                          {order.order_items.length} art.
                        </div>

                        <div className="hidden sm:block font-bold text-gray-800 w-28 shrink-0">
                          {formatPrice(order.total)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${
                            isOnline 
                              ? 'bg-black text-white border-black' 
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {isOnline ? <Wallet size={12} /> : <Truck size={12} />}
                            {isOnline ? 'En ligne' : 'À la livraison'}
                          </span>

                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium ${statusCfg.color}`}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>

                          <button
                            onClick={e => { e.stopPropagation(); togglePaid(order.id, order.is_paid); }}
                            className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border transition-colors ${
                              order.is_paid
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                          >
                            {order.is_paid ? '✓ Payée' : 'Non payée'}
                          </button>
                        </div>

                        <div className="hidden sm:block text-gray-400 shrink-0">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        
                        <div className="flex justify-center sm:hidden mt-2 text-gray-400">
                           {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-gray-50 px-4 py-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Adresse</p>
                              <p className="text-gray-700">{order.address || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Téléphone</p>
                              <p className="text-gray-700">{order.phone || '—'}</p>
                            </div>
                            {order.is_paid && order.paid_at && (
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Payée le</p>
                                <p className="text-gray-700">{formatDate(order.paid_at)}</p>
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Articles
                            </p>
                            <div className="space-y-2">
                              {order.order_items.map(item => (
                                <div
                                  key={item.id}
                                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white rounded-lg p-2 sm:px-3 border"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {item.product_image ? (
                                      <img
                                        src={item.product_image}
                                        alt={item.product_name}
                                        className="w-10 h-10 rounded object-cover border shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center shrink-0">
                                        <Package size={16} className="text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-800 text-sm truncate">{item.product_name}</p>
                                      <p className="text-[10px] sm:text-xs text-gray-400">
                                        {[item.variant_color, item.variant_size].filter(Boolean).join(' · ')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex justify-between sm:block text-right mt-1 sm:mt-0">
                                    <p className="text-xs text-gray-500">x{item.quantity}</p>
                                    <p className="text-sm font-semibold text-gray-700">
                                      {formatPrice(item.product_price * item.quantity)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <div className="text-sm space-y-1 w-full sm:w-56">
                              <div className="flex justify-between text-gray-500">
                                <span>Sous-total</span>
                                <span>{formatPrice(order.total)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-black border-t pt-1">
                                <span>Total</span>
                                <span>{formatPrice(order.total)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2 border-t sm:border-0">
                            <label className="text-sm text-gray-500">Statut :</label>
                            <select
                              value={order.status}
                              onChange={e => updateOrderStatus(order.id, e.target.value)}
                              className="w-full sm:w-auto text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-black"
                            >
                              <option value="pending">En attente</option>
                              <option value="shipped">Expédiée</option>
                              <option value="delivered">Livrée</option>
                              <option value="cancelled">Annulée</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-black">Gestion des Produits</h2>
              <button
                onClick={() => { setEditingProduct(null); setShowAddProduct(true); }}
                className="w-full sm:w-auto bg-black text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 text-sm"
              >
                <Plus size={18} /> Ajouter un produit
              </button>
            </div>

            <div className="bg-white rounded-xl shadow border overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm text-black">Produit</th>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm text-black">Catégorie</th>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm text-black">Prix</th>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm text-black">Stock</th>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm text-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => {
                    const totalStock = getTotalStock(product);
                    return (
                      <tr key={product.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {product.images?.[0] && (
                              <img src={product.images[0]} className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover border" alt={product.name} />
                            )}
                            <span className="font-medium text-black text-sm truncate max-w-[120px] sm:max-w-xs">{product.name}</span>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 text-gray-500 text-xs sm:text-sm">{product.category}</td>
                        <td className="p-3 sm:p-4 font-medium text-black text-xs sm:text-sm">{formatPrice(product.price)}</td>
                        <td className={`p-3 sm:p-4 font-semibold text-xs sm:text-sm ${totalStock < 10 ? 'text-red-600' : 'text-black'}`}>
                          {totalStock}
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                            <button
                              onClick={() => editProduct(product)}
                              className="text-gray-600 flex items-center gap-1 hover:text-black text-xs sm:text-sm"
                            >
                              <Pencil size={14} /> Modifier
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="text-red-500 flex items-center gap-1 hover:text-red-700 text-xs sm:text-sm"
                            >
                              <Trash2 size={14} /> Suppr.
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) {
  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
      <div>
        <p className="text-[10px] sm:text-sm text-gray-500 uppercase sm:normal-case">{title}</p>
        <p className="text-lg sm:text-xl font-bold text-black">{value}</p>
      </div>
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
    </div>
  );
}