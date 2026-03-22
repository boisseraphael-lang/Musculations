// ===== EXERCISE CREATOR =====
// Permet à l'utilisateur d'ajouter ses propres exercices
// Stockés en localStorage, injectés dans exercises[] et muscleGroups{}

const EC_STORAGE_KEY = 'fitzone_custom_exercises';

// ===== State =====
let customExercises = [];
let aefImageDataUrl = null; // base64 de l'image choisie

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    loadCustomExercises();

    // Bouton header
    const addExBtn = document.getElementById('add-exercise-btn');
    if (addExBtn) addExBtn.addEventListener('click', showAddExerciseView);

    // Formulaire
    const form = document.getElementById('add-exercise-form');
    if (form) form.addEventListener('submit', handleAddExerciseSubmit);

    // Annuler
    const cancelBtn = document.getElementById('aef-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        showHome();
        resetAddExerciseForm();
    });

    // Drag & drop zone
    setupDropzone();

    // Parcourir fichiers
    const browseBtn = document.getElementById('aef-browse-btn');
    const fileInput = document.getElementById('aef-file-input');
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleImageFile(e.target.files[0]);
        });
    }

    // Supprimer preview
    const removeBtn = document.getElementById('aef-preview-remove');
    if (removeBtn) removeBtn.addEventListener('click', clearImagePreview);

    // Toggle nouvelle catégorie
    const muscleSelect = document.getElementById('aef-muscle');
    const newMuscleContainer = document.getElementById('new-muscle-container');
    if (muscleSelect && newMuscleContainer) {
        muscleSelect.addEventListener('change', () => {
            if (muscleSelect.value === 'autre') {
                newMuscleContainer.style.display = 'block';
                document.getElementById('aef-muscle-custom').focus();
            } else {
                newMuscleContainer.style.display = 'none';
                document.getElementById('aef-muscle-custom').value = '';
            }
        });
    }

    // YouTube live preview
    const videoInput = document.getElementById('aef-video');
    if (videoInput) {
        videoInput.addEventListener('input', debounce(handleVideoInput, 400));
        videoInput.addEventListener('paste', () => setTimeout(handleVideoInput, 50));
    }
});

// Custom exercises are now injected natively by app.js immediately after the CSV finishes loading.

// ===== Storage =====
function loadCustomExercises() {
    // On retourne simplement le tableau du compte utilisateur
    return currentUser ? (currentUser.customExercises || []) : [];
}

function saveCustomExercises(newList) {
    if (!currentUser) return;
    
    // Mise à jour locale
    customExercises = newList || customExercises;
    currentUser.customExercises = customExercises;
    
    // Synchronisation globale
    if (typeof syncCurrentUser === 'function') {
        syncCurrentUser();
    }
}

// ===== Injection dans app.js globals =====
function injectCustomExercises() {
    if (!customExercises.length) return;

    customExercises.forEach(ex => {
        // Évite les doublons si on appelle plusieurs fois
        if (exercises.find(e => e.id === ex.id)) return;

        exercises.push(ex);

        if (!muscleGroups[ex.muscle]) {
            muscleGroups[ex.muscle] = [];
        }
        muscleGroups[ex.muscle].push(ex);
    });

    // Rafraîchir les catégories si on est sur la home
    if (typeof renderCategories === 'function') {
        renderCategories();
    }
}

// ===== Remplir le select des muscles depuis les données actuelles =====
function populateMuscleSelect() {
    const select = document.getElementById('aef-muscle');
    if (!select) return;

    // Récupère les muscles existants + ceux déjà dans le select
    const existingMuscles = Object.keys(muscleGroups).sort((a, b) => a.localeCompare(b));

    // Vide et re-remplit
    select.innerHTML = '<option value="" disabled selected>Choisir un groupe musculaire…</option>';
    existingMuscles.forEach(muscle => {
        const opt = document.createElement('option');
        opt.value = muscle;
        opt.textContent = muscle;
        select.appendChild(opt);
    });

    // Ajouter l'option "Autre" à la fin
    const autreOpt = document.createElement('option');
    autreOpt.value = 'autre';
    autreOpt.textContent = 'Autre (Créer une nouvelle catégorie)...';
    select.appendChild(autreOpt);
}

// ===== Vue =====
function showAddExerciseView() {
    // Cache toutes les vues
    hideAllViewsEC();

    const view = document.getElementById('view-add-exercise');
    if (view) view.classList.add('active');

    // Rafraîchit la liste des muscles (peut avoir changé)
    populateMuscleSelect();

    // Breadcrumb
    if (typeof updateBreadcrumb === 'function') {
        updateBreadcrumb([{ label: 'Ajouter un exercice' }]);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideAllViewsEC() {
    ['view-home', 'view-muscle', 'view-exercise', 'view-my-sessions', 'view-add-exercise'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
}

// ===== Formulaire =====
function handleAddExerciseSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    const name    = document.getElementById('aef-name').value.trim();
    const muscle  = getSelectedMuscle();
    const initial = document.getElementById('aef-desc-initial').value.trim();
    const move    = document.getElementById('aef-desc-movement').value.trim();
    const final   = document.getElementById('aef-desc-final').value.trim();
    const video   = document.getElementById('aef-video').value.trim();

    // Construit la description formatée (même format que app.js attend)
    let description = '';
    if (initial) description += `Position initiale:\n${initial}\n\n`;
    if (move)    description += `Mouvement:\n${move}\n\n`;
    if (final)   description += `Position finale:\n${final}`;
    description = description.trim();

    // ID unique
    const id = 'custom_' + Date.now();

    const newExercise = {
        id,
        muscle,
        name,
        illustration: aefImageDataUrl || '',
        video: video || '',
        description,
        muscleHeads: [],
        isCustom: true,
        createdAt: new Date().toISOString()
    };

    // Ajouter en local
    customExercises.push(newExercise);
    saveCustomExercises();

    // Injecter dans l'appli immédiatement
    exercises.push(newExercise);
    if (!muscleGroups[muscle]) muscleGroups[muscle] = [];
    muscleGroups[muscle].push(newExercise);

    // Rafraîchir les catégories
    if (typeof renderCategories === 'function') renderCategories();

    // Feedback visuel
    showAddSuccessToast(name, muscle);

    // Reset & retour home
    resetAddExerciseForm();
    if (typeof showHome === 'function') showHome();
}

function validateForm() {
    let valid = true;

    // Nom
    const nameInput = document.getElementById('aef-name');
    const name = nameInput.value.trim();
    if (!name) {
        setFieldError(nameInput, 'Le nom est obligatoire');
        valid = false;
    } else {
        clearFieldError(nameInput);
    }

    // Muscle
    const muscle = getSelectedMuscle();
    const muscleSelect = document.getElementById('aef-muscle');
    if (!muscle) {
        setFieldError(muscleSelect, 'Choisissez ou saisissez un groupe musculaire');
        valid = false;
    } else {
        clearFieldError(muscleSelect);
    }

    return valid;
}

function getSelectedMuscle() {
    const select = document.getElementById('aef-muscle');
    if (select.value === 'autre') {
        const custom = document.getElementById('aef-muscle-custom').value.trim();
        return custom || '';
    }
    return select.value || '';
}

function setFieldError(input, msg) {
    input.classList.add('aef-input-error');
    let err = input.parentElement.querySelector('.aef-field-error');
    if (!err) {
        err = document.createElement('span');
        err.className = 'aef-field-error';
        input.parentElement.appendChild(err);
    }
    err.textContent = msg;
    input.focus();
}

function clearFieldError(input) {
    input.classList.remove('aef-input-error');
    const err = input.parentElement.querySelector('.aef-field-error');
    if (err) err.remove();
}

function resetAddExerciseForm() {
    const form = document.getElementById('add-exercise-form');
    if (form) form.reset();
    clearImagePreview();
    aefImageDataUrl = null;

    // Reset video preview
    const vp = document.getElementById('aef-video-preview');
    if (vp) vp.style.display = 'none';

    // Clear errors
    document.querySelectorAll('.aef-input-error').forEach(el => el.classList.remove('aef-input-error'));
    document.querySelectorAll('.aef-field-error').forEach(el => el.remove());
}

// ===== Dropzone Drag & Drop =====
function setupDropzone() {
    const zone = document.getElementById('aef-dropzone');
    if (!zone) return;

    zone.addEventListener('dragenter', (e) => { e.preventDefault(); zone.classList.add('aef-dropzone-active'); });
    zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('aef-dropzone-active'); });
    zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove('aef-dropzone-active');
    });
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('aef-dropzone-active');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        } else if (file) {
            showDropzoneError('Format non supporté. Utilisez JPG, PNG ou WEBP.');
        }
    });
}

function handleImageFile(file) {
    // Limite 5 Mo
    if (file.size > 5 * 1024 * 1024) {
        showDropzoneError('Image trop lourde (max 5 Mo)');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        aefImageDataUrl = e.target.result;
        showImagePreview(aefImageDataUrl, file.name);
    };
    reader.readAsDataURL(file);
}

function showImagePreview(dataUrl, fileName) {
    const inner   = document.getElementById('aef-dropzone-inner');
    const preview = document.getElementById('aef-preview');
    const img     = document.getElementById('aef-preview-img');
    const name    = document.getElementById('aef-preview-name');

    if (inner)   inner.style.display = 'none';
    if (preview) preview.style.display = 'flex';
    if (img)     img.src = dataUrl;
    if (name)    name.textContent = fileName;

    // Reset erreur éventuelle
    const zone = document.getElementById('aef-dropzone');
    if (zone) zone.classList.remove('aef-dropzone-error');
}

function clearImagePreview() {
    const inner   = document.getElementById('aef-dropzone-inner');
    const preview = document.getElementById('aef-preview');
    const img     = document.getElementById('aef-preview-img');
    const fileInput = document.getElementById('aef-file-input');

    if (inner)   inner.style.display = 'flex';
    if (preview) preview.style.display = 'none';
    if (img)     img.src = '';
    if (fileInput) fileInput.value = '';
    aefImageDataUrl = null;
}

function showDropzoneError(msg) {
    const zone = document.getElementById('aef-dropzone');
    if (!zone) return;
    zone.classList.add('aef-dropzone-error');
    let err = zone.querySelector('.aef-dropzone-error-msg');
    if (!err) {
        err = document.createElement('p');
        err.className = 'aef-dropzone-error-msg';
        zone.querySelector('#aef-dropzone-inner')?.appendChild(err);
    }
    err.textContent = msg;
    setTimeout(() => zone.classList.remove('aef-dropzone-error'), 3000);
}

// ===== YouTube Preview =====
function handleVideoInput() {
    const input = document.getElementById('aef-video');
    const preview = document.getElementById('aef-video-preview');
    const thumb = document.getElementById('aef-video-thumb');

    if (!input || !preview || !thumb) return;

    const url = input.value.trim();
    const videoId = getYouTubeId ? getYouTubeId(url) : extractYTId(url);

    if (videoId) {
        thumb.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        preview.style.display = 'flex';
        input.classList.remove('aef-input-error');
    } else {
        preview.style.display = 'none';
        if (url && url.length > 10) {
            input.classList.add('aef-input-error');
        }
    }
}

// Fallback si getYouTubeId de app.js n'est pas encore dispo
function extractYTId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// ===== Toast succès =====
function showAddSuccessToast(name, muscle) {
    // Supprime un éventuel toast existant
    document.getElementById('ec-toast')?.remove();

    const toast = document.createElement('div');
    toast.id = 'ec-toast';
    toast.className = 'ec-toast ec-toast-show';
    toast.innerHTML = `
        <span class="ec-toast-icon">✓</span>
        <div class="ec-toast-content">
            <strong>${name}</strong>
            <span>ajouté dans <em>${muscle}</em></span>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('ec-toast-show');
        toast.classList.add('ec-toast-hide');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ===== Utilitaire =====
function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ===== Expose pour app.js si besoin =====
window.showAddExerciseView = showAddExerciseView;
window.getCustomExercises  = () => customExercises;
window.deleteCustomExercise = (id) => {
    customExercises = customExercises.filter(e => e.id !== id);
    saveCustomExercises();
    // Retirer de exercises[] et muscleGroups{}
    const idx = exercises.findIndex(e => e.id === id);
    if (idx !== -1) {
        const ex = exercises[idx];
        exercises.splice(idx, 1);
        if (muscleGroups[ex.muscle]) {
            muscleGroups[ex.muscle] = muscleGroups[ex.muscle].filter(e => e.id !== id);
            if (!muscleGroups[ex.muscle].length) delete muscleGroups[ex.muscle];
        }
    }
    if (typeof renderCategories === 'function') renderCategories();
};
