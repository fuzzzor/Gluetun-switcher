// API wrapper pour communiquer avec le backend
const api = {
    async _request(method, endpoint, body = null) {
        try {
            const options = {
                method,
                headers: {}
            };
            if (body) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
            const response = await fetch(`/api/${endpoint}`, options);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `Erreur ${response.status}`);
            }
            // Gérer les réponses qui n'ont pas de corps JSON
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return response.json();
            }
            return { success: true }; // Pour les requêtes comme DELETE qui ne renvoient rien
        } catch (error) {
            console.error(`API Error on ${method} /api/${endpoint}:`, error);
            throw error;
        }
    },
    get(endpoint) { return this._request('GET', endpoint); },
    post(endpoint, body) { return this._request('POST', endpoint, body); },
    delete(endpoint) { return this._request('DELETE', endpoint); },

    // Fonctions spécifiques à l'application
    getOperationHistory: () => api.get('operation-history'),
    saveOperationHistory: (history) => api.post('operation-history', { history }),
    clearOperationHistory: () => api.delete('operation-history'),
    listWireguardFiles: () => api.get('wireguard-files'),
    getCurrentConfigInfo: () => api.get('current-config-info'),
    activateConfig: (sourcePath) => api.post('activate-config', { sourcePath }),
};


// Variables globales
let selectedFile = null;
let wireguardFiles = [];
let operationHistory = [];
let translations = {};

// Elements DOM
const refreshBtn = document.getElementById('refreshBtn');
const fileList = document.getElementById('fileList');
const activateBtn = document.getElementById('activateBtn');
const resetBtn = document.getElementById('resetBtn');
const currentConfig = document.getElementById('currentConfig');

const operationHistoryContainer = document.getElementById('operationHistory');
const notificationsContainer = document.getElementById('notifications');
const clearHistoryBtn = document.getElementById('clearHistoryBtn'); // Nouveau bouton

const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');
const modalClose = document.querySelector('.modal-close');
 
// Initialisation
async function loadTranslations() {
    const lang = navigator.language.startsWith('fr') ? 'fr' : 'en';
    document.documentElement.lang = lang;
    try {
        const response = await fetch(`locales/${lang}.json`);
        translations = await response.json();
        applyTranslations();
    } catch (error) {
        console.error('Could not load translations:', error);
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    await loadTranslations();
    initializeEventListeners();
    operationHistory = await api.getOperationHistory(); // Charger l'historique
    updateHistoryDisplay(); // Afficher l'historique chargé
    loadWireguardFiles();
    checkCurrentConfig();
});
 
// Gestionnaires d'événements
function initializeEventListeners() {
    refreshBtn.addEventListener('click', loadWireguardFiles);
    activateBtn.addEventListener('click', showConfirmationModal);
    resetBtn.addEventListener('click', resetSelection);

    // Gestionnaire pour le bouton d'effacement de l'historique
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearOperationHistory);
    }

    // Modal events
    confirmYes.addEventListener('click', executeActivation);
    confirmNo.addEventListener('click', hideConfirmationModal);
    modalClose.addEventListener('click', hideConfirmationModal);
    
    // Fermer le modal en cliquant à l'extérieur
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            hideConfirmationModal();
        }
    });
    
    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideConfirmationModal();
        }
        if (e.key === 'F5') {
            e.preventDefault();
            loadWireguardFiles();
        }
    });
}

// Chargement des fichiers WireGuard
async function loadWireguardFiles() {
    try {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${translations.loading}`;
        
        fileList.innerHTML = `
            <div class="no-files">
                <i class="fas fa-spinner fa-spin"></i> ${translations.loadingFiles}
            </div>
        `;
        
        const result = await api.listWireguardFiles();
        
        if (result.success) {
            wireguardFiles = result.files;
            displayFileList();
            showNotification(translations.configsFound.replace('{count}', result.files.length), 'success');
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        showNotification(translations.errorLoading.replace('{error}', error.message), 'error');
        fileList.innerHTML = `
            <div class="no-files">
                <i class="fas fa-exclamation-triangle"></i><br>
                ${translations.errorLoadingShort}
            </div>
        `;
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `<i class="fas fa-sync-alt"></i> ${translations.refreshList}`;
    }
}

// Affichage de la liste des fichiers
function displayFileList() {
    if (wireguardFiles.length === 0) {
        fileList.innerHTML = `
            <div class="no-files">
                <i class="fas fa-info-circle"></i><br>
                ${translations.noConfigAvailable}<br>
                <small>${translations.onlyConfAllowed}</small>
            </div>
        `;
        return;
    }
    
    fileList.innerHTML = wireguardFiles.map(file => `
        <div class="file-item" data-file="${file.name}" onclick="selectFile('${file.name}')">
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <div class="file-details">
                    <h4>${getCountryFlag(file.name)} ${file.name}</h4>
                    <p>${getCountryName(file.name)}</p>
                </div>
            </div>
            <div class="file-status">
                <span class="status-badge status-available">${translations.available}</span>
            </div>
        </div>
    `).join('');
}

// Sélection d'un fichier
function selectFile(fileName) {
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const fileItem = document.querySelector(`[data-file="${fileName}"]`);
    if (fileItem) {
        fileItem.classList.add('selected');
        selectedFile = wireguardFiles.find(f => f.name === fileName);
        activateBtn.disabled = false;
        showNotification(translations.configSelected.replace('{fileName}', fileName), 'info');
    }
}

// Vérification de la configuration actuelle
async function checkCurrentConfig() {
    try {
        const configInfo = await api.getCurrentConfigInfo();

        if (configInfo.success) {
            currentConfig.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <div>
                    <h4>${getCountryFlag(configInfo.name)} ${configInfo.name} (${translations.active})</h4>
                    <p>${getCountryName(configInfo.name)} - ${translations.size.replace('{size}', formatFileSize(configInfo.size))}</p>
                </div>
            `;
            currentConfig.style.background = '';
        } else if (configInfo.reason === 'not_found') {
            currentConfig.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <h4>${translations.noActiveConfig}</h4>
                    <p>${translations.wg0NotFound}</p>
                </div>
            `;
            currentConfig.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        } else {
            // Gère les erreurs de lecture ou autres erreurs serveur
            throw new Error(configInfo.error || translations.unknownErrorChecking);
        }
    } catch (error) {
        currentConfig.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <div>
                <h4>${translations.errorChecking}</h4>
                <p>${translations.cantCheck}</p>
            </div>
        `;
        currentConfig.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
        console.error('Erreur dans checkCurrentConfig:', error);
    }
}

// Réinitialisation de la sélection
function resetSelection() {
    selectedFile = null;
    activateBtn.disabled = true;
    
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    showNotification(translations.selectionReset, 'info');
}

// Affichage du modal de confirmation
function showConfirmationModal() {
    if (!selectedFile) return;
    
    confirmMessage.innerHTML = `
        <strong>${translations.activateConfigTitle}</strong><br><br>
        <strong>${translations.fileSelected}</strong> ${getCountryFlag(selectedFile.name)} ${selectedFile.name} (${getCountryName(selectedFile.name)})<br>
        <strong>${translations.action}</strong> ${translations.activateThisConfig}<br><br>
        ${translations.thisActionWillActivate}
    `;
    
    confirmModal.classList.remove('hidden');
}

// Masquage du modal de confirmation
function hideConfirmationModal() {
    confirmModal.classList.add('hidden');
}

// Exécution de l'activation
async function executeActivation() {
    hideConfirmationModal();
    if (!selectedFile) return;
    
    try {
        showNotification(translations.activationInProgress, 'info');
        
        const result = await api.activateConfig(selectedFile.fullPath);
        
        if (result.success) {
            showNotification(result.message, 'success');
            addToHistory({
                type: 'success',
                message: result.message,
                timestamp: new Date()
            });
            
            resetSelection();
            loadWireguardFiles();
            checkCurrentConfig();

        } else {
            showNotification(result.error, 'error');
            addToHistory({ type: 'error', message: result.error, timestamp: new Date() });
        }
    } catch (error) {
        const errorMessage = `${translations.unexpectedError}: ${error.message}`;
        showNotification(errorMessage, 'error');
        addToHistory({ type: 'error', message: errorMessage, timestamp: new Date() });
    }
}

// Ajout à l'historique des opérations
async function addToHistory(operation) {
    operationHistory.unshift(operation);
    
    if (operationHistory.length > 20) {
        operationHistory = operationHistory.slice(0, 20);
    }
    
    updateHistoryDisplay();
    await api.saveOperationHistory(operationHistory);
}

// Mise à jour de l'affichage de l'historique
function updateHistoryDisplay() {
    const noOperationsMsg = operationHistoryContainer.querySelector('.no-operations');
    
    if (operationHistory.length === 0) {
        if (!noOperationsMsg) {
            operationHistoryContainer.innerHTML = `<p class="no-operations">${translations.noOperation}</p>`;
        }
        return;
    }
    
    if (noOperationsMsg) {
        noOperationsMsg.remove();
    }
    
    operationHistoryContainer.innerHTML = operationHistory.map(op => `
        <div class="operation-item ${op.type}">
            <div class="operation-time">${formatTimestamp(new Date(op.timestamp))}</div>
            <div class="operation-message">${op.message}</div>
        </div>
    `).join('');
}

// Affichage des notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'fas fa-check-circle' :
                type === 'error' ? 'fas fa-exclamation-circle' :
                'fas fa-info-circle';
    
    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    notificationsContainer.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    notification.addEventListener('click', () => {
        notification.remove();
    });
}

// Fonctions utilitaires

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTimestamp(date) {
    const lang = document.documentElement.lang === 'fr' ? 'fr-FR' : 'en-GB';
    return new Intl.DateTimeFormat(lang, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date);
}

function getCountryFlag(fileName) {
    if (!fileName) return `<i class="fas fa-globe country-flag" title="${translations.unknown}"></i>`;
    const name = fileName.toLowerCase();
    const locationFlags = {
        'zrh': 'ch', 'cdg': 'fr', 'lhr': 'gb', 'ist': 'tr', 'fra': 'de',
        'dub': 'ie', 'ord': 'us', 'bud': 'hu', 'bru': 'be', 'ams': 'nl',
        'zurich': 'ch', 'paris': 'fr', 'london': 'gb', 'istanbul': 'tr',
        'frankfurt': 'de', 'dublin': 'ie', 'chicago': 'us', 'budapest': 'hu',
        'brussels': 'be', 'amsterdam': 'nl'
    };
    for (const [key, countryCode] of Object.entries(locationFlags)) {
        if (name.includes(key)) {
            return `<img src="flags/${countryCode}.svg" class="country-flag" alt="${key}" title="${key}">`;
        }
    }
    if (name.includes('server')) return `<i class="fas fa-server country-flag" title="${translations.server}"></i>`;
    if (name.includes('test')) return `<i class="fas fa-flask country-flag" title="${translations.test}"></i>`;
    if (name.includes('backup')) return `<i class="fas fa-save country-flag" title="${translations.backup}"></i>`;
    return `<i class="fas fa-globe country-flag" title="${translations.unknown}"></i>`;
}

function getCountryName(fileName) {
    if (!fileName) return translations.wireguardConfig;
    const name = fileName.toLowerCase();
    const locationCountries = {
        'zrh': translations.switzerland, 'cdg': translations.france, 'lhr': translations.uk, 'ist': translations.turkey,
        'fra': translations.germany, 'dub': translations.ireland, 'ord': translations.usa, 'bud': translations.hungary,
        'bru': translations.belgium, 'ams': translations.netherlands, 'zurich': translations.switzerland, 'paris': translations.france,
        'london': translations.uk, 'istanbul': translations.turkey, 'frankfurt': translations.germany,
        'dublin': translations.ireland, 'chicago': translations.usa, 'budapest': translations.hungary,
        'brussels': translations.belgium, 'amsterdam': translations.netherlands
    };
    for (const [key, countryName] of Object.entries(locationCountries)) {
        if (name.includes(key)) return countryName;
    }
    if (name.includes('server')) return translations.genericServer;
    if (name.includes('test')) return translations.testConfig;
    if (name.includes('backup')) return translations.backupConfig;
    return translations.wireguardConfig;
}

async function clearOperationHistory() {
    try {
        const result = await api.clearOperationHistory();
        if (result.success) {
            operationHistory = [];
            updateHistoryDisplay();
            showNotification(translations.historyCleared, 'success');
        } else {
            showNotification(translations.errorClearingHistory, 'error');
        }
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
    }
}
 
// Gestion des erreurs globales
window.addEventListener('error', (e) => {
    console.error('Erreur JavaScript:', e.error);
    showNotification(translations.unexpectedError, 'error');
});
 
window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejetée:', e.reason);
    showNotification(translations.rejectedPromise.replace('{reason}', e.reason.message || e.reason), 'error');
});