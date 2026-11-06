// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// 🔍 LIGNE DE DÉBOGAGE (visible dans la console du navigateur)
console.log('--- DEBUG ENV ---');
console.log('URL lue par Vite :', import.meta.env.VITE_SUPABASE_URL);
console.log('KEY lue par Vite :', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'PRÉSENTE' : 'MANQUANTE');
console.log('-----------------');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERREUR : Les variables d'environnement Supabase sont manquantes !");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
