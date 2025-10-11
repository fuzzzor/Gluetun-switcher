const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const Docker = require('dockerode');
// electron-store sera importé dynamiquement pour la compatibilité ESM

const app = express();
const port = 3003;

async function startServer() {
  const docker = new Docker({ socketPath: '/var/run/docker.sock' });
  const historyPath = path.join(__dirname, 'config', 'history', 'history.json');

// Middlewares
app.use(cors());
app.use(express.json()); // Pour parser le JSON dans les requêtes POST

// --- API Routes ---
// Déclarées avant les fichiers statiques pour qu'elles aient la priorité.

// Lister les fichiers WireGuard
app.get('/api/wireguard-files', async (req, res) => {
  const wireguardDir = process.env.WIREGUARD_DIR;
  if (!wireguardDir) {
    return res.status(500).json({
      success: false,
      error: "La variable d'environnement WIREGUARD_DIR n'est pas configurée sur le serveur."
    });
  }

  try {
    const files = await fs.readdir(wireguardDir);
    const confFiles = files
      .filter(file => file.endsWith('.conf') && file !== 'wg0.conf')
      .map(file => ({
        name: file,
        fullPath: path.join(wireguardDir, file)
      }));
    res.json({ success: true, files: confFiles });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la lecture du répertoire ${wireguardDir}: ${error.message}`
    });
  }
});

// Charger les données de localisation
app.get('/api/locations', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'config', 'locations.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Impossible de charger le fichier locations.json: ${error.message}`
    });
  }
});

// Activer une configuration WireGuard (renommer en wg0.conf)
app.post('/api/activate-config', async (req, res) => {
  const { sourcePath } = req.body;
  console.log(`[ACTIVATE] Received request to activate: ${sourcePath}`);
  if (!sourcePath) {
    console.error('[ACTIVATE] Error: sourcePath is missing.');
    return res.status(400).json({ success: false, error: 'Le chemin du fichier source est manquant.' });
  }

  try {
    const sourceStats = await fs.stat(sourcePath);
    if (!sourceStats.isFile()) {
      throw new Error('Le chemin source n\'est pas un fichier valide');
    }

    // Utilise la variable d'environnement pour trouver le répertoire WireGuard.
    const wireguardDir = process.env.WIREGUARD_DIR;
    if (!wireguardDir) {
      return res.status(500).json({
        success: false,
        error: "La variable d'environnement WIREGUARD_DIR n'est pas configurée sur le serveur."
      });
    }
    const wg0Path = path.join(wireguardDir, 'wg0.conf');
    const sourceName = path.basename(sourcePath);

    console.log(`[ACTIVATE] Attempting to copy '${sourcePath}' to '${wg0Path}'`);
    await fs.copyFile(sourcePath, wg0Path);
    console.log(`[ACTIVATE] Copy successful.`);
    // La dépendance 'conf' n'est plus utilisée pour stocker le nom actif.
    // Cette information est maintenant récupérée dynamiquement.

    let message = `"${sourceName}" a été copié et activé en "wg0.conf" avec succès.`;

    // Redémarrer le conteneur si la variable d'environnement est définie
    // Redémarrer le ou les conteneurs si la variable d'environnement est définie
    const containersToRestart = process.env.CONTAINER_TO_RESTART;
    if (containersToRestart) {
      const containerNames = containersToRestart.split(',').map(name => name.trim());
      const restartPromises = containerNames.map(async (containerName) => {
        if (!containerName) return; // Ignorer les noms vides
        try {
          const container = docker.getContainer(containerName);
          await container.restart();
          return ` Le conteneur "${containerName}" a été redémarré.`;
        } catch (restartError) {
          return ` ERREUR: Impossible de redémarrer le conteneur "${containerName}": ${restartError.message}`;
        }
      });

      const restartResults = await Promise.all(restartPromises);
      message += restartResults.join('');
    }

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error(`[ACTIVATE] Error during activation:`, error);
    res.status(500).json({
      success: false,
      error: `Erreur lors de l'activation: ${error.message}`
    });
  }
});

// La fonctionnalité SSH a été supprimée.

// Les routes pour les chemins de configuration et l'état de repliement ont été supprimées.

// Obtenir les informations sur la configuration active (wg0.conf)
app.get('/api/current-config-info', async (req, res) => {
  const wireguardDir = process.env.WIREGUARD_DIR;
  if (!wireguardDir) {
    return res.status(500).json({
      success: false,
      error: "La variable d'environnement WIREGUARD_DIR n'est pas configurée sur le serveur.",
      reason: 'config_error'
    });
  }
  const wg0Path = path.join(wireguardDir, 'wg0.conf');
  // On ne peut plus se fier à 'conf', on va essayer de deviner le nom
  // en se basant sur le contenu du fichier. C'est une approche moins fiable.
  // Pour une solution robuste, il faudrait une autre méthode de stockage.
  const activeConfigName = 'wg0.conf';

  try {
    const stats = await fs.stat(wg0Path);
    res.json({
      success: true,
      name: activeConfigName || 'wg0.conf',
      size: stats.size,
      lastModified: stats.mtime,
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Le fichier wg0.conf n'existe pas, ce qui est une information valide
      res.json({ success: false, reason: 'not_found' });
    } else {
      res.status(500).json({
        success: false,
        error: `Erreur lors de la lecture de wg0.conf: ${error.message}`,
        reason: 'read_error'
      });
    }
  }
});

// Gestion de l'historique des opérations
app.route('/api/operation-history')
  .get(async (req, res) => {
    try {
      const data = await fs.readFile(historyPath, 'utf8');
      res.json(JSON.parse(data));
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json([]); // Le fichier n'existe pas, renvoyer un tableau vide
      } else {
        res.status(500).json({ success: false, error: 'Impossible de lire l\'historique.' });
      }
    }
  })
  .post(async (req, res) => {
    try {
      await fs.writeFile(historyPath, JSON.stringify(req.body.history, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Impossible d\'écrire l\'historique.' });
    }
  })
  .delete(async (req, res) => {
    try {
      await fs.unlink(historyPath);
      res.json({ success: true });
    } catch (error) {
      if (error.code !== 'ENOENT') { // Ignorer si le fichier n'existe pas
        res.status(500).json({ success: false, error: 'Impossible de supprimer l\'historique.' });
      } else {
        res.json({ success: true });
      }
    }
  });

// Route pour servir la page d'accueil explicite
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'wireguard-manager.html'));
});

// Le middleware express.static sert les autres fichiers (CSS, JS, images).
// Il doit être déclaré APRES les routes de l'API.
app.use(express.static(__dirname));

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur web démarré sur http://localhost:${port}`);
});
}

startServer();
