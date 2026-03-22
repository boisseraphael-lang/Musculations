/**
 * FITZONE - Interactive Muscle Trainer (Light Version)
 * 
 * Features:
 * - Centered front/back body views
 * - Search functionality for muscles and exercises
 * - Category chips for quick access
 * - Slide-in exercise panel
 * - Pink highlight on hover
 */

// ===== Configuration =====
const CONFIG = {
    csvUrl: 'https://corsproxy.io/?' + encodeURIComponent('https://docs.google.com/spreadsheets/d/e/2PACX-1vQMJ1QxebIt9_Jnc_JFHeYUnn8C5iENjLfhy33ERZrH-pqXc8jT-r7fSP78gMNJngpW3GgywLEnWgLV/pub?gid=0&single=true&output=csv')
};

// Muscle layer definitions
const MUSCLE_LAYERS = {
    front: [
        { key: 'pectoraux_front', category: 'Pectoraux', icon: '💪' },
        { key: 'abdminaux_front', category: 'Abdominaux', icon: '🔥' },
        { key: 'biceps_front', category: 'Biceps', icon: '💪' },
        { key: 'deltoide_epaule_front', category: 'Deltoides', icon: '🎯' },
        { key: 'quadriceps_front', category: 'Quadriceps', icon: '🦵' },
        { key: 'mollet_front', category: 'Mollets', icon: '🦶' }
    ],
    back: [
        { key: 'Grand_dorsal_Dos_back', category: 'Dorsaux', icon: '🔙' },
        { key: 'triceps_back', category: 'Triceps', icon: '💪' },
        { key: 'deltoide_epaule_back', category: 'Deltoides', icon: '🎯' },
        { key: 'fessier_back', category: 'Fessiers', icon: '🍑' },
        { key: 'Ischio-jambiers_back', category: 'Ischio-Jambiers', icon: '🦵' },
        { key: 'mollet_back', category: 'Mollets', icon: '🦶' }
    ]
};

// ===== State =====
let exerciseData = [];
let muscleGroups = {};
let activeMuscle = null;
let allCategories = new Set();

const loadedImages = {};
const muscleCanvases = new Map();

// ===== DOM Elements =====
let elements = {};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
    // Cache DOM elements
    elements = {
        containerFront: document.getElementById('container-front'),
        containerBack: document.getElementById('container-back'),
        canvasFront: document.getElementById('canvas-front'),
        canvasBack: document.getElementById('canvas-back'),
        tooltip: document.getElementById('tooltip'),
        searchInput: document.getElementById('search-input'),
        searchResults: document.getElementById('search-results'),
        searchBtn: document.getElementById('search-btn'),
        categoryChips: document.getElementById('category-chips'),
        exercisePanel: document.getElementById('exercise-panel'),
        panelTitle: document.getElementById('panel-title'),
        panelContent: document.getElementById('panel-content'),
        panelClose: document.getElementById('panel-close'),
        totalExercises: document.getElementById('total-exercises')
    };

    console.log('Initializing FitZone...');

    // Load all assets first
    await loadAllAssets();

    // Load exercise data
    await loadExercises();

    // Draw base bodies
    drawBaseBodies();

    // Setup event listeners
    setupEventListeners();

    // Update stats
    updateStats();

    // Generate category chips
    generateCategoryChips();

    console.log('FitZone ready!');
});

// ===== Asset Loading (from version-clean) =====
async function loadAllAssets() {
    if (typeof MUSCLE_ASSETS === 'undefined') {
        console.error('MUSCLE_ASSETS not found! Make sure muscle-assets.js is loaded first.');
        return;
    }

    const keys = Object.keys(MUSCLE_ASSETS);
    console.log(`Loading ${keys.length} assets...`);

    for (const key of keys) {
        await loadImage(key, MUSCLE_ASSETS[key]);
    }

    // Process muscle layers (clean non-pink pixels)
    for (const layer of [...MUSCLE_LAYERS.front, ...MUSCLE_LAYERS.back]) {
        if (loadedImages[layer.key]) {
            processMuscleLayer(layer.key, layer.category, MUSCLE_LAYERS.front.includes(layer) ? 'front' : 'back');
        } else {
            console.warn(`Missing image for layer: ${layer.key}`);
        }
    }
}

function loadImage(key, base64) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            loadedImages[key] = img;
            console.log(`Loaded: ${key} (${img.width}x${img.height})`);
            resolve();
        };
        img.onerror = () => {
            console.error(`Failed to load: ${key}`);
            resolve();
        };
        img.src = base64;
    });
}

function processMuscleLayer(key, category, view) {
    const img = loadedImages[key];
    if (!img) return;

    // Create a hidden canvas for hit detection
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    // Clean non-pink pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let hasPink = false;

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Pink detection: high red, lower green/blue
        if (r > 180 && r > g + 20 && r > b + 10) {
            hasPink = true;
        } else {
            pixels[i + 3] = 0; // Make transparent
        }
    }
    ctx.putImageData(imageData, 0, 0);

    muscleCanvases.set(key, {
        ctx: ctx,
        width: canvas.width,
        height: canvas.height,
        category: category,
        view: view,
        hasPink: hasPink
    });

    console.log(`Processed: ${key} - Pink zones: ${hasPink}`);
}

// ===== Drawing =====
function drawBaseBodies() {
    // Draw front body
    const frontImg = loadedImages['full_body_front'];
    if (frontImg) {
        elements.canvasFront.width = frontImg.width;
        elements.canvasFront.height = frontImg.height;
        const ctxF = elements.canvasFront.getContext('2d');
        ctxF.drawImage(frontImg, 0, 0);
    }

    // Draw back body
    const backImg = loadedImages['full_body_back'];
    if (backImg) {
        elements.canvasBack.width = backImg.width;
        elements.canvasBack.height = backImg.height;
        const ctxB = elements.canvasBack.getContext('2d');
        ctxB.drawImage(backImg, 0, 0);
    }
}

function redrawCanvas(view) {
    const canvas = view === 'front' ? elements.canvasFront : elements.canvasBack;
    const baseKey = view === 'front' ? 'full_body_front' : 'full_body_back';
    const baseImg = loadedImages[baseKey];

    if (!baseImg) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImg, 0, 0);
}

// ===== Data Loading =====
async function loadExercises() {
    try {
        const response = await fetch(CONFIG.csvUrl);
        const csvText = await response.text();
        parseCSV(csvText);
    } catch (e) {
        console.error('Failed to load exercises:', e);
    }
}

function parseCSV(text) {
    const rows = text.split('\n').map(r => r.trim()).filter(r => r);
    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!cols || cols.length < 3) continue;

        const clean = cols.map(c => c.replace(/^"|"$/g, '').trim());
        const ex = {
            id: clean[0],
            muscle: clean[1],
            name: clean[2],
            img: clean[3] || '',
            video: clean[4] || '',
            type: clean[5] || '',
            desc: clean[6] || ''
        };

        exerciseData.push(ex);
        if (!muscleGroups[ex.muscle]) muscleGroups[ex.muscle] = [];
        muscleGroups[ex.muscle].push(ex);
    }

    console.log(`Loaded ${exerciseData.length} exercises in ${Object.keys(muscleGroups).length} muscle groups`);
}

// ===== Stats Update =====
function updateStats() {
    if (elements.totalExercises) {
        elements.totalExercises.textContent = exerciseData.length;
    }
}

// ===== Category Chips =====
function generateCategoryChips() {
    // Collect all unique categories from MUSCLE_LAYERS
    [...MUSCLE_LAYERS.front, ...MUSCLE_LAYERS.back].forEach(layer => {
        allCategories.add(layer.category);
    });

    if (!elements.categoryChips) return;

    elements.categoryChips.innerHTML = Array.from(allCategories).map(category => {
        const layer = [...MUSCLE_LAYERS.front, ...MUSCLE_LAYERS.back].find(l => l.category === category);
        return `<button class="category-chip" data-category="${category}">${layer?.icon || '💪'} ${category}</button>`;
    }).join('');

    // Add click handlers
    elements.categoryChips.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const category = chip.dataset.category;

            // Update active state
            elements.categoryChips.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            selectMuscle(category);
        });
    });
}

// ===== Event Handling =====
function setupEventListeners() {
    // Canvas interactions (from version-clean)
    elements.canvasFront.addEventListener('mousemove', (e) => handleMouseMove(e, 'front'));
    elements.canvasFront.addEventListener('mouseleave', () => handleMouseLeave('front'));
    elements.canvasFront.addEventListener('click', handleClick);

    elements.canvasBack.addEventListener('mousemove', (e) => handleMouseMove(e, 'back'));
    elements.canvasBack.addEventListener('mouseleave', () => handleMouseLeave('back'));
    elements.canvasBack.addEventListener('click', handleClick);

    // Search functionality
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', handleSearch);
        elements.searchInput.addEventListener('focus', () => {
            if (elements.searchInput.value.length >= 2) {
                elements.searchResults.classList.add('active');
            }
        });
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (elements.searchInput && elements.searchResults) {
            if (!elements.searchInput.contains(e.target) && !elements.searchResults.contains(e.target)) {
                elements.searchResults.classList.remove('active');
            }
        }
    });

    // Panel close button
    if (elements.panelClose) {
        elements.panelClose.addEventListener('click', () => {
            elements.exercisePanel.classList.remove('open');
        });
    }
}

function handleMouseMove(e, view) {
    const canvas = view === 'front' ? elements.canvasFront : elements.canvasBack;
    const rect = canvas.getBoundingClientRect();

    // Calculate mouse position relative to canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = Math.floor((e.clientX - rect.left) * scaleX);
    const py = Math.floor((e.clientY - rect.top) * scaleY);

    // Find which muscle (if any) is under the cursor
    let foundLayer = null;

    for (const [key, data] of muscleCanvases.entries()) {
        if (data.view !== view || !data.hasPink) continue;
        if (px < 0 || px >= data.width || py < 0 || py >= data.height) continue;

        try {
            const pixel = data.ctx.getImageData(px, py, 1, 1).data;
            if (pixel[3] > 50) { // Has visible pink
                foundLayer = data;
                break;
            }
        } catch (err) {
            // Ignore
        }
    }

    // Redraw base body
    redrawCanvas(view);

    if (foundLayer) {
        // Draw the pink muscle overlay
        const ctx = canvas.getContext('2d');
        ctx.drawImage(foundLayer.ctx.canvas, 0, 0);

        // Show tooltip
        elements.tooltip.classList.add('visible');
        elements.tooltip.textContent = foundLayer.category;
        elements.tooltip.style.left = (e.clientX + 15) + 'px';
        elements.tooltip.style.top = (e.clientY + 15) + 'px';

        canvas.style.cursor = 'pointer';
        activeMuscle = foundLayer.category;
    } else {
        elements.tooltip.classList.remove('visible');
        canvas.style.cursor = 'default';
        activeMuscle = null;
    }
}

function handleMouseLeave(view) {
    redrawCanvas(view);
    elements.tooltip.classList.remove('visible');
    activeMuscle = null;
}

function handleClick() {
    if (activeMuscle) {
        selectMuscle(activeMuscle);
    }
}

// ===== Search Functionality =====
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    if (query.length < 2) {
        elements.searchResults.classList.remove('active');
        return;
    }

    const results = [];

    // Search in muscle groups from Google Sheets
    Object.keys(muscleGroups).forEach(muscle => {
        if (muscle.toLowerCase().includes(query)) {
            results.push({ type: 'muscle', name: muscle });
        }
    });

    // Search in exercises
    exerciseData.forEach(exercise => {
        if (exercise.name && exercise.name.toLowerCase().includes(query)) {
            results.push({
                type: 'exercice',
                name: exercise.name,
                muscle: exercise.muscle
            });
        }
    });

    displaySearchResults(results.slice(0, 10));
}

function displaySearchResults(results) {
    if (!elements.searchResults) return;

    if (results.length === 0) {
        elements.searchResults.innerHTML = '<div class="search-result-item"><span class="result-name">Aucun résultat</span></div>';
    } else {
        elements.searchResults.innerHTML = results.map(result => `
            <div class="search-result-item" data-type="${result.type}" data-name="${result.name}" data-muscle="${result.muscle || result.name}">
                <span class="result-type">${result.type}</span>
                <span class="result-name">${result.name}</span>
            </div>
        `).join('');

        // Add click handlers
        elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const muscle = item.dataset.muscle;
                elements.searchResults.classList.remove('active');
                elements.searchInput.value = item.dataset.name;
                selectMuscle(muscle);
            });
        });
    }

    elements.searchResults.classList.add('active');
}

// ===== Muscle Selection & Exercise Panel =====
function selectMuscle(category) {
    activeMuscle = category;

    if (elements.panelTitle) {
        elements.panelTitle.textContent = category;
    }

    // Update active category chip
    if (elements.categoryChips) {
        elements.categoryChips.querySelectorAll('.category-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.category === category);
        });
    }

    // Find exercises from muscleGroups (loaded from Google Sheets)
    let exercises = muscleGroups[category] || [];

    // If no exact match, try partial match
    if (exercises.length === 0) {
        for (const [group, exList] of Object.entries(muscleGroups)) {
            if (group.toLowerCase().includes(category.toLowerCase()) ||
                category.toLowerCase().includes(group.toLowerCase())) {
                exercises = exercises.concat(exList);
            }
        }
    }

    if (elements.panelContent) {
        if (exercises.length === 0) {
            elements.panelContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">😢</div>
                    <p>Aucun exercice trouvé pour ${category}</p>
                </div>
            `;
        } else {
            elements.panelContent.innerHTML = exercises.map((ex, idx) => `
                <div class="exercise-card" style="animation-delay: ${idx * 0.1}s">
                    <h3>${ex.name || 'Exercice'}</h3>
                    <div class="exercise-info">
                        ${ex.type ? `<span class="exercise-tag">${ex.type}</span>` : ''}
                        ${ex.muscle ? `<span class="exercise-tag">${ex.muscle}</span>` : ''}
                    </div>
                    ${ex.video ? `
                        <a href="${ex.video}" target="_blank" class="video-link">
                            ▶️ Voir la vidéo
                        </a>
                    ` : ''}
                </div>
            `).join('');
        }
    }

    if (elements.exercisePanel) {
        elements.exercisePanel.classList.add('open');
    }
}
