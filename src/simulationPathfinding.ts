import { PNJ } from './types';
import { DeplacementService } from './services/DeplacementService';
import { PNJDecisionService } from './services/PNJDecisionService';
import { PathfindingService } from './services/PathfindingService';
import { BatimentService } from './services/BatimentService';
import { 
  getEnvironnement, 
  avancerTemps, 
  initialiserEnvironnement,
  mettreAJourBesoinsPNJ 
} from './environnement';
import EventEmitter from 'events';

export class SimulationPathfinding extends EventEmitter {
  private static instance: SimulationPathfinding;
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
  }
  
  public static getInstance(): SimulationPathfinding {
    if (!SimulationPathfinding.instance) {
      SimulationPathfinding.instance = new SimulationPathfinding();
    }
    return SimulationPathfinding.instance;
  }
  
  /**
   * Définit les PNJ à simuler
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
    
    // Afficher la carte au démarrage
    this.afficherCarte();
    
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
    console.log("Simulation réinitialisée");
    this.emit('simulation:reinitialisee');
  }
  
  /**
   * Exécute un tick de simulation
   */
  private tick(): void {
    // Avancer le temps
    avancerTemps(this.minutesParTick);
    
    // Mettre à jour les besoins des PNJ
    try {
      console.log(`Tentative de mise à jour des besoins pour ${this.pnjs.length} PNJ(s)...`);
      mettreAJourBesoinsPNJ(this.pnjs, this.minutesParTick);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des besoins:', error);
    }
    
    // Mettre à jour les déplacements en cours
    this.deplacementService.mettreAJourDeplacements(this.pnjs);
    
    // Pour chaque PNJ, prendre des décisions en fonction des besoins
    this.pnjs.forEach(pnj => {
      this.pnjDecisionService.evaluerBesoinsEtDecider(pnj)
        .then(decisionPrise => {
          if (decisionPrise) {
            console.log(`${pnj.nom} a pris une nouvelle décision`);
          }
        });
    });
    
    // Émettre un événement tick
    this.emit('simulation:tick', getEnvironnement());
  }
  
  /**
   * Gère l'arrivée d'un PNJ à sa destination
   */
  private handlePNJArrivee(pnj: PNJ, batimentId?: string): void {
    if (batimentId) {
      // Entrer dans le bâtiment
      console.log(`${pnj.nom} est arrivé à ${batimentId} et tente d'y entrer`);
      
      // Vérifier si le PNJ peut entrer dans le bâtiment
      const batiment = this.batimentService.getBatiment(batimentId);
      if (batiment && batiment.occupants.length < batiment.capacite) {
        // Mettre à jour la localisation du PNJ
        pnj.localisation.batimentId = batiment.id;
        pnj.localisation.exterieur = false;
        
        // Ajouter le PNJ aux occupants du bâtiment
        this.batimentService.ajouterOccupant(batiment.id, pnj.id);
        
        console.log(`${pnj.nom} est entré dans ${batiment.nom}`);
        
        // Satisfaire les besoins du PNJ
        this.pnjDecisionService.satisfaireBesoin(pnj, batiment.id);
      } else {
        console.log(`${pnj.nom} n'a pas pu entrer dans le bâtiment (plein ou fermé)`);
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
    console.log(`Carte de pathfinding mise à jour avec ${batiments.length} bâtiments`);
  }
  
  /**
   * Simule une urgence de santé pour un PNJ
   */
  public simulerUrgenceSante(pnj: PNJ): void {
    // Diminuer drastiquement la santé du PNJ
    pnj.sante = 10;
    console.log(`URGENCE: ${pnj.nom} a un problème de santé (santé: ${pnj.sante})`);
    
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
    console.log(`ALERTE: ${pnj.nom} a très faim (faim: ${pnj.besoins.faim})`);
    
    // Forcer une évaluation immédiate des besoins
    this.pnjDecisionService.evaluerBesoinsEtDecider(pnj)
      .then(decisionPrise => {
        if (decisionPrise) {
          console.log(`${pnj.nom} cherche à manger`);
          this.emit('pnj:faim', pnj);
        }
      });
  }
  
  /**
   * Affiche une visualisation simple de la carte avec les obstacles
   */
  public afficherCarte(): void {
    const batiments = this.batimentService.getAllBatiments();
    
    // Créer une matrice pour la visualisation
    const tailleGrille = 25; // Taille réduite pour l'affichage
    const grille: string[][] = Array(tailleGrille).fill(0).map(() => Array(tailleGrille).fill(' . ')); // Point = case libre
    
    console.log("\n🗺️ VISUALISATION DE LA CARTE:");
    
    // Ajouter les bâtiments à la grille
    batiments.forEach(batiment => {
      const x = Math.floor(batiment.position.x) + Math.floor(tailleGrille/2); // Centrer sur la carte
      const y = Math.floor(batiment.position.y) + Math.floor(tailleGrille/2);
      
      if (x >= 0 && x < tailleGrille && y >= 0 && y < tailleGrille) {
        // Représentation en fonction du type de bâtiment
        switch (batiment.type) {
          case 'maison':
            grille[y][x] = ' 🏠 ';
            break;
          case 'taverne':
            grille[y][x] = ' 🍺 ';
            break;
          case 'forge':
            grille[y][x] = ' 🔨 ';
            break;
          case 'bibliotheque':
            grille[y][x] = ' 📚 ';
            break;
          case 'marche':
            grille[y][x] = ' 🛒 ';
            break;
          case 'temple':
            grille[y][x] = ' ⛪ ';
            break;
          case 'caserne':
            grille[y][x] = ' 🛡️ ';
            break;
          default:
            grille[y][x] = ' 🏢 ';
        }
      }
    });
    
    // Ajouter les PNJs à la grille
    this.pnjs.forEach(pnj => {
      const x = Math.floor(pnj.localisation.position.x) + Math.floor(tailleGrille/2);
      const y = Math.floor(pnj.localisation.position.y) + Math.floor(tailleGrille/2);
      
      if (x >= 0 && x < tailleGrille && y >= 0 && y < tailleGrille) {
        grille[y][x] = ' 👤 '; // Représentation d'un PNJ
      }
    });
    
    // Afficher la grille
    let carteTxt = '';
    for (let y = 0; y < tailleGrille; y++) {
      let ligne = '';
      for (let x = 0; x < tailleGrille; x++) {
        ligne += grille[y][x];
      }
      carteTxt += ligne + '\n';
    }
    
    // Afficher une légende
    console.log(carteTxt);
    console.log("Légende: 👤 = PNJ, 🏠 = Maison, 🍺 = Taverne, 🔨 = Forge, 📚 = Bibliothèque, 🛒 = Marché, ⛪ = Temple, 🛡️ = Caserne");
    
    // Afficher les coordonnées des bâtiments
    console.log("\nCoordonnées des bâtiments:");
    batiments.forEach(batiment => {
      console.log(`${batiment.nom} (${batiment.type}): [${batiment.position.x}, ${batiment.position.y}]`);
    });
  }
}

export const simulationPathfinding = SimulationPathfinding.getInstance(); 