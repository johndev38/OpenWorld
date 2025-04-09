import { PNJ, EtatPNJ, Batiment, Service } from './types';
import { getBatimentsParService, getLieuActuel, entrerDansBatiment } from './environnement';
import { genererDialogue } from './ia';
import { SEUILS } from './pnj';
import { ReactionEvenementNode } from './evenements';

// Types de base pour l'arbre de comportement
export type BehaviorStatus = 'success' | 'failure' | 'running';

export interface BehaviorNode {
  execute(pnj: PNJ, context?: any): Promise<BehaviorStatus>;
}

// Nœud pour la séquence (exécute les enfants en séquence jusqu'à ce qu'un échec se produise)
export class SequenceNode implements BehaviorNode {
  constructor(private children: BehaviorNode[]) {}

  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    for (const child of this.children) {
      const status = await child.execute(pnj, context);
      if (status !== 'success') {
        return status;
      }
    }
    return 'success';
  }
}

// Nœud pour le sélecteur (exécute les enfants jusqu'à ce qu'un succès se produise)
export class SelectorNode implements BehaviorNode {
  constructor(private children: BehaviorNode[]) {}

  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    for (const child of this.children) {
      const status = await child.execute(pnj, context);
      if (status === 'success') {
        return 'success';
      }
    }
    return 'failure';
  }
}

// Nœud pour vérifier une condition
export class ConditionNode implements BehaviorNode {
  constructor(private condition: (pnj: PNJ, context?: any) => boolean) {}

  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    return this.condition(pnj, context) ? 'success' : 'failure';
  }
}

// Nœud pour exécuter une action
export class ActionNode implements BehaviorNode {
  constructor(private action: (pnj: PNJ, context?: any) => Promise<BehaviorStatus>) {}

  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    return await this.action(pnj, context);
  }
}

// NŒUDS DE CONDITION SPÉCIFIQUES

// Vérifier si un besoin est en dessous du seuil
export class BesoinCritiqueNode implements BehaviorNode {
  constructor(private besoin: keyof typeof SEUILS) {}

  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    return pnj.besoins[this.besoin] < SEUILS[this.besoin] ? 'success' : 'failure';
  }
}

// Vérifier si le PNJ est dans un bâtiment spécifique
export class EstDansBatimentNode implements BehaviorNode {
  constructor(private typeBatiment?: string) {}

  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    const lieu = getLieuActuel(pnj);
    if (!this.typeBatiment) {
      return pnj.localisation?.batimentId ? 'success' : 'failure';
    }
    return lieu.type === this.typeBatiment ? 'success' : 'failure';
  }
}

// Vérifier si le PNJ est à l'extérieur
export class EstExterieureNode implements BehaviorNode {
  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    return pnj.localisation?.exterieur ? 'success' : 'failure';
  }
}

// Vérifier si un autre PNJ est à proximité
export class PNJAProximiteNode implements BehaviorNode {
  constructor(private distance: number = 0) {}

  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    if (!context || !context.pnjs) {
      return 'failure';
    }

    // Vérifier si un autre PNJ est dans le même bâtiment ou à proximité
    const autresPNJs = context.pnjs.filter((autrePNJ: PNJ) => {
      if (autrePNJ.id === pnj.id) return false;

      // Si les deux sont dans le même bâtiment
      if (pnj.localisation?.batimentId && 
          pnj.localisation.batimentId === autrePNJ.localisation?.batimentId) {
        return true;
      }

      // Si les deux sont à l'extérieur et à proximité
      if (pnj.localisation?.exterieur && autrePNJ.localisation?.exterieur) {
        // Simplifié pour la démo: considérons qu'ils sont à proximité s'ils sont tous deux à l'extérieur
        return true;
      }

      return false;
    });

    if (autresPNJs.length > 0) {
      // Stocker les PNJs à proximité dans le contexte pour utilisation future
      context.pnjsProximite = autresPNJs;
      return 'success';
    }
    return 'failure';
  }
}

// NŒUDS D'ACTION SPÉCIFIQUES

// Se déplacer vers un bâtiment offrant un service
export class AllerVersBatimentNode implements BehaviorNode {
  constructor(private service: Service) {}

  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    const batiments = getBatimentsParService(this.service);
    
    if (batiments.length === 0) {
      console.log(`Aucun bâtiment offrant le service ${this.service} n'est disponible pour ${pnj.nom}`);
      return 'failure';
    }
    
    // Choisir le bâtiment le plus approprié (ici, simplement le premier disponible)
    const batiment = batiments[0];
    
    // Si déjà dans ce bâtiment, succès immédiat
    if (pnj.localisation?.batimentId === batiment.id) {
      return 'success';
    }
    
    // Tenter d'entrer dans le bâtiment
    const succes = entrerDansBatiment(pnj, batiment.id);
    
    if (succes) {
      console.log(`${pnj.nom} est allé vers ${batiment.nom} pour ${this.service}`);
      
      // Ajouter une entrée dans l'historique
      pnj.historique.push({
        timestamp: Date.now(),
        etat: this.serviceToEtat(this.service),
        action: `${pnj.nom} se déplace vers ${batiment.nom}.`
      });
      
      // Mettre à jour l'état actuel
      pnj.etatActuel = this.serviceToEtat(this.service);
      
      return 'success';
    }
    
    return 'failure';
  }
  
  // Convertir un service en état PNJ
  private serviceToEtat(service: Service): EtatPNJ {
    const mapping: Record<Service, EtatPNJ> = {
      'repas': { activite: 'repas' },
      'boissons': { activite: 'social' },
      'repos': { activite: 'repos' },
      'commerce': { activite: 'travail' },
      'formation': { activite: 'travail' },
      'soins': { activite: 'repos' },
      'priere': { activite: 'social' },
      'forge': { activite: 'travail' },
      'protection': { activite: 'travail' }
    };
    
    return mapping[service] || { activite: 'repos' };
  }
}

// S'engager dans une conversation avec un autre PNJ
export class EngagerConversationNode implements BehaviorNode {
  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    if (!context || !context.pnjsProximite || context.pnjsProximite.length === 0) {
      return 'failure';
    }
    
    // Choisir un PNJ pour converser
    const autrePNJ = context.pnjsProximite[0];
    
    // Générer le dialogue
    const dialogue = await genererDialogue(pnj, autrePNJ);
    
    // Augmenter le besoin social satisfait
    pnj.besoins.social += 20;
    if (pnj.besoins.social > 100) pnj.besoins.social = 100;
    
    // Ajouter une entrée dans l'historique
    pnj.historique.push({
      timestamp: Date.now(),
      etat: { activite: 'social' },
      action: `${pnj.nom} a une conversation avec ${autrePNJ.nom}: "${dialogue}"`
    });
    
    // Mettre à jour l'état actuel
    pnj.etatActuel = { activite: 'social' };
    
    console.log(`${pnj.nom} converse avec ${autrePNJ.nom}: "${dialogue}"`);
    return 'success';
  }
}

// Effectuer une activité en fonction de la localisation actuelle
export class EffectuerActiviteNode implements BehaviorNode {
  async execute(pnj: PNJ, context?: any): Promise<BehaviorStatus> {
    const lieu = getLieuActuel(pnj);
    let activite = 'passe le temps';
    let etat: EtatPNJ = { activite: 'repos' };
    
    // Activité en fonction du type de bâtiment
    if (lieu && lieu.type) {
      switch (lieu.type) {
        case 'restaurant':
          activite = 'mange un repas';
          etat = { activite: 'repas' };
          pnj.besoins.faim += 40;
          break;
        case 'maison':
          // On vérifie si c'est sa maison via la localisation
          if (pnj.localisation?.batimentId === lieu.lieu) {
            activite = 'se repose chez soi';
            etat = { activite: 'repos' };
            pnj.besoins.energie += 10;
          } else {
            activite = 'visite quelqu\'un';
            etat = { activite: 'social' };
            pnj.besoins.social += 10;
          }
          break;
        case 'parc':
          activite = 'se promène dans le parc';
          etat = { activite: 'loisir' };
          pnj.besoins.divertissement += 15;
          break;
        case 'commerce':
          activite = 'fait des achats';
          etat = { activite: 'loisir' };
          pnj.besoins.divertissement += 10;
          break;
        case 'bureau':
          activite = 'travaille au bureau';
          etat = { activite: 'travail' };
          break;
        case 'usine':
          activite = 'travaille à l\'usine';
          etat = { activite: 'travail' };
          break;
        case 'bar':
          activite = 'prend un verre';
          etat = { activite: 'social' };
          pnj.besoins.social += 15;
          pnj.besoins.divertissement += 10;
          break;
        case 'bibliothèque':
          activite = 'lit à la bibliothèque';
          etat = { activite: 'loisir' };
          pnj.besoins.divertissement += 15;
          break;
        default:
          activite = 'passe du temps à ' + lieu.lieu;
          break;
      }
    } else if (pnj.localisation?.exterieur) {
      activite = 'se promène dehors';
      etat = { activite: 'loisir' };
      pnj.besoins.divertissement += 5;
    }
    
    // Limiter les besoins à 100
    if (pnj.besoins.faim > 100) pnj.besoins.faim = 100;
    if (pnj.besoins.energie > 100) pnj.besoins.energie = 100;
    if (pnj.besoins.social > 100) pnj.besoins.social = 100;
    if (pnj.besoins.divertissement > 100) pnj.besoins.divertissement = 100;
    
    // Ajouter une entrée dans l'historique
    pnj.historique.push({
      timestamp: Date.now(),
      etat,
      action: `${pnj.nom} ${activite} à ${lieu ? lieu.lieu : 'un endroit inconnu'}`
    });
    
    // Mettre à jour l'état actuel
    pnj.etatActuel = etat;
    
    console.log(`${pnj.nom} ${activite} à ${lieu ? lieu.lieu : 'un endroit inconnu'}`);
    return 'success';
  }
}

// CONSTRUCTION DES ARBRES DE COMPORTEMENT

// Construction de l'arbre pour la gestion des besoins critiques
function construireArbreBesoins(): BehaviorNode {
  // Arbre pour la gestion des besoins critiques
  return new SelectorNode([
    // Faim critique
    new SequenceNode([
      new BesoinCritiqueNode('faim'),
      new AllerVersBatimentNode('repas'),
      new ActionNode(async (pnj) => {
        pnj.besoins.faim += 40;
        pnj.historique.push({
          timestamp: Date.now(),
          etat: { activite: 'repas' },
          action: `${pnj.nom} a mangé et récupéré de la faim.`
        });
        return 'success';
      })
    ]),
    
    // Fatigue critique
    new SequenceNode([
      new BesoinCritiqueNode('fatigue'),
      new AllerVersBatimentNode('repos'),
      new ActionNode(async (pnj) => {
        pnj.besoins.energie += 40;
        pnj.historique.push({
          timestamp: Date.now(),
          etat: { activite: 'repos' },
          action: `${pnj.nom} a dormi et récupéré de l'énergie.`
        });
        return 'success';
      })
    ]),
    
    // Besoin social critique
    new SequenceNode([
      new BesoinCritiqueNode('social'),
      new AllerVersBatimentNode('boissons'),
      new ActionNode(async (pnj) => {
        pnj.besoins.social += 40;
        pnj.historique.push({
          timestamp: Date.now(),
          etat: { activite: 'social' },
          action: `${pnj.nom} a socialisé et amélioré son besoin social.`
        });
        return 'success';
      })
    ]),
    
    // Besoin de divertissement critique
    new SequenceNode([
      new BesoinCritiqueNode('divertissement'),
      new AllerVersBatimentNode('commerce'),
      new ActionNode(async (pnj) => {
        pnj.besoins.divertissement += 40;
        if (pnj.besoins.divertissement > 100) pnj.besoins.divertissement = 100;
        
        pnj.historique.push({
          timestamp: Date.now(),
          etat: { activite: 'loisir' },
          action: `${pnj.nom} s'est diverti et a récupéré du moral.`
        });
        
        return 'success';
      })
    ])
  ]);
}

// Construction de l'arbre pour les activités normales
function construireArbreActivitesNormales(): BehaviorNode {
  // Suivre le planning si c'est l'heure de travail
  const suivrePlanning = new SequenceNode([
    // condition pour vérifier si c'est l'heure de travail selon l'emploi du temps
    new ConditionNode((pnj: PNJ, context?: any) => {
      if (!pnj.emploiDuTemps || !context || !context.timestamp) return false;
      
      const now = new Date(context.timestamp);
      const heure = now.getHours();
      const jour = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
      
      // Vérifier si l'horaire actuel correspond à une entrée dans l'emploi du temps
      // Parcourir les entrées de l'emploi du temps
      return Object.keys(pnj.emploiDuTemps).some(heureStr => {
        const h = parseInt(heureStr, 10);
        const activite = pnj.emploiDuTemps![h];
        
        // Simplification: si on est dans l'heure de l'emploi du temps, retourner vrai
        return h === heure;
      });
    }),
    new AllerVersBatimentNode('commerce')
  ]);
  
  // Socialiser avec d'autres PNJs si disponibles
  const socialiser = new SequenceNode([
    new PNJAProximiteNode(),
    new EngagerConversationNode()
  ]);
  
  // Effectuer une activité basée sur la localisation actuelle
  const effectuerActivite = new EffectuerActiviteNode();
  
  // Aller vers un lieu de loisir si rien d'autre à faire
  const allerVersLoisir = new AllerVersBatimentNode('formation');
  
  // Sélecteur qui choisit l'activité normale à faire
  return new SelectorNode([
    suivrePlanning,
    socialiser,
    effectuerActivite,
    allerVersLoisir
  ]);
}

// Fonction pour construire l'arbre de comportement complet
function construireArbreComportement(): BehaviorNode {
  return new SelectorNode([
    // Priorité 1: Réagir aux événements en cours
    new ReactionEvenementNode(),
    
    // Priorité 2: Satisfaire les besoins critiques
    construireArbreBesoins(),
    
    // Priorité 3: Activités normales
    construireArbreActivitesNormales()
  ]);
}

// Fonction principale pour exécuter l'arbre de comportement sur un PNJ
export async function executerArbreComportement(pnj: PNJ, context: any): Promise<void> {
  // Construire l'arbre de comportement
  const arbre = construireArbreComportement();
  
  // Exécuter l'arbre
  await arbre.execute(pnj, context);
} 