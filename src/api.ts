import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import { PNJ } from './types';
import { creerPNJParDefaut } from './pnj';
import { genererBackground, genererDialogue, genererNomAleatoire, genererTraitsPersonnalite, analyserEtSuggererProfessions } from './ia';
import { 
  Simulation,
  demarrerSimulation, 
  arreterSimulation, 
  etatSimulation, 
  getPNJs, 
  getPNJById, 
  ajouterPNJ, 
  retirerPNJ 
} from './simulation';
import { BatimentService } from './services/BatimentService';
import { DeplacementService } from './services/DeplacementService';

// Créer l'application Express
const app = express();
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, '../public')));

// Définir le port
const PORT = process.env.PORT || 3000;

// Route racine qui redirige vers la visualisation
app.get('/', (req: Request, res: Response) => {
  res.redirect('/index.html');
});

// Route pour la documentation de l'API
app.get('/api', (req: Request, res: Response) => {
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
app.get('/api/pnjs', (req: Request, res: Response) => {
  res.json(getPNJs());
});

// Route pour obtenir tous les bâtiments
app.get('/api/batiments', (req: Request, res: Response) => {
  const batimentService = BatimentService.getInstance();
  res.json(batimentService.getAllBatiments());
});

// Route pour obtenir un PNJ par son ID
app.get('/api/pnjs/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const pnj = getPNJById(id);
  
  if (pnj) {
    res.json(pnj);
  } else {
    res.status(404).json({ erreur: `PNJ avec ID ${id} non trouvé` });
  }
});

// Route pour créer un nouveau PNJ
app.post('/api/pnjs', async (req: Request, res: Response) => {
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
      pnjInfo.profession,
      pnjInfo.personnalite
    );
    
    // Générer un background via l'IA si demandé
    if (req.body.genererBackground) {
      nouveauPNJ.background = await genererBackground(nouveauPNJ, { monde, epoque });
    }
    
    // Ajouter le PNJ à la simulation
    ajouterPNJ(nouveauPNJ);
    
    res.status(201).json(nouveauPNJ);
  } catch (error) {
    console.error('Erreur lors de la création du PNJ:', error);
    res.status(500).json({ erreur: 'Erreur lors de la création du PNJ' });
  }
});

// Route pour supprimer un PNJ
app.delete('/api/pnjs/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const supprime = retirerPNJ(id);
  
  if (supprime) {
    res.json({ message: `PNJ avec ID ${id} supprimé avec succès` });
  } else {
    res.status(404).json({ erreur: `PNJ avec ID ${id} non trouvé` });
  }
});

// Route pour générer un dialogue entre deux PNJ
app.post('/api/dialogues', function(req: Request, res: Response) {
  (async function() {
    try {
      const { id1, id2 } = req.body;
      
      if (!id1 || !id2) {
        return res.status(400).json({ erreur: 'Les IDs des deux PNJ sont requis' });
      }
      
      const pnj1 = getPNJById(id1);
      const pnj2 = getPNJById(id2);
      
      if (!pnj1 || !pnj2) {
        return res.status(404).json({ erreur: 'Un ou plusieurs PNJ non trouvés' });
      }
      
      const dialogue = await genererDialogue(pnj1, pnj2);
      res.json({ dialogue });
    } catch (error) {
      console.error('Erreur lors de la génération du dialogue:', error);
      res.status(500).json({ erreur: 'Erreur lors de la génération du dialogue' });
    }
  })();
});

// Route pour obtenir l'état de la simulation
app.get('/api/simulation/etat', (req: Request, res: Response) => {
  res.json(etatSimulation());
});

// Route pour démarrer la simulation
app.post('/api/simulation/demarrer', (req: Request, res: Response) => {
  demarrerSimulation();
  res.json({ message: 'Simulation démarrée' });
});

// Route pour arrêter la simulation
app.post('/api/simulation/arreter', (req: Request, res: Response) => {
  arreterSimulation();
  res.json({ message: 'Simulation arrêtée' });
});

// Route pour obtenir des suggestions de professions
app.get('/api/suggestions/professions', function(req: Request, res: Response) {
  (async function() {
    try {
      const monde = req.query.monde as string || 'contemporain';
      const epoque = req.query.epoque as string || '';
      
      const professions = await analyserEtSuggererProfessions({ monde, epoque });
      res.json({ professions });
    } catch (error) {
      console.error('Erreur lors de la génération des professions:', error);
      res.status(500).json({ erreur: 'Erreur lors de la génération des professions' });
    }
  })();
});

// Route pour déplacer un PNJ vers une position ou un bâtiment
app.post('/api/pnjs/:id/deplacer', (req: Request, res: Response) => {
  const id = req.params.id;
  const pnj = getPNJById(id);
  
  if (!pnj) {
    return res.status(404).json({ erreur: `PNJ avec ID ${id} non trouvé` });
  }
  
  const deplacementService = DeplacementService.getInstance();
  
  // Si la requête contient les coordonnées x,y
  if (req.body.x !== undefined && req.body.y !== undefined) {
    const x = parseFloat(req.body.x);
    const y = parseFloat(req.body.y);
    
    deplacementService.deplacerVers(pnj, { x, y });
    return res.json({ message: `PNJ ${pnj.nom} se déplace vers (${x}, ${y})` });
  }
  
  // Si la requête contient l'ID d'un bâtiment
  if (req.body.batimentId) {
    const batimentId = req.body.batimentId;
    const batimentService = BatimentService.getInstance();
    const batiment = batimentService.getBatiment(batimentId);
    
    if (!batiment) {
      return res.status(404).json({ erreur: `Bâtiment avec ID ${batimentId} non trouvé` });
    }
    
    deplacementService.deplacerVersBatiment(pnj, batimentId);
    return res.json({ message: `PNJ ${pnj.nom} se déplace vers ${batiment.nom}` });
  }
  
  return res.status(400).json({ erreur: "Paramètres manquants: fournir soit les coordonnées (x,y) soit un batimentId" });
});

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
    const simulation = Simulation.getInstance();
    simulation.setPNJs(getPNJs());
  });
} 