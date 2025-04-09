import axios from 'axios';
import { PNJ, Environnement } from './types';
import { OPENAI_API_KEY, IA_MODE, OLLAMA_API_URL } from './config';

// Types d'événements possibles
export type TypeEvenement = 
  'mariage' | 
  'deces' | 
  'accident' | 
  'rencontre' | 
  'dispute' | 
  'catastrophe' | 
  'festival' | 
  'promotion' | 
  'decouverte' | 
  'anniversaire';

// Interface pour un événement
export interface Evenement {
  id: string;
  type: TypeEvenement;
  description: string;
  pnjsImpliques: string[]; // IDs des PNJ impliqués
  timestampDebut: number;
  duree: number; // en minutes
  impactEmotionnel: {
    [key: string]: number; // ID du PNJ => impact sur son état émotionnel (-100 à 100)
  };
  impactBesoins: {
    [key: string]: { // ID du PNJ
      [besoin: string]: number; // Nom du besoin => impact (-100 à 100)
    };
  };
  resultat?: string; // Description de l'issue de l'événement
  actif: boolean;
}

// Liste des événements en cours
let evenementsActifs: Evenement[] = [];

/**
 * Fonction utilitaire pour appeler l'API d'IA en fonction du mode configuré
 */
async function appelLLM(messages: any[], maxTokens: number = 250): Promise<string> {
  if (IA_MODE === 'openai') {
    // Appel à OpenAI
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-3.5-turbo",
          messages,
          temperature: 0.8,
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
  } else {
    // Appel à Ollama (Mistral 7B)
    try {
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessage = messages.find(m => m.role === 'user')?.content || '';
      
      const response = await axios.post(
        OLLAMA_API_URL,
        {
          model: "mistral:7b-instruct",
          prompt: `<s>[INST] ${systemMessage} ${userMessage} [/INST]`,
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
}

/**
 * Génère un événement aléatoire basé sur le contexte actuel
 */
export async function genererEvenementAleatoire(
  pnjs: PNJ[], 
  environnement: Environnement
): Promise<Evenement | null> {
  if (pnjs.length === 0) {
    console.log("Aucun PNJ disponible pour générer un événement");
    return null;
  }

  try {
    // Extraire des informations sur quelques PNJ pour le contexte
    const pnjsContexte = pnjs.slice(0, Math.min(pnjs.length, 5)).map(pnj => ({
      id: pnj.id,
      nom: pnj.nom,
      age: pnj.age,
      profession: pnj.profession,
      personnalite: pnj.personnalite,
      etat: pnj.etatActuel
    }));

    // Créer le prompt pour l'IA
    const messages = [
      {
        role: "system",
        content: `Tu es un générateur d'événements narratifs pour une simulation de vie. 
        Tu dois créer un événement aléatoire réaliste qui va affecter un ou plusieurs personnages.
        L'événement doit être cohérent avec le contexte actuel et les personnages impliqués.
        Réponds uniquement avec un objet JSON valide sans commentaires ni explications.`
      },
      {
        role: "user",
        content: `Génère un événement aléatoire (mariage, décès, accident, rencontre, dispute, catastrophe, festival, promotion, découverte, anniversaire) qui pourrait se produire dans cet environnement:
        
        Heure: ${environnement.heure}h${environnement.minute}
        Jour: ${environnement.jour}
        Météo: ${environnement.meteo}
        
        Personnages disponibles:
        ${JSON.stringify(pnjsContexte, null, 2)}
        
        Réponds avec un objet JSON au format suivant:
        {
          "type": "type_evenement",
          "description": "Description détaillée de l'événement",
          "pnjsImpliques": ["id1", "id2"], 
          "duree": duree_en_minutes,
          "impactEmotionnel": {
            "id1": impact_de_-100_a_100,
            "id2": impact_de_-100_a_100
          },
          "impactBesoins": {
            "id1": {
              "faim": impact_de_-100_a_100,
              "social": impact_de_-100_a_100,
              "sommeil": impact_de_-100_a_100,
              "energie": impact_de_-100_a_100,
              "divertissement": impact_de_-100_a_100
            },
            "id2": {
              ...
            }
          }
        }`
      }
    ];

    const resultat = await appelLLM(messages, 800);
    
    try {
      const evenementJson = JSON.parse(resultat);
      
      // Créer l'événement avec un ID unique
      const evenement: Evenement = {
        id: `evt_${Date.now()}`,
        type: evenementJson.type as TypeEvenement,
        description: evenementJson.description,
        pnjsImpliques: evenementJson.pnjsImpliques,
        timestampDebut: Date.now(),
        duree: evenementJson.duree,
        impactEmotionnel: evenementJson.impactEmotionnel || {},
        impactBesoins: evenementJson.impactBesoins || {},
        actif: true
      };
      
      console.log(`Nouvel événement généré: ${evenement.type} - ${evenement.description}`);
      return evenement;
    } catch (e) {
      console.error("Erreur lors du parsing du JSON de l'événement:", e);
      console.error("Réponse brute:", resultat);
      return null;
    }
  } catch (error) {
    console.error("Erreur lors de la génération d'un événement aléatoire:", error);
    return null;
  }
}

/**
 * Génère la description de l'issue d'un événement
 */
export async function genererResolutionEvenement(
  evenement: Evenement, 
  pnjs: PNJ[]
): Promise<string> {
  try {
    // Récupérer les PNJ impliqués
    const pnjsImpliques = pnjs.filter(pnj => evenement.pnjsImpliques.includes(pnj.id));
    
    // Créer le prompt pour l'IA
    const messages = [
      {
        role: "system",
        content: `Tu es un narrateur qui résout des événements dans une simulation de vie.
        Tu dois générer une conclusion réaliste et cohérente pour l'événement décrit.`
      },
      {
        role: "user",
        content: `Voici la description d'un événement qui s'est produit:
        
        Type d'événement: ${evenement.type}
        Description: ${evenement.description}
        Personnages impliqués: ${pnjsImpliques.map(p => `${p.nom} (${p.profession}, ${p.personnalite})`).join(', ')}
        
        Génère une conclusion réaliste et détaillée pour cet événement en 3-5 phrases.
        Décris comment cet événement s'est terminé et quelles en sont les conséquences pour les personnages impliqués.`
      }
    ];

    const resultat = await appelLLM(messages, 400);
    return resultat;
  } catch (error) {
    console.error("Erreur lors de la génération de la résolution d'un événement:", error);
    return "L'événement s'est terminé sans conséquences particulières.";
  }
}

/**
 * Ajoute un événement à la liste des événements actifs
 */
export function ajouterEvenement(evenement: Evenement): void {
  evenementsActifs.push(evenement);
}

/**
 * Obtient la liste des événements actifs
 */
export function getEvenementsActifs(): Evenement[] {
  return [...evenementsActifs];
}

/**
 * Termine un événement et génère sa résolution
 */
export async function terminerEvenement(
  evenementId: string, 
  pnjs: PNJ[]
): Promise<Evenement | null> {
  const index = evenementsActifs.findIndex(e => e.id === evenementId);
  if (index === -1) {
    return null;
  }
  
  const evenement = evenementsActifs[index];
  evenement.actif = false;
  
  // Générer une résolution pour l'événement
  evenement.resultat = await genererResolutionEvenement(evenement, pnjs);
  
  // Retirer l'événement de la liste des actifs
  evenementsActifs.splice(index, 1);
  
  return evenement;
}

/**
 * Met à jour les PNJ en fonction des événements actifs
 */
export function appliquerEvenementsAuxPNJ(pnjs: PNJ[]): void {
  // Pour chaque événement actif
  for (const evenement of evenementsActifs) {
    // Vérifier si l'événement est toujours actif (durée non écoulée)
    const tempsEcoule = Date.now() - evenement.timestampDebut;
    const dureeMs = evenement.duree * 60 * 1000;
    
    if (tempsEcoule > dureeMs) {
      // L'événement est terminé, le marquer comme inactif
      evenement.actif = false;
      continue;
    }
    
    // Pour chaque PNJ impliqué dans l'événement
    for (const pnjId of evenement.pnjsImpliques) {
      const pnj = pnjs.find(p => p.id === pnjId);
      if (!pnj) continue;
      
      // Appliquer les impacts sur les besoins
      if (evenement.impactBesoins[pnjId]) {
        const impactBesoins = evenement.impactBesoins[pnjId];
        
        for (const [besoin, impact] of Object.entries(impactBesoins)) {
          // S'assurer que le besoin existe
          if (besoin in pnj.besoins) {
            // Calculer l'impact progressif (proportionnel au temps écoulé)
            const impactProgressif = impact * (tempsEcoule / dureeMs);
            
            // Appliquer l'impact
            const besoinKey = besoin as keyof typeof pnj.besoins;
            pnj.besoins[besoinKey] = Math.max(0, Math.min(100, pnj.besoins[besoinKey] + impactProgressif));
          }
        }
      }
      
      // Ajouter une entrée dans l'historique si ce n'est pas déjà fait
      const dejaEnregistre = pnj.historique.some(h => 
        h.action.includes(evenement.id) && 
        h.timestamp > evenement.timestampDebut
      );
      
      if (!dejaEnregistre) {
        pnj.historique.push({
          timestamp: Date.now(),
          etat: pnj.etatActuel,
          action: `Impliqué dans l'événement: ${evenement.description} (${evenement.id})`
        });
      }
    }
  }
  
  // Nettoyer les événements terminés
  evenementsActifs = evenementsActifs.filter(e => e.actif);
}

/**
 * Classe de nœud pour l'arbre de comportement qui réagit aux événements
 */
export class ReactionEvenementNode {
  async execute(pnj: PNJ, context?: any): Promise<'success' | 'failure' | 'running'> {
    if (!context || !context.evenements) {
      return 'failure';
    }
    
    // Filtrer les événements actifs impliquant ce PNJ
    const evenementsPNJ = context.evenements.filter((e: Evenement) => 
      e.actif && e.pnjsImpliques.includes(pnj.id)
    );
    
    if (evenementsPNJ.length === 0) {
      return 'failure'; // Aucun événement actif pour ce PNJ
    }
    
    // Prendre l'événement le plus récent
    const evenement = evenementsPNJ.sort((a: Evenement, b: Evenement) => 
      b.timestampDebut - a.timestampDebut
    )[0];
    
    // Générer une réaction à l'événement
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en comportement humain qui génère des réactions réalistes à des événements.`
      },
      {
        role: "user",
        content: `Génère une réaction courte (1-2 phrases) et réaliste pour un personnage face à cet événement:
        
        Personnage: ${pnj.nom} (${pnj.profession}, ${pnj.personnalite})
        Événement: ${evenement.description}
        Type d'événement: ${evenement.type}
        
        Comment ${pnj.nom} réagit-il à cet événement spécifiquement?`
      }
    ];
    
    try {
      const reaction = await appelLLM(messages, 150);
      
      // Ajouter la réaction à l'historique du PNJ
      pnj.historique.push({
        timestamp: Date.now(),
        etat: pnj.etatActuel,
        action: `Réaction à l'événement [${evenement.type}]: ${reaction}`
      });
      
      console.log(`${pnj.nom} réagit à l'événement [${evenement.type}]: ${reaction}`);
      
      return 'success';
    } catch (error) {
      console.error(`Erreur lors de la génération de la réaction pour ${pnj.nom}:`, error);
      return 'failure';
    }
  }
} 