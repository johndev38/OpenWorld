// Configuration pour les APIs externes
import dotenv from 'dotenv';

// Charger les variables d'environnement du fichier .env
dotenv.config();

// Récupérer la clé API OpenAI depuis les variables d'environnement
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Mode IA: "openai" pour utiliser l'API OpenAI ou "local" pour utiliser Mistral 7B local via Ollama
export const IA_MODE = process.env.IA_MODE || 'openai';

// URL de l'API Ollama (pour le mode local)
export const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';

// Configuration des événements aléatoires
export const EVENEMENTS_INTERVALLE = parseInt(process.env.EVENEMENTS_INTERVALLE || '3', 10);
export const EVENEMENTS_PROBABILITE = parseInt(process.env.EVENEMENTS_PROBABILITE || '75', 10);

// Vérifier si la clé API est définie
if (IA_MODE === 'openai' && !OPENAI_API_KEY) {
  console.warn('⚠️ La clé API OpenAI n\'est pas définie dans le fichier .env');
} 