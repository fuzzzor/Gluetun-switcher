# Utiliser une image Node.js officielle
FROM node:18-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /usr/src/app

# Copier les fichiers de manifeste de paquets
COPY package*.json ./

# Installer les outils de build nécessaires pour les dépendances natives sur Alpine
RUN apk add --no-cache g++ make python3 linux-headers

# Installer les dépendances de production
RUN npm install --production

# Copier tout le reste du code source (y compris le frontend)
COPY . .

# Exposer le port sur lequel le serveur tourne
EXPOSE 3003

# Commande pour démarrer l'application
CMD ["node", "server.js"]