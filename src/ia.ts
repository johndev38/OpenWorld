import axios from 'axios';
import { PNJ } from './types';
import { OPENAI_API_KEY, IA_MODE, OLLAMA_API_URL } from './config';

/**
 * Fonction utilitaire pour appeler l'API OpenAI
 */
async function appelOpenAI(messages: any[], model: string = "gpt-3.5-turbo", maxTokens: number = 250, temperature: number = 0.7): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API OpenAI:", error);
    throw error;
  }
}

/**
 * Fonction utilitaire pour appeler l'API Ollama avec Mistral 7B
 */
async function appelOllama(prompt: string, system: string, maxTokens: number = 250): Promise<string> {
  try {
    const response = await axios.post(
      OLLAMA_API_URL,
      {
        model: "mistral:7b-instruct",
        prompt: `<s>[INST] ${system} ${prompt} [/INST]`,
        stream: false,
        options: {
          num_predict: maxTokens
        }
      }
    );
    
    return response.data.response.trim();
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Ollama:", error);
    throw error;
  }
}

/**
 * Fonction générique pour appeler le LLM selon le mode choisi
 */
async function appelLLM(messages: any[], maxTokens: number = 250, temperature: number = 0.7): Promise<string> {
  if (IA_MODE === 'openai') {
    return appelOpenAI(messages, "gpt-3.5-turbo", maxTokens, temperature);
  } else {
    // Pour Ollama, on extrait le contenu des messages pour créer un prompt
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessage = messages.find(m => m.role === 'user')?.content || '';
    return appelOllama(userMessage, systemMessage, maxTokens);
  }
}

// Fonction pour générer un dialogue entre deux PNJ
export async function genererDialogue(pnj1: PNJ, pnj2: PNJ): Promise<string> {
  console.log("Fonction de dialogue appelée entre", pnj1.nom, "et", pnj2.nom);
  
  try {
    const messages = [
      {
        role: "system",
        content: `Tu es un générateur de dialogues réalistes entre personnages fictifs. 
        Crée un dialogue naturel et intéressant entre les deux personnages décrits ci-dessous.
        Le dialogue doit refléter leur personnalité, leur profession et leur état actuel.
        Reste concis, environ 4-6 répliques au total (2-3 par personnage).`
      },
      {
        role: "user",
        content: `Génère un dialogue entre ces deux personnages:
        
        Personnage 1:
        - Nom: ${pnj1.nom}
        - Profession: ${pnj1.profession}
        - Personnalité: ${pnj1.personnalite}
        - État actuel: ${pnj1.etatActuel}
        
        Personnage 2:
        - Nom: ${pnj2.nom}
        - Profession: ${pnj2.profession}
        - Personnalité: ${pnj2.personnalite}
        - État actuel: ${pnj2.etatActuel}
        
        Format souhaité: dialogue direct avec prénom suivi de deux points.
        Exemple:
        Jean: Bonjour Marie, comment vas-tu aujourd'hui?
        Marie: Très bien Jean, merci de demander!`
      }
    ];
    
    return await appelLLM(messages, 250, 0.7);
  } catch (error) {
    console.error("Erreur lors de la génération du dialogue:", error);
    // Fallback en cas d'erreur
    return `${pnj1.nom}: Bonjour ${pnj2.nom}, comment vas-tu aujourd'hui?\n${pnj2.nom}: Très bien ${pnj1.nom}, merci de demander!`;
  }
}

// Fonction pour générer un background pour un PNJ
export async function genererBackground(pnj: Partial<PNJ>, contexte: { monde?: string; epoque?: string; } = {}): Promise<string> {
  const monde = contexte.monde || 'contemporain';
  const epoque = contexte.epoque || '';
  
  try {
    const messages = [
      {
        role: "system",
        content: `Tu es un créateur d'histoires de fond (background) pour personnages fictifs.
        Ton objectif est de créer une histoire de fond cohérente, concise mais riche pour un personnage.`
      },
      {
        role: "user",
        content: `Génère une histoire de fond (background) concise mais riche pour un personnage avec les caractéristiques suivantes:
        - Nom: ${pnj.nom}
        - Âge: ${pnj.age} ans
        - Profession: ${pnj.profession}
        - Personnalité: ${pnj.personnalite}
        - Monde: ${monde}
        ${epoque ? `- Époque: ${epoque}` : ''}
        
        L'histoire doit inclure:
        1. Origines et famille
        2. Un événement marquant dans sa jeunesse
        3. Comment il/elle est arrivé(e) à exercer sa profession
        4. Une particularité ou habitude qui le/la caractérise
        
        Limite-toi à un paragraphe de 5-7 phrases.`
      }
    ];
    
    return await appelLLM(messages, 300, 0.7);
  } catch (error) {
    console.error("Erreur lors de la génération du background:", error);
    // Fallback en cas d'erreur
    return `${pnj.nom} est un(e) ${pnj.profession} de ${pnj.age} ans avec une personnalité ${pnj.personnalite}. Les détails de son passé restent mystérieux.`;
  }
}

// Fonction pour générer des traits de personnalité aléatoires
export function genererTraitsPersonnalite(): string {
  const traits = [
    'ambitieux', 'optimiste', 'pessimiste', 'introverti', 'extraverti', 
    'créatif', 'analytique', 'organisé', 'spontané', 'prudent', 
    'aventureux', 'loyal', 'curieux', 'pragmatique', 'idéaliste',
    'patient', 'impatient', 'perfectionniste', 'décontracté', 'sensible',
    'rationnel', 'empathique', 'réservé', 'bavard', 'discipliné',
    'chaotique', 'généreux', 'égoïste', 'attentionné', 'indépendant'
  ];
  
  // Sélectionner 2 à 3 traits aléatoires
  const nbTraits = Math.floor(Math.random() * 2) + 2; // 2 ou 3 traits
  const traitsSelectionnes = [];
  
  for (let i = 0; i < nbTraits; i++) {
    const index = Math.floor(Math.random() * traits.length);
    traitsSelectionnes.push(traits[index]);
    traits.splice(index, 1); // Éviter les duplications
  }
  
  return traitsSelectionnes.join(', ');
}

// Fonction pour générer des noms aléatoires
export function genererNomAleatoire(): string {
  const prenoms = [
    'Thomas', 'Julie', 'Antoine', 'Sophie', 'Luc', 'Camille', 'Paul', 'Emma',
    'Nicolas', 'Léa', 'Pierre', 'Marie', 'Jean', 'Élodie', 'Michel', 'Claire',
    'David', 'Émilie', 'Alexandre', 'Laura', 'Maxime', 'Sarah', 'Julien', 'Charlotte'
  ];
  
  const noms = [
    'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
    'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
    'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefevre'
  ];
  
  const prenom = prenoms[Math.floor(Math.random() * prenoms.length)];
  const nom = noms[Math.floor(Math.random() * noms.length)];
  
  return `${prenom} ${nom}`;
}

// Fonction pour analyser et suggérer des professions appropriées selon le contexte
export async function analyserEtSuggererProfessions(contexte: { monde?: string; epoque?: string; } = {}): Promise<string[]> {
  const monde = contexte.monde || 'contemporain';
  const epoque = contexte.epoque || '';
  
  try {
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en création de personnages pour des univers fictifs. 
        Tu dois fournir des suggestions de professions cohérentes avec le monde et l'époque donnés.`
      },
      {
        role: "user",
        content: `Propose une liste de 10 professions qui seraient réalistes et intéressantes pour des personnages évoluant dans:
        - Monde: ${monde}
        ${epoque ? `- Époque: ${epoque}` : ''}
        
        Réponds uniquement avec la liste des professions, une par ligne, sans numérotation ni préambule.`
      }
    ];
    
    const content = await appelLLM(messages, 200, 0.7);
    
    // Traiter la réponse pour obtenir un tableau de professions
    return content.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
  } catch (error) {
    console.error("Erreur lors de la génération des professions:", error);
    // Professions par défaut en cas d'erreur
    return [
      'médecin', 'enseignant', 'boulanger', 'agriculteur', 'commerçant',
      'artisan', 'fonctionnaire', 'ingénieur', 'artiste', 'ouvrier'
    ];
  }
} 