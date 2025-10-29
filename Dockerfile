# Utiliser une image Node.js officielle
FROM node:22-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /usr/src/app

# Copier les fichiers de manifeste de paquets
COPY package*.json ./

# Installer les outils de build nécessaires pour les dépendances natives sur Alpine
RUN apk add --no-cache g++ make python3 linux-headers

# Installer les dépendances de production
RUN npm install --production

# Copier la configuration par défaut dans un répertoire séparé
COPY config/ /app-defaults/

# Copier le reste du code source
COPY . .

# Corriger les fins de ligne pour la compatibilité Linux et rendre le script exécutable
RUN sed -i 's/\r$//' /usr/src/app/entrypoint.sh && chmod +x /usr/src/app/entrypoint.sh

# Exposer le port sur lequel le serveur tourne
EXPOSE 3003

# Définir le script d'entrée
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]

# Commande par défaut à passer à l'entrypoint
CMD ["node", "server.js"]