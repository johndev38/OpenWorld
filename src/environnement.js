"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.chargerEnvironnement = chargerEnvironnement;
exports.sauvegarderEnvironnement = sauvegarderEnvironnement;
exports.getEnvironnement = getEnvironnement;
exports.avancerTemps = avancerTemps;
exports.mettreAJourBesoinsPNJ = mettreAJourBesoinsPNJ;
exports.getBatimentById = getBatimentById;
exports.getBatimentsByType = getBatimentsByType;
exports.getBatimentsParService = getBatimentsParService;
exports.estBatimentOuvert = estBatimentOuvert;
exports.entrerDansBatiment = entrerDansBatiment;
exports.sortirDuBatiment = sortirDuBatiment;
exports.getLieuActuel = getLieuActuel;
exports.determinerNouvelEtatSelonEnvironnement = determinerNouvelEtatSelonEnvironnement;
exports.initialiserEnvironnement = initialiserEnvironnement;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Chemin vers le fichier de sauvegarde de l'environnement
const ENV_FILE_PATH = path.join(process.cwd(), 'data', 'environnement.json');
// État global de l'environnement
let environnement = {
    heure: 8, // Démarrer à 8h du matin
    minute: 0,
    jour: 1,
    meteo: 'ensoleillé',
    batiments: []
};
// Fonction pour charger l'environnement depuis le fichier
function chargerEnvironnement() {
    if (fs.existsSync(ENV_FILE_PATH)) {
        try {
            const data = fs.readFileSync(ENV_FILE_PATH, 'utf8');
            environnement = JSON.parse(data);
            console.log('Environnement chargé depuis', ENV_FILE_PATH);
            return environnement;
        }
        catch (error) {
            console.error('Erreur lors du chargement de l\'environnement:', error);
        }
    }
    // Si le fichier n'existe pas ou erreur, utiliser l'environnement par défaut
    console.log('Utilisation de l\'environnement par défaut');
    return environnement;
}
// Fonction pour sauvegarder l'environnement dans un fichier
function sauvegarderEnvironnement() {
    try {
        const dirPath = path.dirname(ENV_FILE_PATH);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(ENV_FILE_PATH, JSON.stringify(environnement, null, 2), 'utf8');
        console.log('Environnement sauvegardé dans', ENV_FILE_PATH);
    }
    catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'environnement:', error);
    }
}
// Fonction pour obtenir l'environnement actuel
function getEnvironnement() {
    return Object.assign({}, environnement);
}
// Faire avancer le temps dans l'environnement
function avancerTemps(minutes) {
    // Calculer les nouvelles minutes
    environnement.minute += minutes;
    // Gérer le passage à l'heure suivante
    while (environnement.minute >= 60) {
        environnement.minute -= 60;
        environnement.heure += 1;
        // Gérer le passage au jour suivant
        if (environnement.heure >= 24) {
            environnement.heure = 0;
            environnement.jour += 1;
            // Cycle des jours (simpliste)
            if (environnement.jour > 30) {
                environnement.jour = 1;
            }
            // Changer aléatoirement la météo au nouveau jour
            const meteos = ['ensoleillé', 'nuageux', 'pluvieux', 'orageux', 'neigeux'];
            const indexMeteo = Math.floor(Math.random() * meteos.length);
            environnement.meteo = meteos[indexMeteo];
        }
    }
    console.log(`Temps avancé à Jour ${environnement.jour}, ${environnement.heure}:${environnement.minute.toString().padStart(2, '0')} - Météo: ${environnement.meteo}`);
    sauvegarderEnvironnement();
}
/**
 * Met à jour les besoins des PNJ en fonction du temps écoulé
 * @param pnjs Liste des PNJ à mettre à jour
 * @param minutes Nombre de minutes écoulées
 */
function mettreAJourBesoinsPNJ(pnjs, minutes) {
    // Facteurs de diminution des besoins par minute
    const facteurs = {
        faim: 0.15, // Diminution de la satiété
        soif: 0.25, // Diminution plus rapide pour la soif
        fatigue: 0.1, // Augmentation de la fatigue
        social: 0.05, // Diminution du besoin social
        divertissement: 0.1, // Diminution du divertissement
        energie: 0.1 // Diminution de l'énergie
    };
    console.log(`🔄 BESOINS: Mise à jour des besoins de ${pnjs.length} PNJ(s) pour ${minutes} minutes écoulées`);
    pnjs.forEach(pnj => {
        // Facteurs modifiés selon la météo
        let facteurMeteo = 1.0;
        if (environnement.meteo === 'pluvieux') {
            facteurMeteo = 1.2; // Plus fatigant par temps pluvieux
        }
        else if (environnement.meteo === 'orageux') {
            facteurMeteo = 1.5; // Encore plus fatigant par temps orageux
        }
        else if (environnement.meteo === 'ensoleillé') {
            facteurMeteo = 0.9; // Moins fatigant par beau temps
        }
        // Diminuer les besoins en fonction du temps écoulé
        pnj.besoins.faim = Math.max(0, pnj.besoins.faim - facteurs.faim * minutes);
        pnj.besoins.soif = Math.max(0, pnj.besoins.soif - facteurs.soif * minutes);
        pnj.besoins.fatigue = Math.max(0, pnj.besoins.fatigue - facteurs.fatigue * minutes * facteurMeteo);
        pnj.besoins.social = Math.max(0, pnj.besoins.social - facteurs.social * minutes);
        pnj.besoins.divertissement = Math.max(0, pnj.besoins.divertissement - facteurs.divertissement * minutes);
        pnj.energie = Math.max(0, pnj.energie - facteurs.energie * minutes * facteurMeteo);
        // Si un PNJ est vraiment épuisé, sa santé diminue
        if (pnj.besoins.fatigue < 10 || pnj.besoins.faim < 5 || pnj.besoins.soif < 5) {
            pnj.sante = Math.max(0, pnj.sante - 0.1 * minutes);
        }
        // Effets de la météo sur la santé
        if (environnement.meteo === 'neigeux' && pnj.localisation.exterieur) {
            pnj.sante = Math.max(0, pnj.sante - 0.2 * minutes);
        }
        else if (environnement.meteo === 'orageux' && pnj.localisation.exterieur) {
            pnj.sante = Math.max(0, pnj.sante - 0.15 * minutes);
        }
        // Mettre à jour le niveau de bonheur en fonction des besoins
        let bonheur = 100;
        bonheur -= (100 - pnj.besoins.faim) * 0.2;
        bonheur -= (100 - pnj.besoins.soif) * 0.15;
        bonheur -= (100 - pnj.besoins.fatigue) * 0.15;
        bonheur -= (100 - pnj.besoins.social) * 0.2;
        bonheur -= (100 - pnj.besoins.divertissement) * 0.1;
        bonheur -= (100 - pnj.sante) * 0.2;
        pnj.bonheur = Math.max(0, Math.min(100, bonheur));
    });
}
// Trouver un bâtiment par son ID
function getBatimentById(id) {
    return environnement.batiments.find(b => b.id === id);
}
// Trouver des bâtiments par type
function getBatimentsByType(type) {
    return environnement.batiments.filter(b => b.type === type);
}
// Trouver des bâtiments offrant un service spécifique
function getBatimentsParService(service) {
    return environnement.batiments.filter(b => b.services.includes(service) &&
        estBatimentOuvert(b));
}
// Vérifier si un bâtiment est ouvert à l'heure actuelle
function estBatimentOuvert(batiment) {
    const heure = environnement.heure;
    // Cas spécial: ouvert 24/24
    if (batiment.heureOuverture === 0 && batiment.heureFermeture === 24) {
        return true;
    }
    // Cas standard: heure d'ouverture < heure de fermeture
    if (batiment.heureOuverture < batiment.heureFermeture) {
        return heure >= batiment.heureOuverture && heure < batiment.heureFermeture;
    }
    // Cas spécial: ouvert jusqu'au lendemain (ex: bar ouvert de 17h à 2h du matin)
    return heure >= batiment.heureOuverture || heure < batiment.heureFermeture;
}
// Faire entrer un PNJ dans un bâtiment
function entrerDansBatiment(pnj, batimentId) {
    var _a;
    const batiment = getBatimentById(batimentId);
    if (!batiment) {
        console.log(`${pnj.nom} ne peut pas entrer: bâtiment ${batimentId} introuvable.`);
        return false;
    }
    if (!estBatimentOuvert(batiment)) {
        console.log(`${pnj.nom} ne peut pas entrer: ${batiment.nom} est fermé.`);
        return false;
    }
    if (batiment.occupants.length >= batiment.capacite) {
        console.log(`${pnj.nom} ne peut pas entrer: ${batiment.nom} est à pleine capacité.`);
        return false;
    }
    // Sortir du bâtiment actuel si nécessaire
    if ((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.batimentId) {
        sortirDuBatiment(pnj);
    }
    // Mettre à jour la localisation du PNJ
    pnj.localisation = {
        batimentId: batiment.id,
        exterieur: false,
        position: batiment.position // Utiliser la position du bâtiment
    };
    // Ajouter le PNJ aux occupants du bâtiment
    batiment.occupants.push(pnj.id);
    console.log(`${pnj.nom} est entré dans ${batiment.nom}.`);
    sauvegarderEnvironnement();
    return true;
}
// Faire sortir un PNJ d'un bâtiment
function sortirDuBatiment(pnj) {
    var _a;
    if (!((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.batimentId)) {
        return; // Déjà à l'extérieur
    }
    const batimentId = pnj.localisation.batimentId;
    const batiment = getBatimentById(batimentId);
    if (batiment) {
        // Retirer le PNJ des occupants du bâtiment
        batiment.occupants = batiment.occupants.filter(id => id !== pnj.id);
        console.log(`${pnj.nom} est sorti de ${batiment.nom}.`);
    }
    // Mettre à jour la localisation du PNJ
    pnj.localisation = {
        exterieur: true,
        position: batiment ? batiment.position : { x: 0, y: 0 } // Utiliser la position du bâtiment ou une position par défaut
    };
    sauvegarderEnvironnement();
}
// Obtenir la localisation actuelle d'un PNJ
function getLieuActuel(pnj) {
    var _a;
    if ((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.batimentId) {
        const batiment = getBatimentById(pnj.localisation.batimentId);
        return {
            lieu: batiment ? batiment.nom : 'Bâtiment inconnu',
            type: batiment ? batiment.type : 'inconnu'
        };
    }
    return {
        lieu: 'Extérieur',
        type: 'exterieur'
    };
}
// Déterminer le nouvel état en fonction de l'environnement
function determinerNouvelEtatSelonEnvironnement(pnj) {
    const heure = environnement.heure;
    // État par défaut
    let nouvelEtat = {
        activite: 'repos'
    };
    let lieuSuggere;
    // Logique basée sur l'heure
    if (heure >= 9 && heure < 17) {
        // Pendant les heures de travail
        nouvelEtat = {
            activite: 'travail'
        };
        const batimentsTravail = getBatimentsByType(pnj.profession === 'forgeron' ? 'forge' :
            pnj.profession === 'tavernier' ? 'taverne' :
                pnj.profession === 'marchand' ? 'marche' :
                    pnj.profession === 'bibliothécaire' ? 'bibliotheque' :
                        pnj.profession === 'prêtre' ? 'temple' :
                            pnj.profession === 'garde' ? 'caserne' : 'maison');
        if (batimentsTravail.length > 0) {
            lieuSuggere = batimentsTravail[0].id;
        }
    }
    else if (heure >= 12 && heure < 14) {
        // Heure du repas
        nouvelEtat = {
            activite: 'repas'
        };
        const batimentsRepas = getBatimentsParService('repas');
        if (batimentsRepas.length > 0) {
            lieuSuggere = batimentsRepas[0].id;
        }
    }
    else if (heure >= 20 || heure < 6) {
        // Nuit - repos
        nouvelEtat = {
            activite: 'repos'
        };
        const batimentsRepos = getBatimentsParService('repos');
        if (batimentsRepos.length > 0) {
            lieuSuggere = batimentsRepos[0].id;
        }
    }
    else if (heure >= 17 && heure < 20) {
        // Soirée - social
        nouvelEtat = {
            activite: 'social'
        };
        const batimentsSocial = getBatimentsParService('boissons');
        if (batimentsSocial.length > 0) {
            lieuSuggere = batimentsSocial[0].id;
        }
    }
    // Si un lieu est suggéré, l'ajouter à l'état
    if (lieuSuggere) {
        nouvelEtat.batimentCible = lieuSuggere;
    }
    return { etat: nouvelEtat, lieu: lieuSuggere };
}
// Initialiser l'environnement avec des bâtiments par défaut
function initialiserEnvironnement() {
    // Charger l'environnement existant ou utiliser les valeurs par défaut
    environnement = chargerEnvironnement();
    // Si aucun bâtiment n'existe, créer les bâtiments par défaut
    if (environnement.batiments.length === 0) {
        environnement.batiments = [
            {
                id: 'maison_1',
                nom: 'Maison du Maire',
                type: 'maison',
                position: { x: 0, y: 0 },
                occupants: [],
                capacite: 5,
                heureOuverture: 0,
                heureFermeture: 24,
                services: ['repos']
            },
            {
                id: 'taverne_1',
                nom: 'Taverne du Dragon Joyeux',
                type: 'taverne',
                position: { x: 10, y: 10 },
                occupants: [],
                capacite: 20,
                heureOuverture: 10,
                heureFermeture: 2,
                services: ['repas', 'boissons', 'repos']
            },
            {
                id: 'forge_1',
                nom: 'Forge du Marteau d\'Or',
                type: 'forge',
                position: { x: -10, y: 5 },
                occupants: [],
                capacite: 5,
                heureOuverture: 8,
                heureFermeture: 18,
                services: ['forge', 'commerce']
            },
            {
                id: 'bibliotheque_1',
                nom: 'Bibliothèque Municipale',
                type: 'bibliotheque',
                position: { x: 5, y: -5 },
                occupants: [],
                capacite: 15,
                heureOuverture: 9,
                heureFermeture: 17,
                services: ['formation', 'repos']
            },
            {
                id: 'marche_1',
                nom: 'Marché Central',
                type: 'marche',
                position: { x: 15, y: 15 },
                occupants: [],
                capacite: 50,
                heureOuverture: 6,
                heureFermeture: 18,
                services: ['commerce', 'repas']
            },
            {
                id: 'temple_1',
                nom: 'Temple de la Sagesse',
                type: 'temple',
                position: { x: -5, y: -10 },
                occupants: [],
                capacite: 30,
                heureOuverture: 6,
                heureFermeture: 20,
                services: ['priere', 'soins']
            },
            {
                id: 'caserne_1',
                nom: 'Caserne de la Garde',
                type: 'caserne',
                position: { x: -15, y: -15 },
                occupants: [],
                capacite: 25,
                heureOuverture: 0,
                heureFermeture: 24,
                services: ['protection']
            }
        ];
        // Sauvegarder l'environnement initialisé
        sauvegarderEnvironnement();
        console.log('Environnement initialisé avec les bâtiments par défaut');
    }
}
