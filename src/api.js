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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.demarrerServeur = demarrerServeur;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
const pnj_1 = require("./pnj");
const ia_1 = require("./ia");
const simulation_1 = require("./simulation");
const BatimentService_1 = require("./services/BatimentService");
const DeplacementService_1 = require("./services/DeplacementService");
// Créer l'application Express
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Servir les fichiers statiques depuis le dossier public
app.use(express_1.default.static(path.join(__dirname, '../public')));
// Définir le port
const PORT = process.env.PORT || 3000;
// Route racine qui redirige vers la visualisation
app.get('/', (req, res) => {
    res.redirect('/index.html');
});
// Route pour la documentation de l'API
app.get('/api', (req, res) => {
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
app.get('/api/pnjs', (req, res) => {
    res.json((0, simulation_1.getPNJs)());
});
// Route pour obtenir tous les bâtiments
app.get('/api/batiments', (req, res) => {
    const batimentService = BatimentService_1.BatimentService.getInstance();
    res.json(batimentService.getAllBatiments());
});
// Route pour obtenir un PNJ par son ID
app.get('/api/pnjs/:id', (req, res) => {
    const id = req.params.id;
    const pnj = (0, simulation_1.getPNJById)(id);
    if (pnj) {
        res.json(pnj);
    }
    else {
        res.status(404).json({ erreur: `PNJ avec ID ${id} non trouvé` });
    }
});
// Route pour créer un nouveau PNJ
app.post('/api/pnjs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extraire les informations de base de la requête
        const { nom, age, profession, personnalite, monde, epoque } = req.body;
        // Compléter les informations manquantes avec des valeurs par défaut ou générées
        const pnjInfo = {
            nom: nom || (0, ia_1.genererNomAleatoire)(),
            age: age || Math.floor(Math.random() * 50) + 20, // 20-70 ans
            profession: profession || 'habitant',
            personnalite: personnalite || (0, ia_1.genererTraitsPersonnalite)()
        };
        // Créer le PNJ avec les informations de base
        const nouveauPNJ = (0, pnj_1.creerPNJParDefaut)(pnjInfo.nom, pnjInfo.age, pnjInfo.profession, pnjInfo.personnalite);
        // Générer un background via l'IA si demandé
        if (req.body.genererBackground) {
            nouveauPNJ.background = yield (0, ia_1.genererBackground)(nouveauPNJ, { monde, epoque });
        }
        // Ajouter le PNJ à la simulation
        (0, simulation_1.ajouterPNJ)(nouveauPNJ);
        res.status(201).json(nouveauPNJ);
    }
    catch (error) {
        console.error('Erreur lors de la création du PNJ:', error);
        res.status(500).json({ erreur: 'Erreur lors de la création du PNJ' });
    }
}));
// Route pour supprimer un PNJ
app.delete('/api/pnjs/:id', (req, res) => {
    const id = req.params.id;
    const supprime = (0, simulation_1.retirerPNJ)(id);
    if (supprime) {
        res.json({ message: `PNJ avec ID ${id} supprimé avec succès` });
    }
    else {
        res.status(404).json({ erreur: `PNJ avec ID ${id} non trouvé` });
    }
});
// Route pour générer un dialogue entre deux PNJ
app.post('/api/dialogues', function (req, res) {
    (function () {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id1, id2 } = req.body;
                if (!id1 || !id2) {
                    return res.status(400).json({ erreur: 'Les IDs des deux PNJ sont requis' });
                }
                const pnj1 = (0, simulation_1.getPNJById)(id1);
                const pnj2 = (0, simulation_1.getPNJById)(id2);
                if (!pnj1 || !pnj2) {
                    return res.status(404).json({ erreur: 'Un ou plusieurs PNJ non trouvés' });
                }
                const dialogue = yield (0, ia_1.genererDialogue)(pnj1, pnj2);
                res.json({ dialogue });
            }
            catch (error) {
                console.error('Erreur lors de la génération du dialogue:', error);
                res.status(500).json({ erreur: 'Erreur lors de la génération du dialogue' });
            }
        });
    })();
});
// Route pour obtenir l'état de la simulation
app.get('/api/simulation/etat', (req, res) => {
    res.json((0, simulation_1.etatSimulation)());
});
// Route pour démarrer la simulation
app.post('/api/simulation/demarrer', (req, res) => {
    (0, simulation_1.demarrerSimulation)();
    res.json({ message: 'Simulation démarrée' });
});
// Route pour arrêter la simulation
app.post('/api/simulation/arreter', (req, res) => {
    (0, simulation_1.arreterSimulation)();
    res.json({ message: 'Simulation arrêtée' });
});
// Route pour obtenir des suggestions de professions
app.get('/api/suggestions/professions', function (req, res) {
    (function () {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const monde = req.query.monde || 'contemporain';
                const epoque = req.query.epoque || '';
                const professions = yield (0, ia_1.analyserEtSuggererProfessions)({ monde, epoque });
                res.json({ professions });
            }
            catch (error) {
                console.error('Erreur lors de la génération des professions:', error);
                res.status(500).json({ erreur: 'Erreur lors de la génération des professions' });
            }
        });
    })();
});
// Route pour déplacer un PNJ vers une position ou un bâtiment
app.post('/api/pnjs/:id/deplacer', (req, res) => {
    const id = req.params.id;
    const pnj = (0, simulation_1.getPNJById)(id);
    if (!pnj) {
        return res.status(404).json({ erreur: `PNJ avec ID ${id} non trouvé` });
    }
    const deplacementService = DeplacementService_1.DeplacementService.getInstance();
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
        const batimentService = BatimentService_1.BatimentService.getInstance();
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
function demarrerServeur() {
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
        const simulation = simulation_1.Simulation.getInstance();
        simulation.setPNJs((0, simulation_1.getPNJs)());
    });
}
