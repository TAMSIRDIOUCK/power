// src/components/vendor/AddProductForm.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Product, ProductVariant } from '../../types';

interface AddProductFormProps {
  onClose: () => void;
  productToEdit?: Product | null;
}

export default function AddProductForm({ onClose, productToEdit }: AddProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    images: [''],
    isWholesale: false,
    shippingPrice: '',
  });

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [variantStock, setVariantStock] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(false);

  const colors = [
    { name: "Rouge", hex: "#FF0000" },
    { name: "Bleu", hex: "#0000FF" },
    { name: "Vert", hex: "#008000" },
    { name: "Jaune", hex: "#FFFF00" },
    { name: "Noir", hex: "#000000" },
    { name: "Blanc", hex: "#FFFFFF" },
    { name: "Gris", hex: "#808080" },
    { name: "Rose", hex: "#FFC0CB" },
    { name: "Orange", hex: "#FFA500" },
    { name: "Violet", hex: "#800080" },
    { name: "Marron", hex: "#A52A2A" },
  ];

  // Catégorie fixe (invisible dans le formulaire)
  const DEFAULT_CATEGORY = "general";

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        description: productToEdit.description,
        price: productToEdit.price.toString(),
        images: productToEdit.images.length ? productToEdit.images : [''],
        isWholesale: productToEdit.isWholesale || false,
        shippingPrice: productToEdit.shippingPrice?.toString() || '',
      });

      // Récupérer les couleurs uniques depuis les variantes existantes (ignorer les tailles)
      const colorsFromVariants = [...new Set(productToEdit.variants.map(v => v.color).filter(Boolean))];
      setSelectedColors(colorsFromVariants);

      if (productToEdit.variants.length > 0) {
        setVariantStock(productToEdit.variants[0].stock);
      }
    }
  }, [productToEdit]);

  const uploadImage = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const filePath = `products2/${Date.now()}-${file.name}`;
        
        const { error } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (!error) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
          resolve(data.publicUrl);
        } else {
          console.warn('Upload Supabase échoué, utilisation du fallback base64:', error.message);
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Erreur de conversion en base64'));
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error('Erreur dans uploadImage:', err);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Impossible de traiter l\'image'));
        reader.readAsDataURL(file);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const uploadedImages = await Promise.all(
        formData.images
          .filter((img) => img.trim() !== '')
          .map(async (img, index) => {
            if (img.startsWith('http') || (img.startsWith('data:image') && !img.includes('blob:'))) {
              return img;
            }
            
            if (img.startsWith('blob:') || img.startsWith('data:image')) {
              try {
                const res = await fetch(img);
                const blob = await res.blob();
                const file = new File([blob], `image-${Date.now()}-${index}.png`, { type: blob.type || 'image/png' });
                return await uploadImage(file);
              } catch (err) {
                console.error(`Erreur pour l'image ${index}:`, err);
                return img;
              }
            }
            
            return img;
          })
      );

      const finalImages = uploadedImages.filter(Boolean) as string[];

      let variants: ProductVariant[] = [];

      if (selectedColors.length) {
        selectedColors.forEach((color, index) => {
          variants.push({
            id: `${Date.now()}-${index}-${Math.random()}`,
            size: '',      // Plus de taille
            color: color,
            stock: variantStock,
            sku: `${formData.name.substring(0, 3)}-${color}`.toUpperCase().replace(/\s/g, ''),
          });
        });
      } else {
        // Variante par défaut (aucune couleur sélectionnée)
        variants.push({
          id: `${Date.now()}-default`,
          size: 'Unique',
          color: 'Standard',
          stock: variantStock || 1,
          sku: `${formData.name.substring(0, 3)}-DEFAULT`.toUpperCase().replace(/\s/g, ''),
        });
      }

      const now = new Date();
      
      const supabaseData = {
        name: formData.name,
        description: formData.description,
        price: parseInt(formData.price),
        category: DEFAULT_CATEGORY,   // Catégorie fixe, non modifiable par l'utilisateur
        images: finalImages.length ? finalImages : ['https://placehold.co/600x400?text=No+Image'],
        variants: variants.map(v => ({
          size: v.size,
          color: v.color,
          stock: v.stock
        })),
        stock: variants.reduce((sum, v) => sum + v.stock, 0),
        created_at: productToEdit?.createdAt?.toISOString() || now.toISOString(),
        updated_at: now.toISOString(),
        is_wholesale: formData.isWholesale,
        shipping_price: formData.shippingPrice ? parseInt(formData.shippingPrice) : null,
      };

      let response;

      if (productToEdit) {
        response = await supabase
          .from('products2')
          .update(supabaseData)
          .eq('id', productToEdit.id)
          .select('*');
      } else {
        response = await supabase
          .from('products2')
          .insert([supabaseData])
          .select('*');
      }

      if (response.error) {
        alert(`Erreur Supabase : ${response.error.message}`);
        return;
      }

      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        onClose();
      }, 2000);

      if (!productToEdit) {
        setFormData({ name: '', description: '', price: '', images: [''], isWholesale: false, shippingPrice: '' });
        setSelectedColors([]);
        setVariantStock(0);
      }

    } catch (err) {
      console.error('Erreur complète:', err);
      alert('Erreur lors de l’opération. Vérifiez la console pour plus de détails.');
    } finally {
      setLoading(false);
    }
  };

  const addImage = () =>
    setFormData({ ...formData, images: [...formData.images, ''] });

  const updateImage = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({ ...formData, images: newImages });
  };

  const removeImage = (index: number) =>
    setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });

  const toggleColor = (color: string) =>
    selectedColors.includes(color)
      ? setSelectedColors(selectedColors.filter(c => c !== color))
      : setSelectedColors([...selectedColors, color]);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center mb-6 sm:mb-8">
          <button
            onClick={onClose}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour au tableau de bord
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">
            {productToEdit ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Nom du produit */}
            <div>
              <label className="text-sm font-medium text-gray-700">Nom du produit *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700">Description *</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                rows={4}
              />
            </div>

            {/* Prix et livraison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Prix (F CFA) *</label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Frais de livraison (F CFA)</label>
                <input
                  type="number"
                  value={formData.shippingPrice}
                  onChange={(e) => setFormData({ ...formData, shippingPrice: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Vente en gros */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isWholesale"
                checked={formData.isWholesale}
                onChange={(e) => setFormData({ ...formData, isWholesale: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <label htmlFor="isWholesale" className="text-sm font-medium text-gray-700">
                Produit en gros (vente par lot)
              </label>
            </div>

            {/* Images */}
            <div>
              <label className="text-sm font-medium text-gray-700">Images du produit *</label>
              <div className="space-y-3 mt-2">
                {formData.images.map((img, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => updateImage(index, reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    {img && (
                      <img src={img} alt="Preview" className="w-20 h-20 object-cover rounded-lg border" />
                    )}
                    {formData.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addImage}
                  className="flex items-center text-blue-600 hover:underline"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une image
                </button>
              </div>
            </div>

            {/* Variantes : uniquement les couleurs (plus de tailles) */}
            <div>
              <label className="text-sm font-medium text-gray-700">Variantes (couleurs) *</label>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700">Couleurs disponibles</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {colors.map((c) => (
                    <label key={c.name} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedColors.includes(c.name)}
                        onChange={() => toggleColor(c.name)}
                        className="form-checkbox h-4 w-4"
                        style={{ accentColor: c.hex }}
                      />
                      <span className="flex items-center space-x-1">
                        <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.hex }}></span>
                        <span>{c.name}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700">Stock global pour toutes les couleurs sélectionnées</p>
                <input
                  type="number"
                  value={variantStock}
                  min={0}
                  onChange={(e) => setVariantStock(parseInt(e.target.value) || 0)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg mt-1"
                />
              </div>
            </div>

            {/* Boutons */}
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-50"
              >
                {loading ? 'En cours...' : (productToEdit ? 'Modifier' : 'Ajouter')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showSuccessMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50">
          <CheckCircle2 className="w-5 h-5" />
          <span>Produit {productToEdit ? 'modifié' : 'ajouté'} avec succès !</span>
        </div>
      )}
    </div>
  );
}