# WireGuard Manager

WireGuard Manager is a lightweight web interface designed to simplify the management of WireGuard configurations, especially in a Docker environment. It allows you to quickly switch configurations and automatically restart dependent containers (like Gluetun, qBittorrent, etc.) to apply the new network settings.

![Screenshot](https://raw.githubusercontent.com/fuzzzor/wireguard-manager/main/screenshot.png)

## Features

- **Simple Web Interface:** A clean interface to view and manage your configuration files.
- **One-Click Activation:** Select a `.conf` file and activate it. The application automatically copies it as `wg0.conf`.
- **Automatic Restart:** Restarts one or more specified Docker containers after activating a new configuration.
- **Status View:** Displays the currently active configuration (`wg0.conf`).
- **Operation History:** Keeps a log of the latest actions performed.
- **Notifications:** Provides real-time feedback on the success or failure of operations.

---

## Prerequisites

### WireGuard Configuration Files

This application does not generate WireGuard configurations. You must provide your own `.conf` files.

- **Source:** These files are typically provided by your WireGuard-compatible VPN service (e.g., Mullvad, ProtonVPN, etc.).
- **Placement:** You must place these `.conf` files in a folder on your host machine. This folder will then be mounted as a volume into the WireGuard Manager container. This is how the application reads and manages them.

For instance, if you use the `gluetun` container, you likely already have a folder containing your configurations. You will mount this same folder into WireGuard Manager.

---

## Deployment

You can deploy WireGuard Manager using Docker Compose (recommended) or a simple `docker run` command.

### 1. Docker Compose (Recommended)

Here is an example `docker-compose.yml` file:

```yaml
services:
  app:
    image: ghcr.io/fuzzzor/wireguard-manager:latest
    container_name: wireguard-manager
    restart: unless-stopped
    ports:
      - "3003:3003"
    environment:
      - WIREGUARD_DIR=/etc/wireguard
      - CONTAINER_TO_RESTART=gluetun,qBittorrent
      - TZ=Europe/Paris
    volumes:
      # For application history persistence
      - ./wireguard-manager/config:/root/.config
      
      # --- IMPORTANT VOLUME ---
      # Mount the folder containing your .conf files here
      - ./gluetun/wireguard:/etc/wireguard
      
      # --- MANDATORY VOLUME ---
      # Required to allow restarting other containers
      - /var/run/docker.sock:/var/run/docker.sock
```

**To launch:**
```bash
docker-compose up -d
```

### 2. `docker run` Command Line

You can also launch the container with the following command:

```bash
docker run -d \
  --name=wireguard-manager \
  --restart=unless-stopped \
  -p 3003:3003 \
  -e WIREGUARD_DIR=/etc/wireguard \
  -e CONTAINER_TO_RESTART="gluetun,qBittorrent" \
  -e TZ=Europe/Paris \
  -v ./wireguard-manager/config:/root/.config \
  -v ./gluetun/wireguard:/etc/wireguard \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/fuzzzor/wireguard-manager:latest
```

---

## Configuration

### Environment Variables

- `WIREGUARD_DIR`: (Required) The path *inside the container* where your `.conf` files are located. This path must match the destination of the volume you mount.
- `CONTAINER_TO_RESTART`: (Required) The name(s) of the Docker container(s) to restart after a configuration change. Separate names with a comma (e.g., `gluetun,qbittorrent`).
- `TZ`: (Optional) The timezone to use for timestamps in the history (e.g., `Europe/Paris`).

### Volumes

- `./wireguard-manager/config:/root/.config`: (Recommended) This volume ensures the persistence of the operation history.
- `./gluetun/wireguard:/etc/wireguard`: (Required) This is the core of the application.
    - The left path (`./gluetun/wireguard`) is the folder on your **host** machine where you have stored your `.conf` files.
    - The right path (`/etc/wireguard`) is the folder **inside the container** where the application will look for the files. It must match the `WIREGUARD_DIR` variable.
- `/var/run/docker.sock:/var/run/docker.sock`: (Required) This volume is crucial for the restart functionality.
    - **Why is this necessary?** The `docker.sock` file is a Unix socket that allows communication with the host's Docker daemon. By mounting this volume, you grant the WireGuard Manager container permission to send commands (like "restart") to the Docker daemon, thus allowing it to restart other containers on the same host. Without it, the automatic restart feature will not work.

---
<br>

# WireGuard Manager (Français)

WireGuard Manager est une interface web légère conçue pour simplifier la gestion des configurations WireGuard, en particulier dans un environnement Docker. Elle permet de changer rapidement de configuration et de redémarrer automatiquement les conteneurs dépendants (comme Gluetun, qBittorrent, etc.) pour appliquer les nouveaux paramètres réseau.

![Screenshot](https://raw.githubusercontent.com/fuzzzor/wireguard-manager/main/screenshot.png)

## Fonctionnalités

- **Interface Web Simple :** Une interface claire pour visualiser et gérer vos fichiers de configuration.
- **Activation en un Clic :** Sélectionnez un fichier `.conf` et activez-le. L'application le copie automatiquement en tant que `wg0.conf`.
- **Redémarrage Automatique :** Redémarre un ou plusieurs conteneurs Docker spécifiés après l'activation d'une nouvelle configuration.
- **Visualisation de l'État :** Affiche la configuration actuellement active (`wg0.conf`).
- **Historique des Opérations :** Garde une trace des dernières actions effectuées.
- **Notifications :** Fournit des retours en temps réel sur le succès ou l'échec des opérations.

---

## Prérequis

### Fichiers de Configuration WireGuard

Cette application ne génère pas de configurations WireGuard. Vous devez fournir vos propres fichiers `.conf`.

- **Source :** Ces fichiers sont généralement fournis par votre service VPN compatible WireGuard (par exemple Mullvad, ProtonVPN, etc.).
- **Placement :** Vous devez placer ces fichiers `.conf` dans un dossier sur votre machine hôte. Ce dossier sera ensuite monté en tant que volume dans le conteneur WireGuard Manager. C'est ce qui permet à l'application de les lire et de les gérer.

Par exemple, si vous utilisez le conteneur `gluetun`, vous avez probablement déjà un dossier contenant vos configurations. Vous monterez ce même dossier dans WireGuard Manager.

---

## Déploiement

Vous pouvez déployer WireGuard Manager en utilisant Docker Compose (recommandé) ou une simple commande `docker run`.

### 1. Docker Compose (Recommandé)

Voici un exemple de fichier `docker-compose.yml` :

```yaml
services:
  app:
    image: ghcr.io/fuzzzor/wireguard-manager:latest
    container_name: wireguard-manager
    restart: unless-stopped
    ports:
      - "3003:3003"
    environment:
      - WIREGUARD_DIR=/etc/wireguard
      - CONTAINER_TO_RESTART=gluetun,qBittorrent
      - TZ=Europe/Paris
    volumes:
      # Persistance de l'historique de l'application
      - ./wireguard-manager/config:/root/.config
      
      # --- VOLUME IMPORTANT ---
      # Montez ici le dossier contenant vos fichiers .conf
      - ./gluetun/wireguard:/etc/wireguard
      
      # --- VOLUME OBLIGATOIRE ---
      # Nécessaire pour permettre le redémarrage d'autres conteneurs
      - /var/run/docker.sock:/var/run/docker.sock
```

**Pour lancer :**
```bash
docker-compose up -d
```

### 2. Ligne de Commande `docker run`

Vous pouvez également lancer le conteneur avec la commande suivante :

```bash
docker run -d \
  --name=wireguard-manager \
  --restart=unless-stopped \
  -p 3003:3003 \
  -e WIREGUARD_DIR=/etc/wireguard \
  -e CONTAINER_TO_RESTART="gluetun,qBittorrent" \
  -e TZ=Europe/Paris \
  -v ./wireguard-manager/config:/root/.config \
  -v ./gluetun/wireguard:/etc/wireguard \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/fuzzzor/wireguard-manager:latest
```

---

## Configuration

### Variables d'Environnement

- `WIREGUARD_DIR` : (Obligatoire) Chemin *à l'intérieur du conteneur* où se trouvent vos fichiers de configuration `.conf`. Ce chemin doit correspondre à la destination du volume que vous montez.
- `CONTAINER_TO_RESTART` : (Obligatoire) Le ou les noms des conteneurs Docker à redémarrer après un changement de configuration. Séparez les noms par une virgule (ex: `gluetun,qbittorrent`).
- `TZ` : (Optionnel) Le fuseau horaire à utiliser pour l'horodatage dans l'historique. (ex: `Europe/Paris`).

### Volumes

- `./wireguard-manager/config:/root/.config` : (Recommandé) Ce volume assure la persistance de l'historique des opérations.
- `./gluetun/wireguard:/etc/wireguard` : (Obligatoire) C'est le cœur de l'application.
    - Le chemin de gauche (`./gluetun/wireguard`) est le dossier sur votre machine **hôte** où vous avez stocké vos fichiers `.conf`.
    - Le chemin de droite (`/etc/wireguard`) est le dossier **à l'intérieur du conteneur** où l'application va chercher les fichiers. Il doit correspondre à la variable `WIREGUARD_DIR`.
- `/var/run/docker.sock:/var/run/docker.sock` : (Obligatoire) Ce volume est crucial pour la fonctionnalité de redémarrage.
    - **Pourquoi est-ce nécessaire ?** Le fichier `docker.sock` est une socket Unix qui permet de communiquer avec le démon Docker de l'hôte. En montant ce volume, vous donnez au conteneur WireGuard Manager la permission d'envoyer des commandes (comme "restart") au démon Docker, lui permettant ainsi de redémarrer d'autres conteneurs sur le même hôte. Sans cela, la fonction de redémarrage automatique ne fonctionnera pas.
