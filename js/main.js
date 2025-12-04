/**
 * Punto de entrada principal del juego.
 * Orquesta la lógica, el bucle de juego y los eventos.
 */

import { state } from './core/estado.js';
import {
    INITIAL_SPEED, SPAWN_TIME, DESTRUCTION_TOTAL_TIME,
    DEFAULT_UNLOCKED_SKINS, SKIN_TYPES, MANTENIMIENTO,
    GAME_WIDTH, GAME_HEIGHT
} from './core/constantes.js';
import {
    ui, showOverlayLogin, setAuthMiniText, enableGameControls,
    updateInventoryView, actualizarTextoRecord, updateProgressBar,
    loadLeaderboardTables, renderSkinsList, showTab, updateXPBar
} from './ui/ui.js';
import { api } from './services/api.js';
import { initBattlePass, renderBattlePass, checkAndClaimRewards } from './ui/battlepass.js';



import { initStars } from './game/estrellas.js';
import { drawPlayer } from './game/jugador.js';
import { spawnProjectile, drawProjectiles } from './game/proyectiles.js';
import { drawParticles } from './game/particulas.js';
import {
    spawnMultiplier, drawMultiplier, checkMultiplierCollision, scheduleMultiplier,
    spawnShield, drawShieldPowerup, checkShieldCollision, scheduleShield,
    spawnTimeBonus, drawTimeBonus, checkTimeBonusCollision, scheduleTimeBonus
} from './game/powerups.js';
import {
    clamp, generarColorHslAleatorio,
    setRegTimeout, clearRegTimeout, setRegInterval, clearRegInterval, clearAllTimers
} from './core/utils.js';


/* ============================
   INICIALIZACIÓN
   ============================ */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Neon Spinner v7.5');

    // Inicializar canvas
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const starsCanvas = document.getElementById('stars');

    // Resize inicial (antes de estrellas para que tengan dimensiones)
    resize();
    window.addEventListener('resize', () => {
        clearRegTimeout(state._resizeTimeout);
        state._resizeTimeout = setRegTimeout(resize, 50);
    });

    // Inicializar estrellas
    initStars(starsCanvas);

    // Cargar sesión
    loadSession();

    // Event Listeners UI
    setupEventListeners();

    // Bucle de FPS (solo UI)
    startFpsTicker();

    // Música
    setupMusic();

    /* ============================
       LÓGICA DEL JUEGO
       ============================ */

    function resize() {
        // Fijar resolución del canvas a 1920x1080
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
        starsCanvas.width = GAME_WIDTH;
        starsCanvas.height = GAME_HEIGHT;
        state.width = GAME_WIDTH;
        state.height = GAME_HEIGHT;
        // Calcular escala para ajustar al viewport manteniendo aspect ratio
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scaleX = viewportWidth / GAME_WIDTH;
        const scaleY = viewportHeight / GAME_HEIGHT;
        const scale = Math.min(scaleX, scaleY);
        // Aplicar escala CSS
        const scaledWidth = GAME_WIDTH * scale;
        const scaledHeight = GAME_HEIGHT * scale;

        canvas.style.width = scaledWidth + 'px';
        canvas.style.height = scaledHeight + 'px';
        starsCanvas.style.width = scaledWidth + 'px';
        starsCanvas.style.height = scaledHeight + 'px';
        // Centrar canvas
        const offsetX = (viewportWidth - scaledWidth) / 2;
        const offsetY = (viewportHeight - scaledHeight) / 2;

        canvas.style.left = offsetX + 'px';
        canvas.style.top = offsetY + 'px';
        starsCanvas.style.left = offsetX + 'px';
        starsCanvas.style.top = offsetY + 'px';
        // Guardar factores de escala para traducir coordenadas del mouse
        state.scaleX = scale;
        state.scaleY = scale;
        state.offsetX = offsetX;
        state.offsetY = offsetY;
    }

    function iniciarPartida() {
        if (state.rafId !== null) {
            cancelAnimationFrame(state.rafId);
            state.rafId = null;
        }

        clearAllTimers();

        // Reset estado
        state.score = 0;
        state.projectileSpeed = INITIAL_SPEED;
        state.spawnTime = SPAWN_TIME;
        state.projectiles = [];
        state.particles = [];
        state.player = {
            x: state.width / 2,
            y: state.height / 2,
            r: 25,
            angle: 0
        };

        // Reset Powerups
        state.multiplier = { active: false, x: 0, y: 0, r: 28, show: false, timer: null };
        state.multiplierEffectActive = false;
        state.shield = { active: false, x: 0, y: 0, r: 28, show: false, timer: null };
        state.shieldEffectActive = false;
        state.timeBonus = { active: false, x: 0, y: 0, r: 28, show: false, timer: null };
        state.timeBonusEffectActive = false;

        // UI Reset
        ui.scoreEl.innerText = 'Puntos: 0';
        ui.gameOverEl.style.display = 'none';
        document.documentElement.style.cursor = 'none';

        ui.scoreEl.style.display = 'inline';
        ui.recordEl.style.display = 'inline';
        ui.mainMenu.style.display = 'none';
        ui.menuLeaderboardBtn.style.display = 'none';
        ui.usernameDisplay.style.display = 'none';

        state.playing = true;
        state.sessionStart = Date.now();

        actualizarTextoRecord();
        updateProgressBar(DESTRUCTION_TOTAL_TIME);

        // Iniciar Spawns
        spawnProjectile(state.width, state.height);
        scheduleMultiplier(state.width, state.height);

        if (state.gameMode === 'huida') {
            scheduleShield(state.width, state.height);
        } else {
            iniciarTemporizadorDestruccion();
            scheduleTimeBonus(state.width, state.height);
        }

        update();
    }

    function update() {
        if (!state.playing) return;

        ctx.clearRect(0, 0, state.width, state.height);

        drawPlayer(ctx);

        // Callbacks para proyectiles
        drawProjectiles(ctx, {
            endGame,
            setRecordHuida,
            setRecordDestruccion
        });

        drawParticles(ctx);
        drawMultiplier(ctx);
        drawShieldPowerup(ctx);
        drawTimeBonus(ctx);

        checkMultiplierCollision();
        checkShieldCollision();
        checkTimeBonusCollision();

        state.rafId = requestAnimationFrame(update);
    }

    async function endGame() {
        if (state.destructionIntervalId) {
            clearRegInterval(state.destructionIntervalId);
            state.destructionIntervalId = null;
        }

        if (state.godMode) return;

        state.playing = false;
        ui.gameOverEl.style.display = 'block';
        ui.gameOverEl.setAttribute('aria-hidden', 'false');
        document.documentElement.style.cursor = 'auto';

        clearAllTimers();

        // Guardar tiempo jugado
        let elapsedSec = 0;
        if (state.sessionStart) {
            elapsedSec = Math.max(0, Math.floor((Date.now() - state.sessionStart) / 1000));
            const prev = parseInt(localStorage.getItem('neonSpinnerPlayTime') || '0', 10);
            localStorage.setItem('neonSpinnerPlayTime', String(prev + elapsedSec));
            state.sessionStart = null;
        }

        if (state.sessionUser) {
            const r = await api('save_records.php', 'POST', {
                recordHuida: state.recordHuida,
                recordDestruccion: state.recordDestruccion,
                playTime: elapsedSec,
                score: state.score // Enviar puntuación actual para XP
            });

            if (r.ok && r.data && r.data.xp !== undefined) {
                state.xp = Number(r.data.xp);
                updateXPBar(); // Actualizar barra de nivel al volver al menú
                await checkAndClaimRewards(); // Reclamar recompensas si subió de nivel
            }

            setTimeout(loadLeaderboardTables, 250);
        }
    }

    /* ============================
       HELPERS DE ESTADO
       ============================ */

    function iniciarTemporizadorDestruccion() {
        state.destructionTimeLeft = DESTRUCTION_TOTAL_TIME;
        updateProgressBar(DESTRUCTION_TOTAL_TIME);

        if (state.destructionIntervalId) clearRegInterval(state.destructionIntervalId);

        state.destructionIntervalId = setRegInterval(() => {
            if (!state.playing) return;

            state.destructionTimeLeft = Number((state.destructionTimeLeft - 0.1).toFixed(1));

            if (state.destructionTimeLeft <= 0) {
                state.destructionTimeLeft = 0;
                updateProgressBar(DESTRUCTION_TOTAL_TIME);
                clearRegInterval(state.destructionIntervalId);
                state.destructionIntervalId = null;
                endGame();
                return;
            }
            updateProgressBar(DESTRUCTION_TOTAL_TIME);
        }, 100);
    }

    async function setRecordHuida(val) {
        state.recordHuida = Number(val) || 0;
        localStorage.setItem('neonSpinnerRecord', String(state.recordHuida));
        actualizarTextoRecord();

        if (state.sessionUser) {
            await api('save_records.php', 'POST', {
                recordHuida: state.recordHuida,
                recordDestruccion: state.recordDestruccion
            });
            if (ui.leaderboardPanel.style.display === 'block') {
                await loadLeaderboardTables();
            }
        }
    }

    async function setRecordDestruccion(val) {
        state.recordDestruccion = Number(val) || 0;
        localStorage.setItem('neonSpinnerRecordDestruction', String(state.recordDestruccion));
        actualizarTextoRecord();

        if (state.sessionUser) {
            await api('save_records.php', 'POST', {
                recordHuida: state.recordHuida,
                recordDestruccion: state.recordDestruccion
            });
            if (ui.leaderboardPanel.style.display === 'block') {
                await loadLeaderboardTables();
            }
        }
    }

    /* ============================
       SESIÓN Y UI
       ============================ */

    /**
     * Muestra u oculta el overlay de mantenimiento según el estado de la constante MANTENIMIENTO.
     * Si MANTENIMIENTO es true, se muestra el overlay; si es false, se oculta.
     */
    function activarMantenimiento() {
        const overlay = document.getElementById("maintenance-overlay");

        if (MANTENIMIENTO) {
            overlay.style.display = "flex";
        } else {
            overlay.style.display = "none";
        }
    }
    activarMantenimiento();

    async function loadSession() {
        const r = await api('get_user.php', 'GET');

        if (r.ok && r.data && r.data.logged) {
            const user = r.data.user;
            state.sessionUser = user.username;
            state.sessionStart = Date.now();
            setAuthMiniText();
            showOverlayLogin(false);
            enableGameControls(true);

            // Cargar records con valores por defecto si son NULL/undefined
            if (user.recordHuida !== undefined && user.recordHuida !== null) {
                state.recordHuida = Number(user.recordHuida) || 0;
            } else {
                state.recordHuida = 0;
            }
            localStorage.setItem('neonSpinnerRecord', String(state.recordHuida));

            if (user.recordDestruccion !== undefined && user.recordDestruccion !== null) {
                state.recordDestruccion = Number(user.recordDestruccion) || 0;
            } else {
                state.recordDestruccion = 0;
            }
            localStorage.setItem('neonSpinnerRecordDestruction', String(state.recordDestruccion));

            // Cargar XP
            state.xp = Number(user.xp) || 0;
            // Cargar estado premium
            state.hasPremium = Boolean(user.has_premium);
            updateXPBar(); // Mostrar barra de nivel en el menú
            await checkAndClaimRewards(); // Reclamar recompensas pendientes

            // Generar catálogo completo de skins
            const fullCatalog = SKIN_TYPES.map(type => ({ type, color: generarColorHslAleatorio() }));

            // Cargar skins desbloqueadas con validación
            const unlockedStr = user.unlocked_skins;
            if (unlockedStr && typeof unlockedStr === 'string' && unlockedStr.trim() !== '') {
                const unlockedTypes = unlockedStr.split(',').map(s => s.trim()).filter(s => s);
                state.playerSkins = fullCatalog.filter(s => unlockedTypes.includes(s.type));

                // Si por alguna razón no hay skins válidas, usar las por defecto
                if (state.playerSkins.length === 0) {
                    state.playerSkins = fullCatalog.filter(s => DEFAULT_UNLOCKED_SKINS.includes(s.type));
                }
            } else {
                // Si unlocked_skins es NULL o vacío, usar las por defecto
                state.playerSkins = fullCatalog.filter(s => DEFAULT_UNLOCKED_SKINS.includes(s.type));
            }

            // Cargar skin equipada con validación
            state.currentSkin = null;
            if (user.equipped_skin && typeof user.equipped_skin === 'string') {
                try {
                    const saved = JSON.parse(user.equipped_skin);
                    if (saved && saved.type) {
                        const found = state.playerSkins.find(s => s.type === saved.type);
                        if (found) {
                            state.currentSkin = { type: saved.type, color: saved.color || found.color };
                        }
                    }
                } catch (e) {
                    console.error('Error parsing equipped_skin:', e);
                }
            }

            // Si no hay skin equipada válida, usar la primera disponible
            if (!state.currentSkin && state.playerSkins.length > 0) {
                state.currentSkin = state.playerSkins[0];
            }

        } else {
            state.sessionUser = null;
            state.sessionStart = null;
            setAuthMiniText();
            showOverlayLogin(true);
            enableGameControls(false);

            // Defaults para usuarios no logueados
            const fullCatalog = SKIN_TYPES.map(type => ({ type, color: generarColorHslAleatorio() }));
            state.playerSkins = fullCatalog.filter(s => DEFAULT_UNLOCKED_SKINS.includes(s.type));
            state.currentSkin = state.playerSkins[Math.floor(Math.random() * state.playerSkins.length)];
        }

        updateInventoryView(saveEquippedSkin);
    }

    async function saveEquippedSkin() {
        if (!state.sessionUser) return;
        await api('save_skin.php', 'POST', { skin: state.currentSkin });
    }

    /**
     * Cierra todos los menús/modales abiertos.
     */
    function closeAllMenus() {
        ui.inventoryModal.style.display = 'none';
        ui.leaderboardPanel.style.display = 'none';
        ui.modeSelectMenu.style.display = 'none';
        ui.battlePassModal.style.display = 'none';
    }

    function setupEventListeners() {
        // Login/Register
        ui.authLogin.addEventListener('click', async () => {
            const u = ui.authUsername.value.trim();
            const p = ui.authPassword.value;
            if (!u || !p) return;
            ui.authMsg.textContent = 'Iniciando...';
            const r = await api('login.php', 'POST', { username: u, password: p });
            if (r.ok && r.data.ok) {
                ui.authMsg.textContent = '';
                ui.authPassword.value = '';
                await loadSession();
                await loadLeaderboardTables();
            } else {
                ui.authMsg.textContent = 'Error login.';
            }
        });

        ui.authRegister.addEventListener('click', async () => {
            const u = ui.authUsername.value.trim();
            const p = ui.authPassword.value;
            if (!u || !p) return;
            ui.authMsg.textContent = 'Registrando...';
            const r = await api('register.php', 'POST', { username: u, password: p });
            if (r.ok && r.data.ok) {
                ui.authMsg.textContent = 'Registrado. Inicia sesión.';
            } else {
                ui.authMsg.textContent = 'Error registro.';
            }
        });

        // Menús
        ui.playBtn.addEventListener('click', () => {
            if (state.sessionUser) {
                closeAllMenus();
                ui.modeSelectMenu.style.display = 'flex';
            } else {
                showOverlayLogin(true, 'Inicia sesión para jugar');
            }
        });

        document.getElementById('close-mode-menu').addEventListener('click', () => {
            ui.modeSelectMenu.style.display = 'none';
        });

        ui.playHuida.addEventListener('click', () => {
            state.gameMode = 'huida';
            ui.modeSelectMenu.style.display = 'none';
            iniciarPartida();
        });

        ui.playDestructionBtn.addEventListener('click', () => {
            state.gameMode = 'destruccion';
            ui.modeSelectMenu.style.display = 'none';
            iniciarPartida();
        });

        ui.retryBtn.addEventListener('click', iniciarPartida);
        ui.backMenuBtn.addEventListener('click', () => location.reload());

        ui.menuLeaderboardBtn.addEventListener('click', () => {
            closeAllMenus();
            ui.leaderboardPanel.style.display = 'block';
            loadLeaderboardTables();
        });
        ui.closeLeaderboardBtn.addEventListener('click', () => {
            ui.leaderboardPanel.style.display = 'none';
        });

        // Pase de Batalla
        ui.battlePassBtn.addEventListener('click', () => {
            closeAllMenus();
            ui.battlePassModal.style.display = 'block';
            renderBattlePass();
        });
        ui.closeBpBtn.addEventListener('click', () => {
            ui.battlePassModal.style.display = 'none';
        });

        // Inventario
        ui.inventoryBtn.addEventListener('click', () => {
            closeAllMenus();
            ui.inventoryModal.style.display = 'block';
            showTab('skins'); // Resetear a pestaña skins
            updateInventoryView(saveEquippedSkin);
        });
        ui.closeInventoryBtn.addEventListener('click', () => {
            ui.inventoryModal.style.display = 'none';
        });
        ui.changeSkinBtn.addEventListener('click', () => {
            ui.inventoryModal.style.display = 'block';
            showTab('skins');
            updateInventoryView(saveEquippedSkin);
        });

        // Tabs del inventario
        ui.tabSkins.addEventListener('click', () => showTab('skins'));
        ui.tabColor.addEventListener('click', () => showTab('color'));


        // Input Juego
        document.addEventListener('mousemove', (e) => {
            if (state.playing) {
                // Traducir coordenadas del viewport a coordenadas del canvas
                const rect = canvas.getBoundingClientRect();
                state.player.x = (e.clientX - rect.left) * (GAME_WIDTH / rect.width);
                state.player.y = (e.clientY - rect.top) * (GAME_HEIGHT / rect.height);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') location.reload();

            // Dev Mode
            if (e.key === 'Tab') {
                const onNext = (ev) => {
                    if (ev.key === 'k' || ev.key === 'K') {
                        state.devMode = !state.devMode;
                        console.log('DevMode:', state.devMode);
                    }
                    document.removeEventListener('keydown', onNext);
                };
                document.addEventListener('keydown', onNext);
            }

            if (state.devMode) {
                if (e.key === 'g' || e.key === 'G') state.godMode = !state.godMode;
                if (e.key === 'a' || e.key === 'A') state.multiplierEffectActive = !state.multiplierEffectActive;
                if (e.key === 's' || e.key === 'S') state.shieldEffectActive = !state.shieldEffectActive;
                if (e.key === 'd' || e.key === 'D') {
                    state.destructionTimeLeft += 10;
                    updateProgressBar(DESTRUCTION_TOTAL_TIME);
                }
            }

            // Skins secretas
            if (ui.inventoryModal.style.display === 'block' && !state.skinsSecretasActivas && e.key.toLowerCase() === 'l') {
                state.skinsSecretasActivas = true;
                const secret = ['卐', 'Σ', '☭'].map(type => ({ type, color: generarColorHslAleatorio() }));
                state.playerSkins.push(...secret);
                updateInventoryView(saveEquippedSkin);
            }
        });
    }

    function startFpsTicker() {
        let last = performance.now();
        let frames = 0;
        function tick(now) {
            frames++;
            if (now - last >= 1000) {
                if (ui.FPS) ui.FPS.textContent = (frames / ((now - last) / 1000)).toFixed(2) + ' FPS';
                frames = 0;
                last = now;
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function setupMusic() {
        const bgmusic = ui.bgmusic;
        function tryPlay() {
            if (bgmusic && bgmusic.paused) bgmusic.play().catch(() => { });
            document.removeEventListener('click', tryPlay);
        }
        document.addEventListener('click', tryPlay, { passive: true });
    }

    /* ============================
       FUNCIÓN DE LOGOUT (CONSOLA)
       ============================ */

    /**
     * Función global de logout accesible desde la consola.
     * Cierra la sesión actual y recarga la página.
     * Uso: logout() en la consola del navegador
     */
    window.logout = async function () {
        console.log('🚪 Cerrando sesión...');

        try {
            await api('logout.php', 'POST');
            console.log('✅ Sesión cerrada correctamente');

            // Limpiar estado local
            state.sessionUser = null;
            state.sessionStart = null;

            // Recargar la página para volver al estado inicial
            setTimeout(() => {
                console.log('🔄 Recargando página...');
                location.reload();
            }, 500);

        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
        }
    };

    console.log('💡 Tip: Usa logout() en la consola para cerrar sesión');
});