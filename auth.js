// ===== Auth Configuration & State =====
const AUTH_STORAGE_KEY = 'fitzone_users';
const CURRENT_USER_KEY = 'fitzone_current_user';

// Global user state (optional, for fast access)
let currentUser = null;

// ===== User Management =====

/**
 * Charge tous les utilisateurs depuis localStorage
 */
function getAllUsers() {
    const users = localStorage.getItem(AUTH_STORAGE_KEY);
    return users ? JSON.parse(users) : [];
}

/**
 * Sauvegarde la liste des utilisateurs dans localStorage
 */
function saveAllUsers(users) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
}

/**
 * Inscription d'un nouvel utilisateur
 */
function registerUser(userData) {
    const users = getAllUsers();
    
    // Vérification unicité Email
    if (users.find(u => u.email === userData.email)) {
        throw new Error('Cet email est déjà utilisé.');
    }

    const newUser = {
        id: 'user_' + Date.now(),
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        age: userData.age,
        weight: userData.weight,
        height: userData.height,
        type: userData.type || 'client',
        sessions: [], // Sandbox sessions
        customExercises: [] // Sandbox exercises
    };

    users.push(newUser);
    saveAllUsers(users);
    
    // Connexion automatique
    const result = loginUser(userData.email, userData.password);
    return result.user; // On retourne l'objet user pour app.js
}

/**
 * Connexion d'un utilisateur
 * @returns {Object} { success: boolean, user: Object, error: string }
 */
function loginUser(email, password) {
    const users = getAllUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }

    if (user.password !== password) {
        return { success: false, error: 'WRONG_PASSWORD' };
    }

    // On ne stocke pas le mot de passe dans sessionStorage
    const sessionUser = { ...user };
    delete sessionUser.password;

    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
    currentUser = sessionUser;
    
    return { success: true, user: sessionUser };
}

/**
 * Déconnexion Propre
 */
function logoutUser() {
    sessionStorage.removeItem(CURRENT_USER_KEY);
    currentUser = null;
    
    // Vider les variables globales en mémoire
    if (typeof exercises !== 'undefined') exercises = [];
    if (typeof muscleGroups !== 'undefined') muscleGroups = {};
    if (typeof isDataLoading !== 'undefined') isDataLoading = false;
    
    // Vider le HTML des listes pour la sécurité visuelle
    const exGrid = document.getElementById('exercises-grid');
    const catGrid = document.getElementById('categories-grid');
    if (exGrid) exGrid.innerHTML = '';
    if (catGrid) catGrid.innerHTML = '';
    
    // Réafficher l'overlay via updateAuthUI
    if (typeof updateAuthUI === 'function') {
        updateAuthUI(null);
    }
    
    // Reload contrôlé pour purger les singletons/états de tous les modules
    location.reload();
}

/**
 * Récupère l'utilisateur connecté
 */
function loadCurrentUser() {
    const saved = sessionStorage.getItem(CURRENT_USER_KEY);
    if (saved) {
        currentUser = JSON.parse(saved);
        return currentUser;
    }
    return null;
}

/**
 * Met à jour les données de l'utilisateur connecté dans fitzone_users
 */
function updateUserData(newData) {
    if (!currentUser) return;
    
    const users = getAllUsers();
    const index = users.findIndex(u => u.id === currentUser.id);
    
    if (index !== -1) {
        users[index] = { ...users[index], ...newData };
        saveAllUsers(users);
        
        // Mettre à jour le cache session
        const sessionUser = { ...users[index] };
        delete sessionUser.password;
        sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
        currentUser = sessionUser;
    }
}

/**
 * Synchronisation du currentUser vers fitzone_users
 */
function syncCurrentUser() {
    if (!currentUser) return;
    
    const users = getAllUsers();
    const index = users.findIndex(u => u.id === currentUser.id);
    
    if (index !== -1) {
        users[index] = { 
            ...users[index], 
            sessions: currentUser.sessions || [],
            customExercises: currentUser.customExercises || []
        };
        saveAllUsers(users);
        console.log("🔄 Données synchronisées.");
    }
}

/**
 * Ancienne fonction gardée pour compatibilité si nécessaire
 */
function saveUserToDatabase() {
    syncCurrentUser();
}

// Initialisation au chargement du script
loadCurrentUser();
