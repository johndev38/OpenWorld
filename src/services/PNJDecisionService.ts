import { PNJ, Batiment, TypeBatiment, Service, Position } from '../types';
import { DeplacementService } from './DeplacementService';
import { BatimentService } from './BatimentService';
import EventEmitter from 'events';
import { PathfindingService } from './PathfindingService';

/**
 * Service qui gère les décisions des PNJ en fonction de leurs besoins
 */
export class PNJDecisionService extends EventEmitter {
  private static instance: PNJDecisionService;
  private deplacementService: DeplacementService;
  private batimentService: BatimentService;
  private pathfindingService: PathfindingService;
  
  // Seuils pour les différents besoins (en dessous, le besoin devient prioritaire)
  private seuils = {
    faim: 30,
    soif: 25,
    fatigue: 20,
    social: 15,
    divertissement: 10,
    sante: 40
  };

  private constructor() {
    super();
    this.deplacementService = DeplacementService.getInstance();
    this.batimentService = BatimentService.getInstance();
    this.pathfindingService = PathfindingService.getInstance();
  }

  public static getInstance(): PNJDecisionService {
    if (!PNJDecisionService.instance) {
      PNJDecisionService.instance = new PNJDecisionService();
    }
    return PNJDecisionService.instance;
  }

  /**
   * Évalue les besoins d'un PNJ et prend une décision sur sa prochaine action
   */
  public async evaluerBesoinsEtDecider(pnj: PNJ): Promise<boolean> {
    // Si le PNJ est déjà en déplacement, ne pas interférer
    if (this.deplacementService.estEnDeplacement(pnj.id)) {
      return false;
    }

    console.log(`🤔 DÉCISION: Évaluation des besoins de ${pnj.nom} - Faim: ${pnj.besoins.faim}, Soif: ${pnj.besoins.soif}, Fatigue: ${pnj.besoins.fatigue}, Social: ${pnj.besoins.social}, Santé: ${pnj.sante}`);

    // Récupérer le besoin le plus urgent
    const besoinUrgent = this.trouverBesoinPrioritaire(pnj);
    
    if (!besoinUrgent) {
      console.log(`😌 DÉCISION: ${pnj.nom} n'a pas de besoin urgent, il continue son activité actuelle (${pnj.etatActuel.activite})`);
      return false;
    }

    console.log(`⚠️ DÉCISION: ${pnj.nom} a un besoin urgent: ${besoinUrgent.type} (${besoinUrgent.valeur})`);
    
    // Trouver un bâtiment qui répond à ce besoin
    const batiment = this.trouverBatimentPourBesoin(besoinUrgent.type, pnj);
    
    if (!batiment) {
      console.log(`❌ DÉCISION: Aucun bâtiment disponible pour répondre au besoin ${besoinUrgent.type} de ${pnj.nom}`);
      return false;
    }

    console.log(`🏢 DÉCISION: ${pnj.nom} a choisi le bâtiment ${batiment.nom} (${batiment.id}) en [${batiment.position.x}, ${batiment.position.y}] pour son besoin de ${besoinUrgent.type}`);

    // Trouver une destination adjacente libre
    const destination = this.trouverDestinationAdjacenteLibre(batiment.position);
    if (!destination) {
      console.log(`❌ DÉCISION: Aucune case adjacente libre trouvée pour le bâtiment ${batiment.nom}`);
      return false;
    }
    console.log(`🎯 DÉCISION: Destination ajustée à [${destination.x}, ${destination.y}] (adjacent à ${batiment.nom})`);

    // Mettre à jour l'état du PNJ en fonction du besoin
    this.mettreAJourEtatPNJ(pnj, besoinUrgent.type);
    
    // Déplacer le PNJ vers la destination adjacente
    console.log(`✅ DÉCISION: ${pnj.nom} se dirige vers les environs de ${batiment.nom} pour satisfaire son besoin de ${besoinUrgent.type}`);
    
    return this.deplacementService.deplacerVers(pnj, destination, batiment.id);
  }

  /**
   * Trouve le besoin le plus urgent d'un PNJ
   */
  private trouverBesoinPrioritaire(pnj: PNJ): { type: string; valeur: number } | null {
    const besoins = [
      { type: 'faim', valeur: pnj.besoins.faim, seuil: this.seuils.faim },
      { type: 'soif', valeur: pnj.besoins.soif, seuil: this.seuils.soif },
      { type: 'fatigue', valeur: pnj.besoins.fatigue, seuil: this.seuils.fatigue },
      { type: 'social', valeur: pnj.besoins.social, seuil: this.seuils.social },
      { type: 'divertissement', valeur: pnj.besoins.divertissement, seuil: this.seuils.divertissement },
      { type: 'sante', valeur: pnj.sante, seuil: this.seuils.sante }
    ];

    // Filtrer les besoins qui sont en dessous du seuil
    const besoinsUrgents = besoins.filter(b => b.valeur < b.seuil);
    
    if (besoinsUrgents.length === 0) {
      return null;
    }

    // Trier par ordre croissant de valeur (le plus bas = le plus urgent)
    besoinsUrgents.sort((a, b) => a.valeur - b.valeur);
    
    return { type: besoinsUrgents[0].type, valeur: besoinsUrgents[0].valeur };
  }

  /**
   * Trouve un bâtiment approprié pour répondre à un besoin
   */
  private trouverBatimentPourBesoin(typeBesoin: string, pnj: PNJ): Batiment | null {
    let service: Service | undefined;
    let typeBatiment: TypeBatiment | undefined;
    
    // Associer le besoin à un service ou type de bâtiment
    switch (typeBesoin) {
      case 'faim':
        service = 'repas';
        break;
      case 'soif':
        service = 'boissons';
        break;
      case 'fatigue':
        service = 'repos';
        break;
      case 'social':
        service = 'boissons'; // Les tavernes sont bonnes pour socialiser
        break;
      case 'divertissement':
        // Selon la personnalité du PNJ, différents types de divertissement
        if (pnj.personnalite === 'sage' || pnj.personnalite === 'mystérieux') {
          typeBatiment = 'bibliotheque';
        } else {
          typeBatiment = 'taverne';
        }
        break;
      case 'sante':
        service = 'soins';
        break;
      default:
        return null;
    }

    let batiments: Batiment[] = [];
    
    if (service) {
      // Trouver tous les bâtiments offrant ce service
      batiments = this.batimentService.getAllBatiments().filter(b => b.services.includes(service));
    } else if (typeBatiment) {
      // Ou trouver tous les bâtiments de ce type
      batiments = this.batimentService.getBatimentsParType(typeBatiment);
    }

    if (batiments.length === 0) {
      return null;
    }

    // Trouver le bâtiment le plus proche parmi ceux disponibles
    return this.trouverBatimentLePlusProche(batiments, pnj);
  }

  /**
   * Trouve le bâtiment le plus proche parmi une liste de bâtiments
   */
  private trouverBatimentLePlusProche(batiments: Batiment[], pnj: PNJ): Batiment | null {
    if (batiments.length === 0) {
      return null;
    }

    // Trier les bâtiments par distance
    batiments.sort((a, b) => {
      const distanceA = this.calculerDistance(pnj.localisation.position, a.position);
      const distanceB = this.calculerDistance(pnj.localisation.position, b.position);
      return distanceA - distanceB;
    });

    return batiments[0];
  }

  /**
   * Calcule la distance euclidienne entre deux positions
   */
  private calculerDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Trouve une case adjacente libre à une position donnée.
   * Vérifie les 8 voisins.
   */
  private trouverDestinationAdjacenteLibre(positionCible: Position): Position | null {
    const x = Math.floor(positionCible.x);
    const y = Math.floor(positionCible.y);
    const voisins = [
      { x: x - 1, y: y }, { x: x + 1, y: y }, { x: x, y: y - 1 }, { x: x, y: y + 1 },
      { x: x - 1, y: y - 1 }, { x: x + 1, y: y - 1 }, { x: x - 1, y: y + 1 }, { x: x + 1, y: y + 1 }
    ];

    for (const voisin of voisins) {
      // Vérifier si la case voisine est valide et libre sur la grille de pathfinding
      if (this.pathfindingService.estAccessible(voisin.x, voisin.y)) {
        return voisin; // Retourner la première case libre trouvée
      }
    }

    console.warn(`Aucune case adjacente libre trouvée autour de [${x}, ${y}]`);
    return null; // Aucune case adjacente libre trouvée
  }

  /**
   * Met à jour l'état du PNJ en fonction du besoin à satisfaire
   */
  private mettreAJourEtatPNJ(pnj: PNJ, typeBesoin: string): void {
    // Réinitialiser le dialogue potentiel avant de changer d'activité
    pnj.etatActuel.dialogue = undefined;
    
    switch (typeBesoin) {
      case 'faim':
      case 'soif':
        pnj.etatActuel.activite = 'repas';
        break;
      case 'fatigue':
        pnj.etatActuel.activite = 'repos';
        break;
      case 'social':
        pnj.etatActuel.activite = 'social';
        // Définir un dialogue générique pour l'activité sociale
        pnj.etatActuel.dialogue = "...discution..."; 
        break;
      case 'divertissement':
        pnj.etatActuel.activite = 'loisir';
        break;
      case 'sante':
        pnj.etatActuel.activite = 'repos';
        break;
    }

    // Ajouter une entrée dans l'historique
    pnj.historique.push({
      timestamp: Date.now(),
      etat: pnj.etatActuel,
      action: `${pnj.nom} a décidé de satisfaire son besoin de ${typeBesoin}.`
    });
  }

  /**
   * Simuler l'effet de l'action sur les besoins du PNJ (à appeler après l'arrivée)
   */
  public satisfaireBesoin(pnj: PNJ, batimentId: string): void {
    const batiment = this.batimentService.getBatiment(batimentId);
    
    if (!batiment) {
      console.log(`❌ SATISFACTION: Impossible de satisfaire les besoins de ${pnj.nom}, bâtiment ${batimentId} non trouvé`);
      return;
    }

    console.log(`🏢 SATISFACTION: ${pnj.nom} satisfait ses besoins à ${batiment.nom} (${batiment.type}) - Services: [${batiment.services.join(', ')}]`);
    console.log(`📊 SATISFACTION: Besoins avant - Faim: ${pnj.besoins.faim.toFixed(0)}, Soif: ${pnj.besoins.soif.toFixed(0)}, Fatigue: ${pnj.besoins.fatigue.toFixed(0)}, Social: ${pnj.besoins.social.toFixed(0)}, Énergie: ${pnj.energie.toFixed(0)}, Santé: ${pnj.sante.toFixed(0)}`);

    // --- Logique spécifique par Type de Bâtiment --- 

    if (batiment.type === 'maison') {
      // À la maison, on se repose bien et on peut manger un peu
      pnj.besoins.fatigue = Math.min(100, pnj.besoins.fatigue + 50); // Bon repos
      pnj.energie = Math.min(100, pnj.energie + 40);
      pnj.besoins.faim = Math.min(100, pnj.besoins.faim + 25); // Petit encas
      console.log(`🏠 SATISFACTION (Maison): ${pnj.nom} se repose et mange. Fatigue: ${pnj.besoins.fatigue.toFixed(0)}, Énergie: ${pnj.energie.toFixed(0)}, Faim: ${pnj.besoins.faim.toFixed(0)}`);
    }
    
    if (batiment.type === 'taverne') {
      // À la taverne, on boit, on socialise, on se divertit
      pnj.besoins.soif = Math.min(100, pnj.besoins.soif + 70); // Étanche bien la soif
      pnj.besoins.social = Math.min(100, pnj.besoins.social + 45);
      pnj.besoins.divertissement = Math.min(100, pnj.besoins.divertissement + 25);
      console.log(`🍻 SATISFACTION (Taverne): ${pnj.nom} boit et socialise. Soif: ${pnj.besoins.soif.toFixed(0)}, Social: ${pnj.besoins.social.toFixed(0)}, Divertissement: ${pnj.besoins.divertissement.toFixed(0)}`);
    }
    
    if (batiment.type === 'marche') {
       // Au marché, on socialise un peu et on se divertit
       pnj.besoins.social = Math.min(100, pnj.besoins.social + 20); 
       pnj.besoins.divertissement = Math.min(100, pnj.besoins.divertissement + 15);
       console.log(`🧺 SATISFACTION (Marché): ${pnj.nom} socialise. Social: ${pnj.besoins.social.toFixed(0)}, Divertissement: ${pnj.besoins.divertissement.toFixed(0)}`);
    }
    
    if (batiment.type === 'bibliotheque') {
      // À la bibliothèque, on se cultive (divertissement)
      pnj.besoins.divertissement = Math.min(100, pnj.besoins.divertissement + 40);
      console.log(`📚 SATISFACTION (Bibliothèque): ${pnj.nom} s'est cultivé. Divertissement: ${pnj.besoins.divertissement.toFixed(0)}`);
    }

    // --- Logique basée sur les Services (peut compléter la logique par type) --- 
    
    if (batiment.services.includes('repas') && batiment.type !== 'maison') { // Éviter double augmentation si maison
      pnj.besoins.faim = Math.min(100, pnj.besoins.faim + 50);
      console.log(`🍽️ SATISFACTION (Service Repas): ${pnj.nom} s'est restauré. Faim: ${pnj.besoins.faim.toFixed(0)}`);
    }
    
    if (batiment.services.includes('boissons') && batiment.type !== 'taverne') { // Éviter double augmentation si taverne
      pnj.besoins.soif = Math.min(100, pnj.besoins.soif + 60);
      console.log(`🥤 SATISFACTION (Service Boissons): ${pnj.nom} a étanché sa soif. Soif: ${pnj.besoins.soif.toFixed(0)}`);
    }
    
    if (batiment.services.includes('repos') && batiment.type !== 'maison') { // Éviter double augmentation si maison
      pnj.besoins.fatigue = Math.min(100, pnj.besoins.fatigue + 40);
      pnj.energie = Math.min(100, pnj.energie + 30);
      console.log(`😴 SATISFACTION (Service Repos): ${pnj.nom} s'est reposé. Fatigue: ${pnj.besoins.fatigue.toFixed(0)}, Énergie: ${pnj.energie.toFixed(0)}`);
    }
    
    if (batiment.services.includes('soins')) {
      pnj.sante = Math.min(100, pnj.sante + 70);
      console.log(`🏥 SATISFACTION (Service Soins): ${pnj.nom} a reçu des soins. Santé: ${pnj.sante.toFixed(0)}`);
    }
    
    // Note : La logique pour 'social' et 'divertissement' basée sur le type semble plus pertinente 
    // que de se baser sur un service générique ici, donc on laisse les if par type ci-dessus.

    console.log(`📈 SATISFACTION: Besoins après - Faim: ${pnj.besoins.faim.toFixed(0)}, Soif: ${pnj.besoins.soif.toFixed(0)}, Fatigue: ${pnj.besoins.fatigue.toFixed(0)}, Social: ${pnj.besoins.social.toFixed(0)}, Énergie: ${pnj.energie.toFixed(0)}, Santé: ${pnj.sante.toFixed(0)}`);

    // Ajouter une entrée dans l'historique
    pnj.historique.push({
      timestamp: Date.now(),
      etat: pnj.etatActuel,
      action: `${pnj.nom} a satisfait ses besoins à ${batiment.nom}.`
    });
  }
} 