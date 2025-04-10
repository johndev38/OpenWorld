import { PNJ, EtatPNJ } from './types';
import { 
  sauvegarderPNJ, 
  chargerTousLesPNJ,
  genererActionDescription
} from './pnj';
import { 
  initialiserEnvironnement, 
  avancerTemps,
  getEnvironnement,
  mettreAJourBesoinsPNJ
} from './environnement';
import { executerArbreComportement } from './behaviorTree';
import {
  genererEvenementAleatoire,
  ajouterEvenement,
  getEvenementsActifs,
  terminerEvenement,
  appliquerEvenementsAuxPNJ,
  Evenement,
  ReactionEvenementNode
} from './evenements';
import { EVENEMENTS_INTERVALLE, EVENEMENTS_PROBABILITE } from './config';
import { DeplacementService } from './services/DeplacementService';
import { PNJDecisionService } from './services/PNJDecisionService';
import { PathfindingService } from './services/PathfindingService';
import { BatimentService } from './services/BatimentService';
import EventEmitter from 'events';

// Constante pour l'intervalle de simulation
export const TICK_INTERVAL = 10000; // 10 secondes par tick

export class Simulation extends EventEmitter {
  private static instance: Simulation;
  private pnjs: PNJ[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private enPause: boolean = true;
  
  // Services
  private deplacementService: DeplacementService;
  private pnjDecisionService: PNJDecisionService;
  private pathfindingService: PathfindingService;
  private batimentService: BatimentService;
  
  // Configuration de simulation
  private intervalTemps: number = 1000; // ms entre chaque tick
  private minutesParTick: number = 5; // minutes qui passent par tick
  
  private constructor() {
    super();
    this.deplacementService = DeplacementService.getInstance();
    this.pnjDecisionService = PNJDecisionService.getInstance();
    this.pathfindingService = PathfindingService.getInstance();
    this.batimentService = BatimentService.getInstance();
    
    // Configurer les écouteurs d'événements
    this.deplacementService.on('arrivee', this.handlePNJArrivee.bind(this));
    
    // Initialiser l'environnement
    initialiserEnvironnement();
    
    // Initialiser la carte de pathfinding avec les bâtiments
    this.mettreAJourCartePathfinding();
    
    // Charger les PNJ existants
    this.chargerPNJsInitial();
  }
  
  public static getInstance(): Simulation {
    if (!Simulation.instance) {
      Simulation.instance = new Simulation();
    }
    return Simulation.instance;
  }
  
  /**
   * Charge les PNJs depuis les fichiers au démarrage
   */
  private chargerPNJsInitial(): void {
    try {
      const pnjsCharges = chargerTousLesPNJ();
      this.pnjs = pnjsCharges;
      console.log(`✔️ ${pnjsCharges.length} PNJ(s) chargé(s) initialement.`);
    } catch (error) {
      console.error("❌ Erreur lors du chargement initial des PNJ:", error);
    }
  }
  
  /**
   * Définit les PNJ à simuler (peut écraser les PNJ chargés)
   */
  public setPNJs(pnjs: PNJ[]): void {
    this.pnjs = pnjs;
    console.log(`Simulation configurée avec ${pnjs.length} PNJs`);
  }
  
  /**
   * Démarre la simulation
   */
  public demarrer(): void {
    if (!this.enPause) return;
    
    this.enPause = false;
    console.log("Démarrage de la simulation...");
    
    // Exécuter un premier tick immédiatement pour réactivité
    this.tick(); 
    
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.intervalTemps);
    
    this.emit('simulation:demarree');
  }
  
  /**
   * Met en pause la simulation
   */
  public pause(): void {
    if (this.enPause) return;
    
    this.enPause = true;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log("Simulation en pause");
    this.emit('simulation:pause');
  }
  
  /**
   * Réinitialise la simulation
   */
  public reinitialiser(): void {
    this.pause();
    initialiserEnvironnement();
    this.mettreAJourCartePathfinding();
    this.chargerPNJsInitial(); // Recharger les PNJ depuis les fichiers
    console.log("Simulation réinitialisée");
    this.emit('simulation:reinitialisee');
  }
  
  /**
   * Exécute un tick de simulation
   */
  private tick(): void {
    console.log(`\n--- TICK DE SIMULATION ---`);
    // Avancer le temps
    avancerTemps(this.minutesParTick);
    console.log(`⏱️  Temps avancé à: ${getEnvironnement().heure}h${getEnvironnement().minute}`);
    
    // Mettre à jour les besoins des PNJ
    mettreAJourBesoinsPNJ(this.pnjs, this.minutesParTick);
    
    // Mettre à jour les déplacements en cours
    this.deplacementService.mettreAJourDeplacements(this.pnjs);
    
    // Pour chaque PNJ, prendre des décisions en fonction des besoins
    this.pnjs.forEach(pnj => {
      if (!this.deplacementService.estEnDeplacement(pnj.id)) {
         this.pnjDecisionService.evaluerBesoinsEtDecider(pnj)
            .then(decisionPrise => {
              if (decisionPrise) {
                console.log(`💡 ${pnj.nom} a pris une nouvelle décision due à ses besoins.`);
              }
            });
      }
    });
    
    // Émettre un événement tick avec les données à jour
    this.emit('simulation:tick', { environnement: getEnvironnement(), pnjs: this.getAllPNJs() });
  }
  
  /**
   * Gère l'arrivée d'un PNJ à sa destination
   */
  private handlePNJArrivee(pnj: PNJ, batimentId?: string): void {
    console.log(`🏁 ARRIVÉE: ${pnj.nom} est arrivé à ${batimentId ? 'bâtiment ' + batimentId : 'sa destination'}.`);
    if (batimentId) {
      // Entrer dans le bâtiment
      console.log(`${pnj.nom} tente d'entrer dans ${batimentId}`);
      
      const batiment = this.batimentService.getBatiment(batimentId);
      if (batiment && batiment.occupants.length < batiment.capacite) {
        // Mettre à jour la localisation du PNJ
        pnj.localisation.batimentId = batiment.id;
        pnj.localisation.exterieur = false;
        
        // Ajouter le PNJ aux occupants du bâtiment
        this.batimentService.ajouterOccupant(batiment.id, pnj.id);
        
        console.log(`✔️ ${pnj.nom} est entré dans ${batiment.nom}`);
        
        // Satisfaire les besoins du PNJ
        this.pnjDecisionService.satisfaireBesoin(pnj, batiment.id);
      } else {
        console.log(`❌ ${pnj.nom} n'a pas pu entrer dans le bâtiment ${batimentId} (plein ou fermé)`);
        // Le PNJ pourrait devoir prendre une autre décision ici
        this.pnjDecisionService.evaluerBesoinsEtDecider(pnj);
      }
    }
    
    this.emit('pnj:arrive', pnj, batimentId);
  }
  
  /**
   * Met à jour la carte de pathfinding avec les bâtiments actuels
   */
  private mettreAJourCartePathfinding(): void {
    const batiments = this.batimentService.getAllBatiments();
    this.pathfindingService.mettreAJourCarte(batiments);
    console.log(`🗺️ Carte de pathfinding mise à jour avec ${batiments.length} bâtiments`);
  }
  
  /**
   * Simule une urgence de santé pour un PNJ
   */
  public simulerUrgenceSante(pnj: PNJ): void {
    // Diminuer drastiquement la santé du PNJ
    pnj.sante = 10;
    console.log(`🚨 URGENCE SANTÉ: ${pnj.nom} (santé: ${pnj.sante})`);
    
    // Forcer une évaluation immédiate des besoins
    this.pnjDecisionService.evaluerBesoinsEtDecider(pnj)
      .then(decisionPrise => {
        if (decisionPrise) {
          console.log(`${pnj.nom} cherche de l'aide médicale`);
          this.emit('pnj:urgence', pnj);
        }
      });
  }
  
  /**
   * Simule une forte faim pour un PNJ
   */
  public simulerFaim(pnj: PNJ): void {
    // Diminuer drastiquement la nourriture du PNJ
    pnj.besoins.faim = 5;
    console.log(`🍽️ ALERTE FAIM: ${pnj.nom} (faim: ${pnj.besoins.faim})`);
    
    // Forcer une évaluation immédiate des besoins
    this.pnjDecisionService.evaluerBesoinsEtDecider(pnj)
      .then(decisionPrise => {
        if (decisionPrise) {
          console.log(`${pnj.nom} cherche à manger`);
          this.emit('pnj:faim', pnj);
        }
      });
  }
  
  // --- Fonctions pour l'API --- 
  
  /**
   * Obtenir tous les PNJs actuels
   */
  public getAllPNJs(): PNJ[] {
    return [...this.pnjs]; // Retourne une copie
  }

  /**
   * Obtenir un PNJ par son ID
   */
  public getPNJById(id: string): PNJ | undefined {
    return this.pnjs.find(p => p.id === id);
  }
  
  /**
   * Ajouter un PNJ à la simulation
   */
  public ajouterPNJ(pnj: PNJ): void {
    this.pnjs.push(pnj);
    sauvegarderPNJ(pnj); // Sauvegarde le PNJ dans son fichier JSON
    console.log(`➕ PNJ ${pnj.nom} ajouté à la simulation.`);
    this.emit('pnj:ajoute', pnj);
  }

  /**
   * Retirer un PNJ de la simulation
   */
  public retirerPNJ(id: string): boolean {
    const index = this.pnjs.findIndex(p => p.id === id);
    if (index !== -1) {
      const pnjRetire = this.pnjs.splice(index, 1)[0];
      console.log(`➖ PNJ ${pnjRetire.nom} (ID ${id}) retiré de la simulation.`);
      // Optionnel: supprimer le fichier JSON
      // try {
      //   const filePath = path.join('data/pnjs', `${id}.json`);
      //   if (fs.existsSync(filePath)) {
      //     fs.unlinkSync(filePath);
      //   }
      // } catch (error) {
      //   console.error(`Erreur lors de la suppression du fichier PNJ ${id}:`, error);
      // }
      this.emit('pnj:retire', id);
      return true;
    }
    return false;
  }

  /**
   * Retourne l'état actuel de pause de la simulation.
   */
  public estEnPause(): boolean {
    return this.enPause;
  }
}

// Créer et exporter l'instance singleton
export const simulation = Simulation.getInstance();

// --- Anciennes fonctions (maintenant gérées par la classe Simulation) ---
// Ces fonctions sont conservées pour référence mais devraient être supprimées à terme
// si l'API utilise directement l'instance de Simulation.

// let simulationActive = false;
// let intervalId: NodeJS.Timeout | null = null;
// let pnjs: PNJ[] = [];
// let dernierEvenement: number = 0;

// Fonction pour générer un événement aléatoire
// async function genererEtAjouterEvenement(): Promise<void> { ... }

// Fonction pour simuler un tick de la simulation
// export async function simulerTick(): Promise<void> { ... }

// Démarrer la simulation
export function demarrerSimulation(): void {
  simulation.demarrer();
}

// Arrêter la simulation
export function arreterSimulation(): void {
  simulation.pause();
}

// État de la simulation
export function etatSimulation(): { actif: boolean; nbPNJs: number } {
  return {
    actif: !simulation.estEnPause(),
    nbPNJs: simulation.getAllPNJs().length
  };
}

// --- Fonctions d'accès aux PNJ pour l'API (utilisent l'instance) ---

// Ajouter un PNJ à la simulation
// Note: Répétition de simulation.ajouterPNJ. À nettoyer.
// export function ajouterPNJ(pnj: PNJ): void {
//   simulation.ajouterPNJ(pnj);
// }

// Retirer un PNJ de la simulation
// Note: Répétition de simulation.retirerPNJ. À nettoyer.
// export function retirerPNJ(id: string): boolean {
//   return simulation.retirerPNJ(id);
// }

// Obtenir tous les PNJs actuels
export function getPNJs(): PNJ[] {
  return simulation.getAllPNJs();
}

// Obtenir un PNJ par son ID
export function getPNJById(id: string): PNJ | undefined {
  return simulation.getPNJById(id);
}

// --- Tests (conservé pour référence) ---

// Créer des scénarios de test pour valider l'arbre de comportement
/*
export async function testerScenarios(): Promise<void> {
  console.log("--- LANCEMENT DES SCÉNARIOS DE TEST ---");
  const pnjsPourTest = simulation.getAllPNJs();

  // Vérifier qu'il y a des PNJs à tester
  if (pnjsPourTest.length === 0) {
    console.log("Aucun PNJ disponible pour les tests. Veuillez d'abord ajouter des PNJs.");
    return;
  }

  // Environnement et contexte partagés
  const environnement = getEnvironnement();
  const context = {
    environnement,
    pnjs: pnjsPourTest,
    timestamp: Date.now()
  };

  // SCÉNARIO 1: Besoin social critique
  console.log("\n--- SCÉNARIO 1: BESOIN SOCIAL CRITIQUE ---");
  const pnjSocial = pnjsPourTest[0];
  console.log(`Test avec PNJ: ${pnjSocial.nom}`);
  
  // Forcer le besoin social à être critique
  pnjSocial.besoins.social = 10; // Bien en-dessous du seuil critique
  
  // Mémoriser l'état actuel pour la comparaison
  const etatAvantSocial = pnjSocial.etatActuel.activite;
  
  console.log(`État avant: ${etatAvantSocial}`);
  console.log(`Besoins avant: Faim(${pnjSocial.besoins.faim}), Social(${pnjSocial.besoins.social}), Fatigue(${pnjSocial.besoins.fatigue})`);
  
  // Exécuter un tick de simulation pour voir la réaction
  simulation.tick(); // Laisse la simulation gérer l'appel au service de décision
  
  console.log(`État après: ${pnjSocial.etatActuel.activite}`);
  console.log(`Le PNJ devrait chercher à socialiser: ${pnjSocial.etatActuel.activite === 'social' ? 'RÉUSSI' : 'ÉCHEC'}`);

  // Restaurer l'état
  pnjSocial.besoins.social = 70;
  
  // SCÉNARIO 2: Choix entre manger et dormir
  console.log("\n--- SCÉNARIO 2: CHOIX ENTRE MANGER ET DORMIR ---");
  const pnjChoix = pnjsPourTest.length > 1 ? pnjsPourTest[1] : pnjsPourTest[0];
  console.log(`Test avec PNJ: ${pnjChoix.nom}`);
  
  // Forcer les deux besoins à être critiques, mais fatigue plus critique
  pnjChoix.besoins.faim = 25; // En-dessous du seuil critique
  pnjChoix.besoins.fatigue = 15; // Bien en-dessous du seuil critique
  
  // Mémoriser l'état actuel
  const etatAvantChoix = pnjChoix.etatActuel.activite;
  
  console.log(`État avant: ${etatAvantChoix}`);
  console.log(`Besoins avant: Faim(${pnjChoix.besoins.faim}), Fatigue(${pnjChoix.besoins.fatigue})`);
  
  // Exécuter un tick de simulation
  simulation.tick(); // Laisse la simulation gérer l'appel au service de décision
  
  console.log(`État après: ${pnjChoix.etatActuel.activite}`);
  console.log(`Le PNJ devrait prioritairement se reposer: ${pnjChoix.etatActuel.activite === 'repos' ? 'RÉUSSI' : 'ÉCHEC'}`);

  // Restaurer l'état
  pnjChoix.besoins.faim = 70;
  pnjChoix.besoins.fatigue = 70;
  
  // SCÉNARIO 3: Influence de la personnalité (Moins direct avec PNJDecisionService)
  // ... (Ce scénario est moins pertinent car PNJDecisionService ne prend pas directement la personnalité 
  //      en compte pour le choix du *type* d'action, mais pour le *lieu* de divertissement)
  
  // SCÉNARIO 4: Influence de l'heure (Non testé directement par PNJDecisionService)
  // ... (L'heure influence les besoins via mettreAJourBesoinsPNJ, mais pas directement la décision immédiate)
  
  console.log("\n--- FIN DES SCÉNARIOS DE TEST ---");
}
*/ 