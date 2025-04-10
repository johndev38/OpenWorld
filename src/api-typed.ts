import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import * as path from 'path';
import { PNJ, Profession, Personnalite, ElementDecor, Position, TypeElementDecor } from './types';
import { creerPNJParDefaut } from './pnj';
import { genererBackground, genererDialogue, genererNomAleatoire, genererTraitsPersonnalite, analyserEtSuggererProfessions } from './ia';
import { 
  Simulation,
  demarrerSimulation, 
  arreterSimulation, 
  etatSimulation, 
  getPNJs, 
  getPNJById, 
  simulation
} from './simulation';
import { BatimentService } from './services/BatimentService';
import { DeplacementService } from './services/DeplacementService';
import { 
  ajouterElementDecor, 
  supprimerElementDecor, 
  getElementsDecor, 
  getElementsDecorParType, 
  ajouterArbre, 
  genererArbresAleatoires,
  initialiserEnvironnement
} from './environnement';
import { PathfindingService } from './services/PathfindingService';

// Interfaces pour les requêtes typées
interface CreatePNJRequest {
  nom?: string;
  age?: number;
  profession?: string;
  personnalite?: string[] | string;
  genererBackground?: boolean;
  monde?: string;
  epoque?: string;
}

interface DialogueRequest {
  id1: string;
  id2: string;
}

interface DeplacementPositionRequest {
  x: number;
  y: number;
}

interface DeplacementBatimentRequest {
  batimentId: string;
}

interface ErrorResponse {
  erreur: string;
}

interface SuccessResponse {
  message: string;
}

// Interface pour ajouter un élément de décor
interface AjoutElementDecorRequest {
  type: TypeElementDecor;
  position: Position;
  taille?: number;
  bloquant?: boolean;
}

// Interface pour générer des arbres aléatoires
interface GenerationArbresRequest {
  nombre: number;
  zoneMin: Position;
  zoneMax: Position;
}

// Créer l'application Express
const app = express();
app.use(cors());
app.use(express.json());

// Créer un routeur pour les routes API
const router: Router = express.Router();

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, '../public')));

// Définir le port
const PORT = process.env.PORT || 3000;

// Route racine qui redirige vers la visualisation
router.get('/', (req: Request, res: Response): void => {
  res.redirect('/index.html');
});

// Route pour la documentation de l'API
router.get('/api', (req: Request, res: Response): void => {
  res.json({
    message: 'API de gestion des PNJ - OpenWorld',
    version: '1.0.0',
    endpoints: [
      { route: '/api/pnjs', description: 'Liste tous les PNJ' },
      { route: '/api/pnjs/:id', description: 'Détails d\'un PNJ spécifique' },
      { route: '/api/simulation/etat', description: 'État actuel de la simulation' },
      { route: '/api/simulation/demarrer', description: 'Démarrer la simulation' },
      { route: '/api/simulation/arreter', description: 'Arrêter la simulation' },
      { route: '/api/elements-decor', description: 'Liste tous les éléments de décor' },
      { route: '/api/elements-decor/:type', description: 'Liste les éléments de décor d\'un type spécifique' },
      { route: '/api/elements-decor', method: 'POST', description: 'Ajoute un nouvel élément de décor' },
      { route: '/api/elements-decor/:id', method: 'DELETE', description: 'Supprime un élément de décor' },
      { route: '/api/elements-decor/reinitialiser', method: 'POST', description: 'Réinitialise tous les éléments de décor' },
      { route: '/api/arbres', method: 'POST', description: 'Ajoute un nouvel arbre' },
      { route: '/api/arbres/generer', method: 'POST', description: 'Génère des arbres aléatoirement' }
    ]
  });
});

// Route pour lister tous les PNJ
router.get('/api/pnjs', (req: Request, res: Response): void => {
  res.json(getPNJs());
});

// Route pour obtenir tous les bâtiments
router.get('/api/batiments', (req: Request, res: Response): void => {
  const batimentService = BatimentService.getInstance();
  res.json(batimentService.getAllBatiments());
});

// Route pour obtenir un PNJ par son ID
router.get('/api/pnjs/:id', (req: Request<{id: string}>, res: Response<PNJ | ErrorResponse>): void => {
  const id = req.params.id;
  const pnj = getPNJById(id);
  
  if (pnj) {
    res.json(pnj);
  } else {
    res.status(404).json({ erreur: `PNJ avec ID ${id} non trouvé` });
  }
});

// Route pour créer un nouveau PNJ
router.post('/api/pnjs', async (req: Request<{}, {}, CreatePNJRequest>, res: Response): Promise<void> => {
  try {
    // Extraire les informations de base de la requête
    const { nom, age, profession, personnalite, monde, epoque } = req.body;
    
    // Compléter les informations manquantes avec des valeurs par défaut ou générées
    const pnjInfo = {
      nom: nom || genererNomAleatoire(),
      age: age || Math.floor(Math.random() * 50) + 20, // 20-70 ans
      profession: profession || 'habitant',
      personnalite: personnalite || genererTraitsPersonnalite()
    };
    
    // Créer le PNJ avec les informations de base
    const nouveauPNJ = creerPNJParDefaut(
      pnjInfo.nom,
      pnjInfo.age,
      (pnjInfo.profession as unknown as Profession),
      (Array.isArray(pnjInfo.personnalite) ? pnjInfo.personnalite[0] as Personnalite : pnjInfo.personnalite as unknown as Personnalite)
    );
    
    // Générer un background via l'IA si demandé
    if (req.body.genererBackground) {
      nouveauPNJ.background = await genererBackground(nouveauPNJ, { monde, epoque });
    }
    
    // Ajouter le PNJ à la simulation via l'instance
    simulation.ajouterPNJ(nouveauPNJ);
    
    res.status(201).json(nouveauPNJ);
  } catch (error) {
    console.error('Erreur lors de la création du PNJ:', error);
    res.status(500).json({ erreur: 'Erreur lors de la création du PNJ' });
  }
});

// Route pour supprimer un PNJ
router.delete('/api/pnjs/:id', (req: Request<{id: string}>, res: Response<SuccessResponse | ErrorResponse>): void => {
  const id = req.params.id;
  // Retirer le PNJ via l'instance
  const supprime = simulation.retirerPNJ(id);
  
  if (supprime) {
    res.json({ message: `PNJ avec ID ${id} supprimé avec succès` });
  } else {
    res.status(404).json({ erreur: `PNJ avec ID ${id} non trouvé` });
  }
});

// Route pour générer un dialogue entre deux PNJ
router.post('/api/dialogues', async (req: Request<{}, {}, DialogueRequest>, res: Response): Promise<void> => {
  try {
    const { id1, id2 } = req.body;
    
    if (!id1 || !id2) {
      res.status(400).json({ erreur: 'Les IDs des deux PNJ sont requis' });
      return;
    }
    
    const pnj1 = getPNJById(id1);
    const pnj2 = getPNJById(id2);
    
    if (!pnj1 || !pnj2) {
      res.status(404).json({ erreur: 'Un ou plusieurs PNJ non trouvés' });
      return;
    }
    
    const dialogue = await genererDialogue(pnj1, pnj2);
    res.json({ dialogue });
  } catch (error) {
    console.error('Erreur lors de la génération du dialogue:', error);
    res.status(500).json({ erreur: 'Erreur lors de la génération du dialogue' });
  }
});

// Route pour obtenir l'état de la simulation
router.get('/api/simulation/etat', (req: Request, res: Response): void => {
  res.json(etatSimulation());
});

// Route pour démarrer la simulation
router.post('/api/simulation/demarrer', (req: Request, res: Response): void => {
  demarrerSimulation();
  res.json({ message: 'Simulation démarrée' });
});

// Route pour arrêter la simulation
router.post('/api/simulation/arreter', (req: Request, res: Response): void => {
  arreterSimulation();
  res.json({ message: 'Simulation arrêtée' });
});

// Route pour obtenir des suggestions de professions
router.get('/api/suggestions/professions', async (req: Request, res: Response): Promise<void> => {
  try {
    const monde = (req.query.monde as string) || 'contemporain';
    const epoque = (req.query.epoque as string) || '';
    
    const professions = await analyserEtSuggererProfessions({ monde, epoque });
    res.json({ professions });
  } catch (error) {
    console.error('Erreur lors de la génération des professions:', error);
    res.status(500).json({ erreur: 'Erreur lors de la génération des professions' });
  }
});

// Route pour déplacer un PNJ vers une position ou un bâtiment
router.post('/api/pnjs/:id/deplacer', (req: Request<{id: string}, {}, DeplacementPositionRequest | DeplacementBatimentRequest>, res: Response): void => {
  const id = req.params.id;
  const pnj = getPNJById(id);
  
  if (!pnj) {
    res.status(404).json({ erreur: `PNJ avec ID ${id} non trouvé` });
    return;
  }
  
  const deplacementService = DeplacementService.getInstance();
  
  // Si la requête contient les coordonnées x,y
  if ('x' in req.body && 'y' in req.body) {
    const position: DeplacementPositionRequest = req.body as DeplacementPositionRequest;
    const { x, y } = position;
    
    deplacementService.deplacerVers(pnj, { x, y });
    res.json({ message: `PNJ ${pnj.nom} se déplace vers (${x}, ${y})` });
    return;
  }
  
  // Si la requête contient l'ID d'un bâtiment
  if ('batimentId' in req.body) {
    const batimentRequest: DeplacementBatimentRequest = req.body as DeplacementBatimentRequest;
    const batimentId = batimentRequest.batimentId;
    const batimentService = BatimentService.getInstance();
    const batiment = batimentService.getBatiment(batimentId);
    
    if (!batiment) {
      res.status(404).json({ erreur: `Bâtiment avec ID ${batimentId} non trouvé` });
      return;
    }
    
    deplacementService.deplacerVersBatiment(pnj, batimentId);
    res.json({ message: `PNJ ${pnj.nom} se déplace vers ${batiment.nom}` });
    return;
  }
  
  res.status(400).json({ erreur: "Paramètres manquants: fournir soit les coordonnées (x,y) soit un batimentId" });
});

// Route pour obtenir tous les éléments de décor
router.get('/api/elements-decor', (req: Request, res: Response): void => {
  res.json(getElementsDecor());
});

// Route pour obtenir les éléments de décor par type
router.get('/api/elements-decor/:type', (req: Request<{type: TypeElementDecor}>, res: Response): void => {
  const type = req.params.type as TypeElementDecor;
  const elements = getElementsDecorParType(type);
  res.json(elements);
});

// Route pour ajouter un élément de décor
router.post('/api/elements-decor', (req: Request<{}, {}, AjoutElementDecorRequest>, res: Response): void => {
  try {
    const { type, position, taille = 1, bloquant = false } = req.body;
    
    if (!type || !position) {
      res.status(400).json({ erreur: 'Type et position sont requis' });
      return;
    }
    
    const id = `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const element: ElementDecor = {
      id,
      type,
      position,
      taille,
      bloquant
    };
    
    const elementAjoute = ajouterElementDecor(element);
    res.status(201).json(elementAjoute);
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'un élément de décor:', error);
    res.status(500).json({ erreur: 'Erreur lors de l\'ajout d\'un élément de décor' });
  }
});

// Route pour ajouter un arbre spécifiquement
router.post('/api/arbres', (req: Request<{}, {}, {position: Position, taille?: number, bloquant?: boolean}>, res: Response): void => {
  try {
    const { position, taille = 1, bloquant = true } = req.body;
    
    if (!position) {
      res.status(400).json({ erreur: 'Position requise' });
      return;
    }
    
    const arbre = ajouterArbre(position, taille, bloquant);
    res.status(201).json(arbre);
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'un arbre:', error);
    res.status(500).json({ erreur: 'Erreur lors de l\'ajout d\'un arbre' });
  }
});

// Route pour générer des arbres aléatoirement
router.post('/api/arbres/generer', (req: Request<{}, {}, GenerationArbresRequest>, res: Response): void => {
  try {
    const { nombre, zoneMin, zoneMax } = req.body;
    
    if (!nombre || !zoneMin || !zoneMax) {
      res.status(400).json({ erreur: 'Nombre, zoneMin et zoneMax sont requis' });
      return;
    }
    
    const arbres = genererArbresAleatoires(nombre, zoneMin, zoneMax);
    res.status(201).json(arbres);
  } catch (error) {
    console.error('Erreur lors de la génération d\'arbres:', error);
    res.status(500).json({ erreur: 'Erreur lors de la génération d\'arbres' });
  }
});

// Route pour supprimer un élément de décor
router.delete('/api/elements-decor/:id', (req: Request<{id: string}>, res: Response<SuccessResponse | ErrorResponse>): void => {
  const id = req.params.id;
  const supprime = supprimerElementDecor(id);
  
  if (supprime) {
    res.json({ message: `Élément de décor avec ID ${id} supprimé avec succès` });
  } else {
    res.status(404).json({ erreur: `Élément de décor avec ID ${id} non trouvé` });
  }
});

// Route pour réinitialiser les éléments de décor
router.post('/api/elements-decor/reinitialiser', (req: Request, res: Response): void => {
  try {
    // Supprimer tous les éléments de décor existants
    const elementsActuels = getElementsDecor();
    elementsActuels.forEach(element => {
      supprimerElementDecor(element.id);
    });
    
    // Réinitialiser l'environnement qui créera de nouveaux éléments de décor
    initialiserEnvironnement();
    
    // Mettre à jour le pathfinding avec ces nouveaux éléments
    const batimentService = BatimentService.getInstance();
    const pathfindingService = PathfindingService.getInstance();
    pathfindingService.mettreAJourCarte(batimentService.getAllBatiments());
    
    // Retourner les nouveaux éléments
    const nouveauxElements = getElementsDecor();
    res.json({ 
      message: `${nouveauxElements.length} éléments de décor générés`, 
      elements: nouveauxElements 
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des éléments de décor:', error);
    res.status(500).json({ erreur: 'Erreur lors de la réinitialisation des éléments de décor' });
  }
});

// Utiliser le routeur
app.use('/', router);

// Démarrer le serveur
export function demarrerServeur(): void {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`   SERVEUR DE VISUALISATION DES PNJ DÉMARRÉ!`);
    console.log(`=================================================`);
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`URL du serveur API: http://localhost:${PORT}/api`);
    console.log(`URL de visualisation: http://localhost:${PORT}`);
    console.log(`-------------------------------------------------`);
    console.log(`Pour voir les PNJ se déplacer, ouvrez votre navigateur et`);
    console.log(`accédez à l'URL: http://localhost:${PORT}`);
    console.log(`=================================================`);
    
    // Initialiser la simulation au démarrage
    const simulationInstance = Simulation.getInstance(); // Assure l'initialisation
    // simulationInstance.setPNJs(getPNJs()); // Plus nécessaire ici si chargés dans le constructeur
  });
} 