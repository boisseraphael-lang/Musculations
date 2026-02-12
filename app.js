// ===== Configuration =====
const CONFIG = {
    // Using CORS proxy to allow fetching from file:// protocol
    csvUrl: 'https://corsproxy.io/?' + encodeURIComponent('https://docs.google.com/spreadsheets/d/e/2PACX-1vQMJ1QxebIt9_Jnc_JFHeYUnn8C5iENjLfhy33ERZrH-pqXc8jT-r7fSP78gMNJngpW3GgywLEnWgLV/pub?gid=0&single=true&output=csv'),
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
let currentMuscle = null;
let currentExercise = null;
let selectedMuscleHeads = []; // For muscle head filtering

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
    try {
        await loadExercises();
        setupEventListeners();
        renderCategories();
        hideLoading();
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Erreur lors du chargement des exercices');
    }
}

// ===== Data Loading =====
async function loadExercises() {
    const response = await fetch(CONFIG.csvUrl);
    const csvText = await response.text();
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

    // Close search on outside click
    document.addEventListener('click', (e) => {
        if (!elements.searchInput.contains(e.target) && !elements.searchResults.contains(e.target)) {
            elements.searchResults.classList.remove('active');
        }
    });

    // Filter panel events
    elements.filterReset.addEventListener('click', resetFilters);
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

    elements.categoriesGrid.innerHTML = muscleNames.map(muscle => `
        <div class="category-card" data-muscle="${muscle}">
            <div class="category-image-container">
                <img class="category-image" src="${CONFIG.muscleImages[muscle] || ''}" alt="${muscle}" onerror="this.style.display='none'">
            </div>
            <div class="category-content">
                <h3 class="category-name">${muscle}</h3>
                <p class="category-count">${muscleGroups[muscle].length} exercice${muscleGroups[muscle].length > 1 ? 's' : ''}</p>
            </div>
        </div>
    `).join('');

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
            <h3 class="exercise-card-name">${exercise.name}</h3>
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

function hideAllViews() {
    elements.viewHome.classList.remove('active');
    elements.viewMuscle.classList.remove('active');
    elements.viewExercise.classList.remove('active');
    // Also hide My Sessions view to prevent phantom rendering
    var viewMySessions = document.getElementById('view-my-sessions');
    if (viewMySessions) viewMySessions.classList.remove('active');
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

// ===== Utilities =====
function hideLoading() {
    elements.loading.classList.add('hidden');
}

function showError(message) {
    elements.loading.innerHTML = `
        <div style="color: #ff6b35; font-size: 1.2rem;">${message}</div>
        <button onclick="location.reload()" style="
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background: #ff6b35;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
        ">Réessayer</button>
    `;
}

