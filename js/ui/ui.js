/**
 * Gestión de la Interfaz de Usuario (UI).
 */

import { state } from '../core/estado.js';
import { api } from '../services/api.js';
import { escapeHtml, generarColorHslAleatorio } from '../core/utils.js';
import { BIG_SKINS, SKIN_TYPES, DEFAULT_UNLOCKED_SKINS } from '../core/constantes.js';

/**
 * Referencias a elementos del DOM.
 */
export const ui = {
    scoreEl: document.getElementById('score'),
    recordEl: document.getElementById('record'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),

    mainMenu: document.getElementById('mainmenu'),
    modeSelectMenu: document.getElementById('mode-select-menu'),
    playDestructionBtn: document.getElementById('play-destruction'),
    playHuida: document.getElementById('play-huida'),
    modeLegacyBtn: document.getElementById("mode-legacy-btn"),
    modeLegacyMenu: document.getElementById("mode-legacy-menu"),
    playBtn: document.getElementById('playbtn'),

    gameOverEl: document.getElementById('gameover'),
    retryBtn: document.getElementById('retry'),
    backMenuBtn: document.getElementById('backmenu'),

    changeSkinBtn: document.getElementById('CambiarSkin'),
    changeColorBtn: document.getElementById('CambiarColor'),

    colorPanel: document.getElementById('color-panel'),
    skinsList: document.getElementById('skins-list'),
    skinName: document.getElementById('skin-name'),
    bigSkinView: document.getElementById('big-skin-view'),
    colorPicker: document.getElementById('color-picker'),

    versionsBtn: document.getElementById('versions-btn'),
    versionsMenu: document.getElementById('versions-menu'),

    FPS: document.getElementById('FPS'),
    bgmusic: document.getElementById('bgmusic'),

    resetBtn: document.getElementById('reset-records-btn'),
    resetPopup: document.getElementById('reset-popup'),

    // Battle Pass
    battlePassBtn: document.getElementById('battlepass-btn'),
    battlePassModal: document.getElementById('battlepass-modal'),
    closeBpBtn: document.getElementById('close-bp-btn'),
    bpGrid: document.getElementById('bp-grid'),

    // Inventario
    inventoryBtn: document.getElementById('inventorybtn'),
    inventoryModal: document.getElementById('inventory-modal'),
    closeInventoryBtn: document.getElementById('close-inventory'),
    tabSkins: document.getElementById('tab-skins'),
    tabColor: document.getElementById('tab-color'),
    skinsPanel: document.getElementById('skins-panel'),

    leaderboardPanel: document.getElementById('leaderboard-panel'),
    menuLeaderboardBtn: document.getElementById('menu-leaderboard-btn'),
    closeLeaderboardBtn: document.getElementById('close-leaderboard'),
    lbHuidaBody: document.querySelector('#lb-huida tbody'),
    lbDestruBody: document.querySelector('#lb-destruccion tbody'),

    authOverlay: document.getElementById('auth-overlay'),
    authUsername: document.getElementById('auth-username'),
    authPassword: document.getElementById('auth-password'),
    authLogin: document.getElementById('auth-login'),
    authRegister: document.getElementById('auth-register'),
    authMsg: document.getElementById('auth-msg'),
    authMini: document.getElementById('auth-mini'),

    usernameDisplay: document.getElementById('auth-mini')
};

/**
 * Muestra u oculta el overlay de login.
 * @param {boolean} show - Mostrar/Ocultar.
 * @param {string} msg - Mensaje opcional.
 */
export function showOverlayLogin(show = true, msg = '') {
    if (ui.authOverlay) {
        ui.authOverlay.style.display = show ? 'flex' : 'none';
        ui.authOverlay.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
    if (ui.authMsg) ui.authMsg.textContent = msg;
}

/**
 * Actualiza el texto del mini indicador de sesión.
 */
export function setAuthMiniText() {
    if (ui.authMini) {
        ui.authMini.textContent = state.sessionUser
            ? `Usuario: ${state.sessionUser}`
            : 'No conectado';
    }
}

/**
 * Habilita o deshabilita controles de juego.
 * @param {boolean} enable 
 */
export function enableGameControls(enable) {
    if (enable) {
        ui.playBtn?.removeAttribute('disabled');
        ui.playDestructionBtn?.removeAttribute('disabled');
        ui.playBtn?.classList.remove('disabled');
        ui.playDestructionBtn?.classList.remove('disabled');
    } else {
        ui.playBtn?.setAttribute('disabled', '');
        ui.playDestructionBtn?.setAttribute('disabled', '');
        ui.playBtn?.classList.add('disabled');
        ui.playDestructionBtn?.classList.add('disabled');
    }
}

/**
 * Crea un canvas icono para una skin.
 * @param {string} symbol 
 * @param {string} color 
 * @param {number} size 
 * @returns {HTMLCanvasElement}
 */
export function createIconCanvas(symbol, color, size = 56) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ic = c.getContext('2d');

    ic.save();
    ic.translate(size / 2, size / 2);

    ic.strokeStyle = color;
    ic.lineWidth = 2;
    ic.shadowBlur = 20;
    ic.shadowColor = color;

    ic.font = `${Math.floor(size * 0.68)}px 'Press Start 2P', monospace`;
    ic.textAlign = 'center';
    ic.textBaseline = 'middle';
    ic.strokeText(symbol, 0, 0);

    ic.globalAlpha = 0.15;
    ic.fillStyle = color;
    ic.fillText(symbol, 0, 0);
    ic.globalAlpha = 1;

    ic.restore();
    return c;
}

/**
 * Renderiza la lista de skins en el inventario.
 * @param {Function} onSelect - Callback al seleccionar skin.
 */
export function renderSkinsList(onSelect) {
    if (!ui.skinsList) return;
    ui.skinsList.innerHTML = '';

    state.playerSkins.forEach((skin) => {
        const item = document.createElement('div');
        item.className = 'skin-item';

        if (state.currentSkin && skin.type === state.currentSkin.type) {
            item.classList.add('selected');
        }

        const canvasIcon = createIconCanvas(skin.type, skin.color);
        item.appendChild(canvasIcon);

        item.addEventListener('click', () => {
            state.currentSkin = skin;
            updateInventoryView(onSelect);
            if (onSelect) onSelect();
        });

        ui.skinsList.appendChild(item);
    });
}

/**
 * Actualiza la vista completa del inventario.
 * @param {Function} onSave - Callback para guardar cambios.
 */
export function updateInventoryView(onSave) {
    if (!ui.skinsList || !ui.bigSkinView || !state.currentSkin) return;

    renderSkinsList(onSave);

    ui.bigSkinView.innerHTML = '';
    const bigCanvas = createIconCanvas(
        state.currentSkin.type,
        state.currentSkin.color,
        250
    );
    ui.bigSkinView.appendChild(bigCanvas);

    if (ui.skinName) {
        ui.skinName.textContent = state.currentSkin.type;
    }

    if (ui.colorPicker) {
        ui.colorPicker.value = state.currentSkin.color;

        // Usar 'input' para actualización en tiempo real
        ui.colorPicker.oninput = (e) => {
            state.currentSkin.color = e.target.value;
            updateInventoryView(onSave); // Re-renderizar iconos
        };

        // Guardar solo al final (change) para no saturar
        ui.colorPicker.onchange = (e) => {
            if (onSave) onSave();
        };
    }
}

/**
 * Cambia la pestaña del inventario.
 * @param {'skins'|'color'} tab 
 */
export function showTab(tab) {
    state.currentInventoryTab = tab;

    if (tab === 'skins') {
        ui.tabSkins.classList.add('active');
        ui.tabColor.classList.remove('active');
        ui.skinsPanel.style.display = '';
        ui.colorPanel.style.display = 'none';
    } else {
        ui.tabSkins.classList.remove('active');
        ui.tabColor.classList.add('active');
        ui.skinsPanel.style.display = 'none';
        ui.colorPanel.style.display = '';
    }
}

/**
 * Actualiza el texto del récord en pantalla.
 */
export function actualizarTextoRecord() {
    if (state.gameMode === 'huida') {
        state.record = state.recordHuida;
        ui.recordEl.innerText = 'Récord Huida: ' + state.recordHuida;
    } else {
        state.record = state.recordDestruccion;
        ui.recordEl.innerText = 'Récord Destrucción: ' + state.recordDestruccion;
    }
}

/**
 * Actualiza la barra de progreso.
 * @param {number} destructionTotalTime 
 */
export function updateProgressBar(destructionTotalTime) {
    if (!ui.progressBar) return;

    if (state.gameMode === 'destruccion') {
        const ratio = state.destructionTimeLeft / destructionTotalTime;
        const percent = ratio * 100;

        ui.progressBar.style.width = percent + '%';
        if (ui.progressText) {
            ui.progressText.textContent = state.destructionTimeLeft.toFixed(1) + 's';
        }

        if (state.score >= state.recordDestruccion) {
            ui.progressBar.style.background = 'linear-gradient(90deg, #ff595e 60%, #be1e2d 100%)';
            ui.progressBar.style.boxShadow = '0 0 12px #ff595e99';
        } else {
            ui.progressBar.style.background = 'linear-gradient(90deg,#00eaff 60%,#00b6c9 100%)';
            ui.progressBar.style.boxShadow = '0 0 12px var(--neon-alpha-1)';
        }
    } else {
        const rec = Math.max(1, state.recordHuida);
        const percent = (Math.min(state.score, rec) / rec) * 100;

        ui.progressBar.style.width = percent + '%';
        if (ui.progressText) ui.progressText.textContent = '';

        if (state.score >= state.recordHuida) {
            ui.progressBar.style.background = 'linear-gradient(90deg, #ff595e 60%, #be1e2d 100%)';
            ui.progressBar.style.boxShadow = '0 0 12px #ff595e99';
        } else {
            ui.progressBar.style.background = 'linear-gradient(90deg,#00eaff 60%,#00b6c9 100%)';
            ui.progressBar.style.boxShadow = '0 0 12px var(--neon-alpha-1)';
        }
    }
}

/**
 * Actualiza la barra de progreso con la XP del usuario (para el menú).
 */
export function updateXPBar() {
    if (!ui.progressBar || !ui.progressText) return;

    // Calcular nivel y progreso (Serie aritmética: 50, 100, 150...)
    // Total XP para nivel L = 25 * L * (L - 1)
    // Nivel = floor((1 + sqrt(1 + 0.16 * XP)) / 2)
    const level = Math.floor((1 + Math.sqrt(1 + 0.16 * state.xp)) / 2);

    const xpForCurrentLevel = 25 * level * (level - 1);
    const xpForNextLevel = 50 * level; // Coste para subir al siguiente nivel
    const currentProgress = state.xp - xpForCurrentLevel;

    const percent = Math.min(100, Math.max(0, (currentProgress / xpForNextLevel) * 100));

    ui.progressBar.style.width = percent + '%';
    ui.progressText.textContent = `Nivel ${level}: ${currentProgress}/${xpForNextLevel}`;

    // Estilo específico para XP
    ui.progressBar.style.background = 'linear-gradient(90deg, #40ff89 60%, #00b6c9 100%)';
    ui.progressBar.style.boxShadow = '0 0 12px #40ff8999';

    // Asegurar que se muestra
    if (ui.progressText.parentElement) {
        ui.progressText.parentElement.setAttribute('aria-hidden', 'false');
    }
}

/**
 * Estilos para medallas del leaderboard.
 */
function getMedalStyle(index) {
    switch (index) {
        case 0: return 'color: #FFD700; text-shadow: 0 0 5px #FFD700; font-weight: bold;';
        case 1: return 'color: #C0C0C0; text-shadow: 0 0 5px #C0C0C0; font-weight: bold;';
        case 2: return 'color: #CD7F32; text-shadow: 0 0 5px #CD7F32; font-weight: bold;';
        default: return '';
    }
}

/**
 * Carga y renderiza el leaderboard.
 */
export async function loadLeaderboardTables() {
    const r = await api('leaderboard.php', 'GET');

    if (ui.lbHuidaBody) ui.lbHuidaBody.innerHTML = '';
    if (ui.lbDestruBody) ui.lbDestruBody.innerHTML = '';

    if (!(r.ok && Array.isArray(r.data))) {
        // Manejo de error
        return;
    }

    const players = r.data;

    const huidaPlayers = players
        .filter(p => Number(p.recordHuida) > 0)
        .sort((a, b) => Number(b.recordHuida) - Number(a.recordHuida))
        .slice(0, 10);

    const destruPlayers = players
        .filter(p => Number(p.recordDestruccion) > 0)
        .sort((a, b) => Number(b.recordDestruccion) - Number(a.recordDestruccion))
        .slice(0, 10);

    const renderRows = (list, container, scoreKey) => {
        list.forEach((player, index) => {
            const tr = document.createElement('tr');

            const tdPos = document.createElement('td');
            tdPos.textContent = String(index + 1);
            tdPos.style.cssText = getMedalStyle(index);

            const tdUser = document.createElement('td');
            tdUser.textContent = player.username;
            tdUser.style.cssText = getMedalStyle(index);

            const tdScore = document.createElement('td');
            tdScore.textContent = String(player[scoreKey]);
            tdScore.style.cssText = getMedalStyle(index);

            tr.appendChild(tdPos);
            tr.appendChild(tdUser);
            tr.appendChild(tdScore);
            container.appendChild(tr);
        });
    };

    if (ui.lbHuidaBody) renderRows(huidaPlayers, ui.lbHuidaBody, 'recordHuida');
    if (ui.lbDestruBody) renderRows(destruPlayers, ui.lbDestruBody, 'recordDestruccion');
}
