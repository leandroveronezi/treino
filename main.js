// === BANCO DE DADOS VISUAL (Diagramas) ===
let database = {};
window.fallbackImg = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="100%" height="100%" fill="#ffffff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999999" font-family="Arial" font-size="18">Sem imagem</text></svg>')}`;

// --- VARIÁVEIS DE ESTADO ---
let currentSelection = null;
let dayDoneEntries = [];
let dayPlanEntries = [];
let editingId = null; // Variável para controlar se estamos editando
let editingMode = 'done';
let editingType = 'strength';
let editingCategory = null;
let currentCatalogCategory = 'peito';
let catalogQuery = '';

const STORAGE = {
    doneByDay: 'v6_done_by_day',
    planByDay: 'v6_plan_by_day',
    historyByDay: 'v6_history_by_day',
    historyByExercise: 'v6_history_by_exercise'
};

const SETTINGS = {
    bodyWeightByDay: 'v6_body_weight_by_day'
};

// --- DATA ---
function pad2(value) {
    return String(value).padStart(2, '0');
}

function getTodayDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function getSelectedDate() {
    const input = document.getElementById('selectedDate');
    return input.value || getTodayDateString();
}

function setSelectedDate(value) {
    document.getElementById('selectedDate').value = value;
}

function readJsonStorage(key, fallbackValue) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    try {
        return JSON.parse(raw);
    } catch {
        return fallbackValue;
    }
}

function writeJsonStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getBodyWeight(date) {
    const bodyWeightByDay = readJsonStorage(SETTINGS.bodyWeightByDay, {});
    return bodyWeightByDay[date] || null;
}

function setBodyWeight(date, weight) {
    const bodyWeightByDay = readJsonStorage(SETTINGS.bodyWeightByDay, {});
    if (weight && weight > 0) {
        bodyWeightByDay[date] = weight;
    } else {
        delete bodyWeightByDay[date];
    }
    writeJsonStorage(SETTINGS.bodyWeightByDay, bodyWeightByDay);
}

function getImgSrc(path) {
    if (!path) return window.fallbackImg;
    if (typeof path !== 'string') return window.fallbackImg;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    return encodeURI(path);
}

function migrateLegacyIfNeeded() {
    const legacyWorkoutRaw = localStorage.getItem('v5_workout');
    const legacyCardioRaw = localStorage.getItem('v5_cardio');
    const legacyBodyWeight = localStorage.getItem('v6_body_weight');

    // Migrar peso corporal legado para o formato por data
    if (legacyBodyWeight) {
        const today = getTodayDateString();
        setBodyWeight(today, legacyBodyWeight);
        localStorage.removeItem('v6_body_weight');
    }

    if (!legacyWorkoutRaw && !legacyCardioRaw) return;

    const today = getTodayDateString();
    const doneByDay = readJsonStorage(STORAGE.doneByDay, {});
    const currentDone = Array.isArray(doneByDay[today]) ? doneByDay[today] : [];

    if (legacyWorkoutRaw) {
        try {
            const legacyWorkout = JSON.parse(legacyWorkoutRaw);
            if (Array.isArray(legacyWorkout)) {
                legacyWorkout.forEach(item => {
                    currentDone.push({
                        id: item.id || Date.now(),
                        type: 'strength',
                        category: 'outros',
                        name: item.name,
                        img: item.img,
                        sets: item.sets,
                        reps: item.reps,
                        weight: item.weight,
                        createdAt: Date.now(),
                        date: today
                    });
                });
            }
        } catch { }
    }

    if (legacyCardioRaw) {
        const timeMin = Number(legacyCardioRaw);
        if (!Number.isNaN(timeMin) && timeMin > 0) {
            currentDone.push({
                id: Date.now() + 1,
                type: 'cardio',
                category: 'cardio',
                name: 'Cardio',
                img: '',
                timeMin,
                speedKmh: '',
                createdAt: Date.now(),
                date: today
            });
        }
    }

    doneByDay[today] = currentDone;
    writeJsonStorage(STORAGE.doneByDay, doneByDay);
    localStorage.removeItem('v5_workout');
    localStorage.removeItem('v5_cardio');
}

// --- NOTIFICAÇÃO DE ATUALIZAÇÃO ---
function showUpdateNotification() {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 300px;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
                <strong>🚀 Nova versão disponível!</strong><br>
                <small style="opacity: 0.9;">Clique para atualizar</small>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                margin-left: 10px;
            ">×</button>
        </div>
    `;

    // Adicionar estilo de animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Adicionar evento de clique para atualizar
    notification.addEventListener('click', () => {
        // Enviar mensagem para o Service Worker pular espera
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        // Recarregar a página após um pequeno delay
        setTimeout(() => {
            window.location.reload();
        }, 100);
    });

    // Adicionar ao DOM
    document.body.appendChild(notification);

    // Remover automaticamente após 10 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    // Registrar Service Worker para PWA
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registrado:', registration);

            // Detectar atualizações do Service Worker
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('[SW] Nova versão detectada, instalando...');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Nova versão disponível
                        showUpdateNotification();
                    }
                });
            });

            // Escutar mensagens do Service Worker
            navigator.serviceWorker.addEventListener('message', event => {
                console.log('[SW] Mensagem recebida:', event.data);
            });

        } catch (error) {
            console.log('Falha ao registrar Service Worker:', error);
        }
    }

    migrateLegacyIfNeeded();
    setSelectedDate(getTodayDateString());
    document.getElementById('selectedDate').addEventListener('change', () => {
        loadDay();
    });

    const bodyWeightInput = document.getElementById('bodyWeight');
    bodyWeightInput.addEventListener('change', () => {
        const selectedDate = getSelectedDate();
        setBodyWeight(selectedDate, bodyWeightInput.value);
        renderSummary();
    });

    // Carregar peso da data atual na inicialização
    const today = getTodayDateString();
    const initialWeight = getBodyWeight(today);
    if (initialWeight) {
        bodyWeightInput.value = initialWeight;
    }

    loadDay();

    try {
        const response = await fetch('./database.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Falha ao carregar database.json (status ${response.status})`);
        }

        database = await response.json();
    } catch (error) {
        console.error(error);
        database = {};
        alert('Não foi possível carregar o arquivo database.json.\n\nSe você abriu o arquivo direto (file://), o navegador pode bloquear o fetch.\nAbra usando um servidor local (ex.: Live Server).');
    }

    filterCat('peito', document.querySelector('.cat-chip'));
});

// --- FUNÇÕES DE INTERFACE ---
function openCatalog(mode) {
    editingId = null; // Garante que estamos criando um novo
    editingMode = mode;
    const search = document.getElementById('catalogSearch');
    if (search) search.value = '';
    catalogQuery = '';
    document.getElementById('catalogModal').classList.add('active');
    renderCatalog();
}

function closeCatalog() {
    document.getElementById('catalogModal').classList.remove('active');
}

function onCatalogSearch() {
    const input = document.getElementById('catalogSearch');
    catalogQuery = (input?.value || '').trim().toLowerCase();
    renderCatalog();
}

function filterCat(category, element) {
    document.querySelectorAll('.cat-chip').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    currentCatalogCategory = category;
    renderCatalog();
}

function renderCatalog() {
    const grid = document.getElementById('visualGrid');
    grid.innerHTML = '';

    const allItems = database[currentCatalogCategory] || [];
    const list = catalogQuery
        ? allItems.filter(item => String(item.name || '').toLowerCase().includes(catalogQuery))
        : allItems;

    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'visual-card';
        div.onclick = () => selectExercise(item, currentCatalogCategory);
        div.innerHTML = `
                    <img src="${getImgSrc(item.img)}" class="visual-img" alt="${item.name}" onerror="this.onerror=null;this.src=window.fallbackImg">
                    <div class="visual-name">${item.name}</div>
                `;
        grid.appendChild(div);
    });
}

function selectExercise(item, category) {
    currentSelection = item;
    editingCategory = category;
    editingType = category === 'cardio' ? 'cardio' : 'strength';
    closeCatalog();
    openDetailsModal(item.name, item.img);

    const suggBox = document.getElementById('suggestionBox');
    document.getElementById('btnSave').innerText = editingMode === 'plan' ? 'Salvar no Plano' : 'Adicionar ao Treino';
    renderDetailsInputs();

    const history = readJsonStorage(STORAGE.historyByExercise, {});
    if (editingType === 'strength') {
        const lastWeight = history[item.name]?.weight;
        const lastDate = history[item.name]?.date;
        const weightInput = document.getElementById('newWeight');
        if (lastWeight) {
            weightInput.value = lastWeight;
            suggBox.style.display = 'block';
            if (lastDate && lastDate !== getSelectedDate()) {
                suggBox.innerHTML = `💡 Última vez: <strong>${lastWeight}kg</strong> em ${lastDate}`;
            } else {
                suggBox.innerHTML = `💡 Última vez: <strong>${lastWeight}kg</strong>`;
            }
        } else {
            weightInput.value = '';
            suggBox.style.display = 'none';
        }
    } else {
        const lastTime = history[item.name]?.timeMin;
        const lastSpeed = history[item.name]?.speedKmh;
        const lastDate = history[item.name]?.date;
        const timeInput = document.getElementById('newTimeMin');
        const speedInput = document.getElementById('newSpeedKmh');
        if (lastTime) timeInput.value = lastTime;
        if (lastSpeed) speedInput.value = lastSpeed;
        if (lastTime && lastDate && lastDate !== getSelectedDate()) {
            suggBox.style.display = 'block';
            suggBox.innerHTML = `💡 Última vez: <strong>${lastTime} min</strong> em ${lastDate}`;
        } else {
            suggBox.style.display = 'none';
        }
    }
}

// --- FUNÇÃO DE EDIÇÃO ---
function editItem(id) {
    const source = editingMode === 'plan' ? dayPlanEntries : dayDoneEntries;
    const item = source.find(i => i.id === id);
    if (!item) return;

    editingId = id; // Marca que estamos editando
    editingType = item.type;
    editingCategory = item.category;
    currentSelection = { name: item.name, img: item.img }; // Recupera info visual

    openDetailsModal(item.name, item.img);

    document.getElementById('btnSave').innerText = 'Salvar Alterações';
    renderDetailsInputs();

    // Preenche com os dados atuais
    if (editingType === 'strength') {
        document.getElementById('newSets').value = item.sets;
        document.getElementById('newReps').value = item.reps;
        document.getElementById('newWeight').value = item.weight;
    } else {
        document.getElementById('newTimeMin').value = item.timeMin;
        document.getElementById('newSpeedKmh').value = item.speedKmh;
    }

    document.getElementById('suggestionBox').style.display = 'none';
}

function openDetailsModal(title, imgUrl) {
    const details = document.getElementById('detailsModal');
    document.getElementById('modalTitle').innerText = title;
    const src = getImgSrc(imgUrl);
    document.getElementById('modalImg').innerHTML = `<img src="${src}" style="height:100%; max-width:100%;" onerror="this.onerror=null;this.src=window.fallbackImg">`;
    details.classList.add('active');
}

function closeDetails() {
    document.getElementById('detailsModal').classList.remove('active');
    editingId = null; // Reseta edição
}

function renderDetailsInputs() {
    const strength = document.getElementById('strengthInputs');
    const cardio = document.getElementById('cardioInputs');
    if (editingType === 'cardio') {
        strength.style.display = 'none';
        cardio.style.display = 'flex';
    } else {
        strength.style.display = 'flex';
        cardio.style.display = 'none';
    }
}

function confirmAdd() {
    const selectedDate = getSelectedDate();

    const sets = document.getElementById('newSets').value;
    const reps = document.getElementById('newReps').value;
    const weight = document.getElementById('newWeight').value;
    const timeMin = document.getElementById('newTimeMin').value;
    const speedKmh = document.getElementById('newSpeedKmh').value;

    const target = editingMode === 'plan' ? dayPlanEntries : dayDoneEntries;

    if (editingId) {
        // MODO EDIÇÃO: Atualiza o item existente
        const index = target.findIndex(i => i.id === editingId);
        if (index !== -1) {
            if (editingType === 'strength') {
                target[index].sets = sets;
                target[index].reps = reps;
                target[index].weight = weight;
            } else {
                target[index].timeMin = timeMin;
                target[index].speedKmh = speedKmh;
            }
        }
    } else {
        // MODO NOVO: Adiciona um novo item
        const base = {
            id: Date.now(),
            type: editingType,
            category: editingCategory || (editingType === 'cardio' ? 'cardio' : 'outros'),
            name: currentSelection.name,
            img: currentSelection.img,
            createdAt: Date.now(),
            date: selectedDate
        };

        const entry = editingType === 'cardio'
            ? { ...base, timeMin, speedKmh }
            : { ...base, sets, reps, weight };

        target.push(entry);
    }

    saveDay();
    closeDetails();
    renderAll();
}

// --- RENDERIZAÇÃO DA LISTA ---
function renderWorkout() {
    const list = document.getElementById('workout-list');
    list.innerHTML = '';

    if (dayDoneEntries.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #555; margin-top: 50px;">Toque no botão dourado abaixo para escolher os aparelhos.</p>';
        return;
    }

    dayDoneEntries.forEach(item => {
        const div = document.createElement('div');
        div.className = 'workout-card';
        // Adiciona evento de clique no CARD para EDITAR
        div.onclick = (e) => {
            // Se clicou no botão X, não abre a edição
            if (e.target.classList.contains('btn-delete')) return;
            editingMode = 'done';
            editItem(item.id);
        };

        div.innerHTML = `
                    <img src="${getImgSrc(item.img)}" class="workout-thumb" onerror="this.onerror=null;this.src=window.fallbackImg">
                    <div class="workout-info">
                        <h4>${item.name}</h4>
                        <p>${formatEntrySubtitle(item)}</p>
                    </div>
                    <button class="btn-delete" onclick="removeItem(${item.id})">✖</button>
                `;
        list.appendChild(div);
    });
}

function movePlanToDone(id) {
    const index = dayPlanEntries.findIndex(i => i.id === id);
    if (index === -1) return;

    const item = dayPlanEntries[index];
    dayPlanEntries.splice(index, 1);

    const cloned = {
        ...item,
        id: Date.now(),
        createdAt: Date.now(),
        date: getSelectedDate()
    };
    dayDoneEntries.push(cloned);
    saveDay();
    renderAll();
}

function renderPlan() {
    const list = document.getElementById('plan-list');
    list.innerHTML = '';

    if (dayPlanEntries.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #555; margin-top: 10px;">Nenhum item planejado.</p>';
        return;
    }

    dayPlanEntries.forEach(item => {
        const div = document.createElement('div');
        div.className = 'workout-card';
        div.onclick = (e) => {
            if (e.target.classList.contains('btn-delete')) return;
            if (e.target.classList.contains('btn-move')) return;
            editingMode = 'plan';
            editItem(item.id);
        };

        div.innerHTML = `
                    <img src="${getImgSrc(item.img)}" class="workout-thumb" onerror="this.onerror=null;this.src=window.fallbackImg">
                    <div class="workout-info">
                        <h4>${item.name}</h4>
                        <p>${formatEntrySubtitle(item)}</p>
                    </div>
                    <button class="btn-move" onclick="movePlanToDone(${item.id})">➡</button>
                    <button class="btn-delete" onclick="removePlanItem(${item.id})">✖</button>
                `;

        list.appendChild(div);
    });
}

function formatEntrySubtitle(item) {
    if (item.type === 'cardio') {
        const t = item.timeMin ? `${item.timeMin} min` : '';
        const v = item.speedKmh ? `${item.speedKmh} km/h` : '';
        const parts = [t, v].filter(Boolean);
        return parts.join(' - ') || 'Cardio';
    }

    const weightText = item.weight ? `${item.weight}kg` : '';
    return `${item.sets} x ${item.reps} - <strong style="color:var(--primary)">${weightText}</strong>`;
}

function removeItem(id) {
    customConfirm("Remover este exercício?").then(confirmed => {
        if (confirmed) {
            dayDoneEntries = dayDoneEntries.filter(i => i.id !== id);
            saveDay();
            renderAll();
        }
    });
}

function removePlanItem(id) {
    customConfirm("Remover este item do plano?").then(confirmed => {
        if (confirmed) {
            dayPlanEntries = dayPlanEntries.filter(i => i.id !== id);
            saveDay();
            renderAll();
        }
    });
}

function saveDay() {
    const date = getSelectedDate();
    const doneByDay = readJsonStorage(STORAGE.doneByDay, {});
    const planByDay = readJsonStorage(STORAGE.planByDay, {});
    doneByDay[date] = dayDoneEntries;
    planByDay[date] = dayPlanEntries;
    writeJsonStorage(STORAGE.doneByDay, doneByDay);
    writeJsonStorage(STORAGE.planByDay, planByDay);

    syncHistory(date);
}

function syncHistory(date) {
    const historyByDay = readJsonStorage(STORAGE.historyByDay, {});
    historyByDay[date] = dayDoneEntries;
    writeJsonStorage(STORAGE.historyByDay, historyByDay);

    const historyByExercise = readJsonStorage(STORAGE.historyByExercise, {});
    dayDoneEntries.forEach(entry => {
        if (!entry?.name) return;
        if (entry.type === 'strength') {
            const w = Number(entry.weight);
            if (!Number.isNaN(w) && w > 0) {
                historyByExercise[entry.name] = {
                    ...(historyByExercise[entry.name] || {}),
                    weight: entry.weight,
                    date: entry.date
                };
            }
        } else {
            const t = Number(entry.timeMin);
            const v = Number(entry.speedKmh);
            historyByExercise[entry.name] = {
                ...(historyByExercise[entry.name] || {}),
                timeMin: Number.isNaN(t) ? entry.timeMin : t,
                speedKmh: Number.isNaN(v) ? entry.speedKmh : v,
                date: entry.date
            };
        }
    });
    writeJsonStorage(STORAGE.historyByExercise, historyByExercise);
}

function loadDay() {
    const date = getSelectedDate();
    const doneByDay = readJsonStorage(STORAGE.doneByDay, {});
    const planByDay = readJsonStorage(STORAGE.planByDay, {});
    dayDoneEntries = Array.isArray(doneByDay[date]) ? doneByDay[date] : [];
    dayPlanEntries = Array.isArray(planByDay[date]) ? planByDay[date] : [];

    // Carregar peso corporal da data selecionada
    const bodyWeightInput = document.getElementById('bodyWeight');
    const savedWeight = getBodyWeight(date);
    bodyWeightInput.value = savedWeight || '';

    // Atualizar estado dos botões de navegação
    updateNavigationButtons();

    renderAll();
}

function renderAll() {
    renderPlan();
    renderWorkout();
    renderSummary();
}

function renderSummary() {
    const summary = document.getElementById('summary');
    const strength = dayDoneEntries.filter(e => e.type === 'strength');
    const cardio = dayDoneEntries.filter(e => e.type === 'cardio');

    const selectedDate = getSelectedDate();
    const bodyWeight = Number(getBodyWeight(selectedDate) || document.getElementById('bodyWeight')?.value);

    const volume = strength.reduce((acc, e) => {
        const sets = Number(e.sets) || 0;
        const reps = Number(e.reps) || 0;
        const weight = Number(e.weight) || 0;
        return acc + (sets * reps * weight);
    }, 0);

    const cardioTime = cardio.reduce((acc, e) => acc + (Number(e.timeMin) || 0), 0);
    const cardioDistance = cardio.reduce((acc, e) => {
        const t = Number(e.timeMin) || 0;
        const v = Number(e.speedKmh) || 0;
        return acc + (v * (t / 60));
    }, 0);

    const cardioCalories = Number.isFinite(bodyWeight) && bodyWeight > 0
        ? cardio.reduce((acc, e) => acc + estimateCardioCalories(e, bodyWeight), 0)
        : null;

    const strengthCalories = Number.isFinite(bodyWeight) && bodyWeight > 0
        ? estimateStrengthCalories(strength, bodyWeight)
        : null;

    const totalCalories = strengthCalories === null || cardioCalories === null
        ? null
        : (strengthCalories + cardioCalories);

    summary.innerHTML = `
                <div class="summary-card">
                    <div class="summary-title">Resumo do dia</div>
                    <div class="summary-row"><span>Volume (musculação)</span><strong>${Math.round(volume)}</strong></div>
                    <div class="summary-row"><span>Cardio (tempo)</span><strong>${Math.round(cardioTime)} min</strong></div>
                    <div class="summary-row"><span>Cardio (distância est.)</span><strong>${cardioDistance.toFixed(1)} km</strong></div>
                    <div class="summary-row"><span>Calorias (musculação)</span><strong>${strengthCalories === null ? '--' : Math.round(strengthCalories)} kcal</strong></div>
                    <div class="summary-row"><span>Calorias (cardio)</span><strong>${cardioCalories === null ? '--' : Math.round(cardioCalories)} kcal</strong></div>
                    <div class="summary-row"><span>Calorias (total)</span><strong>${totalCalories === null ? '--' : Math.round(totalCalories)} kcal</strong></div>
                </div>
            `;
}

function estimateStrengthCalories(entries, bodyWeightKg) {
    const totalSets = entries.reduce((acc, e) => acc + (Number(e.sets) || 0), 0);
    if (totalSets <= 0) return 0;

    // Heurística simples:
    // - ~2 min por série (execução + descanso)
    // - Musculação moderada/intensa ~ 6 MET
    const estimatedMinutes = totalSets * 2;
    const met = 6;
    return met * bodyWeightKg * (estimatedMinutes / 60);
}

function estimateCardioCalories(entry, bodyWeightKg) {
    const timeMin = Number(entry.timeMin) || 0;
    if (timeMin <= 0) return 0;

    const speed = Number(entry.speedKmh) || 0;
    const name = String(entry.name || '').toLowerCase();

    let met = 6;
    if (name.includes('escada')) met = 8.8;
    else if (name.includes('corrida') || speed >= 8) met = 8.3;
    else if (speed > 0 && speed < 6) met = 3.5;

    return met * bodyWeightKg * (timeMin / 60);
}

function clearDone() {
    customConfirm('Deseja limpar a lista FEITO desta data?').then(confirmed => {
        if (confirmed) {
            dayDoneEntries = [];
            saveDay();
            renderAll();
        }
    });
}

function openHistory() {
    document.getElementById('historyModal').classList.add('active');
    renderHistoryList();
}

function closeHistory() {
    document.getElementById('historyModal').classList.remove('active');
}

function renderHistoryList() {
    const listEl = document.getElementById('historyList');
    const historyByDay = readJsonStorage(STORAGE.historyByDay, {});
    const keys = Object.keys(historyByDay).sort((a, b) => b.localeCompare(a));

    console.log('renderHistoryList - keys encontradas:', keys);

    if (keys.length === 0) {
        listEl.innerHTML = '<p style="text-align:center;color:#777;margin-top:20px;">Sem histórico ainda.</p>';
        return;
    }

    const itemsHtml = keys.slice(0, 120).map(date => {
        const entries = Array.isArray(historyByDay[date]) ? historyByDay[date] : [];
        const strength = entries.filter(e => e.type === 'strength');
        const cardio = entries.filter(e => e.type === 'cardio');

        const volume = strength.reduce((acc, e) => {
            const sets = Number(e.sets) || 0;
            const reps = Number(e.reps) || 0;
            const weight = Number(e.weight) || 0;
            return acc + (sets * reps * weight);
        }, 0);

        const cardioTime = cardio.reduce((acc, e) => acc + (Number(e.timeMin) || 0), 0);
        const cardioDistance = cardio.reduce((acc, e) => {
            const t = Number(e.timeMin) || 0;
            const v = Number(e.speedKmh) || 0;
            return acc + (v * (t / 60));
        }, 0);

        const total = entries.length;

        return `
                    <div class="history-item">
                        <div class="history-content" onclick="selectHistoryDate('${date}')">
                            <div class="history-date">${date}</div>
                            <div class="history-meta">
                                <div>Itens: <strong>${total}</strong></div>
                                <div>Volume: <strong>${Math.round(volume)}</strong></div>
                                <div>Cardio: <strong>${Math.round(cardioTime)} min</strong> (${cardioDistance.toFixed(1)} km)</div>
                            </div>
                        </div>
                        <button class="btn-delete-history" onclick="deleteHistoryDay('${date}')" title="Excluir este dia">🗑️</button>
                    </div>
                `;
    }).join('');

    listEl.innerHTML = itemsHtml;
    console.log('renderHistoryList - HTML atualizado');
}

function selectHistoryDate(date) {
    setSelectedDate(date);
    closeHistory();
    loadDay();
}

function deleteHistoryDay(date) {

    console.log(`deleteHistoryDay - date: ${date}`);

    customConfirm(`Tem certeza que deseja excluir todos os dados do dia ${date}?`, "Excluir Dia").then(confirmed => {

        console.log(`deleteHistoryDay - confirmed: ${confirmed}`);

        if (confirmed) {


            console.log(`Excluindo dia: ${date}`);

            // Remover de todos os storages
            const doneByDay = readJsonStorage(STORAGE.doneByDay, {});
            const planByDay = readJsonStorage(STORAGE.planByDay, {});
            const historyByDay = readJsonStorage(STORAGE.historyByDay, {});
            const bodyWeightByDay = readJsonStorage(SETTINGS.bodyWeightByDay, {});

            console.log('Antes da exclusão:', {
                doneByDay: Object.keys(doneByDay),
                planByDay: Object.keys(planByDay),
                historyByDay: Object.keys(historyByDay),
                bodyWeightByDay: Object.keys(bodyWeightByDay)
            });

            delete doneByDay[date];
            delete planByDay[date];
            delete historyByDay[date];
            delete bodyWeightByDay[date];

            console.log('Depois da exclusão:', {
                doneByDay: Object.keys(doneByDay),
                planByDay: Object.keys(planByDay),
                historyByDay: Object.keys(historyByDay),
                bodyWeightByDay: Object.keys(bodyWeightByDay)
            });

            writeJsonStorage(STORAGE.doneByDay, doneByDay);
            writeJsonStorage(STORAGE.planByDay, planByDay);
            writeJsonStorage(STORAGE.historyByDay, historyByDay);
            writeJsonStorage(SETTINGS.bodyWeightByDay, bodyWeightByDay);

            // Forçar uma nova leitura para verificar se a exclusão persistiu
            setTimeout(() => {
                const historyCheck = readJsonStorage(STORAGE.historyByDay, {});
                console.log('Verificação após gravação - historyByDay keys:', Object.keys(historyCheck));

                // Se o dia excluído estava selecionado, limpar a tela
                if (getSelectedDate() === date) {
                    dayDoneEntries = [];
                    dayPlanEntries = [];
                    document.getElementById('bodyWeight').value = '';
                    renderAll();
                }

                // Atualizar o histórico
                renderHistoryList();

                customAlert(`Dia ${date} excluído com sucesso!`, "Sucesso");
            }, 100);
        }
    });
}

function openCharts() {
    document.getElementById('chartsModal').classList.add('active');
    renderCharts();
}

function closeCharts() {
    document.getElementById('chartsModal').classList.remove('active');
}

function renderCharts() {
    const range = Number(document.getElementById('chartRange').value) || 30;
    const type = document.getElementById('chartType').value;
    const historyByDay = readJsonStorage(STORAGE.historyByDay, {});
    const points = buildSeries(historyByDay, range, type);
    drawChart(points, type);
}

function buildSeries(historyByDay, range, type) {
    const dates = [];
    const values = [];
    const today = new Date(getSelectedDate());

    for (let i = range - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        dates.push(key);
        const entries = Array.isArray(historyByDay[key]) ? historyByDay[key] : [];

        if (type === 'cardio') {
            const dist = entries
                .filter(e => e.type === 'cardio')
                .reduce((acc, e) => {
                    const t = Number(e.timeMin) || 0;
                    const v = Number(e.speedKmh) || 0;
                    return acc + (v * (t / 60));
                }, 0);
            values.push(dist);
            continue;
        }

        if (type === 'pr') {
            const pr = entries
                .filter(e => e.type === 'strength')
                .reduce((acc, e) => Math.max(acc, Number(e.weight) || 0), 0);
            values.push(pr);
            continue;
        }

        const volume = entries
            .filter(e => e.type === 'strength')
            .reduce((acc, e) => {
                const sets = Number(e.sets) || 0;
                const reps = Number(e.reps) || 0;
                const weight = Number(e.weight) || 0;
                return acc + (sets * reps * weight);
            }, 0);
        values.push(volume);
    }

    return { dates, values };
}

function drawChart(series, type) {
    const canvas = document.getElementById('chartCanvas');
    const ctx = canvas.getContext('2d');
    const legend = document.getElementById('chartLegend');

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padding = 24;
    const maxValue = Math.max(...series.values, 1);
    const minValue = Math.min(...series.values, 0);
    const range = maxValue - minValue || 1;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();

    series.values.forEach((value, index) => {
        const x = padding + (index * (width - padding * 2)) / Math.max(series.values.length - 1, 1);
        const y = (height - padding) - ((value - minValue) * (height - padding * 2)) / range;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();

    const lastValue = series.values[series.values.length - 1] || 0;
    const label = type === 'cardio'
        ? `Último: ${lastValue.toFixed(1)} km`
        : type === 'pr'
            ? `Último: ${Math.round(lastValue)} kg`
            : `Último: ${Math.round(lastValue)}`;

    legend.innerText = label;
}

// --- FUNÇÕES DE NAVEGAÇÃO ENTRE DIAS ---
function navigateToPreviousDay() {
    const selectedDate = getSelectedDate();
    const previousDate = getPreviousWorkoutDate(selectedDate);

    if (previousDate) {
        setSelectedDate(previousDate);
        loadDay();
    }
}

function getPreviousWorkoutDate(currentDate) {
    const doneByDay = readJsonStorage(STORAGE.doneByDay, {});
    const planByDay = readJsonStorage(STORAGE.planByDay, {});

    // Combinar todas as datas que têm treinos ou planos
    const allDates = new Set([
        ...Object.keys(doneByDay),
        ...Object.keys(planByDay)
    ]);

    // Converter para array e ordenar
    const sortedDates = Array.from(allDates).sort();

    console.log('getPreviousWorkoutDate - currentDate:', currentDate);
    console.log('getPreviousWorkoutDate - sortedDates:', sortedDates);

    // Encontrar o índice da data atual
    const currentIndex = sortedDates.indexOf(currentDate);

    console.log('getPreviousWorkoutDate - currentIndex:', currentIndex);

    // Retornar a data anterior se existir
    const result = currentIndex > 0 ? sortedDates[currentIndex - 1] : null;
    console.log('getPreviousWorkoutDate - result:', result);

    return result;
}

function navigateToNextDay() {
    const selectedDate = getSelectedDate();
    const nextDate = getNextWorkoutDate(selectedDate);

    if (nextDate) {
        setSelectedDate(nextDate);
        loadDay();
    }
}

function getNextWorkoutDate(currentDate) {
    const doneByDay = readJsonStorage(STORAGE.doneByDay, {});
    const planByDay = readJsonStorage(STORAGE.planByDay, {});

    // Combinar todas as datas que têm treinos ou planos
    const allDates = new Set([
        ...Object.keys(doneByDay),
        ...Object.keys(planByDay)
    ]);

    // Converter para array e ordenar
    const sortedDates = Array.from(allDates).sort();

    console.log('getNextWorkoutDate - currentDate:', currentDate);
    console.log('getNextWorkoutDate - sortedDates:', sortedDates);

    // Encontrar o índice da data atual
    const currentIndex = sortedDates.indexOf(currentDate);

    console.log('getNextWorkoutDate - currentIndex:', currentIndex);

    // Retornar a próxima data se existir e não for maior que hoje
    const nextDate = currentIndex < sortedDates.length - 1 ? sortedDates[currentIndex + 1] : null;
    const today = getTodayDateString();

    console.log('getNextWorkoutDate - nextDate:', nextDate);
    console.log('getNextWorkoutDate - today:', today);

    const result = (nextDate && nextDate <= today) ? nextDate : null;
    console.log('getNextWorkoutDate - result:', result);

    return result;
}

function updateNavigationButtons() {
    const selectedDate = getSelectedDate();

    const btnPrevDay = document.getElementById('btnPrevDay');
    const btnNextDay = document.getElementById('btnNextDay');

    if (btnPrevDay && btnNextDay) {
        // Verificar se existe data anterior com treinos
        const previousDate = getPreviousWorkoutDate(selectedDate);
        btnPrevDay.disabled = !previousDate;

        // Verificar se existe próxima data com treinos
        const nextDate = getNextWorkoutDate(selectedDate);
        btnNextDay.disabled = !nextDate;
    }
}