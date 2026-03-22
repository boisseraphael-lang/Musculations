// ===== Configuration =====
const CONFIG = {
    // Liste des proxys CORS pour assurer le chargement initial même si l'un est en panne
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQMJ1QxebIt9_Jnc_JFHeYUnn8C5iENjLfhy33ERZrH-pqXc8jT-r7fSP78gMNJngpW3GgywLEnWgLV/pub?gid=0&single=true&output=csv',
    proxies: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://thingproxy.freeboard.io/fetch/'
    ],
    // Images for muscle categories - using actual asset files
    muscleImages: {
        'Grand dorsal (Dos)': 'asset/Grand dorsal (Dos) back.png',
        'Dorsaux': 'asset/Grand dorsal (Dos) back.png',
        'Pectoraux': 'asset/pectoraux front.png',
        'Quadriceps': 'asset/quadriceps front.png',
        'Fessier': 'asset/fessier back.png',
        'Ischio-jambiers': 'asset/Ischio-jambiers back.png',
        'Biceps': 'asset/biceps front.png',
        'Abdominaux': 'asset/abdminaux front.png',
        'Triceps': 'asset/triceps back.png',
        'deltoïde (épaule)': 'asset/deltoïde (épaule) front.png',
        'Mollet': 'asset/mollet front.png'
    },
    // Fallback emoji icons if images fail
    muscleIcons: {
        'Grand dorsal (Dos)': '🏋️',
        'Pectoraux': '💪',
        'Quadriceps': '🦵',
        'Fessier': '🍑',
        'Ischio-jambiers': '🦿',
        'Biceps': '💪',
        'Abdominaux': '🎯',
        'Triceps': '🔱',
        'deltoïde (épaule)': '🎯',
        'Mollet': '🦶'
    },
    // Muscle head filters configuration
    muscleHeadFilters: {
        'Quadriceps': ['Droit fémoral', 'Vaste latéral', 'Vaste médial', 'Vaste intermédiaire']
    }
};

// ===== State =====
let exercises = [];
let muscleGroups = {};
let currentExercise = null;
let selectedMuscleHeads = []; // For muscle head filtering
let isDataLoading = false; // Sécurité anti-boucle de chargement fetch
let authListenersAttached = false; // Empêche le double attachement des events auth

// ===== DOM Elements =====
const elements = {
    loading: document.getElementById('loading'),
    viewHome: document.getElementById('view-home'),
    viewMuscle: document.getElementById('view-muscle'),
    viewExercise: document.getElementById('view-exercise'),
    categoriesGrid: document.getElementById('categories-grid'),
    exercisesGrid: document.getElementById('exercises-grid'),
    exerciseDetail: document.getElementById('exercise-detail'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    searchClear: document.getElementById('search-clear'),
    muscleTitle: document.getElementById('muscle-title'),
    muscleCount: document.getElementById('muscle-count'),
    breadcrumb: document.getElementById('breadcrumb'),
    backToHome: document.getElementById('back-to-home'),
    logoHome: document.getElementById('logo-home'),
    // Filter elements
    filterPanel: document.getElementById('filter-panel'),
    filterReset: document.getElementById('filter-reset'),
    filterCheckboxes: document.getElementById('filter-checkboxes')
};

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // 1. Setup Auth Events UNE SEULE FOIS
    if (!authListenersAttached) {
        setupAuthEventListeners();
        authListenersAttached = true;
    }

    // 2. Check Authentication
    const user = loadCurrentUser();
    updateAuthUI(user);

    if (!user) {
        document.getElementById('auth-overlay').style.display = 'flex';
        hideLoading();
        return; 
    }

    // 3. Charger les données (avec sécurité anti-double appel)
    if (isDataLoading) {
        console.warn('Chargement déjà en cours, ignoré.');
        return;
    }
    isDataLoading = true;
    
    document.getElementById('auth-overlay').style.display = 'none';

    try {
        await loadExercises();
        setupEventListeners();
        renderCategories();
    } catch (error) {
        console.error('Error initializing app:', error);
        alert(error.message || 'Erreur lors du chargement des exercices');
    } finally {
        hideLoading();
        isDataLoading = false;
    }
}

// ===== Data Loading =====

/**
 * Charge les exercices avec stratégie CACHE-FIRST :
 * 1. Si un cache localStorage existe → affichage instantané, puis refresh réseau en arrière-plan
 * 2. Sinon → fetch réseau normal (premier chargement uniquement)
 */
async function loadExercises() {
    const cached = localStorage.getItem('fitzone_csv_cache');

    if (cached && cached.length > 100) {
        // ✅ CACHE-FIRST : affichage instantané depuis le cache
        console.log('⚡ Chargement instantané depuis le cache local');
        processCSVData(cached);
        // Rafraîchir les données en arrière-plan (non bloquant)
        refreshFromNetwork();
        return;
    }

    // Pas de cache → premier chargement, on doit attendre le réseau
    console.log('🌐 Premier chargement, récupération depuis le réseau...');
    const csvText = await fetchFromNetwork();

    if (!csvText) {
        throw new Error('Connexion impossible et aucune donnée en cache. Vérifiez votre connexion Internet.');
    }

    localStorage.setItem('fitzone_csv_cache', csvText);
    processCSVData(csvText);
}

/**
 * Parse le CSV et remplit exercises[] et muscleGroups{}
 */
function processCSVData(csvText) {
    exercises = parseCSV(csvText);

    // Group exercises by muscle
    muscleGroups = {};
    exercises.forEach(exercise => {
        if (exercise.muscle && exercise.name) {
            if (!muscleGroups[exercise.muscle]) {
                muscleGroups[exercise.muscle] = [];
            }
            muscleGroups[exercise.muscle].push(exercise);
        }
    });

    // Inject custom exercises seamlessly after loading CSV data
    if (typeof injectCustomExercises === 'function') {
        injectCustomExercises();
        if (typeof populateMuscleSelect === 'function') populateMuscleSelect();
    }
}

/**
 * Fetch CSV depuis le réseau avec timeout de 5s par proxy
 * @returns {Promise<string|null>} Le texte CSV ou null si tout échoue
 */
async function fetchFromNetwork() {
    const URLsToTry = [
        ...CONFIG.proxies.map(p => p + encodeURIComponent(CONFIG.csvUrl)),
        CONFIG.csvUrl
    ];

    for (const url of URLsToTry) {
        try {
            console.log(`Tentative de chargement : ${url}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(url, {
                cache: 'no-cache',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const text = await response.text();

            // Vérifier si c'est du CSV valide et non du HTML d'erreur
            if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
                continue;
            }

            if (text.length < 100) continue; // Trop court pour être nos données

            console.log('✅ Chargement réussi via proxy/direct');
            return text;
        } catch (e) {
            console.warn(`Échec avec ${url}:`, e.message);
        }
    }

    return null;
}

/**
 * Rafraîchit les données en arrière-plan depuis le réseau
 * Met à jour le cache et re-render si les données ont changé
 */
function refreshFromNetwork() {
    fetchFromNetwork().then(newCsv => {
        if (newCsv) {
            const oldCache = localStorage.getItem('fitzone_csv_cache');
            if (newCsv !== oldCache) {
                console.log('🔄 Données mises à jour depuis le réseau');
                localStorage.setItem('fitzone_csv_cache', newCsv);
                processCSVData(newCsv);
                renderCategories();
            } else {
                console.log('✅ Cache à jour, pas de changement');
            }
        } else {
            console.warn('⚠️ Refresh réseau échoué, on garde le cache actuel');
        }
    }).catch(err => {
        console.warn('⚠️ Erreur refresh arrière-plan:', err.message);
    });
}

function parseCSV(csvText) {
    const result = [];

    // Parse CSV properly handling quoted fields with newlines
    const rows = parseCSVRows(csvText);

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];

        // Skip empty rows or rows without essential data
        // Column A (index 0) = Muscle, Column B (index 1) = Name
        if (!values[0] || !values[1]) continue;

        result.push({
            id: i,
            muscle: values[0]?.trim(),     // Column A
            name: values[1]?.trim(),       // Column B
            illustration: values[2]?.trim(), // Column C
            video: values[3]?.trim(),      // Column D
            description: values[4]?.trim(), // Column E
            muscleHeads: values[5] ? values[5].split('/').map(h => h.trim()).filter(h => h) : [] // Column F
        });
    }

    return result;
}

// Parse CSV handling quoted fields with newlines
function parseCSVRows(csvText) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++;
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            // Row separator (outside quotes)
            if (char === '\r' && nextChar === '\n') {
                i++; // Skip \n after \r
            }
            currentRow.push(currentField);
            if (currentRow.some(field => field.trim())) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }

    // Don't forget last field/row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.some(field => field.trim())) {
            rows.push(currentRow);
        }
    }

    return rows;
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Search
    elements.searchInput.addEventListener('input', handleSearch);
    elements.searchClear.addEventListener('click', clearSearch);

    // Navigation
    elements.backToHome.addEventListener('click', showHome);
    elements.logoHome.addEventListener('click', (e) => {
        e.preventDefault();
        showHome();
    });

    // Hard Reset Event Listener
    const btnHardReset = document.getElementById('btn-hard-reset');
    if (btnHardReset) {
        btnHardReset.addEventListener('click', resetAllData);
    }

    // Close search on outside click
    document.addEventListener('click', (e) => {
        if (!elements.searchInput.contains(e.target) && !elements.searchResults.contains(e.target)) {
            elements.searchResults.classList.remove('active');
        }
    });

    // Filter panel events
    elements.filterReset.addEventListener('click', resetFilters);
}

// ===== Hard Reset =====
function resetAllData() {
    if (confirm("⚠️ ATTENTION ⚠️\n\nVoulez-vous vraiment supprimer toutes vos données (exercices personnalisés et dossiers enregistrés) ?\n\nCette action est irréversible.")) {
        // Clear globally known keys
        localStorage.removeItem('fitzone_user_folders');
        localStorage.removeItem('fitzone_custom_exercises');
        localStorage.removeItem('circuit_settings');
        localStorage.removeItem('emom_settings');
        // Clear dynamically saved mode workouts
        const modes = ['bloc', 'circuit', 'parcours', 'superset', 'emom'];
        modes.forEach(mode => localStorage.removeItem('fitzone_workout_' + mode));
        localStorage.removeItem('fitzone_workout');

        // Reload the page to start completely fresh
        location.reload();
    }
}

// ===== Search =====
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    if (!query) {
        elements.searchResults.classList.remove('active');
        return;
    }

    const matches = exercises.filter(exercise =>
        exercise.name && exercise.name.toLowerCase().includes(query)
    ).slice(0, 10);

    renderSearchResults(matches);
}

function renderSearchResults(matches) {
    if (matches.length === 0) {
        elements.searchResults.innerHTML = `
            <div class="search-no-results">
                Aucun exercice trouvé
            </div>
        `;
    } else {
        elements.searchResults.innerHTML = matches.map(exercise => `
            <div class="search-result-item" data-exercise-id="${exercise.id}">
                <span class="search-result-muscle">${exercise.muscle}</span>
                <span class="search-result-name">${exercise.name}</span>
            </div>
        `).join('');

        // Add click listeners
        elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const exerciseId = item.dataset.exerciseId;
                const exercise = exercises.find(e => String(e.id) === exerciseId);
                if (exercise) {
                    currentMuscle = exercise.muscle;
                    showExercise(exercise);
                    clearSearch();
                }
            });
        });
    }

    elements.searchResults.classList.add('active');
}

function clearSearch() {
    elements.searchInput.value = '';
    elements.searchResults.classList.remove('active');
}

// ===== Rendering =====
function renderCategories() {
    const muscleNames = Object.keys(muscleGroups).sort();

    elements.categoriesGrid.innerHTML = muscleNames.map(muscle => {
        const imageSrc = CONFIG.muscleImages[muscle] || 'asset/logo_muscu_app_2.png';
        return `
        <div class="category-card" data-muscle="${muscle}">
            <div class="category-image-container">
                <img class="category-image" src="${imageSrc}" alt="${muscle}" onerror="this.src='asset/logo_muscu_app_2.png'; this.onerror=null;">
            </div>
            <div class="category-content">
                <h3 class="category-name">${muscle}</h3>
                <p class="category-count">${muscleGroups[muscle].length} exercice${muscleGroups[muscle].length > 1 ? 's' : ''}</p>
            </div>
        </div>
        `;
    }).join('');

    // Add click listeners
    elements.categoriesGrid.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const muscle = card.dataset.muscle;
            showMuscle(muscle);
        });
    });
}

function resetTooltip() {
    elements.muscleTooltip.textContent = 'Sélectionnez un muscle sur le corps';
    elements.muscleTooltip.style.background = 'var(--gradient-primary)';
}

// ===== Filter Panel Functions =====
function toggleFilterPanel() {
    // Keep for compatibility but now just opens
    elements.filterPanel.classList.add('open');
}

function closeFilterPanel() {
    // No longer needed but keep for compatibility
}

function resetFilters() {
    selectedMuscleHeads = [];
    renderFilterCheckboxes();
    renderExercises(currentMuscle);
}

function updateFilterVisibility() {
    // Show filter panel if current muscle has filter config
    const hasFilters = currentMuscle && CONFIG.muscleHeadFilters[currentMuscle];

    if (hasFilters) {
        elements.filterPanel.classList.add('open');
        renderFilterCheckboxes();
    } else {
        elements.filterPanel.classList.remove('open');
    }
}

function renderFilterCheckboxes() {
    const heads = CONFIG.muscleHeadFilters[currentMuscle] || [];

    elements.filterCheckboxes.innerHTML = heads.map(head => {
        const isChecked = selectedMuscleHeads.includes(head);
        const checkId = `filter-${head.replace(/\s+/g, '-').toLowerCase()}`;
        return `
            <div class="filter-checkbox-item ${isChecked ? 'checked' : ''}" data-head="${head}">
                <input type="checkbox" class="filter-checkbox" id="${checkId}" ${isChecked ? 'checked' : ''}>
                <span class="filter-label">${head}</span>
            </div>
        `;
    }).join('');

    // Add event listeners to the entire row (div container)
    elements.filterCheckboxes.querySelectorAll('.filter-checkbox-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default behavior
            e.stopPropagation(); // Stop event bubbling

            const head = item.dataset.head;
            const checkbox = item.querySelector('.filter-checkbox');

            // Always toggle the checkbox state
            checkbox.checked = !checkbox.checked;

            if (checkbox.checked) {
                if (!selectedMuscleHeads.includes(head)) {
                    selectedMuscleHeads.push(head);
                }
                item.classList.add('checked');
            } else {
                selectedMuscleHeads = selectedMuscleHeads.filter(h => h !== head);
                item.classList.remove('checked');
            }

            // Re-render exercises with filter
            renderExercises(currentMuscle);
        });
    });
}

function renderExercises(muscle) {
    let muscleExercises = muscleGroups[muscle] || [];

    // Apply AND-logic filter if muscle heads are selected
    if (selectedMuscleHeads.length > 0) {
        muscleExercises = muscleExercises.filter(exercise => {
            // Check if ALL selected heads are present in the exercise's muscleHeads
            return selectedMuscleHeads.every(head =>
                exercise.muscleHeads.some(h =>
                    h.toLowerCase().includes(head.toLowerCase()) ||
                    head.toLowerCase().includes(h.toLowerCase())
                )
            );
        });
    }

    // Update count display
    const totalCount = muscleGroups[muscle]?.length || 0;
    const filteredCount = muscleExercises.length;
    if (selectedMuscleHeads.length > 0) {
        elements.muscleCount.textContent = `${filteredCount} / ${totalCount} exercice${filteredCount > 1 ? 's' : ''} (filtré)`;
    } else {
        elements.muscleCount.textContent = `${totalCount} exercice${totalCount > 1 ? 's' : ''} disponible${totalCount > 1 ? 's' : ''}`;
    }

    elements.exercisesGrid.innerHTML = muscleExercises.map((exercise, index) => `
        <div class="exercise-card" data-exercise-id="${exercise.id}" style="animation-delay: ${index * 0.1}s">
            <h3 class="exercise-card-name">
                ${exercise.name}
                ${exercise.isCustom ? '<span class="exercise-card-custom-badge">Perso</span>' : ''}
            </h3>
            <span class="exercise-card-arrow">→</span>
        </div>
    `).join('');

    // Add click listeners
    elements.exercisesGrid.querySelectorAll('.exercise-card').forEach(card => {
        card.addEventListener('click', () => {
            const exerciseId = card.dataset.exerciseId;
            const exercise = exercises.find(e => String(e.id) === exerciseId);
            if (exercise) {
                closeFilterPanel(); // Close filter menu when clicking an exercise
                showExercise(exercise);
            }
        });
    });

    // Refresh creator mode buttons if creator mode is active
    if (typeof refreshCreatorButtons === 'function') {
        setTimeout(refreshCreatorButtons, 50);
    }
}

function renderExerciseDetail(exercise) {
    const imageUrl = convertGoogleDriveUrl(exercise.illustration);
    const formattedDescription = formatDescription(exercise.description);
    const videoHTML = getYouTubeLink(exercise.video, exercise.name);

    // Modular Block Layout with back button below title
    const detailHTML = `
        <div class="exercise-detail-header">
            <h2 class="exercise-detail-title">${exercise.name}</h2>
            <button class="back-button back-button-detail" id="back-to-muscle-dynamic">
                <span class="back-icon">←</span>
                <span>Retour aux exercices</span>
            </button>
        </div>

        <div class="detail-grid">
            <!-- Block 1: Illustration -->
            <div class="detail-block block-image">
                <div class="block-header">
                    <span class="block-icon">📷</span> Illustration
                </div>
                <div class="exercise-image-container">
                    <img class="exercise-image" src="${imageUrl}" alt="${exercise.name}" onerror="this.src='asset/logo_muscu_app_2.png'">
                </div>
            </div>

            <!-- Block 2: Description -->
            <div class="detail-block block-description">
                <div class="block-header">
                    <span class="block-icon">📝</span> Instructions
                </div>
                <div class="exercise-description">
                    ${formattedDescription}
                </div>
            </div>

            <!-- Block 3: Video -->
            <div class="detail-block block-video">
                <div class="block-header">
                    <span class="block-icon">🎬</span> Démonstration
                </div>
                ${videoHTML}
            </div>
        </div>
    `;

    elements.exerciseDetail.innerHTML = detailHTML;

    // Attach back button event listener dynamically
    const backBtn = document.getElementById('back-to-muscle-dynamic');
    if (backBtn) {
        backBtn.addEventListener('click', () => showMuscle(currentMuscle));
    }
}

// ===== URL Conversions =====
function convertGoogleDriveUrl(url) {
    if (!url) return null;

    // Extract file ID from various Google Drive URL formats
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/d\/([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            const fileId = match[1];
            // Use thumbnail URL which works better for public sharing
            return `https://lh3.googleusercontent.com/d/${fileId}`;
        }
    }

    return url;
}

// Extract YouTube video ID from various URL formats
function getYouTubeId(url) {
    if (!url) return null;
    url = url.trim();
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,          // Standard watch URL
        /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,        // Watch URL with other params
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,                       // Short youtu.be URL
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,            // Already embed URL
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,                 // Old v/ format
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,           // Shorts URL
        /^([a-zA-Z0-9_-]{11})$/                                     // Just the ID
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

// Global function to load video on click (Facade Strategy)
window.loadVideo = function (element, videoId, title) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&origin=${origin}`;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.src = src;
    iframe.title = title;
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;

    // Replace facade with iframe
    element.parentNode.replaceChild(iframe, element);
};

function getYouTubeLink(url, title) {
    if (!url) return '';

    const videoId = getYouTubeId(url);

    if (!videoId) {
        return `
            <div class="video-container-placeholder">
                <a href="${url}" target="_blank" rel="noopener noreferrer" class="video-link-button">
                    ▶ Voir la vidéo sur YouTube
                </a>
            </div>
        `;
    }

    // Facade Strategy: Image first, Click to load Iframe
    // Uses maxresdefault thumbnail and a play button overlay
    return `
        <div class="video-container">
            <div class="video-facade" onclick="loadVideo(this, '${videoId}', '${title.replace(/'/g, "\\'")}')" 
                 style="background-image: url('https://img.youtube.com/vi/${videoId}/maxresdefault.jpg');">
                <div class="video-play-button"></div>
            </div>
        </div>
        <div class="video-fallback">
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="video-fallback-link">
                Ouvrir sur YouTube ↗
            </a>
        </div>
    `;
}

// ===== Description Formatting =====
function formatDescription(description) {
    if (!description) return '';

    // Replace key phrases with styled versions
    // Regex matches start of string or new line (<br>), followed by optional whitespace, then the keyword
    // Removed 'g' flag to ensure we only replace the first occurrence (headers), avoiding duplicates in text
    let formatted = description
        .replace(/\n/g, '<br>')
        .replace(/(^|<br>)\s*Position initiale\s*[:\-]*/i, '$1<div class="phase-block"><span class="phase-badge phase-initial">Position Initiale</span></div>')
        .replace(/(^|<br>)\s*Mouvement\s*[:\-]*/i, '$1<div class="phase-block"><span class="phase-badge phase-movement">Mouvement</span></div>')
        .replace(/(^|<br>)\s*Position finale\s*[:\-]*/i, '$1<div class="phase-block"><span class="phase-badge phase-final">Position Finale</span></div>');

    return formatted;
}

// ===== View Navigation =====
function showHome() {
    hideAllViews();
    elements.viewHome.classList.add('active');
    currentMuscle = null;
    currentExercise = null;
    selectedMuscleHeads = []; // Reset filters
    updateBreadcrumb([]);
    clearSearch();
    elements.filterPanel.classList.remove('open'); // Hide filter panel on home
}

function showMuscle(muscle) {
    currentMuscle = muscle;
    currentExercise = null;
    selectedMuscleHeads = []; // Reset filters when switching muscles

    hideAllViews();
    elements.viewMuscle.classList.add('active');

    elements.muscleTitle.textContent = muscle;

    // Update filter visibility (shows burger only for muscles with filters)
    updateFilterVisibility();

    renderExercises(muscle);
    updateBreadcrumb([{ label: muscle }]);
}

function showExercise(exercise) {
    currentExercise = exercise;

    hideAllViews();
    elements.viewExercise.classList.add('active');

    renderExerciseDetail(exercise);
    updateBreadcrumb([
        { label: currentMuscle, action: () => showMuscle(currentMuscle) },
        { label: exercise.name }
    ]);
}

// ===== Loading & Error Helpers =====
function hideLoading() {
    const el = document.getElementById('loading');
    if (el) el.style.display = 'none';
    // Aussi montrer la vue home
    if (elements.viewHome) elements.viewHome.classList.add('active');
}

function showError(message) {
    hideLoading();
    alert(message);
}

function hideAllViews() {
    elements.viewHome.classList.remove('active');
    elements.viewMuscle.classList.remove('active');
    elements.viewExercise.classList.remove('active');
    // Also hide My Sessions view to prevent phantom rendering
    var viewMySessions = document.getElementById('view-my-sessions');
    if (viewMySessions) viewMySessions.classList.remove('active');
    // Also hide Add Exercise view
    var viewAddExercise = document.getElementById('view-add-exercise');
    if (viewAddExercise) viewAddExercise.classList.remove('active');
}

// ===== Breadcrumb =====
function updateBreadcrumb(items) {
    if (items.length === 0) {
        elements.breadcrumb.innerHTML = '';
        return;
    }

    let html = '<span class="breadcrumb-separator">›</span>';

    items.forEach((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast) {
            html += `<span class="breadcrumb-current">${item.label}</span>`;
        } else {
            html += `
                <a href="#" class="breadcrumb-link" data-index="${index}">${item.label}</a>
                <span class="breadcrumb-separator">›</span>
            `;
        }
    });

    elements.breadcrumb.innerHTML = html;

    // Add click listeners
    elements.breadcrumb.querySelectorAll('.breadcrumb-link').forEach(link => {
        const index = parseInt(link.dataset.index);
        if (items[index]?.action) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                items[index].action();
            });
        }
    });
}

// ===== Authentication UI & Events =====

function updateAuthUI(user) {
    const profileHeader = document.getElementById('user-profile-header');
    const loginTrigger = document.getElementById('btn-login-trigger');
    const overlay = document.getElementById('auth-overlay');

    if (user) {
        profileHeader.style.display = 'flex';
        loginTrigger.style.display = 'none';
        overlay.style.display = 'none';

        document.getElementById('header-user-name').textContent = user.firstName;
        const roleBadge = document.getElementById('user-role-badge');
        
        // Reset and Apply specific role classes
        roleBadge.className = 'user-badge';
        if (user.type === 'pro') {
            roleBadge.textContent = 'PRO';
            roleBadge.classList.add('badge-pro');
        } else {
            roleBadge.textContent = 'CLIENT';
            roleBadge.classList.add('badge-client');
        }
    } else {
        profileHeader.style.display = 'none';
        loginTrigger.style.display = 'flex';
        overlay.style.display = 'flex';
    }
}

function showRegisterForm(prefillEmail = '') {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    document.getElementById('auth-title').textContent = 'Créer un compte';
    document.getElementById('auth-subtitle').textContent = 'Rejoignez la communauté Musculations';
    
    if (prefillEmail) {
        document.getElementById('reg-email').value = prefillEmail;
    }
}

function setupAuthEventListeners() {
    // Switch between Login and Register
    document.getElementById('goto-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'flex';
        document.getElementById('auth-title').textContent = 'Créer un compte';
        document.getElementById('auth-subtitle').textContent = 'Rejoignez la communauté Musculations';
    });

    document.getElementById('goto-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'flex';
        document.getElementById('auth-title').textContent = 'Bienvenue sur Musculations';
        document.getElementById('auth-subtitle').textContent = 'Connectez-vous pour accéder à vos programmes';
    });

    // Role selection
    const roleCards = document.querySelectorAll('.role-card');
    roleCards.forEach(card => {
        card.addEventListener('click', () => {
            roleCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // Login Form Submit
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;

        const result = loginUser(email, pass);
        
        if (result.success) {
            // Cacher l'overlay et initialiser l'app proprement
            document.getElementById('auth-overlay').style.display = 'none';
            updateAuthUI(result.user);
            
            // Réinitialisation forcée pour charger le nouveau sandbox
            isDataLoading = false; 
            init(); 
            
            alert(`Bienvenue ${result.user.firstName} !`);
        } else {
            if (result.error === 'USER_NOT_FOUND') {
                if (confirm("Ce compte n'existe pas. Voulez-vous créer un compte avec cet email ?")) {
                    showRegisterForm(email);
                }
            } else {
                alert("Email ou mot de passe incorrect.");
            }
        }
    });

    // Register Form Submit
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const activeCard = document.querySelector('.role-card.active');
        const selectedRole = activeCard ? activeCard.dataset.role : 'client';
        
        const userData = {
            firstName: document.getElementById('reg-firstname').value,
            lastName: document.getElementById('reg-lastname').value,
            email: document.getElementById('reg-email').value,
            age: document.getElementById('reg-age').value,
            weight: document.getElementById('reg-weight').value,
            height: document.getElementById('reg-height').value,
            password: document.getElementById('reg-password').value,
            type: selectedRole
        };

        try {
            const user = registerUser(userData);
            
            // Cacher l'overlay et initialiser l'app proprement
            document.getElementById('auth-overlay').style.display = 'none';
            updateAuthUI(user);
            
            isDataLoading = false;
            init();
            
            alert(`Compte ${selectedRole.toUpperCase()} créé ! Bienvenue ${user.firstName}.`);
        } catch (err) {
            alert(err.message);
        }
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        if (confirm('Voulez-vous vous déconnecter ?')) {
            logoutUser();
        }
    });

    // Login Trigger (if closed somehow)
    if (document.getElementById('btn-login-trigger')) {
        document.getElementById('btn-login-trigger').addEventListener('click', () => {
            document.getElementById('auth-overlay').style.display = 'flex';
        });
    }
}

