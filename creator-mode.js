// ===== CREATOR MODE =====
// State for workout builder
let isCreatorMode = false;
let sessionMode = null; // 'bloc', 'circuit', 'parcours', 'superset', 'emom'
let workout = [];
let currentEditingExercise = null;
let draggedItem = null;
let draggedItemType = null;

// Circuit settings (global for the session)
let circuitSettings = {
    tours: 3,
    effort: 45,
    reposExo: 15,
    reposTour: 90
};

// EMOM settings
let emomSettings = {
    duration: 20 // minutes
};

// Superset state
let supersetState = {
    waitingForPair: false,
    currentSupersetId: null
};

// Confirmation callback
let confirmationCallback = null;

// Mode info texts
const modeInfoTexts = {
    bloc: {
        title: '🏗️ Mode Par Bloc',
        text: 'La méthode traditionnelle. Vous terminez toutes les séries d\'un exercice avant de passer au suivant. Idéal pour la force et la prise de muscle.'
    },
    circuit: {
        title: '🔄 Circuit Training',
        text: 'Enchaînez tous les exercices sélectionnés sans pause. Le repos se prend uniquement à la fin du tour. Idéal pour le cardio et l\'endurance.'
    },
    parcours: {
        title: '⚡ Parcours / Chipper',
        text: 'Une liste de tâches à accomplir (Ex: 50 tractions, 100 pompes...). Gérez votre effort comme vous voulez, le but est de finir le volume total.'
    },
    superset: {
        title: '🔗 Superset',
        text: 'Une technique d\'intensité. Couplez deux exercices (souvent muscles opposés) sans repos entre les deux pour gagner du temps.'
    },
    emom: {
        title: '⏱️ EMOM',
        text: 'Every Minute On the Minute. Vous avez 1 minute pour faire vos reps. Plus vous allez vite, plus vous avez de repos avant la minute suivante.'
    }
};

// Creator DOM Elements
let creatorElements = {};

function initCreatorElements() {
    creatorElements = {
        toggleBtn: document.getElementById('creator-toggle'),
        sidebar: document.getElementById('creator-sidebar'),
        sidebarClose: document.getElementById('sidebar-close'),
        sidebarContent: document.getElementById('sidebar-content'),
        sidebarEmpty: document.getElementById('sidebar-empty'),
        btnNewBlock: document.getElementById('btn-new-block'),
        btnClearWorkout: document.getElementById('btn-clear-workout'),
        btnExportPdf: document.getElementById('btn-export-pdf'),
        modalOverlay: document.getElementById('modal-overlay'),
        exerciseModal: document.getElementById('exercise-modal'),
        modalForm: document.getElementById('modal-form'),
        modalClose: document.getElementById('modal-close'),
        modalTitle: document.getElementById('modal-title'),
        modalExerciseName: document.getElementById('modal-exercise-name'),
        inputSets: document.getElementById('input-sets'),
        inputReps: document.getElementById('input-reps'),
        inputRest: document.getElementById('input-rest'),
        inputNotes: document.getElementById('input-notes'),
        inputLoad: document.getElementById('input-load'),
        inputLoadSlider: document.getElementById('input-load-slider'),
        modalImg: document.getElementById('modal-img'),
        selectBlock: document.getElementById('select-block'),
        blockSelectorGroup: document.getElementById('block-selector-group'),
        btnCancel: document.getElementById('btn-cancel'),
        blockModalOverlay: document.getElementById('block-modal-overlay'),
        blockModal: document.getElementById('block-modal'),
        blockForm: document.getElementById('block-form'),
        blockModalClose: document.getElementById('block-modal-close'),
        inputBlockName: document.getElementById('input-block-name'),
        blockCancel: document.getElementById('block-cancel'),
        // Mode selection elements
        modeSelectionOverlay: document.getElementById('mode-selection-overlay'),
        modeSelectionClose: document.getElementById('mode-selection-close'),
        modeCards: document.querySelectorAll('.mode-card'),
        modeInfoBtns: document.querySelectorAll('.mode-info-btn'),
        modeInfoOverlay: document.getElementById('mode-info-overlay'),
        modeInfoClose: document.getElementById('mode-info-close'),
        modeInfoTitle: document.getElementById('mode-info-title'),
        modeInfoText: document.getElementById('mode-info-text'),
        modeInfoOk: document.getElementById('mode-info-ok'),
        // Change mode and sidebar elements
        btnChangeMode: document.getElementById('btn-change-mode'),
        currentModeBadge: document.getElementById('current-mode-badge'),
        sidebarActions: document.getElementById('sidebar-actions'),
        // Circuit config modal
        circuitConfigOverlay: document.getElementById('circuit-config-overlay'),
        circuitConfigClose: document.getElementById('circuit-config-close'),
        circuitConfigCancel: document.getElementById('circuit-config-cancel'),
        circuitConfigSave: document.getElementById('circuit-config-save'),
        circuitTours: document.getElementById('circuit-tours'),
        circuitEffort: document.getElementById('circuit-effort'),
        circuitReposExo: document.getElementById('circuit-repos-exo'),
        circuitReposTour: document.getElementById('circuit-repos-tour'),
        // EMOM Config Modal
        emomConfigOverlay: document.getElementById('emom-config-overlay'),
        emomConfigClose: document.getElementById('emom-config-close'),
        emomConfigCancel: document.getElementById('emom-config-cancel'),
        emomConfigSave: document.getElementById('emom-config-save'),
        emomDurationInput: document.getElementById('emom-duration'),
        // Confirmation Modal
        confirmationOverlay: document.getElementById('confirmation-overlay'),
        confirmationClose: document.getElementById('confirmation-close'),
        confirmationCancel: document.getElementById('confirmation-cancel'),
        confirmationOk: document.getElementById('confirmation-ok'),
        confirmationMessage: document.getElementById('confirmation-message')
    };
}

function initCreatorMode() {
    initCreatorElements();
    loadWorkoutFromStorage();
    setupCreatorEventListeners();
    renderSidebar();
    // Note: Buttons are added when toggling creator mode, not here
}

function setupCreatorEventListeners() {
    if (creatorElements.toggleBtn) {
        creatorElements.toggleBtn.addEventListener('click', toggleCreatorMode);
    }
    if (creatorElements.sidebarClose) {
        creatorElements.sidebarClose.addEventListener('click', toggleCreatorMode);
    }
    if (creatorElements.btnNewBlock) {
        creatorElements.btnNewBlock.addEventListener('click', openBlockModal);
    }
    if (creatorElements.btnClearWorkout) {
        creatorElements.btnClearWorkout.addEventListener('click', clearWorkout);
    }
    if (creatorElements.btnExportPdf) {
        creatorElements.btnExportPdf.addEventListener('click', exportWorkoutToPDF);
    }
    if (creatorElements.modalClose) {
        creatorElements.modalClose.addEventListener('click', closeExerciseModal);
    }
    if (creatorElements.btnCancel) {
        creatorElements.btnCancel.addEventListener('click', closeExerciseModal);
    }
    if (creatorElements.modalForm) {
        creatorElements.modalForm.addEventListener('submit', saveExerciseConfig);
    }
    if (creatorElements.modalOverlay) {
        creatorElements.modalOverlay.addEventListener('click', function (e) {
            if (e.target === creatorElements.modalOverlay) closeExerciseModal();
        });
    }
    if (creatorElements.blockModalClose) {
        creatorElements.blockModalClose.addEventListener('click', closeBlockModal);
    }
    if (creatorElements.blockCancel) {
        creatorElements.blockCancel.addEventListener('click', closeBlockModal);
    }
    if (creatorElements.blockForm) {
        creatorElements.blockForm.addEventListener('submit', createBlock);
    }
    if (creatorElements.blockModalOverlay) {
        creatorElements.blockModalOverlay.addEventListener('click', function (e) {
            if (e.target === creatorElements.blockModalOverlay) closeBlockModal();
        });
    }

    // Sync load slider and number input (two-way binding)
    if (creatorElements.inputLoadSlider && creatorElements.inputLoad) {
        creatorElements.inputLoadSlider.addEventListener('input', function () {
            creatorElements.inputLoad.value = this.value;
        });
        creatorElements.inputLoad.addEventListener('input', function () {
            var val = parseInt(this.value) || 70;
            val = Math.max(30, Math.min(100, val));
            creatorElements.inputLoadSlider.value = val;
        });
    }

    // Mode selection event listeners
    if (creatorElements.modeSelectionClose) {
        creatorElements.modeSelectionClose.addEventListener('click', closeModeSelection);
    }
    if (creatorElements.modeSelectionOverlay) {
        creatorElements.modeSelectionOverlay.addEventListener('click', function (e) {
            if (e.target === creatorElements.modeSelectionOverlay) closeModeSelection();
        });
    }
    // Mode card clicks
    creatorElements.modeCards.forEach(function (card) {
        card.addEventListener('click', function (e) {
            // Don't trigger if clicking the info button
            if (e.target.classList.contains('mode-info-btn')) return;
            selectMode(card.dataset.mode);
        });
    });
    // Mode info button clicks
    creatorElements.modeInfoBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            showModeInfo(btn.dataset.mode);
        });
    });
    // Mode info modal close
    if (creatorElements.modeInfoClose) {
        creatorElements.modeInfoClose.addEventListener('click', closeModeInfo);
    }
    if (creatorElements.modeInfoOk) {
        creatorElements.modeInfoOk.addEventListener('click', closeModeInfo);
    }
    if (creatorElements.modeInfoOverlay) {
        creatorElements.modeInfoOverlay.addEventListener('click', function (e) {
            if (e.target === creatorElements.modeInfoOverlay) closeModeInfo();
        });
    }

    // Change mode button
    if (creatorElements.btnChangeMode) {
        creatorElements.btnChangeMode.addEventListener('click', changeMode);
    }

    // Circuit config modal
    if (creatorElements.circuitConfigClose) {
        creatorElements.circuitConfigClose.addEventListener('click', closeCircuitConfig);
    }
    if (creatorElements.circuitConfigCancel) {
        creatorElements.circuitConfigCancel.addEventListener('click', closeCircuitConfig);
    }
    if (creatorElements.circuitConfigSave) {
        creatorElements.circuitConfigSave.addEventListener('click', saveCircuitConfig);
    }
    if (creatorElements.circuitConfigOverlay) {
        creatorElements.circuitConfigOverlay.addEventListener('click', function (e) {
            if (e.target === creatorElements.circuitConfigOverlay) closeCircuitConfig();
        });
    }

    // EMOM Config Modal
    if (creatorElements.emomConfigClose) creatorElements.emomConfigClose.addEventListener('click', closeEmomConfigModal);
    if (creatorElements.emomConfigCancel) creatorElements.emomConfigCancel.addEventListener('click', closeEmomConfigModal);
    if (creatorElements.emomConfigSave) creatorElements.emomConfigSave.addEventListener('click', saveEmomConfig);
    if (creatorElements.emomConfigOverlay) {
        creatorElements.emomConfigOverlay.addEventListener('click', function (e) {
            if (e.target === creatorElements.emomConfigOverlay) closeEmomConfigModal();
        });
    }

    // Confirmation Modal
    if (creatorElements.confirmationClose) creatorElements.confirmationClose.addEventListener('click', closeConfirmationModal);
    if (creatorElements.confirmationCancel) creatorElements.confirmationCancel.addEventListener('click', closeConfirmationModal);
    if (creatorElements.confirmationOk) creatorElements.confirmationOk.addEventListener('click', handleConfirmationOk);
    if (creatorElements.confirmationOverlay) {
        creatorElements.confirmationOverlay.addEventListener('click', function (e) {
            if (e.target === creatorElements.confirmationOverlay) closeConfirmationModal();
        });
    }
}

function toggleCreatorMode() {
    // If turning on and no mode selected, show mode selection first
    if (!isCreatorMode && !sessionMode) {
        openModeSelection();
        return;
    }

    isCreatorMode = !isCreatorMode;

    var appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.toggle('creator-active', isCreatorMode);
    }

    if (creatorElements.toggleBtn) {
        creatorElements.toggleBtn.classList.toggle('active', isCreatorMode);
    }

    if (creatorElements.sidebar) {
        creatorElements.sidebar.classList.toggle('open', isCreatorMode);
    }

    // Delay button update to ensure DOM is ready
    setTimeout(function () {
        updateExerciseCardButtons();
    }, 50);
}

// Mode Selection Functions
function openModeSelection() {
    if (creatorElements.modeSelectionOverlay) {
        creatorElements.modeSelectionOverlay.classList.add('active');
    }
}

function closeModeSelection() {
    if (creatorElements.modeSelectionOverlay) {
        creatorElements.modeSelectionOverlay.classList.remove('active');
    }
}

function selectMode(mode) {
    sessionMode = mode;
    closeModeSelection();

    // Load mode-specific workout data
    loadWorkoutFromStorage();

    // Load circuit settings if circuit mode
    if (mode === 'circuit') {
        loadCircuitSettings();
    }

    // Update UI for the selected mode
    updateModeUI();

    // Now actually toggle creator mode on
    toggleCreatorMode();
}

// Change mode (reset and go back to selection)
function changeMode() {
    // Save current workout before switching
    saveWorkoutToStorage();

    // Close sidebar
    isCreatorMode = false;
    var appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.classList.remove('creator-active');
    if (creatorElements.toggleBtn) creatorElements.toggleBtn.classList.remove('active');
    if (creatorElements.sidebar) creatorElements.sidebar.classList.remove('open');

    // Reset mode
    sessionMode = null;
    workout = [];

    // Update buttons
    updateExerciseCardButtons();

    // Show mode selection
    openModeSelection();
}

// Update UI based on current mode
function updateModeUI() {
    // Update mode badge
    var modeNames = {
        bloc: '🏗️ Bloc',
        circuit: '🔄 Circuit',
        parcours: '⚡ Parcours',
        superset: '🔗 Superset',
        emom: '⏱️ EMOM'
    };
    if (creatorElements.currentModeBadge) {
        creatorElements.currentModeBadge.textContent = modeNames[sessionMode] || 'Mode';
    }

    // Hide "Nouveau Bloc" button for all flat modes (single block structure)
    if (creatorElements.sidebarActions) {
        var flatModes = ['circuit', 'parcours', 'emom', 'superset'];
        if (flatModes.indexOf(sessionMode) !== -1) {
            creatorElements.sidebarActions.style.display = 'none';
        } else {
            creatorElements.sidebarActions.style.display = 'block';
        }
    }

    // Re-render sidebar with new mode settings
    renderSidebar();
}

function showModeInfo(mode) {
    var info = modeInfoTexts[mode];
    if (info && creatorElements.modeInfoOverlay) {
        creatorElements.modeInfoTitle.textContent = info.title;
        creatorElements.modeInfoText.textContent = info.text;
        creatorElements.modeInfoOverlay.classList.add('active');
    }
}

function closeModeInfo() {
    if (creatorElements.modeInfoOverlay) {
        creatorElements.modeInfoOverlay.classList.remove('active');
    }
}

// Circuit Config Functions
function openCircuitConfig() {
    // Load current values into modal
    if (creatorElements.circuitTours) creatorElements.circuitTours.value = circuitSettings.tours;
    if (creatorElements.circuitEffort) creatorElements.circuitEffort.value = circuitSettings.effort;
    if (creatorElements.circuitReposExo) creatorElements.circuitReposExo.value = circuitSettings.reposExo;
    if (creatorElements.circuitReposTour) creatorElements.circuitReposTour.value = circuitSettings.reposTour;

    if (creatorElements.circuitConfigOverlay) {
        creatorElements.circuitConfigOverlay.classList.add('active');
    }
}

function closeCircuitConfig() {
    if (creatorElements.circuitConfigOverlay) {
        creatorElements.circuitConfigOverlay.classList.remove('active');
    }
}

function saveCircuitConfig() {
    // Read values from modal
    circuitSettings.tours = parseInt(creatorElements.circuitTours.value) || 3;
    circuitSettings.effort = parseInt(creatorElements.circuitEffort.value) || 45;
    circuitSettings.reposExo = parseInt(creatorElements.circuitReposExo.value) || 15;
    circuitSettings.reposTour = parseInt(creatorElements.circuitReposTour.value) || 90;

    // Save to localStorage
    saveCircuitSettings();

    // Close modal
    closeCircuitConfig();

    // Re-render sidebar to show updated summary
    renderSidebar();

    showQuickFeedback('✓ Circuit configuré');
}

function saveCircuitSettings() {
    localStorage.setItem('circuit_settings', JSON.stringify(circuitSettings));
}

function loadCircuitSettings() {
    var saved = localStorage.getItem('circuit_settings');
    if (saved) {
        try {
            circuitSettings = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading circuit settings:', e);
        }
    }
}

// Fast Add Exercise (for Circuit and Parcours modes - no modal)
function fastAddExercise(exerciseData) {
    // Ensure at least one block exists
    if (workout.length === 0) {
        var defaultBlockTitle = sessionMode === 'circuit' ? 'Circuit' : 'Parcours';
        workout.push({
            id: 'block_' + Date.now(),
            title: defaultBlockTitle,
            exercises: []
        });
    }

    // Add exercise with default values to the first/only block
    var newExercise = {
        id: 'ex_' + Date.now(),
        name: exerciseData.name,
        muscle: exerciseData.muscle || '',
        illustration: exerciseData.illustration || '',
        // Mode-specific defaults
        chargeKg: 0,
        reps: sessionMode === 'parcours' ? 0 : 10, // Parcours uses "objectif total"
        objectifTotal: sessionMode === 'parcours' ? 50 : null,
        loadPercentage: 70
    };

    workout[0].exercises.push(newExercise);
    saveWorkoutToStorage();
    renderSidebar();

    // Visual feedback
    showQuickFeedback('✓ ' + exerciseData.name + ' ajouté');
}

// Quick feedback toast for fast add
function showQuickFeedback(message) {
    var toast = document.createElement('div');
    toast.className = 'quick-feedback-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function () {
        toast.classList.add('show');
    }, 10);

    setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () {
            toast.remove();
        }, 300);
    }, 1500);
}

// EMOM - Fast Add (no modal, immediate add with reps/min default)
function openEmomModal(exerciseData) {
    fastAddEmomExercise(exerciseData);
}

// Fast Add for EMOM mode
function fastAddEmomExercise(exerciseData) {
    // Ensure at least one block exists
    if (workout.length === 0) {
        workout.push({
            id: 'block_' + Date.now(),
            title: 'EMOM',
            exercises: []
        });
    }

    // Add exercise with EMOM-specific default values
    var newExercise = {
        id: 'ex_' + Date.now(),
        name: exerciseData.name,
        muscle: exerciseData.muscle || '',
        illustration: exerciseData.illustration || '',
        repsPerMin: 10, // EMOM-specific: reps to do per minute
        chargeKg: 0,
        loadPercentage: 70
    };

    workout[0].exercises.push(newExercise);
    saveWorkoutToStorage();
    renderSidebar();

    showQuickFeedback('✓ ' + exerciseData.name + ' ajouté');
}

// EMOM Config - Modal Implementation
function openEmomConfig() {
    if (creatorElements.emomDurationInput) {
        creatorElements.emomDurationInput.value = emomSettings.duration;
    }
    if (creatorElements.emomConfigOverlay) {
        creatorElements.emomConfigOverlay.classList.add('active');
    }
}

function closeEmomConfigModal() {
    if (creatorElements.emomConfigOverlay) {
        creatorElements.emomConfigOverlay.classList.remove('active');
    }
}

function saveEmomConfig() {
    if (creatorElements.emomDurationInput) {
        var newDuration = parseInt(creatorElements.emomDurationInput.value);
        if (newDuration && newDuration > 0 && newDuration <= 60) {
            emomSettings.duration = newDuration;
            saveEmomSettings();
            renderSidebar();
            showQuickFeedback('✓ EMOM: ' + emomSettings.duration + ' min');
            closeEmomConfigModal();
        } else {
            showQuickFeedback('⚠️ Durée invalide (1-60 min)');
        }
    }
}

function saveEmomSettings() {
    localStorage.setItem('emom_settings', JSON.stringify(emomSettings));
}

function loadEmomSettings() {
    var saved = localStorage.getItem('emom_settings');
    if (saved) {
        try {
            emomSettings = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading EMOM settings:', e);
        }
    }
}

// Confirmation Modal Functions
function openConfirmationModal(message, callback) {
    if (creatorElements.confirmationMessage) {
        creatorElements.confirmationMessage.textContent = message;
    }
    confirmationCallback = callback;
    if (creatorElements.confirmationOverlay) {
        creatorElements.confirmationOverlay.classList.add('active');
    }
}

function closeConfirmationModal() {
    if (creatorElements.confirmationOverlay) {
        creatorElements.confirmationOverlay.classList.remove('active');
    }
    confirmationCallback = null;
}

function handleConfirmationOk() {
    if (confirmationCallback) {
        confirmationCallback();
    }
    closeConfirmationModal();
}

// Superset - Pairing logic (duo obligatoire)
function openSupersetModal(exerciseData) {
    if (supersetState.waitingForPair) {
        // Second exercise - complete the pair
        addSupersetPairExercise(exerciseData);
    } else {
        // First exercise - open modal for config, then wait for pair
        openExerciseModal(exerciseData, false, null, true); // true = superset first exercise
    }
}

// Add first exercise of a Superset (called after modal validation)
function addSupersetFirstExercise(exerciseData) {
    // Create a new Superset block
    var supersetId = 'superset_' + Date.now();
    workout.push({
        id: supersetId,
        title: 'Superset (En attente...)',
        isSuperset: true,
        exercises: [exerciseData]
    });

    supersetState.waitingForPair = true;
    supersetState.currentSupersetId = supersetId;

    saveWorkoutToStorage();
    renderSidebar();

    showQuickFeedback('⏳ Sélectionnez le 2ème exercice');
}

// Add second exercise to complete the Superset
function addSupersetPairExercise(exerciseData) {
    var block = workout.find(function (b) { return b.id === supersetState.currentSupersetId; });
    if (block && block.exercises.length === 1) {
        // Open modal for second exercise config
        openExerciseModal(exerciseData, false, null, false, supersetState.currentSupersetId);
    }
}

// Complete the Superset with the second exercise
function completeSupersetPair(exerciseData, supersetId) {
    var block = workout.find(function (b) { return b.id === supersetId; });
    if (block) {
        block.exercises.push(exerciseData);
        block.title = block.exercises[0].name + ' + ' + block.exercises[1].name;

        supersetState.waitingForPair = false;
        supersetState.currentSupersetId = null;

        saveWorkoutToStorage();
        renderSidebar();

        showQuickFeedback('✓ Superset complet !');
    }
}

// Flag to prevent infinite update loops
var isUpdatingButtons = false;

function updateExerciseCardButtons() {
    // Prevent infinite loop
    if (isUpdatingButtons) return;
    isUpdatingButtons = true;

    try {
        var cards = document.querySelectorAll('.exercise-card');
        cards.forEach(function (card) {
            // Remove existing button first to prevent duplicates
            var existingBtn = card.querySelector('.btn-add-exercise');
            if (existingBtn) {
                existingBtn.remove();
            }

            // Only add button if in creator mode
            if (isCreatorMode) {
                var addBtn = document.createElement('button');
                addBtn.className = 'btn-add-exercise';
                addBtn.innerHTML = '+';
                addBtn.type = 'button';

                addBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var nameEl = card.querySelector('.exercise-card-name');
                    var muscleEl = card.querySelector('.exercise-card-muscle');
                    var exerciseName = nameEl ? nameEl.textContent.trim() : '';
                    var exerciseMuscle = muscleEl ? muscleEl.textContent.trim() : '';

                    // Get illustration from exercises data if available
                    var exerciseId = card.dataset.exerciseId;
                    var illustration = '';
                    if (exerciseId && typeof exercises !== 'undefined') {
                        var exerciseData = exercises.find(function (ex) {
                            return String(ex.id) === exerciseId;
                        });
                        if (exerciseData && exerciseData.illustration) {
                            // Convert Google Drive URL if needed
                            if (typeof convertGoogleDriveUrl === 'function') {
                                illustration = convertGoogleDriveUrl(exerciseData.illustration);
                            } else {
                                illustration = exerciseData.illustration;
                            }
                        }
                    }

                    if (exerciseName) {
                        // Mode-specific behavior
                        if (sessionMode === 'circuit' || sessionMode === 'parcours') {
                            // Fast Add: No modal, add immediately with defaults
                            fastAddExercise({
                                name: exerciseName,
                                muscle: exerciseMuscle,
                                illustration: illustration
                            });
                        } else if (sessionMode === 'emom') {
                            // EMOM: Specialized modal (reps per minute + charge)
                            openEmomModal({
                                name: exerciseName,
                                muscle: exerciseMuscle,
                                illustration: illustration
                            });
                        } else if (sessionMode === 'superset') {
                            // Superset: Standard modal but with restricted fields
                            openExerciseModal({
                                name: exerciseName,
                                muscle: exerciseMuscle,
                                illustration: illustration
                            });
                        } else {
                            // Bloc (default): Full config modal
                            openExerciseModal({
                                name: exerciseName,
                                muscle: exerciseMuscle,
                                illustration: illustration
                            });
                        }
                    }
                });

                card.style.position = 'relative';
                card.appendChild(addBtn);
            }
        });
    } finally {
        // Reset flag after a short delay
        setTimeout(function () {
            isUpdatingButtons = false;
        }, 100);
    }
}

// Simple function to refresh buttons when needed (called manually, not via observer)
function refreshCreatorButtons() {
    if (isCreatorMode && !isUpdatingButtons) {
        updateExerciseCardButtons();
    }
}

function openBlockModal() {
    creatorElements.inputBlockName.value = '';
    if (creatorElements.blockModalOverlay) {
        creatorElements.blockModalOverlay.classList.add('active');
    }
}

function closeBlockModal() {
    if (creatorElements.blockModalOverlay) {
        creatorElements.blockModalOverlay.classList.remove('active');
    }
}

function createBlock(e) {
    e.preventDefault();
    var title = creatorElements.inputBlockName.value.trim();
    if (!title) return;

    var block = {
        id: 'block_' + Date.now(),
        title: title,
        exercises: []
    };

    workout.push(block);
    saveWorkoutToStorage();
    renderSidebar();
    closeBlockModal();
}



function renameBlock(blockId) {
    var block = workout.find(function (b) { return b.id === blockId; });
    if (!block) return;

    var newTitle = prompt('Nouveau nom du bloc:', block.title);
    if (newTitle && newTitle.trim()) {
        block.title = newTitle.trim();
        saveWorkoutToStorage();
        renderSidebar();
    }
}

function openExerciseModal(exerciseData, editMode, existingExercise) {
    currentEditingExercise = editMode ? existingExercise : null;

    creatorElements.modalTitle.textContent = editMode ? 'Modifier l\'exercice' : 'Configurer l\'exercice';
    creatorElements.modalExerciseName.textContent = exerciseData.name;
    creatorElements.modalExerciseName.dataset.muscle = exerciseData.muscle || '';

    // Load exercise image if available
    if (creatorElements.modalImg && exerciseData.illustration) {
        creatorElements.modalImg.src = exerciseData.illustration;
    } else if (creatorElements.modalImg) {
        creatorElements.modalImg.src = 'asset/logo_muscu_app_2.png';
    }

    if (editMode && existingExercise) {
        creatorElements.inputSets.value = existingExercise.sets || 3;
        creatorElements.inputReps.value = existingExercise.reps || '12';
        creatorElements.inputRest.value = parseInt(existingExercise.rest) || 60;
        creatorElements.inputNotes.value = existingExercise.notes || '';
        // Load percentage
        var loadVal = existingExercise.loadPercentage || 70;
        if (creatorElements.inputLoad) creatorElements.inputLoad.value = loadVal;
        if (creatorElements.inputLoadSlider) creatorElements.inputLoadSlider.value = loadVal;
        creatorElements.blockSelectorGroup.style.display = 'none';
    } else {
        creatorElements.inputSets.value = 3;
        creatorElements.inputReps.value = '12';
        creatorElements.inputRest.value = 60;
        creatorElements.inputNotes.value = '';
        // Default load percentage
        if (creatorElements.inputLoad) creatorElements.inputLoad.value = 70;
        if (creatorElements.inputLoadSlider) creatorElements.inputLoadSlider.value = 70;

        if (workout.length > 1) {
            creatorElements.blockSelectorGroup.style.display = 'block';
            creatorElements.selectBlock.innerHTML = workout.map(function (b) {
                return '<option value="' + b.id + '">' + b.title + '</option>';
            }).join('');
        } else {
            creatorElements.blockSelectorGroup.style.display = 'none';
        }
    }

    // Adapt UI for Superset (Hide Sets/Rest)
    if (sessionMode === 'superset') {
        if (creatorElements.inputSets) creatorElements.inputSets.closest('.form-group').style.display = 'none';
        if (creatorElements.inputRest) creatorElements.inputRest.closest('.form-group').style.display = 'none';
        if (creatorElements.blockSelectorGroup) creatorElements.blockSelectorGroup.style.display = 'none';
    } else {
        if (creatorElements.inputSets) creatorElements.inputSets.closest('.form-group').style.display = 'block';
        if (creatorElements.inputRest) creatorElements.inputRest.closest('.form-group').style.display = 'block';
    }

    if (creatorElements.modalOverlay) {
        creatorElements.modalOverlay.classList.add('active');
    }
}

function closeExerciseModal() {
    if (creatorElements.modalOverlay) {
        creatorElements.modalOverlay.classList.remove('active');
    }
    currentEditingExercise = null;
}

function saveExerciseConfig(e) {
    e.preventDefault();

    var exerciseConfig = {
        id: currentEditingExercise ? currentEditingExercise.id : 'ex_' + Date.now(),
        name: creatorElements.modalExerciseName.textContent,
        muscle: creatorElements.modalExerciseName.dataset.muscle || '',
        sets: parseInt(creatorElements.inputSets.value) || 3,
        reps: creatorElements.inputReps.value || '12',
        rest: creatorElements.inputRest.value + 's',
        loadPercentage: parseInt(creatorElements.inputLoad ? creatorElements.inputLoad.value : 70) || 70,
        notes: creatorElements.inputNotes.value.trim()
    };

    if (currentEditingExercise) {
        for (var i = 0; i < workout.length; i++) {
            var block = workout[i];
            var idx = block.exercises.findIndex(function (ex) { return ex.id === currentEditingExercise.id; });
            if (idx !== -1) {
                block.exercises[idx] = exerciseConfig;
                break;
            }
        }
    } else {
        if (sessionMode === 'superset') {
            // Superset Logic: Auto-fill blocks of 2
            var lastBlock = workout.length > 0 ? workout[workout.length - 1] : null;

            if (lastBlock && lastBlock.isSuperset && lastBlock.exercises.length < 2) {
                // Add to existing block
                lastBlock.exercises.push(exerciseConfig);
            } else {
                // Create new Superset block
                var newBlock = {
                    id: 'superset_' + Date.now(),
                    title: 'Superset',
                    isSuperset: true,
                    sets: 4,     // Default
                    rest: 90,    // Default
                    exercises: [exerciseConfig]
                };
                workout.push(newBlock);
            }
        } else {
            // Standard Logic (Bloc/Circuit)
            var targetBlockId = creatorElements.selectBlock.value;

            if (workout.length === 0) {
                var newBlock = {
                    id: 'block_' + Date.now(),
                    title: 'Séance',
                    exercises: []
                };
                workout.push(newBlock);
                targetBlockId = newBlock.id;
            }

            if (workout.length === 1) {
                targetBlockId = workout[0].id;
            }

            var targetBlock = workout.find(function (b) { return b.id === targetBlockId; });
            if (targetBlock) {
                targetBlock.exercises.push(exerciseConfig);
            }
        }
    }

    saveWorkoutToStorage();
    renderSidebar();
    closeExerciseModal();
}

function editExercise(blockId, exerciseId) {
    var block = workout.find(function (b) { return b.id === blockId; });
    if (!block) return;

    var exercise = block.exercises.find(function (ex) { return ex.id === exerciseId; });
    if (!exercise) return;

    openExerciseModal({ name: exercise.name, muscle: exercise.muscle }, true, exercise);
}



// Move exercise up within its block
function moveExerciseUp(blockId, exerciseId) {
    var block = workout.find(function (b) { return b.id === blockId; });
    if (!block) return;

    var idx = block.exercises.findIndex(function (ex) { return ex.id === exerciseId; });
    if (idx <= 0) return; // Already at top

    var temp = block.exercises[idx - 1];
    block.exercises[idx - 1] = block.exercises[idx];
    block.exercises[idx] = temp;

    saveWorkoutToStorage();
    renderSidebar();
}

// Move exercise down within its block
function moveExerciseDown(blockId, exerciseId) {
    var block = workout.find(function (b) { return b.id === blockId; });
    if (!block) return;

    var idx = block.exercises.findIndex(function (ex) { return ex.id === exerciseId; });
    if (idx === -1 || idx >= block.exercises.length - 1) return; // Already at bottom

    var temp = block.exercises[idx + 1];
    block.exercises[idx + 1] = block.exercises[idx];
    block.exercises[idx] = temp;

    saveWorkoutToStorage();
    renderSidebar();
}

function renderSidebar() {
    if (!creatorElements.sidebarContent) return;

    var isEmpty = workout.length === 0 || (workout.length === 1 && workout[0].exercises.length === 0);

    // Update empty state message based on mode
    if (creatorElements.sidebarEmpty) {
        creatorElements.sidebarEmpty.style.display = isEmpty ? 'flex' : 'none';
        var emptyHint = creatorElements.sidebarEmpty.querySelector('.empty-hint');
        if (emptyHint) {
            if (sessionMode === 'bloc') {
                emptyHint.textContent = 'Créez un bloc pour commencer';
            } else if (sessionMode === 'superset') {
                emptyHint.textContent = 'Ajoutez des exercices pour créer vos Supersets';
            } else {
                emptyHint.textContent = 'Ajoutez un exercice pour commencer';
            }
        }
    }

    var blocksContainer = creatorElements.sidebarContent.querySelector('.blocks-container');
    if (!blocksContainer) {
        blocksContainer = document.createElement('div');
        blocksContainer.className = 'blocks-container';
        creatorElements.sidebarContent.appendChild(blocksContainer);
    }

    var html = '';

    // Add mode-specific global config button at top
    if (sessionMode === 'circuit') {
        html += '<div class="mode-config-section">';
        html += '<button class="btn-mode-config" onclick="openCircuitConfig()">⚙️ Configurer le Circuit</button>';
        html += '</div>';
    } else if (sessionMode === 'emom') {
        html += '<div class="mode-config-section">';
        html += '<button class="btn-mode-config" onclick="openEmomConfig()">⏱️ Configurer (' + emomSettings.duration + ' min)</button>';
        html += '</div>';
    }

    workout.forEach(function (block) {
        html += '<div class="sidebar-block" data-block-id="' + block.id + '" draggable="true">';
        if (sessionMode === 'superset') {
            // SUPERSET BLOCK HEADER
            html += '<div class="block-header block-header-superset">';
            html += '<div class="block-title-area">';
            html += '<span class="block-drag-handle">⠿</span>';
            html += '<div class="superset-info">';
            html += '<span class="block-title">Superset</span>';
            html += '<span class="superset-meta" style="font-size: 12px; color: #888; margin-left: 8px;">' + (block.sets || 4) + ' Séries | ' + (block.rest || 90) + 's Repos</span>';
            html += '</div></div>';
            html += '<div class="block-actions">';
            html += '<button class="block-action-btn" onclick="openSupersetBlockConfig(\'' + block.id + '\')" title="Configurer">⚙️</button>';
            html += '<button class="block-action-btn delete" onclick="deleteBlock(\'' + block.id + '\')" title="Supprimer">🗑️</button>';
            html += '</div></div>';
        } else {
            // STANDARD HEADER
            html += '<div class="block-header">';
            html += '<div class="block-title-area">';
            html += '<span class="block-drag-handle">⠿</span>';
            html += '<span class="block-title">' + block.title + '</span>';
            html += '</div>';
            html += '<div class="block-actions">';
            html += '<button class="block-action-btn" onclick="renameBlock(\'' + block.id + '\')" title="Renommer">✏️</button>';
            html += '<button class="block-action-btn delete" onclick="deleteBlock(\'' + block.id + '\')" title="Supprimer">🗑️</button>';
            html += '</div></div>';
        }
        html += '<div class="block-exercises" data-block-id="' + block.id + '">';

        if (block.exercises.length === 0) {
            html += '<div class="block-exercises-empty">Cliquez sur + pour ajouter des exercices</div>';
        } else {
            block.exercises.forEach(function (ex, exIdx) {
                html += renderExerciseItem(ex, block.id, exIdx, block.exercises.length);
            });
        }
        html += '</div></div>';
    });

    blocksContainer.innerHTML = html;
    setupDragAndDrop();

    // Setup inline input listeners for Circuit/Parcours modes
    if (sessionMode === 'circuit' || sessionMode === 'parcours') {
        setupInlineInputListeners();
    }
}

// Render exercise item based on sessionMode
function renderExerciseItem(ex, blockId, exIdx, totalExercises) {
    var html = '<div class="sidebar-exercise sidebar-exercise-' + sessionMode + '" data-exercise-id="' + ex.id + '" data-block-id="' + blockId + '" draggable="true">';

    // Move buttons (common to all modes)
    html += '<div class="exercise-move-btns">';
    html += '<button class="move-btn" onclick="moveExerciseUp(\'' + blockId + '\', \'' + ex.id + '\')" title="Monter"' + (exIdx === 0 ? ' disabled' : '') + '>⬆</button>';
    html += '<button class="move-btn" onclick="moveExerciseDown(\'' + blockId + '\', \'' + ex.id + '\')" title="Descendre"' + (exIdx >= totalExercises - 1 ? ' disabled' : '') + '>⬇</button>';
    html += '</div>';

    if (sessionMode === 'circuit') {
        // Circuit: Name + inline charge/reps sliders
        html += '<div class="exercise-info-circuit">';
        html += '<div class="exercise-info-name">' + ex.name + '</div>';
        html += '<div class="inline-inputs">';
        html += '<div class="inline-input-group">';
        html += '<label>Charge</label>';
        html += '<input type="number" class="inline-input" data-field="chargeKg" data-ex-id="' + ex.id + '" value="' + (ex.chargeKg || 0) + '" min="0" max="300"> kg';
        html += '</div>';
        html += '<div class="inline-input-group">';
        html += '<label>Reps</label>';
        html += '<input type="number" class="inline-input" data-field="reps" data-ex-id="' + ex.id + '" value="' + (ex.reps || 10) + '" min="1" max="100">';
        html += '</div>';
        html += '</div></div>';
    } else if (sessionMode === 'parcours') {
        // Parcours: Name + nombre de reps + optional charge
        html += '<div class="exercise-info-parcours">';
        html += '<div class="exercise-info-name">' + ex.name + '</div>';
        html += '<div class="inline-inputs">';
        html += '<div class="inline-input-group objectif-group">';
        html += '<label>Reps</label>';
        html += '<input type="number" class="inline-input inline-input-large" data-field="objectifTotal" data-ex-id="' + ex.id + '" value="' + (ex.objectifTotal || 50) + '" min="1" max="999">';
        html += '</div>';
        html += '<div class="inline-input-group">';
        html += '<label>Charge</label>';
        html += '<input type="number" class="inline-input" data-field="chargeKg" data-ex-id="' + ex.id + '" value="' + (ex.chargeKg || 0) + '" min="0" max="300"> kg';
        html += '</div>';
        html += '</div></div>';
    } else if (sessionMode === 'emom') {
        // EMOM: Name + reps/min + charge
        html += '<div class="exercise-info-emom">';
        html += '<div class="exercise-info-name">' + ex.name + '</div>';
        html += '<div class="inline-inputs">';
        html += '<div class="inline-input-group">';
        html += '<label>Reps/min</label>';
        html += '<input type="number" class="inline-input" data-field="repsPerMin" data-ex-id="' + ex.id + '" value="' + (ex.repsPerMin || 10) + '" min="1" max="50">';
        html += '</div>';
        html += '<div class="inline-input-group">';
        html += '<label>Charge</label>';
        html += '<input type="number" class="inline-input" data-field="chargeKg" data-ex-id="' + ex.id + '" value="' + (ex.chargeKg || 0) + '" min="0" max="300"> kg';
        html += '</div>';
        html += '</div></div>';
    } else if (sessionMode === 'superset') {
        // Superset: Show exercise with details
        html += '<div class="exercise-info-superset">';
        html += '<div class="exercise-info-name">' + ex.name + '</div>';
        var loadStr = ex.loadPercentage ? ' | Charge: ' + ex.loadPercentage + '%' : '';
        html += '<div class="exercise-info-details">' + ex.sets + ' × ' + ex.reps + ' | Repos: ' + ex.rest + loadStr + '</div>';
        html += '</div>';
    } else {
        // Bloc (default): Full details
        html += '<div class="exercise-info">';
        html += '<div class="exercise-info-name">' + ex.name + '</div>';
        var loadStr = ex.loadPercentage ? ' | Charge: ' + ex.loadPercentage + '%' : '';
        html += '<div class="exercise-info-details">' + ex.sets + ' × ' + ex.reps + ' | Repos: ' + ex.rest + loadStr + '</div>';
        html += '</div>';
    }

    // Action buttons
    html += '<div class="exercise-actions">';
    // Only show edit button for Bloc and Superset modes (others are inline)
    if (sessionMode === 'bloc' || sessionMode === 'superset') {
        html += '<button class="exercise-action-btn" onclick="editExercise(\'' + blockId + '\', \'' + ex.id + '\')" title="Modifier">✏️</button>';
    }
    html += '<button class="exercise-action-btn delete" onclick="deleteExercise(\'' + blockId + '\', \'' + ex.id + '\')" title="Supprimer">🗑️</button>';
    html += '</div></div>';

    return html;
}

// Setup listeners for inline inputs (Circuit/Parcours)
function setupInlineInputListeners() {
    document.querySelectorAll('.inline-input').forEach(function (input) {
        input.addEventListener('change', function () {
            var exId = this.dataset.exId;
            var field = this.dataset.field;
            var value = parseInt(this.value) || 0;

            // Find and update the exercise
            workout.forEach(function (block) {
                var ex = block.exercises.find(function (e) { return e.id === exId; });
                if (ex) {
                    ex[field] = value;
                }
            });

            saveWorkoutToStorage();
        });
    });
}

function setupDragAndDrop() {
    document.querySelectorAll('.sidebar-block').forEach(function (block) {
        block.addEventListener('dragstart', handleDragStart);
        block.addEventListener('dragend', handleDragEnd);
        block.addEventListener('dragover', handleDragOver);
        block.addEventListener('drop', handleDrop);
    });

    document.querySelectorAll('.sidebar-exercise').forEach(function (exercise) {
        exercise.addEventListener('dragstart', handleExerciseDragStart);
        exercise.addEventListener('dragend', handleDragEnd);
    });

    document.querySelectorAll('.block-exercises').forEach(function (zone) {
        zone.addEventListener('dragover', handleExerciseDragOver);
        zone.addEventListener('drop', handleExerciseDrop);
    });
}

function handleDragStart(e) {
    draggedItem = e.target;
    draggedItemType = 'block';
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleExerciseDragStart(e) {
    e.stopPropagation();
    draggedItem = e.target;
    draggedItemType = 'exercise';
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedItem = null;
    draggedItemType = null;
}

function handleDragOver(e) {
    e.preventDefault();
    if (draggedItemType !== 'block') return;
    e.dataTransfer.dropEffect = 'move';
}

function handleExerciseDragOver(e) {
    e.preventDefault();
    if (draggedItemType !== 'exercise') return;
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    if (draggedItemType !== 'block' || !draggedItem) return;

    var targetBlock = e.target.closest('.sidebar-block');
    if (!targetBlock || targetBlock === draggedItem) return;

    var draggedId = draggedItem.dataset.blockId;
    var targetId = targetBlock.dataset.blockId;

    var draggedIdx = workout.findIndex(function (b) { return b.id === draggedId; });
    var targetIdx = workout.findIndex(function (b) { return b.id === targetId; });

    if (draggedIdx === -1 || targetIdx === -1) return;

    var removed = workout.splice(draggedIdx, 1)[0];
    workout.splice(targetIdx, 0, removed);

    saveWorkoutToStorage();
    renderSidebar();
}

function handleExerciseDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItemType !== 'exercise' || !draggedItem) return;

    var targetZone = e.target.closest('.block-exercises');
    if (!targetZone) return;

    var sourceBlockId = draggedItem.dataset.blockId;
    var exerciseId = draggedItem.dataset.exerciseId;
    var targetBlockId = targetZone.dataset.blockId;

    var sourceBlock = workout.find(function (b) { return b.id === sourceBlockId; });
    var targetBlock = workout.find(function (b) { return b.id === targetBlockId; });

    if (!sourceBlock || !targetBlock) return;

    var exerciseIdx = sourceBlock.exercises.findIndex(function (ex) { return ex.id === exerciseId; });
    if (exerciseIdx === -1) return;

    var exercise = sourceBlock.exercises.splice(exerciseIdx, 1)[0];
    targetBlock.exercises.push(exercise);

    saveWorkoutToStorage();
    renderSidebar();
}

function saveWorkoutToStorage() {
    // Use mode-specific key for data isolation
    var storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(workout));
}

function loadWorkoutFromStorage() {
    var storageKey = getStorageKey();
    try {
        var saved = localStorage.getItem(storageKey);
        if (saved) {
            workout = JSON.parse(saved);
        } else {
            workout = [];
        }
    } catch (e) {
        console.error('Error loading workout:', e);
        workout = [];
    }
}

// Get mode-specific storage key
function getStorageKey() {
    if (!sessionMode) return 'fitzone_workout_default';
    return 'fitzone_workout_' + sessionMode;
}

// Clear Workout - Now uses custom modal
function clearWorkout() {
    if (workout.length === 0) return;
    openConfirmationModal('Voulez-vous vraiment supprimer tous les exercices de la séance ?', function () {
        workout = [];
        saveWorkoutToStorage();
        renderSidebar();
        showQuickFeedback('✓ Séance effacée');
    });
}

function deleteBlock(blockId) {
    if (workout.length <= 1 && workout[0].exercises.length === 0) return;
    openConfirmationModal('Supprimer ce bloc et ses exercices ?', function () {
        workout = workout.filter(function (b) { return b.id !== blockId; });
        saveWorkoutToStorage();
        renderSidebar();
        showQuickFeedback('✓ Bloc supprimé');
    });
}

function deleteExercise(blockId, exerciseId) {
    openConfirmationModal('Supprimer cet exercice ?', function () {
        var block = workout.find(function (b) { return b.id === blockId; });
        if (block) {
            block.exercises = block.exercises.filter(function (ex) { return ex.id !== exerciseId; });
            saveWorkoutToStorage();
            renderSidebar();
            showQuickFeedback('✓ Exercice supprimé');
        }
    });
}

function exportWorkoutToPDF(sessionDataOption) {
    // Determine context (Global or Passed Data)
    var dataToExport = workout;
    var exportMode = sessionMode;
    var exportTitle = 'Ma Séance d\'Entraînement';
    var exportDate = new Date().toLocaleDateString('fr-FR');

    if (sessionDataOption) {
        dataToExport = sessionDataOption.data || [];
        exportMode = sessionDataOption.mode || 'bloc';
        exportTitle = sessionDataOption.name || 'Ma Séance';
        if (sessionDataOption.createdAt) {
            exportDate = new Date(sessionDataOption.createdAt).toLocaleDateString('fr-FR');
        }
    }

    if (!dataToExport || dataToExport.length === 0) {
        alert('Aucune donnée à exporter.');
        return;
    }

    if (!window.jspdf) {
        alert('Bibliothèque PDF non chargée. Vérifiez votre connexion.');
        return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();

    var y = 20;
    var lineHeight = 8;
    var pageHeight = 280;

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(exportTitle, 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Générée le ' + exportDate, 105, y, { align: 'center' });
    y += 20;
    doc.setTextColor(0);

    dataToExport.forEach(function (block, blockIdx) {
        if (y > pageHeight - 50) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(15, y - 5, 180, 12, 'F');

        var blockTitle = block.title;
        if (block.isSuperset) {
            blockTitle = "Superset (x" + (block.sets || 4) + ")";
        }

        doc.text((blockIdx + 1) + '. ' + blockTitle, 20, y + 3);
        y += 18;

        if (block.exercises.length === 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(150);
            doc.text('Aucun exercice', 25, y);
            doc.setTextColor(0);
            y += lineHeight;
        } else {
            block.exercises.forEach(function (ex) {
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('• ' + ex.name, 25, y);
                y += lineHeight;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80);

                // Mode-specific exercise details
                var detailsText = '';
                if (exportMode === 'parcours') {
                    // Parcours
                    var reps = ex.objectifTotal || ex.reps || 0;
                    if (ex.chargeKg && ex.chargeKg > 0) {
                        detailsText = '   ' + reps + ' reps @ ' + ex.chargeKg + 'kg';
                    } else {
                        detailsText = '   ' + reps + ' reps';
                    }
                } else if (exportMode === 'circuit') {
                    // Circuit
                    var reps = ex.reps || 10;
                    if (ex.chargeKg && ex.chargeKg > 0) {
                        detailsText = '   ' + reps + ' reps - ' + ex.chargeKg + 'kg';
                    } else {
                        detailsText = '   ' + reps + ' reps';
                    }
                } else if (block.isSuperset) {
                    // Superset context
                    // Use Block config for sets/rest if available, else standard?
                    // Superset exercises share sets/rest from block usually, but individual reps/charge
                    detailsText = '   ' + ex.reps + ' reps';
                    if (ex.loadPercentage) detailsText += ' | ' + ex.loadPercentage + '%';
                    // Add block info?
                    detailsText += ' (Repos: ' + (block.rest || 90) + 's)';
                } else {
                    // Bloc (default)
                    var loadPct = ex.loadPercentage ? ' | Charge: ' + ex.loadPercentage + '%' : '';
                    detailsText = '   ' + ex.sets + ' séries × ' + ex.reps + ' reps | Repos: ' + ex.rest + loadPct;
                }
                doc.text(detailsText, 25, y);
                y += lineHeight;

                if (ex.notes) {
                    doc.setFont('helvetica', 'italic');
                    doc.text('   Note: ' + ex.notes, 25, y);
                    y += lineHeight;
                }

                doc.setTextColor(0);
                y += 4;
            });
        }

        y += 10;
    });

    var nameSafe = exportTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(nameSafe + '.pdf');
}

// Superset Block Config
var currentConfigBlockId = null;

function openSupersetBlockConfig(blockId) {
    currentConfigBlockId = blockId;
    var block = workout.find(function (b) { return b.id === blockId; });
    if (!block) return;

    // Set values in modal
    var setsInput = document.getElementById('superset-sets');
    var restInput = document.getElementById('superset-rest');
    var restSlider = document.getElementById('superset-rest-slider');

    if (setsInput) setsInput.value = block.sets || 4;
    if (restInput) restInput.value = block.rest || 90;
    if (restSlider) restSlider.value = block.rest || 90;

    var overlay = document.getElementById('superset-block-overlay');
    if (overlay) overlay.classList.add('active');
}

function closeSupersetBlockConfig() {
    var overlay = document.getElementById('superset-block-overlay');
    if (overlay) overlay.classList.remove('active');
    currentConfigBlockId = null;
}

function saveSupersetBlockConfig() {
    if (!currentConfigBlockId) return;

    var block = workout.find(function (b) { return b.id === currentConfigBlockId; });
    if (!block) return;

    var setsInput = document.getElementById('superset-sets');
    var restInput = document.getElementById('superset-rest');

    if (setsInput) block.sets = parseInt(setsInput.value) || 4;
    if (restInput) block.rest = parseInt(restInput.value) || 90;

    saveWorkoutToStorage();
    renderSidebar();
    closeSupersetBlockConfig();
    showQuickFeedback('✓ Superset configuré');
}

// Add listeners for Superset modal
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
        var closeBtn = document.getElementById('superset-block-close');
        var cancelBtn = document.getElementById('superset-block-cancel');
        var confirmBtn = document.getElementById('superset-block-confirm');
        var overlay = document.getElementById('superset-block-overlay');

        if (closeBtn) closeBtn.addEventListener('click', closeSupersetBlockConfig);
        if (cancelBtn) cancelBtn.addEventListener('click', closeSupersetBlockConfig);
        if (confirmBtn) confirmBtn.addEventListener('click', saveSupersetBlockConfig);
        if (overlay) overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeSupersetBlockConfig();
        });
    });
}

// Initialize creator mode after main app init
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        try {
            initCreatorMode();
            console.log('Creator mode initialized successfully');
        } catch (error) {
            console.error('Error initializing creator mode:', error);
        }
    }, 200);
});
