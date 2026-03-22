/**
 * PHYSIOMAP - Interactive Muscle Trainer
 * 
 * Features:
 * - Left side: Front body view with hoverable muscle zones
 * - Right side: Back body view with hoverable muscle zones
 * - Pink highlight on hover (from muscle overlay images)
 * - Click to select muscle and show corresponding exercises
 */

// ===== Configuration =====
const CONFIG = {
    csvUrl: 'https://corsproxy.io/?' + encodeURIComponent('https://docs.google.com/spreadsheets/d/e/2PACX-1vQMJ1QxebIt9_Jnc_JFHeYUnn8C5iENjLfhy33ERZrH-pqXc8jT-r7fSP78gMNJngpW3GgywLEnWgLV/pub?gid=0&single=true&output=csv')
};

// Muscle layer definitions - maps asset keys to categories
// Note: Keys must match the keys generated in muscle-assets.js
const MUSCLE_LAYERS = {
    front: [
        { key: 'pectoraux_front', category: 'Pectoraux' },
        { key: 'abdminaux_front', category: 'Abdominaux' },
        { key: 'biceps_front', category: 'Biceps' },
        { key: 'deltoide_epaule_front', category: 'Deltoides' },
        { key: 'quadriceps_front', category: 'Quadriceps' },
        { key: 'mollet_front', category: 'Mollets' }
    ],
    back: [
        { key: 'Grand_dorsal_Dos_back', category: 'Dorsaux' },
        { key: 'triceps_back', category: 'Triceps' },
        { key: 'deltoide_epaule_back', category: 'Deltoides' },
        { key: 'fessier_back', category: 'Fessiers' },
        { key: 'Ischio-jambiers_back', category: 'Ischio-Jambiers' },
        { key: 'mollet_back', category: 'Mollets' }
    ]
};

// ===== State =====
let exerciseData = [];
let muscleGroups = {};
let activeMuscle = null;

// Loaded images and their processed canvases
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
        muscleList: document.getElementById('muscle-list'),
        exerciseFeed: document.getElementById('exercise-feed'),
        feedTitle: document.getElementById('feed-title'),
        searchInput: document.getElementById('search-input')
    };

    console.log('Initializing PhysioMap...');

    // Load all assets
    await loadAllAssets();

    // Load exercise data
    await loadExercises();

    // Draw base bodies
    drawBaseBodies();

    // Setup event listeners
    setupEventListeners();

    console.log('PhysioMap ready!');
});

// ===== Asset Loading =====
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
            processMuslceLayer(layer.key, layer.category, MUSCLE_LAYERS.front.includes(layer) ? 'front' : 'back');
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

function processMuslceLayer(key, category, view) {
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
        renderMuscleList();
    } catch (e) {
        console.error('Failed to load exercises:', e);
        elements.muscleList.innerHTML = '<li>Erreur de chargement</li>';
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
            desc: clean[6] || ''
        };

        exerciseData.push(ex);
        if (!muscleGroups[ex.muscle]) muscleGroups[ex.muscle] = [];
        muscleGroups[ex.muscle].push(ex);
    }
}

function renderMuscleList() {
    elements.muscleList.innerHTML = '';
    Object.keys(muscleGroups).sort().forEach(muscle => {
        const li = document.createElement('li');
        li.textContent = muscle;
        li.onclick = () => selectMuscle(muscle);
        elements.muscleList.appendChild(li);
    });
}

function renderFeed(muscleName) {
    elements.exerciseFeed.innerHTML = '';
    const exercises = muscleGroups[muscleName] || [];

    if (exercises.length === 0) {
        elements.exerciseFeed.innerHTML = '<div class="empty-state"><p>Aucun exercice trouvé.</p></div>';
        return;
    }

    exercises.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        card.innerHTML = `
            <div class="card-title">${ex.name}</div>
            <div class="card-meta">${ex.muscle}</div>
        `;
        elements.exerciseFeed.appendChild(card);
    });
}

function selectMuscle(category) {
    document.querySelectorAll('.nav-list li').forEach(li => {
        li.classList.toggle('active', li.textContent === category);
    });
    elements.feedTitle.textContent = category;
    renderFeed(category);
}

// ===== Event Handling =====
function setupEventListeners() {
    // Canvas interactions
    elements.canvasFront.addEventListener('mousemove', (e) => handleMouseMove(e, 'front'));
    elements.canvasFront.addEventListener('mouseleave', () => handleMouseLeave('front'));
    elements.canvasFront.addEventListener('click', handleClick);

    elements.canvasBack.addEventListener('mousemove', (e) => handleMouseMove(e, 'back'));
    elements.canvasBack.addEventListener('mouseleave', () => handleMouseLeave('back'));
    elements.canvasBack.addEventListener('click', handleClick);

    // Search
    elements.searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.nav-list li').forEach(li => {
            li.style.display = li.textContent.toLowerCase().includes(query) ? 'block' : 'none';
        });
    });
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
