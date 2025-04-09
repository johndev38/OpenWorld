"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENEMENTS_PROBABILITE = exports.EVENEMENTS_INTERVALLE = exports.OLLAMA_API_URL = exports.IA_MODE = exports.OPENAI_API_KEY = void 0;
// Configuration pour les APIs externes
const dotenv_1 = __importDefault(require("dotenv"));
// Charger les variables d'environnement du fichier .env
dotenv_1.default.config();
// Récupérer la clé API OpenAI depuis les variables d'environnement
exports.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
// Mode IA: "openai" pour utiliser l'API OpenAI ou "local" pour utiliser Mistral 7B local via Ollama
exports.IA_MODE = process.env.IA_MODE || 'openai';
// URL de l'API Ollama (pour le mode local)
exports.OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
// Configuration des événements aléatoires
exports.EVENEMENTS_INTERVALLE = parseInt(process.env.EVENEMENTS_INTERVALLE || '3', 10);
exports.EVENEMENTS_PROBABILITE = parseInt(process.env.EVENEMENTS_PROBABILITE || '75', 10);
// Vérifier si la clé API est définie
if (exports.IA_MODE === 'openai' && !exports.OPENAI_API_KEY) {
    console.warn('⚠️ La clé API OpenAI n\'est pas définie dans le fichier .env');
}
