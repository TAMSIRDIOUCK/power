// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Petite sécurité pour vous aider à débugger si la variable est vide
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERREUR : Les variables d'environnement Supabase sont manquantes !");
  console.error("Vérifiez votre fichier .env à la racine du projet.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);