// ===== SESSION MANAGER =====
// Gestion des dossiers et des sauvegardes utilisateurs

// State
let userFolders = [];
let currentFolderId = null;
let currentFolder = null;
let editingSessionId = null;
let editingFolderId = null;

// DOM Elements
const sessionElements = {
    mySessionsBtn: document.getElementById('my-sessions-btn'),
    viewHome: document.getElementById('view-home'),
    viewMySessions: document.getElementById('view-my-sessions'),
    foldersGrid: document.getElementById('folders-grid'),
    foldersEmptyState: document.getElementById('folders-empty-state'),
    breadcrumb: document.getElementById('folder-breadcrumb'),
    currentFolderName: document.getElementById('current-folder-name'),
    btnCreateFolder: document.getElementById('btn-create-folder'),
    searchInput: document.getElementById('sessions-search-input'),

    // Save Modal
    saveOverlay: document.getElementById('save-session-overlay'),
    saveClose: document.getElementById('save-session-close'),
    saveCancel: document.getElementById('save-session-cancel'),
    saveConfirm: document.getElementById('save-session-confirm'),
    saveNameInput: document.getElementById('save-session-name'),
    saveFolderSelect: document.getElementById('save-session-folder'),
    linkCreateFolder: document.getElementById('link-create-folder-modal')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserFolders();
    setupSessionEventListeners();

    // Check URL hash for direct access
    if (window.location.hash === '#my-sessions') {
        showMySessions();
    }
});

function loadUserFolders() {
    if (!currentUser) {
        userFolders = [];
        return;
    }
    
    // Au lieu de localStorage global, on prend les sessions de l'objet utilisateur
    userFolders = currentUser.sessions || [];
}

function saveUserFolders() {
    if (!currentUser) return;
    
    currentUser.sessions = userFolders;
    syncCurrentUser(); // Synchronise avec fitzone_users
}

function setupSessionEventListeners() {
    // Navigation
    if (sessionElements.mySessionsBtn) {
        sessionElements.mySessionsBtn.addEventListener('click', showMySessions);
    }

    // Create Folder button
    if (sessionElements.btnCreateFolder) {
        sessionElements.btnCreateFolder.addEventListener('click', createNewFolder);
    }

    // Breadcrumb navigation
    if (sessionElements.breadcrumb) {
        const rootItem = sessionElements.breadcrumb.querySelector('[data-id="root"]');
        if (rootItem) {
            rootItem.addEventListener('click', () => {
                currentFolderId = null;
                currentFolder = null;
                renderFolders();
            });
        }
    }

    // Search
    if (sessionElements.searchInput) {
        sessionElements.searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            if (currentFolderId) {
                // Filter sessions in current folder
                renderSessions(term);
            } else {
                // Filter folders
                renderFolders(term);
            }
        });
    }

    // Save Modal listeners
    // Button in Sidebar (added dynamically or exists in DOM)
    const btnSaveSession = document.getElementById('btn-save-session');
    if (btnSaveSession) {
        btnSaveSession.addEventListener('click', openSaveSessionModal);
    }

    if (sessionElements.saveClose) sessionElements.saveClose.addEventListener('click', closeSaveModal);
    if (sessionElements.saveCancel) sessionElements.saveCancel.addEventListener('click', closeSaveModal);
    if (sessionElements.saveConfirm) sessionElements.saveConfirm.addEventListener('click', handleSaveSession);
    if (sessionElements.linkCreateFolder) {
        sessionElements.linkCreateFolder.addEventListener('click', (e) => {
            e.preventDefault();
            createNewFolder(true); // true = from modal
        });
    }

    if (sessionElements.saveOverlay) {
        sessionElements.saveOverlay.addEventListener('click', (e) => {
            if (e.target === sessionElements.saveOverlay) closeSaveModal();
        });
    }

    // Validate save form on input
    if (sessionElements.saveNameInput) sessionElements.saveNameInput.addEventListener('input', validateSaveForm);
    if (sessionElements.saveFolderSelect) sessionElements.saveFolderSelect.addEventListener('change', validateSaveForm);

    // Deep search in My Sessions
    var sessionsSearchInput = document.getElementById('sessions-search-input');
    if (sessionsSearchInput) {
        sessionsSearchInput.addEventListener('input', function () {
            handleSessionsSearch(this.value.trim().toLowerCase());
        });
    }
}

// Navigation Functions
function showMySessions() {
    // Hide ALL other views (including creator)
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Deactivate creator mode if active
    var appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.classList.remove('creator-active');
    var creatorToggle = document.getElementById('creator-toggle');
    if (creatorToggle) creatorToggle.classList.remove('active');
    if (typeof isCreatorMode !== 'undefined') isCreatorMode = false;

    // Show My Sessions
    if (sessionElements.viewMySessions) {
        sessionElements.viewMySessions.classList.add('active');
    }

    // Reset state
    currentFolderId = null;
    currentFolder = null;
    renderFolders();

    // Update breadcrumb
    updateBreadcrumb();
}

function updateBreadcrumb() {
    if (!sessionElements.breadcrumb) return;

    if (currentFolderId && currentFolder) {
        sessionElements.breadcrumb.style.display = 'flex';
        sessionElements.currentFolderName.textContent = currentFolder.name;
        // Search placeholder update
        if (sessionElements.searchInput) {
            sessionElements.searchInput.placeholder = `Rechercher dans ${currentFolder.name}...`;
        }
    } else {
        sessionElements.breadcrumb.style.display = 'none';
        if (sessionElements.searchInput) {
            sessionElements.searchInput.placeholder = "Rechercher dans mes dossiers...";
        }
    }
}

// Render Functions
function renderFolders(filterTerm = '') {
    if (!sessionElements.foldersGrid) return;

    // Clear grid
    sessionElements.foldersGrid.innerHTML = '';

    // Filter folders
    const filteredFolders = userFolders.filter(f => f.name.toLowerCase().includes(filterTerm));

    if (filteredFolders.length === 0 && !filterTerm) {
        if (sessionElements.foldersEmptyState) {
            sessionElements.foldersEmptyState.style.display = 'flex';
            sessionElements.foldersGrid.appendChild(sessionElements.foldersEmptyState);
        }
        return;
    }

    // Hide empty state if we have folders
    if (sessionElements.foldersEmptyState) {
        sessionElements.foldersEmptyState.style.display = 'none';
    }

    // Render each folder
    filteredFolders.forEach(folder => {
        const card = document.createElement('div');
        card.className = 'folder-card';
        card.dataset.id = folder.id;

        const count = folder.sessions ? folder.sessions.length : 0;
        const sessionText = count === 1 ? 'séance' : 'séances';

        card.innerHTML = `
            <div class="folder-icon">📂</div>
            <div class="folder-info">
                <h3 class="folder-name">${folder.name}</h3>
                <p class="folder-meta">${count} ${sessionText}</p>
            </div>
            <div class="folder-actions">
                <button class="folder-action-btn delete" title="Supprimer">🗑️</button>
            </div>
        `;

        // Click to open folder
        card.addEventListener('click', (e) => {
            // Don't open if clicking actions
            if (e.target.closest('.folder-actions')) return;
            openFolder(folder.id);
        });

        // Delete action
        const deleteBtn = card.querySelector('.delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteFolder(folder.id);
            });
        }

        sessionElements.foldersGrid.appendChild(card);
    });
}

function renderSessions(filterTerm = '') {
    if (!sessionElements.foldersGrid || !currentFolder) return;

    sessionElements.foldersGrid.innerHTML = '';

    const sessions = currentFolder.sessions || [];
    const filteredSessions = sessions.filter(s => s.name.toLowerCase().includes(filterTerm));

    if (filteredSessions.length === 0) {
        sessionElements.foldersGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>Dossier vide</h3>
                <p>Aucune séance sauvegardée dans ce dossier.</p>
            </div>
        `;
        return;
    }

    filteredSessions.forEach(session => {
        const card = document.createElement('div');
        card.className = 'session-card';

        // Mode badge style
        let modeClass = 'badge-bloc';
        let modeLabel = 'Bloc';
        switch (session.mode) {
            case 'circuit': modeClass = 'badge-circuit'; modeLabel = 'Circuit'; break;
            case 'emom': modeClass = 'badge-emom'; modeLabel = 'EMOM'; break;
            case 'superset': modeClass = 'badge-superset'; modeLabel = 'Superset'; break;
            case 'parcours': modeClass = 'badge-parcours'; modeLabel = 'Parcours'; break;
        }

        const date = new Date(session.createdAt).toLocaleDateString();
        const exerciseCount = calculateTotalExercises(session);

        card.innerHTML = `
            <div class="session-card-header">
                <span class="mode-badge ${modeClass}">${modeLabel}</span>
                <span class="session-date">${date}</span>
            </div>
            <h3 class="session-title">${session.name}</h3>
            <p class="session-info">${exerciseCount} exercices</p>
            <div class="session-actions-row">
                <button class="session-btn btn-load">✏️ Ouvrir</button>
                <button class="session-btn btn-pdf">📄 PDF</button>
                <button class="session-btn btn-delete">🗑️</button>
            </div>
        `;

        // Load session
        card.querySelector('.btn-load').addEventListener('click', () => loadSessionToCreator(session, currentFolderId));

        // Delete session
        card.querySelector('.btn-delete').addEventListener('click', () => deleteSession(session.id));

        // PDF Export (Using global function if available or calling logic directly)
        card.querySelector('.btn-pdf').addEventListener('click', () => exportSavedSessionPDF(session));

        sessionElements.foldersGrid.appendChild(card);
    });
}

// Logic Functions
function createNewFolder(fromModal = false) {
    const name = prompt("Nom du nouveau dossier :");
    if (name && name.trim()) {
        const newFolder = {
            id: 'folder_' + Date.now(),
            name: name.trim(),
            createdAt: new Date().toISOString(),
            sessions: []
        };

        userFolders.push(newFolder);
        saveUserFolders();

        if (fromModal) {
            // Refresh select in modal
            populateFolderSelect();
            // Auto select new folder
            if (sessionElements.saveFolderSelect) {
                sessionElements.saveFolderSelect.value = newFolder.id;
                validateSaveForm();
            }
        } else {
            renderFolders();
        }

        // Show feedback (reusing creator toast if available, or alert)
        // Check if showQuickFeedback exists in global scope
        if (typeof showQuickFeedback === 'function') {
            showQuickFeedback('✓ Dossier créé');
        }
    }
}

function deleteFolder(folderId) {
    const folder = userFolders.find(f => f.id === folderId);
    if (!folder) return;

    // Use custom modal if available
    const confirmMsg = `Supprimer le dossier "${folder.name}" et ses ${folder.sessions.length} séances ?`;

    if (typeof openConfirmationModal === 'function') {
        openConfirmationModal(confirmMsg, () => {
            userFolders = userFolders.filter(f => f.id !== folderId);
            saveUserFolders();
            renderFolders();
        });
    } else {
        if (confirm(confirmMsg)) {
            userFolders = userFolders.filter(f => f.id !== folderId);
            saveUserFolders();
            renderFolders();
        }
    }
}

function openFolder(folderId) {
    const folder = userFolders.find(f => f.id === folderId);
    if (!folder) return;

    currentFolderId = folderId;
    currentFolder = folder;
    updateBreadcrumb();
    renderSessions();
}

// Session Logic
function calculateTotalExercises(session) {
    if (!session.data) return 0;
    return session.data.reduce((acc, block) => acc + (block.exercises ? block.exercises.length : 0), 0);
}

function loadSessionToCreator(session, folderId) {
    // Track editing state to prevent duplication
    editingSessionId = session.id;
    editingFolderId = folderId || (currentFolder ? currentFolder.id : null);
    console.log('Loading session for edit:', session.name, '| ID:', editingSessionId);

    if (typeof workout !== 'undefined') {
        // Deep copy to avoid reference issues
        workout = JSON.parse(JSON.stringify(session.data || []));
        sessionMode = session.mode || 'bloc';

        // Load specific settings if they exist
        if (session.circuitSettings && typeof circuitSettings !== 'undefined') {
            Object.assign(circuitSettings, session.circuitSettings);
        }
        if (session.emomSettings && typeof emomSettings !== 'undefined') {
            Object.assign(emomSettings, session.emomSettings);
        }

        // Save to current storage
        saveWorkoutToStorage();
        if (sessionMode === 'circuit' && typeof saveCircuitSettings === 'function') saveCircuitSettings();
        if (sessionMode === 'emom' && typeof saveEmomSettings === 'function') saveEmomSettings();

        // 1. Hide ALL views (including My Sessions)
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

        // 2. Show Home view (categories) so the left side isn't black
        var viewHome = document.getElementById('view-home');
        if (viewHome) viewHome.classList.add('active');

        // 3. Activate creator mode (sidebar + split view)
        var appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.classList.add('creator-active');

        var creatorToggle = document.getElementById('creator-toggle');
        if (creatorToggle) creatorToggle.classList.add('active');

        var sidebar = document.querySelector('.creator-sidebar');
        if (sidebar) sidebar.classList.add('open');

        if (typeof isCreatorMode !== 'undefined') isCreatorMode = true;

        // 4. Update sidebar and mode UI
        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof updateModeUI === 'function') updateModeUI();
        if (typeof updateExerciseCardButtons === 'function') {
            setTimeout(function () { updateExerciseCardButtons(); }, 100);
        }

        if (typeof showQuickFeedback === 'function') {
            showQuickFeedback('✏️ Séance chargée pour modification');
        }
    }
}

function deleteSession(sessionId) {
    if (!currentFolder) return;

    if (typeof openConfirmationModal === 'function') {
        openConfirmationModal("Supprimer cette séance ?", () => {
            currentFolder.sessions = currentFolder.sessions.filter(s => s.id !== sessionId);
            saveUserFolders();
            renderSessions();
        });
    }
}

// PDF Export wrapper
// PDF Export wrapper
function exportSavedSessionPDF(session) {
    if (typeof exportWorkoutToPDF === 'function') {
        // Pass the session object directly
        exportWorkoutToPDF(session);
    } else {
        alert("Fonctionnalité PDF non disponible actuellement.");
    }
}

// Helper: Open Save Modal (called from Creator Sidebar)
function openSaveSessionModal() {
    // Populate folder select
    populateFolderSelect();

    // Reset inputs
    if (sessionElements.saveNameInput) sessionElements.saveNameInput.value = '';

    // Show modal
    if (sessionElements.saveOverlay) {
        sessionElements.saveOverlay.classList.add('active');
        sessionElements.saveOverlay.style.visibility = 'visible';
        sessionElements.saveOverlay.style.opacity = '1';
    }

    validateSaveForm();
}

function closeSaveModal() {
    if (sessionElements.saveOverlay) {
        sessionElements.saveOverlay.classList.remove('active');
        sessionElements.saveOverlay.style.visibility = 'hidden';
        sessionElements.saveOverlay.style.opacity = '0';
    }
}

function populateFolderSelect() {
    if (!sessionElements.saveFolderSelect) return;

    sessionElements.saveFolderSelect.innerHTML = '<option value="" disabled selected>Choisir un dossier...</option>';

    if (userFolders.length === 0) {
        const option = document.createElement('option');
        option.text = "Aucun dossier existant";
        option.disabled = true;
        sessionElements.saveFolderSelect.appendChild(option);
    } else {
        userFolders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.text = folder.name;
            sessionElements.saveFolderSelect.appendChild(option);
        });
    }
}

function validateSaveForm() {
    if (!sessionElements.saveConfirm) return;

    const name = sessionElements.saveNameInput ? sessionElements.saveNameInput.value.trim() : '';
    const folderId = sessionElements.saveFolderSelect ? sessionElements.saveFolderSelect.value : '';

    if (name && folderId) {
        sessionElements.saveConfirm.removeAttribute('disabled');
        sessionElements.saveConfirm.classList.remove('disabled');
    } else {
        sessionElements.saveConfirm.setAttribute('disabled', 'true');
        sessionElements.saveConfirm.classList.add('disabled');
    }
}

function handleSaveSession() {
    console.log('Sauvegarde lancée...');

    var name = sessionElements.saveNameInput ? sessionElements.saveNameInput.value.trim() : '';
    var folderId = sessionElements.saveFolderSelect ? sessionElements.saveFolderSelect.value : '';

    console.log('Nom:', name, '| Dossier ID:', folderId);

    if (!name || !folderId) {
        console.warn('Sauvegarde bloquée: nom ou dossier manquant');
        return;
    }

    var folder = userFolders.find(function (f) { return f.id === folderId; });
    if (!folder) {
        console.error('Dossier non trouvé:', folderId);
        return;
    }

    var workoutData = (typeof workout !== 'undefined') ? workout : [];
    var mode = (typeof sessionMode !== 'undefined') ? sessionMode : 'bloc';

    console.log('Mode:', mode, '| Blocs:', workoutData.length, '| Edit ID:', editingSessionId);

    // Check if we are updating an existing session
    if (editingSessionId && editingFolderId) {
        var editFolder = userFolders.find(function (f) { return f.id === editingFolderId; });
        if (editFolder && editFolder.sessions) {
            var existingIdx = editFolder.sessions.findIndex(function (s) { return s.id === editingSessionId; });
            if (existingIdx !== -1) {
                // Update in-place
                editFolder.sessions[existingIdx].name = name;
                editFolder.sessions[existingIdx].mode = mode;
                editFolder.sessions[existingIdx].data = JSON.parse(JSON.stringify(workoutData));
                editFolder.sessions[existingIdx].updatedAt = new Date().toISOString();
                editFolder.sessions[existingIdx].circuitSettings = (typeof circuitSettings !== 'undefined') ? JSON.parse(JSON.stringify(circuitSettings)) : null;
                editFolder.sessions[existingIdx].emomSettings = (typeof emomSettings !== 'undefined') ? JSON.parse(JSON.stringify(emomSettings)) : null;

                // If folder changed, move the session
                if (folderId !== editingFolderId) {
                    var movedSession = editFolder.sessions.splice(existingIdx, 1)[0];
                    if (!folder.sessions) folder.sessions = [];
                    folder.sessions.push(movedSession);
                }

                saveUserFolders();
                closeSaveModal();
                editingSessionId = null;
                editingFolderId = null;
                console.log('Séance mise à jour');
                if (typeof showQuickFeedback === 'function') {
                    showQuickFeedback('✓ Séance mise à jour');
                }
                return;
            }
        }
    }

    // CREATE new session
    var newSession = {
        id: 'sess_' + Date.now(),
        name: name,
        mode: mode,
        createdAt: new Date().toISOString(),
        data: JSON.parse(JSON.stringify(workoutData)),
        circuitSettings: (typeof circuitSettings !== 'undefined') ? JSON.parse(JSON.stringify(circuitSettings)) : null,
        emomSettings: (typeof emomSettings !== 'undefined') ? JSON.parse(JSON.stringify(emomSettings)) : null
    };

    if (!folder.sessions) folder.sessions = [];
    folder.sessions.push(newSession);

    saveUserFolders();
    closeSaveModal();
    editingSessionId = null;
    editingFolderId = null;

    console.log('Nouvelle séance créée dans:', folder.name);
    if (typeof showQuickFeedback === 'function') {
        showQuickFeedback('✓ Séance enregistrée');
    } else {
        alert('Séance enregistrée avec succès !');
    }
}

// ===== Deep Search =====
function handleSessionsSearch(term) {
    if (!term || term.length < 2) {
        removeSearchDropdown();
        if (currentFolderId) {
            renderSessions();
        } else {
            renderFolders();
        }
        return;
    }

    var results = [];
    userFolders.forEach(function (folder) {
        if (!folder.sessions) return;
        folder.sessions.forEach(function (session) {
            if (session.name.toLowerCase().indexOf(term) !== -1) {
                results.push({
                    session: session,
                    folderId: folder.id,
                    folderName: folder.name
                });
            }
        });
    });

    showSearchDropdown(results);
}

function showSearchDropdown(results) {
    removeSearchDropdown();

    var container = document.querySelector('.my-sessions-header');
    if (!container) return;

    var dropdown = document.createElement('div');
    dropdown.className = 'sessions-search-dropdown';
    dropdown.id = 'sessions-search-dropdown';

    if (results.length === 0) {
        dropdown.innerHTML = '<div class="search-no-results">Aucun résultat</div>';
    } else {
        results.forEach(function (r) {
            var item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = '<span class="search-result-name">' + r.session.name + '</span>' +
                '<span class="search-result-folder">📂 ' + r.folderName + '</span>';
            item.addEventListener('click', function () {
                removeSearchDropdown();
                var searchInput = document.getElementById('sessions-search-input');
                if (searchInput) searchInput.value = '';
                openFolder(r.folderId);
                setTimeout(function () {
                    var cards = document.querySelectorAll('.session-card');
                    cards.forEach(function (card) {
                        var title = card.querySelector('.session-title');
                        if (title && title.textContent === r.session.name) {
                            card.style.outline = '2px solid #22c55e';
                            card.style.outlineOffset = '2px';
                            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(function () {
                                card.style.outline = '';
                                card.style.outlineOffset = '';
                            }, 3000);
                        }
                    });
                }, 200);
            });
            dropdown.appendChild(item);
        });
    }

    container.appendChild(dropdown);
}

function removeSearchDropdown() {
    var existing = document.getElementById('sessions-search-dropdown');
    if (existing) existing.remove();
}

