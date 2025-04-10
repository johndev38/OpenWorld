import { Batiment, TypeBatiment, Service, Position, PNJ, Profession, Personnalite } from './types';
import { creerPNJParDefaut, sauvegarderPNJ } from './pnj';
import { sauvegarderBatiment } from './batiments';
import fs from 'fs';
import path from 'path';

// Chemin vers le dossier de données
const ROOT_DIR = path.resolve(process.cwd());
const DATA_DIR = path.join(ROOT_DIR, 'data');
const ENV_FILE_PATH = path.join(DATA_DIR, 'environnement.json');

// Fonction pour initialiser les bâtiments de base
export function initialiserBatiments(): Batiment[] {
  const batiments: Batiment[] = [
    // Taverne centrale, point de rencontre social
    {
      id: 'bat_taverne_1',
      nom: 'Taverne du Voyageur Intrépide',
      type: 'taverne',
      position: { x: 10, y: 15 },
      occupants: [],
      dimensions: { largeur: 10, hauteur: 8 },
      capacite: 25,
      heureOuverture: 10,
      heureFermeture: 2, // Ferme à 2h du matin
      services: ['repas', 'boissons', 'repos', 'divertissement']
    },
    
    // Maison principale
    {
      id: 'bat_maison_1',
      nom: 'Maison du Maire',
      type: 'maison',
      position: { x: 25, y: 12 },
      occupants: [],
      dimensions: { largeur: 12, hauteur: 10 },
      capacite: 6,
      heureOuverture: 0,
      heureFermeture: 24, // Ouvert 24/24 (c'est une maison)
      services: ['repos']
    },
    
    // Forge
    {
      id: 'bat_forge_1',
      nom: 'Forge du Marteau d\'Acier',
      type: 'forge',
      position: { x: 15, y: 30 },
      occupants: [],
      dimensions: { largeur: 8, hauteur: 6 },
      capacite: 8,
      heureOuverture: 8,
      heureFermeture: 18,
      services: ['forge', 'commerce']
    },
    
    // Marché central
    {
      id: 'bat_marche_1',
      nom: 'Marché de la Place Centrale',
      type: 'marche',
      position: { x: 40, y: 40 },
      occupants: [],
      dimensions: { largeur: 20, hauteur: 20 },
      capacite: 40,
      heureOuverture: 6,
      heureFermeture: 19,
      services: ['commerce', 'repas']
    },
    
    // Bibliothèque
    {
      id: 'bat_bibliotheque_1',
      nom: 'Bibliothèque des Anciens Savoirs',
      type: 'bibliotheque',
      position: { x: 50, y: 20 },
      occupants: [],
      dimensions: { largeur: 15, hauteur: 12 },
      capacite: 20,
      heureOuverture: 9,
      heureFermeture: 17,
      services: ['formation', 'repos']
    },
    
    // Temple
    {
      id: 'bat_temple_1',
      nom: 'Temple de la Lumière',
      type: 'temple',
      position: { x: 60, y: 10 },
      occupants: [],
      dimensions: { largeur: 18, hauteur: 25 },
      capacite: 30,
      heureOuverture: 5,
      heureFermeture: 22,
      services: ['priere', 'soins']
    },
    
    // Caserne de gardes
    {
      id: 'bat_caserne_1',
      nom: 'Caserne de la Garde Royale',
      type: 'caserne',
      position: { x: 70, y: 50 },
      occupants: [],
      dimensions: { largeur: 25, hauteur: 20 },
      capacite: 35,
      heureOuverture: 0,
      heureFermeture: 24, // Ouvert 24/24
      services: ['protection', 'formation']
    },
    
    // Magasin général
    {
      id: 'bat_magasin_1',
      nom: 'Bazar des Merveilles',
      type: 'magasin',
      position: { x: 35, y: 60 },
      occupants: [],
      dimensions: { largeur: 12, hauteur: 10 },
      capacite: 15,
      heureOuverture: 8,
      heureFermeture: 20,
      services: ['commerce']
    }
  ];
  
  // Sauvegarder chaque bâtiment dans un fichier séparé
  batiments.forEach(batiment => {
    sauvegarderBatiment(batiment);
  });
  
  return batiments;
}

// Fonction pour créer un PNJ avec un ID unique
function creerPNJAvecID(
  nom: string,
  age: number,
  profession: Profession,
  personnalite: Personnalite,
  id: string
): PNJ {
  const pnj = creerPNJParDefaut(nom, age, profession, personnalite);
  pnj.id = id; // Remplacer l'ID généré automatiquement par un ID personnalisé
  return pnj;
}

// Fonction pour initialiser les PNJ de base
export function initialiserPNJs(): PNJ[] {
  const pnjs: PNJ[] = [
    // Le maire, homme politique
    creerPNJAvecID(
      'Edouard Castille', 
      58, 
      'maire', 
      'strict',
      'pnj_maire_1'
    ),
    
    // La tavernière, joviale et accueillante
    creerPNJAvecID(
      'Marielle Dubois', 
      42, 
      'tavernier', 
      'jovial',
      'pnj_tavernier_1'
    ),
    
    // Le forgeron, sérieux et travailleur
    creerPNJAvecID(
      'Gontran Forgefer', 
      39, 
      'forgeron', 
      'grognon',
      'pnj_forgeron_1'
    ),
    
    // La bibliothécaire, sage et réservée
    creerPNJAvecID(
      'Élisabeth Parchemin', 
      65, 
      'bibliothécaire', 
      'sage',
      'pnj_bibliothecaire_1'
    ),
    
    // Le garde, protecteur de la ville
    creerPNJAvecID(
      'Roland Vigile', 
      32, 
      'garde', 
      'serviable',
      'pnj_garde_1'
    )
  ];
  
  // Sauvegarder chaque PNJ dans un fichier
  pnjs.forEach(pnj => {
    // Adaptation des positions selon les bâtiments associés à leurs professions
    switch(pnj.profession) {
      case 'maire':
        pnj.localisation.position = { x: 25, y: 12 };
        pnj.localisation.batimentId = 'bat_maison_1';
        break;
      case 'tavernier':
        pnj.localisation.position = { x: 10, y: 15 };
        pnj.localisation.batimentId = 'bat_taverne_1';
        break;
      case 'forgeron':
        pnj.localisation.position = { x: 15, y: 30 };
        pnj.localisation.batimentId = 'bat_forge_1';
        break;
      case 'bibliothécaire':
        pnj.localisation.position = { x: 50, y: 20 };
        pnj.localisation.batimentId = 'bat_bibliotheque_1';
        break;
      case 'garde':
        pnj.localisation.position = { x: 70, y: 50 };
        pnj.localisation.batimentId = 'bat_caserne_1';
        break;
    }
    
    sauvegarderPNJ(pnj);
  });
  
  return pnjs;
}

// Fonction pour initialiser l'environnement complet
export function initialiserEnvironnementComplet(): void {
  // S'assurer que le dossier de données existe
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Initialiser et sauvegarder les bâtiments
  const batiments = initialiserBatiments();
  console.log(`${batiments.length} bâtiment(s) initialisés et sauvegardés.`);
  
  // Créer l'environnement
  const environnement = {
    heure: 8,
    minute: 0,
    jour: 1,
    meteo: 'ensoleillé',
    batiments: batiments
  };
  
  // Sauvegarder l'environnement
  try {
    fs.writeFileSync(ENV_FILE_PATH, JSON.stringify(environnement, null, 2), 'utf8');
    console.log('Environnement initialisé et sauvegardé dans', ENV_FILE_PATH);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'environnement:', error);
  }
  
  // Initialiser les PNJ
  const pnjs = initialiserPNJs();
  console.log(`${pnjs.length} PNJ(s) initialisés et sauvegardés.`);
}

// Si ce fichier est exécuté directement, initialiser l'environnement
if (require.main === module) {
  console.log('Initialisation du monde virtuel...');
  initialiserEnvironnementComplet();
  console.log('Initialisation terminée avec succès !');
} 