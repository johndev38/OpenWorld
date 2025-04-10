import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import * as path from 'path';
import { PNJ, Profession, Personnalite } from './types';
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

// Interfaces pour les requêtes typées
interface CreatePNJRequest {
  nom?: string;
  age?: number;
  profession?: string;
  personnalite?: string[];
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
      { route: '/api/simulation/arreter', description: 'Arrêter la simulation' }
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
router.get('/api/pnjs/:id', (req: Request, res: Response): void => {
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
      (pnjInfo.profession as Profession),
      (pnjInfo.personnalite as unknown as Personnalite)
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
router.delete('/api/pnjs/:id', (req: Request, res: Response): void => {
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
    const x = req.body.x;
    const y = req.body.y;
    
    deplacementService.deplacerVers(pnj, { x, y });
    res.json({ message: `PNJ ${pnj.nom} se déplace vers (${x}, ${y})` });
    return;
  }
  
  // Si la requête contient l'ID d'un bâtiment
  if ('batimentId' in req.body) {
    const batimentId = req.body.batimentId;
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