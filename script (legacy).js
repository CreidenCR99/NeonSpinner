document.addEventListener('DOMContentLoaded', () => {
    console.log('v6.1');

    /* ============================
     *  Helper API (backend PHP)
     *  Usa cookies de sesión same-origin
     * ============================ */

    /**
     * Indica si se está ejecutando en entorno local sin servidor PHP real.
     * Se puede usar más adelante para simular respuestas de servidor.
     * @type {boolean}
     */
    const USE_FAKE_SERVER =
        location.protocol === 'file:' ||
        location.hostname === '127.0.0.1' ||
        location.hostname === 'localhost';

    /**
     * Realiza una petición HTTP al backend y devuelve un objeto normalizado.
     *
     * Siempre intenta parsear JSON y atrapa errores de red, de forma que
     * la capa de UI no tenga que envolver cada fetch en try/catch.
     *
     * @async
     * @param {string} path - Ruta del endpoint (por ejemplo, 'login.php').
     * @param {'GET'|'POST'|'PUT'|'DELETE'} [method='GET'] - Método HTTP.
     * @param {Object|null} [body=null] - Cuerpo JSON a enviar (o null).
     * @returns {Promise<{
     *   ok: boolean,
     *   status?: number,
     *   data?: any,
     *   error?: string
     * }>}
     */
    async function api(path, method = 'GET', body = null) {
        const opts = {
            method,
            credentials: 'same-origin'
        };

        if (body) {
            opts.headers = { 'Content-Type': 'application/json' };
            opts.body = JSON.stringify(body);
        }

        try {
            const res = await fetch(path, opts);
            const json = await res.json().catch(() => null);

            return {
                ok: res.ok,
                status: res.status,
                data: json
            };
        } catch (e) {
            // Error de red (sin respuesta HTTP válida)
            return {
                ok: false,
                error: 'network'
            };
        }
    }

    /* ============================
     *  Referencias DOM (auth + leaderboard + botones juego)
     * ============================ */

    /** @type {HTMLDivElement} */
    const authOverlay = document.getElementById('auth-overlay');
    /** @type {HTMLInputElement} */
    const authUsername = document.getElementById('auth-username');
    /** @type {HTMLInputElement} */
    const authPassword = document.getElementById('auth-password');
    /** @type {HTMLButtonElement} */
    const authLogin = document.getElementById('auth-login');
    /** @type {HTMLButtonElement} */
    const authRegister = document.getElementById('auth-register');
    /** @type {HTMLSpanElement} */
    const authMsg = document.getElementById('auth-msg');
    /** @type {HTMLElement} */
    const authMini = document.getElementById('auth-mini');

    /** @type {HTMLButtonElement} */
    const menuLeaderboardBtn = document.getElementById('menu-leaderboard-btn');
    /** @type {HTMLDivElement} */
    const leaderboardPanel = document.getElementById('leaderboard-panel');
    /** @type {HTMLButtonElement} */
    const closeLeaderboardBtn = document.getElementById('close-leaderboard');

    /** @type {HTMLTableSectionElement} */
    const lbHuidaBody = document.querySelector('#lb-huida tbody');
    /** @type {HTMLTableSectionElement} */
    const lbDestruBody = document.querySelector('#lb-destruccion tbody');

    /**
     * Referencias a elementos de UI agrupadas en un solo objeto
     * para facilitar el acceso y evitar muchas variables sueltas.
     */
    const ui = {
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

        inventoryBtn: document.getElementById('inventorybtn'),
        inventoryModal: document.getElementById('inventory-modal'),
        closeInventoryBtn: document.getElementById('close-inventory'),
        tabSkins: document.getElementById('tab-skins'),
        tabColor: document.getElementById('tab-color'),
        skinsPanel: document.getElementById('skins-panel'),
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
        confirmReset: null,
        cancelReset: null,

        leaderboardPanel: document.getElementById('leaderboard-panel'),
        menuLeaderboardBtn: document.getElementById('menu-leaderboard-btn'),

        usernameDisplay: document.getElementById('auth-mini')

    };

    /* ============================
     *  Estado de sesión / usuario
     * ============================ */

    /**
     * Nombre de usuario de la sesión actual o null si no hay sesión.
     * @type {string|null}
     */
    let sessionUser = null;

    /**
     * Marca temporal del inicio de la sesión (para estadísticas de tiempo),
     * o null si no se ha iniciado sesión todavía.
     * @type {number|null}
     */
    let sessionStart = null;


    let rafId = null;
    /* ============================
     *  Funciones de UI / sesión
     * ============================ */

    /**
     * Muestra u oculta el overlay de login/registro y opcionalmente
     * muestra un mensaje de estado (error, info, etc.).
     *
     * @param {boolean} [show=true] - Si true, muestra el overlay.
     * @param {string} [message=''] - Mensaje a mostrar bajo los campos.
     */
    function showOverlayLogin(show = true, message = '') {
        authOverlay.style.display = show ? 'flex' : 'none';
        authOverlay.setAttribute('aria-hidden', show ? 'false' : 'true');
        authMsg.textContent = message;
    }

    /**
     * Actualiza el texto del mini indicador de sesión (esquina superior),
     * mostrando el usuario actual o que no hay sesión.
     */
    function setAuthMiniText() {
        authMini.textContent = sessionUser
            ? `Usuario: ${sessionUser}`
            : 'No conectado';
    }

    /**
     * Habilita o deshabilita los botones principales del juego
     * según si el usuario está autenticado.
     *
     * @param {boolean} enable - Si true, permite jugar; si false, se bloquea.
     */
    function enableGameControls(enable) {
        const disabledAttr = enable ? null : '';

        if (enable) {
            ui.playBtn.removeAttribute('disabled');
            ui.playDestructionBtn.removeAttribute('disabled');
            ui.playBtn.classList.remove('disabled');
            ui.playDestructionBtn.classList.remove('disabled');
        } else {
            ui.playBtn.setAttribute('disabled', '');
            ui.playDestructionBtn.setAttribute('disabled', '');
            ui.playBtn.classList.add('disabled');
            ui.playDestructionBtn.classList.add('disabled');
        }
    }

    /* ============================
     *  Cargar sesión (get_user.php)
     * ============================ */

    /**
     * Consulta al backend si ya hay una sesión iniciada (cookie de sesión),
     * y actualiza el estado local (nombre de usuario, récords y tiempo).
     *
     * Llama a:
     *   - get_user.php  → { logged, user: { username, recordHuida, ... } }
     *
     * @returns {Promise<void>}
     */
    async function loadSession() {
        const r = await api('get_user.php', 'GET');

        if (r.ok && r.data && r.data.logged) {
            const user = r.data.user;

            sessionUser = user.username;
            sessionStart = Date.now();
            setAuthMiniText();
            showOverlayLogin(false);
            enableGameControls(true);

            // Sincronizar récords locales con los del servidor (si existen)
            if (typeof user.recordHuida !== 'undefined') {
                localStorage.setItem(
                    'neonSpinnerRecord',
                    String(user.recordHuida)
                );
            }

            if (typeof user.recordDestruccion !== 'undefined') {
                localStorage.setItem(
                    'neonSpinnerRecordDestruction',
                    String(user.recordDestruccion)
                );
            }

            if (typeof user.total_play_time !== 'undefined') {
                localStorage.setItem(
                    'neonSpinnerPlayTime',
                    String(user.total_play_time)
                );
            }

            // Cargar skins desbloqueadas
            updateUnlockedSkins(user.unlocked_skins);

            // Cargar skin equipada
            if (user.equipped_skin) {
                try {
                    const savedSkin = JSON.parse(user.equipped_skin);
                    if (savedSkin && savedSkin.type && savedSkin.color) {
                        // Verificar si la skin guardada está desbloqueada (incluyendo las de rango)
                        const skinInList = playerSkins.find(s => s.type === savedSkin.type);
                        if (skinInList) {
                            currentSkin = { type: savedSkin.type, color: savedSkin.color };
                        }
                    }
                } catch (e) {
                    console.error('Error parsing equipped_skin', e);
                }
            }

        } else {
            // No hay sesión activa
            sessionUser = null;
            sessionStart = null;
            setAuthMiniText();
            showOverlayLogin(true);
            enableGameControls(false);

            // Resetear skins a defaults
            updateUnlockedSkins(null);
        }
    }

    /**
     * Guarda la skin equipada en el servidor.
     */
    async function saveEquippedSkin() {
        if (!sessionUser) return;
        await api('save_skin.php', 'POST', { skin: currentSkin });
    }

    /* ============================
     *  Registro
     * ============================ */

    authRegister.addEventListener('click', async () => {
        const username = authUsername.value.trim();
        const password = authPassword.value;

        if (!username || !password) {
            authMsg.textContent = 'Rellena usuario y contraseña.';
            return;
        }

        authMsg.textContent = 'Registrando...';

        const r = await api('register.php', 'POST', { username, password });

        if (r.ok && r.data && r.data.ok) {
            authMsg.textContent = 'Registrado. Inicia sesión.';
            authPassword.value = '';
        } else {
            const errorMsg =
                r.data && r.data.error ? r.data.error : 'desconocido';
            authMsg.textContent = 'Error registro: ' + errorMsg;
        }
    });

    /* ============================
     *  Login
     * ============================ */

    authLogin.addEventListener('click', async () => {
        const username = authUsername.value.trim();
        const password = authPassword.value;

        if (!username || !password) {
            authMsg.textContent = 'Rellena usuario y contraseña.';
            return;
        }

        authMsg.textContent = 'Iniciando...';

        const r = await api('login.php', 'POST', { username, password });

        if (r.ok && r.data && r.data.ok) {
            // El backend devuelve el username como confirmación
            sessionUser = r.data.username;
            sessionStart = Date.now();
            setAuthMiniText();

            authMsg.textContent = '';
            showOverlayLogin(false);
            enableGameControls(true);

            // Limpiar campo contraseña por seguridad
            authPassword.value = '';

            // Si el leaderboard está visible, recargarlo
            await loadLeaderboardTables();
        } else {
            authMsg.textContent = 'Login fallido. Comprueba credenciales.';
        }
    });

    /* ============================
     *  Logout
     * ============================ */

    /**
     * Cierra la sesión en el servidor (si existe) y limpia el estado local.
     *
     * @returns {Promise<void>}
     */
    async function logout() {
        await api('logout.php', 'POST');
        sessionUser = null;
        sessionStart = null;
        setAuthMiniText();
        showOverlayLogin(true);
        enableGameControls(false);
    }

    /* ============================
     *  Leaderboard (panel con 2 tablas)
     * ============================ */

    menuLeaderboardBtn.addEventListener('click', async () => {
        leaderboardPanel.style.display = 'block';
        leaderboardPanel.setAttribute('aria-hidden', 'false');

        await loadLeaderboardTables();
    });

    closeLeaderboardBtn.addEventListener('click', () => {
        leaderboardPanel.style.display = 'none';
        leaderboardPanel.setAttribute('aria-hidden', 'true');
    });

    /**
     * Carga ambos leaderboards (Huida y Destrucción) desde el backend y
     * rellena las tablas HTML correspondientes.
     *
     * Se espera que el endpoint devuelva un array de usuarios con sus
     * puntuaciones, que aquí se filtrarán y ordenarán si es necesario.
     *
     * @returns {Promise<void>}
     */
    function getMedalStyle(index) {
        switch (index) {
            case 0: // Top 1
                return 'color: #FFD700; text-shadow: 0 0 5px #FFD700; font-weight: bold;'; // dorado
            case 1: // Top 2
                return 'color: #C0C0C0; text-shadow: 0 0 5px #C0C0C0; font-weight: bold;'; // plateado
            case 2: // Top 3
                return 'color: #CD7F32; text-shadow: 0 0 5px #CD7F32; font-weight: bold;'; // bronce
            default:
                return '';
        }
    }

    async function loadLeaderboardTables() {
        const r = await api('leaderboard.php', 'GET');

        lbHuidaBody.innerHTML = '';
        lbDestruBody.innerHTML = '';

        if (!(r.ok && Array.isArray(r.data))) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 3;
            td.textContent = 'No se ha podido cargar el leaderboard.';
            tr.appendChild(td);
            lbHuidaBody.appendChild(tr);
            lbDestruBody.appendChild(tr.cloneNode(true));
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

        huidaPlayers.forEach((player, index) => {
            const tr = document.createElement('tr');

            const tdPos = document.createElement('td');
            tdPos.textContent = String(index + 1);
            tdPos.style = getMedalStyle(index);

            const tdUser = document.createElement('td');
            tdUser.textContent = player.username;
            tdUser.style = getMedalStyle(index);

            const tdScore = document.createElement('td');
            tdScore.textContent = String(player.recordHuida);
            tdScore.style = getMedalStyle(index);

            tr.appendChild(tdPos);
            tr.appendChild(tdUser);
            tr.appendChild(tdScore);

            lbHuidaBody.appendChild(tr);
        });

        destruPlayers.forEach((player, index) => {
            const tr = document.createElement('tr');

            const tdPos = document.createElement('td');
            tdPos.textContent = String(index + 1);
            tdPos.style = getMedalStyle(index);

            const tdUser = document.createElement('td');
            tdUser.textContent = player.username;
            tdUser.style = getMedalStyle(index);

            const tdScore = document.createElement('td');
            tdScore.textContent = String(player.recordDestruccion);
            tdScore.style = getMedalStyle(index);

            tr.appendChild(tdPos);
            tr.appendChild(tdUser);
            tr.appendChild(tdScore);

            lbDestruBody.appendChild(tr);
        });
    }

    // Al arrancar la página, intentar cargar sesión existente
    loadSession().catch(() => {
        // En caso de error inesperado, forzamos estado "no logado"
        sessionUser = null;
        sessionStart = null;
        setAuthMiniText();
        showOverlayLogin(true);
        enableGameControls(false);
    });

    /**
     * Escapa caracteres especiales para mostrarlos de forma segura en HTML.
     * Útil si en algún momento interpolas texto de usuario en el DOM.
     *
     * @param {string} s - Texto de entrada.
     * @returns {string} Texto con caracteres HTML escapados.
     */
    function escapeHtml(s) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return String(s).replace(/[&<>"']/g, m => map[m]);
    }

    /* =============================================
       Control de inicio de partida / modo de juego
       ============================================= */

    /**
     * Modo de juego actual.
     * 'huida'  → modo clásico de esquivar.
     * 'destruccion' → modo destrucción.
     *
     * @type {'huida'|'destruccion'}
     */
    let gameMode = 'huida';

    /**
     * Comprueba si se puede iniciar una partida.
     * Si no hay sesión, muestra el overlay de login con un mensaje
     * y devuelve false.
     *
     * @returns {boolean} true si se puede iniciar la partida.
     */
    function canStartGame() {
        if (sessionUser) return true;

        // Si no hay sesión, mostramos el overlay y avisamos al jugador
        showOverlayLogin(true, 'Debes iniciar sesión para jugar.');
        return false;
    }

    // Botón de jugar modo Huida
    if (ui.playBtn) {
        ui.playHuida.addEventListener('click', (e) => {
            if (!canStartGame()) {
                e.preventDefault();
                return;
            }
            // Delegar en la lógica original del juego si existe
            if (typeof iniciarPartida === 'function') {
                gameMode = 'huida';
                ui.modeSelectMenu.style.display = "none";
                iniciarPartida();
            }
        });
    }

    // Botón de jugar modo Destrucción
    if (ui.playDestructionBtn) {
        ui.playDestructionBtn.addEventListener('click', (e) => {
            if (!canStartGame()) {
                e.preventDefault();
                return;
            }
            if (typeof iniciarPartida === 'function') {
                gameMode = 'destruccion';
                ui.modeSelectMenu.style.display = "none";
                iniciarPartida();
            }
        });
    }

    /* =============================================
       Sincronización de récords con el servidor
       ============================================= */

    /**
     * Actualiza el récord local de modo Huida y, si hay sesión activa,
     * envía también el valor al servidor.
     *
     * Esta función se expone en window para que la lógica del juego
     * pueda llamarla libremente.
     *
     * @param {number} value - Nuevo récord de modo Huida.
     * @returns {Promise<void>}
     */
    window.setRecordHuida = window.setRecordHuida || (async (value) => {
        const v = Number(value) || 0;

        localStorage.setItem('neonSpinnerRecord', String(v));

        if (sessionUser) {
            const recordDestru = parseInt(
                localStorage.getItem('neonSpinnerRecordDestruction') || '0',
                10
            );

            await api('save_records.php', 'POST', {
                recordHuida: v,
                recordDestruccion: recordDestru
            });
        }

        // Actualizar leaderboard si el panel está visible
        if (leaderboardPanel.style.display === 'block') {
            await loadLeaderboardTables();
        }
    });

    /**
     * Actualiza el récord local de modo Destrucción y lo sincroniza
     * con el servidor si hay sesión activa.
     *
     * @param {number} value - Nuevo récord de modo Destrucción.
     * @returns {Promise<void>}
     */
    window.setRecordDestruccion = window.setRecordDestruccion || (async (value) => {
        const v = Number(value) || 0;

        localStorage.setItem('neonSpinnerRecordDestruction', String(v));

        if (sessionUser) {
            const recordHuida = parseInt(
                localStorage.getItem('neonSpinnerRecord') || '0',
                10
            );

            await api('save_records.php', 'POST', {
                recordHuida,
                recordDestruccion: v
            });
        }

        if (leaderboardPanel.style.display === 'block') {
            await loadLeaderboardTables();
        }
    });

    /* =============================================
       Botón de reseteo de récords (local + remoto)
       ============================================= */

    /** @type {HTMLButtonElement|null} */
    const resetBtn = document.getElementById('reset-records-btn');

    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            const confirmReset = confirm(
                'Borrar los récords locales y remotos (si estás logado)?'
            );
            if (!confirmReset) return;

            // Limpiar récords locales
            localStorage.removeItem('neonSpinnerRecord');
            localStorage.removeItem('neonSpinnerRecordDestruccion');

            // Si hay sesión, resetear también en el servidor
            if (sessionUser) {
                await api('save_records.php', 'POST', {
                    recordHuida: 0,
                    recordDestruccion: 0
                });
                await loadLeaderboardTables();
            }

            alert('Récords reseteados');
        });
    }

    /* =============================================
       BASE DE DATOS FALSA SOLO EN LOCAL (FAKE SERVER)
       ============================================= */

    // Si estamos en local y aún no existe FAKE_DB, crear una de ejemplo
    if (USE_FAKE_SERVER && !localStorage.getItem('FAKE_DB')) {
        const fakeDB = {
            users: {
                ana: { pass: btoa('1234'), recordHuida: 5, recordDestruccion: 2, unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣' },
                luis: { pass: btoa('1111'), recordHuida: 1, recordDestruccion: 9, unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣' },
                mario: { pass: btoa('0000'), recordHuida: 7, recordDestruccion: 1, unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣' },
                laura: { pass: btoa('abcd'), recordHuida: 3, recordDestruccion: 4, unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣' },
                carlos: { pass: btoa('pass'), recordHuida: 6, recordDestruccion: 0, unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣' },
                sofia: { pass: btoa('qwerty'), recordHuida: 2, recordDestruccion: 5, unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣' },
                david: { pass: btoa('zxcv'), recordHuida: 4, recordDestruccion: 3, unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣' },
                juan: { pass: btoa('asdf'), recordHuida: 0, recordDestruccion: 0, unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣' }
            },
            session: null
        };
        localStorage.setItem('FAKE_DB', JSON.stringify(fakeDB));
    }

    /**
     * Lee la base de datos falsa de localStorage.
     * Solo se usa cuando USE_FAKE_SERVER es true.
     *
     * @returns {{users: Object<string, any>, session: string|null}}
     */
    function readDB() {
        return JSON.parse(localStorage.getItem('FAKE_DB'));
    }

    /**
     * Escribe la base de datos falsa en localStorage.
     *
     * @param {Object} db - Objeto de base de datos a persistir.
     */
    function writeDB(db) {
        localStorage.setItem('FAKE_DB', JSON.stringify(db));
    }

    /* =============================================
       FUNCIÓN API (FAKE SERVER + REAL)
       ============================================= */

    /**
     * Llama a la API del juego.
     *
     * - En LOCAL (file://, localhost...) usa una base de datos falsa
     *   en localStorage para simular el backend PHP.
     * - En producción usa directamente fetch hacia tu servidor real.
     *
     * @async
     * @param {string} path - Ruta del endpoint (por ejemplo 'login.php').
     * @param {'GET'|'POST'|'PUT'|'DELETE'} [method='GET'] - Método HTTP.
     * @param {Object|null} [body=null] - Cuerpo JSON a enviar (según endpoint).
     * @returns {Promise<{ok: boolean, status?: number, data?: any, error?: string}>}
     */
    async function api(path, method = 'GET', body = null) {
        /* ===========================
           MODO LOCAL → SERVIDOR FAKE
           =========================== */
        if (USE_FAKE_SERVER) {
            const db = readDB();

            // REGISTER
            if (path === 'register.php') {
                const { username, password } = body;
                if (db.users[username]) {
                    return {
                        ok: false,
                        status: 400,
                        data: { error: 'user_exists' }
                    };
                }

                db.users[username] = {
                    pass: btoa(password),
                    recordHuida: 0,
                    recordDestruccion: 0,
                    unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣'
                };
                writeDB(db);
                return { ok: true, status: 200, data: { ok: true } };
            }

            // LOGIN
            if (path === 'login.php') {
                const { username, password } = body;

                if (!db.users[username]) {
                    return {
                        ok: false,
                        status: 401,
                        data: { error: 'user_not_found' }
                    };
                }

                if (atob(db.users[username].pass) !== password) {
                    return {
                        ok: false,
                        status: 401,
                        data: { error: 'wrong_password' }
                    };
                }

                db.session = username;
                writeDB(db);

                return {
                    ok: true,
                    status: 200,
                    data: { ok: true, username }
                };
            }

            // GET USER
            if (path === 'get_user.php') {
                if (!db.session) {
                    return {
                        ok: true,
                        status: 200,
                        data: { logged: false }
                    };
                }

                const u = db.users[db.session];

                // Simular lógica de ranking
                let rankSkins = [];
                const allUsers = Object.values(db.users);

                // Ranking Huida
                const topHuida = allUsers.sort((a, b) => b.recordHuida - a.recordHuida).slice(0, 3);
                if (topHuida.includes(u)) {
                    const pos = topHuida.indexOf(u);
                    if (pos <= 2) rankSkins.push('#');
                    if (pos <= 1) rankSkins.push('⚵');
                    if (pos === 0) rankSkins.push('💥');
                }

                // Ranking Destrucción
                const topDestru = allUsers.sort((a, b) => b.recordDestruccion - a.recordDestruccion).slice(0, 3);
                if (topDestru.includes(u)) {
                    const pos = topDestru.indexOf(u);
                    if (pos <= 2) rankSkins.push('#');
                    if (pos <= 1) rankSkins.push('⚵');
                    if (pos === 0) rankSkins.push('💥');
                }

                const currentUnlocked = (u.unlocked_skins || '').split(',');
                const finalUnlocked = [...new Set([...currentUnlocked, ...rankSkins])].join(',');

                return {
                    ok: true,
                    status: 200,
                    data: {
                        logged: true,
                        user: {
                            username: db.session,
                            recordHuida: u.recordHuida,
                            recordDestruccion: u.recordDestruccion,
                            unlocked_skins: finalUnlocked,
                            equipped_skin: u.equipped_skin
                        }
                    }
                };
            }

            // SAVE SKIN
            if (path === 'save_skin.php') {
                if (!db.session) return { ok: false, status: 401 };
                const u = db.users[db.session];
                u.equipped_skin = JSON.stringify(body.skin);
                writeDB(db);
                return { ok: true, status: 200 };
            }

            // SAVE RECORDS
            if (path === 'save_records.php') {
                if (!db.session) {
                    return {
                        ok: false,
                        status: 401,
                        data: { error: 'not_logged' }
                    };
                }

                const u = db.users[db.session];
                u.recordHuida = Math.max(u.recordHuida, body.recordHuida);
                u.recordDestruccion = Math.max(u.recordDestruccion, body.recordDestruccion);
                writeDB(db);

                return { ok: true, status: 200, data: { ok: true } };
            }

            // LEADERBOARD
            if (path === 'leaderboard.php') {
                const arr = Object.keys(db.users)
                    .map(username => ({
                        username,
                        recordHuida: db.users[username].recordHuida,
                        recordDestruccion: db.users[username].recordDestruccion
                    }))
                    .filter(u => u.recordHuida > 0 || u.recordDestruccion > 0);

                return { ok: true, status: 200, data: arr };
            }

            // Endpoint no soportado en modo fake
            return {
                ok: false,
                status: 404,
                data: { error: 'invalid_path' }
            };
        }

        /* ====================================================
           MODO ONLINE → USAR TU SERVIDOR REAL SIN TOCAR NADA
           ==================================================== */
        const opts = { method, credentials: 'same-origin' };

        if (body) {
            opts.headers = { 'Content-Type': 'application/json' };
            opts.body = JSON.stringify(body);
        }

        try {
            const res = await fetch(path, opts);
            const json = await res.json().catch(() => null);

            return {
                ok: res.ok,
                status: res.status,
                data: json
            };
        } catch (e) {
            return { ok: false, error: 'network' };
        }
    }

    /* =============================================
       Helpers de juego: clamps y gestión de timers
       ============================================= */

    /**
     * Limita un valor v al rango [min, max].
     *
     * @param {number} v - Valor actual.
     * @param {number} min - Límite inferior.
     * @param {number} max - Límite superior.
     * @returns {number} Valor clamped.
     */
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    /**
     * Conjunto interno de temporizadores activos.
     * Se usa para poder limpiar todos los timeouts/intervalos
     * al reiniciar la partida o cambiar de modo.
     *
     * @type {Set<number>}
     */
    const _timers = new Set();

    /**
     * setTimeout registrado. Se guarda el id en _timers.
     *
     * @param {Function} fn - Función a ejecutar.
     * @param {number} delay - Retraso en ms.
     * @returns {number} Id del timeout.
     */
    const setRegTimeout = (fn, delay) => {
        const id = setTimeout(() => {
            _timers.delete(id);
            fn();
        }, delay);
        _timers.add(id);
        return id;
    };

    /**
     * Limpia un timeout registrado.
     *
     * @param {number} id - Id del timeout a cancelar.
     */
    const clearRegTimeout = (id) => {
        if (!id) return;
        clearTimeout(id);
        _timers.delete(id);
    };

    /**
     * setInterval registrado. Se guarda el id en _timers.
     *
     * @param {Function} fn - Función a ejecutar periódicamente.
     * @param {number} delay - Intervalo en ms.
     * @returns {number} Id del intervalo.
     */
    const setRegInterval = (fn, delay) => {
        const id = setInterval(fn, delay);
        _timers.add(id);
        return id;
    };

    /**
     * Limpia un intervalo registrado.
     *
     * @param {number} id - Id del intervalo a cancelar.
     */
    const clearRegInterval = (id) => {
        if (!id) return;
        clearInterval(id);
        _timers.delete(id);
    };

    /**
     * Cancela todos los timeouts e intervalos registrados.
     * Muy útil al reiniciar partida o al cambiar de modo de juego.
     */
    const clearAllTimers = () => {
        for (const id of Array.from(_timers)) {
            clearTimeout(id);
            clearInterval(id);
            _timers.delete(id);
        }
    };


    /* =============================================
       Canvas principal y elementos de interfaz
       ============================================= */

    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById('game');
    /** @type {CanvasRenderingContext2D} */
    const ctx = canvas.getContext('2d');

    /** @type {HTMLCanvasElement} */
    const starsCanvas = document.getElementById('stars');
    /** @type {CanvasRenderingContext2D} */
    const starsCtx = starsCanvas.getContext('2d');

    /** @type {HTMLElement} */
    const htmlRoot = document.documentElement;

    /* =============================================
       Menú de versiones antiguas del juego
       ============================================= */

    /**
     * Lista de rutas a versiones anteriores del juego.
     * Se usa para generar el menú desplegable de versiones.
     * @type {string[]}
     */
    const versionsList = [
        'versions/Neon Spinner v1.0.html',
        'versions/Neon Spinner v2.0.html',
        'versions/Neon Spinner v2.1.html',
        'versions/Neon Spinner v2.2.html',
        'versions/Neon Spinner v2.3.html',
        'versions/Neon Spinner v2.4.html',
        'versions/Neon Spinner v3.0.html',
        'versions/Neon Spinner v3.1.html',
        'versions/Neon Spinner v4.0/Neon Spinner v4.0.html'
    ];

    // Abrir el menú cuando se pulsa "Jugar"
    ui.playBtn.addEventListener("click", () => {
        ui.modeSelectMenu.style.display = "flex";
    });

    // Botón cerrar
    document.getElementById("close-mode-menu").addEventListener("click", () => {
        ui.modeSelectMenu.style.display = "none";
    });

    // Se usa la MISMA lista que tienes
    function renderLegacyList() {
        ui.modeLegacyMenu.innerHTML = "";

        versionsList.forEach(v => {
            const a = document.createElement("a");
            a.href = encodeURI(v);
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = v.split('/').pop();
            a.role = "menuitem";

            a.addEventListener("click", () => {
                ui.modeLegacyMenu.style.display = "none";
                ui.modeLegacyBtn.setAttribute("aria-expanded", "false");
            });

            ui.modeLegacyMenu.appendChild(a);
        });
    }

    ui.modeLegacyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = ui.modeLegacyMenu.style.display === "block";

        if (!open) {
            renderLegacyList();
            ui.modeLegacyMenu.style.display = "block";
            ui.modeLegacyMenu.setAttribute("aria-hidden", "false");
            ui.modeLegacyBtn.setAttribute("aria-expanded", "true");
        } else {
            ui.modeLegacyMenu.style.display = "none";
        }
    });

    document.addEventListener("click", (e) => {
        if (!ui.modeLegacyMenu.contains(e.target) && e.target !== ui.modeLegacyBtn) {
            ui.modeLegacyMenu.style.display = "none";
            ui.modeLegacyBtn.setAttribute("aria-expanded", "false");
        }
    });

    // --- Botones de modos ---
    document.getElementById("play-huida")
        .addEventListener("click", () => ui.playHuida.click());

    document.getElementById("play-destruction")
        .addEventListener("click", () => ui.playDestructionBtn.click());


    /* =============================================
       Gestión de resize (canvas responsive)
       ============================================= */

    let sw = 0;
    let sh = 0;

    /**
     * Ajusta el tamaño de los canvas al tamaño de la ventana
     * y actualiza sw/sh para que el resto del juego los use.
     */
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        starsCanvas.width = canvas.width;
        starsCanvas.height = canvas.height;

        sw = canvas.width;
        sh = canvas.height;
    }

    let _resizeTimeout = null;

    // Debounce del resize para no recalcular en cada píxel de movimiento
    window.addEventListener('resize', () => {
        if (_resizeTimeout) clearRegTimeout(_resizeTimeout);
        _resizeTimeout = setRegTimeout(resize, 50);
    });

    // Primera llamada para inicializar tamaños
    resize();

    /* =============================================
       Colores aleatorios (skins / efectos)
       ============================================= */

    /**
     * Genera un color aleatorio en formato hex (#RRGGBB).
     * @returns {string}
     */
    const generarColorHexAleatorio = () => {
        const num = Math.floor(Math.random() * 0xffffff);
        return '#' + num.toString(16).padStart(6, '0');
    };

    /**
     * Genera un color HSL con aspecto neón vibrante.
     * @returns {string} Color en formato hsl(h, s%, l%).
     */
    const generarColorHslAleatorio = () => {
        return `hsl(${Math.random() * 360},100%,60%)`;
    };

    /* =============================================
       Skins del jugador
       ============================================= */

    /**
     * Lista de skins disponibles.
     * Cada skin tiene un tipo (símbolo) y un color HSL.
     *
     * @type {{type: string, color: string}[]}
     */
    /**
     * Catálogo completo de skins disponibles en el juego.
     * @type {{type: string, color: string}[]}
     */
    const ALL_SKINS_CATALOG = [
        // Letras / Básicos
        'X', 'Y', 'I', 'π',
        // Geométricos simples
        '●', '◎', '△', '◆', '⟁',
        // Cartas y símbolos clásicos
        '♠', '♣', '♥',
        // Estrellas / Brillo / Decorativos
        '★', '✧', '✦', '✹', '✵',
        // Místicos / Religiosos / Ocultismo
        '✠', '✟', '⛥', 'ψ', 'Ω', '☯', '☬',
        // Peligro / Biohazard
        '☢', '☣',
        // Naturaleza / Elementos / Fenómenos
        '☄', '∞',
        // Runas
        'ᛉ', 'ᛟ',
        // Objetos / Ítems
        '⚙', '🗿',
        // Números / Especiales
        '67',
        // Deportivos
        '⚽', '🏀', '🥎', '⚾️', '🏐', '🏈',
        // Meméticos / Objetos reconocibles
        '💣', '🧿', '📛', '🍀', '🍄', '🎲',
        // Skins de Rango (Leaderboard)
        '#', '⚵', '💥'
    ].map((type) => ({ type, color: generarColorHslAleatorio() }));

    /**
     * Skins desbloqueadas por defecto (una de cada categoría).
     */
    const DEFAULT_UNLOCKED_SKINS = ['X', '●', '♠', '★', 'ᛉ', '⚙', '67', '⚽', '💣'];

    /**
     * Lista de skins desbloqueadas para el jugador actual.
     * Se inicializa con las por defecto y se actualiza al cargar sesión.
     * @type {{type: string, color: string}[]}
     */
    let playerSkins = ALL_SKINS_CATALOG.filter(s => DEFAULT_UNLOCKED_SKINS.includes(s.type));

    /**
     * Actualiza la lista de skins desbloqueadas a partir de una cadena separada por comas.
     * @param {string|null} unlockedStr - Cadena de skins desbloqueadas (ej: "X,●,♠").
     */
    function updateUnlockedSkins(unlockedStr) {
        if (!unlockedStr) {
            // Si no hay info, usar defaults
            playerSkins = ALL_SKINS_CATALOG.filter(s => DEFAULT_UNLOCKED_SKINS.includes(s.type));
        } else {
            const unlockedTypes = unlockedStr.split(',');
            playerSkins = ALL_SKINS_CATALOG.filter(s => unlockedTypes.includes(s.type));
        }

        // Asegurar que la skin actual sea válida
        if (!playerSkins.find(s => s.type === currentSkin.type)) {
            currentSkin = playerSkins[0];
        }

        // Actualizar vista de inventario si está abierta
        updateInventoryView();
    }

    /**
     * Skin actualmente seleccionada por el jugador.
     * @type {{type: string, color: string}}
     */
    let currentSkin =
        playerSkins[Math.floor(Math.random() * playerSkins.length)];

    /**
     * Skins especiales que se muestran más grandes (tamaño extra).
     * @type {string[]}
     */
    const skinsGrandes = [
        // Místicos / Ocultismo
        '𖣘',
        // Especiales / números
        '67',
        // Deportivas
        '⚽', '🏀', '🥎', '⚾️', '🏐', '🏈',
        // Meméticos / Iconos grandes
        '🗿', '💣', '🧿', '📛', '🍀', '🍄', '🎲'
    ];

    /**
     * Indica si las skins secretas están activas en el inventario.
     * @type {boolean}
     */
    let skinsSecretasActivas = false;

    /**
     * Pestaña actual del inventario: 'skins' o 'color'.
     * @type {'skins'|'color'}
     */
    let currentInventoryTab = 'skins';

    /* =============================================
       Estado general del juego
       ============================================= */

    /** Modo desarrollador: activa atajos de teclado. */
    let devMode = false;
    /** God mode: invulnerable. */
    let godMode = false;

    /** Puntuación actual de la partida. */
    let score = 0;

    // Récords iniciales cargados desde localStorage
    let recordHuida =
        parseInt(localStorage.getItem('neonSpinnerRecord') || '0', 10);
    let recordDestruccion =
        parseInt(localStorage.getItem('neonSpinnerRecordDestruction') || '0', 10);

    /** Récord actual según el modo activo. */
    let record = recordHuida;

    /**
     * Duración total del modo destrucción en segundos.
     * (la barra de progreso se basa en este valor).
     */
    const destructionTotalTime = 30;

    /** Tiempo restante del modo destrucción en segundos. */
    let destructionTimeLeft = 0;

    /** Id del intervalo que decrementa el tiempo en modo destrucción. */
    let destructionIntervalId = null;

    /**
     * Contador de puntos en destrucción para otorgar bonus de tiempo
     * cada cierto número de puntos.
     */
    let destructionBonusCounter = 0;

    /** Cada cuántos puntos se da bonus de tiempo en destrucción. */
    const PUNTOS_PARA_BONUS_TIEMPO = 10;
    /** Segundos añadidos por cada bonus. */
    const SEGUNDOS_BONUS = 2;

    /** Indica si una partida está en curso. */
    let playing = false;

    /** Velocidad base de los proyectiles. */
    let initialSpeed = 20;
    /** Velocidad actual de los proyectiles. */
    let projectileSpeed = initialSpeed;

    /** Timer genérico usado para algunos modos/eventos. */
    let modeTimerId = null;

    /** Array de proyectiles activos. */
    let projectiles = [];
    /** Array de partículas activas (explosiones, efectos). */
    let particles = [];
    /** Tiempo base (ms) entre spawns de proyectiles. */
    let spawnTime = 300;

    /* =============================================
       Power-ups y multiplicadores
       ============================================= */

    /**
     * Estado del power-up de multiplicador x2.
     */
    let multiplier = {
        active: false,
        x: 0,
        y: 0,
        r: 28,
        show: false,
        timer: null
    };
    let multiplierEffectActive = false;
    let multiplierEffectTimeoutId = null;

    /**
     * Estado del power-up de escudo (no disponible en destrucción).
     */
    let shield = {
        active: false,
        x: 0,
        y: 0,
        r: 28,
        show: false,
        timer: null
    };
    let shieldEffectActive = false;
    let shieldEffectTimeoutId = null;

    /**
     * Power-up de +10s en modo destrucción.
     */
    let timeBonus = {
        active: false,
        x: 0,
        y: 0,
        r: 28,
        show: false,
        timer: null
    };
    let timeBonusEffectActive = false;
    let timeBonusEffectTimeoutId = null;

    /* =============================================
       Gestión y visualización de récords
       ============================================= */

    /**
     * Actualiza el texto del récord en pantalla en función del modo actual.
     */
    function actualizarTextoRecord() {
        if (gameMode === 'huida') {
            record = recordHuida;
            ui.recordEl.innerText = 'Récord Huida: ' + recordHuida;
        } else {
            record = recordDestruccion;
            ui.recordEl.innerText = 'Récord Destrucción: ' + recordDestruccion;
        }
    }

    // Mostrar el récord correcto nada más cargar
    actualizarTextoRecord();

    /**
     * Actualiza el récord de modo Huida:
     * - Actualiza variable local.
     * - Guarda en localStorage.
     * - Refresca la UI.
     * - Sincroniza con el servidor y leaderboard si hay sesión.
     *
     * @param {number} value - Nuevo récord de Huida.
     * @returns {Promise<void>}
     */
    async function updateRecordHuida(value) {
        recordHuida = Number(value) || 0;
        localStorage.setItem('neonSpinnerRecord', String(recordHuida));
        actualizarTextoRecord();

        if (sessionUser) {
            await api('save_records.php', 'POST', {
                recordHuida,
                recordDestruccion
            });
            await loadLeaderboardTables();
        }
    }

    /**
     * Actualiza el récord de modo Destrucción:
     * igual que el de Huida pero usando recordDestruccion.
     *
     * @param {number} value - Nuevo récord de Destrucción.
     * @returns {Promise<void>}
     */
    async function updateRecordDestruccion(value) {
        recordDestruccion = Number(value) || 0;
        localStorage.setItem(
            'neonSpinnerRecordDestruction',
            String(recordDestruccion)
        );
        actualizarTextoRecord();

        if (sessionUser) {
            await api('save_records.php', 'POST', {
                recordHuida,
                recordDestruccion
            });
            await loadLeaderboardTables();
        }
    }

    // Exponer las funciones de récord a nivel global (para otros scripts si hacen falta)
    window.setRecordHuida = updateRecordHuida;
    window.setRecordDestruccion = updateRecordDestruccion;
    /* =============================================
       Fondo de estrellas (parallax)
       ============================================= */

    /**
     * Crea una estrella con posición, tamaño, opacidad y movimiento aleatorios.
     * @returns {{x:number,y:number,r:number,alpha:number,dx:number,dy:number,dAlpha:number}}
     */
    function randomStar() {
        return {
            x: Math.random() * sw,
            y: Math.random() * sh,
            r: Math.random() * 1.2 + 0.2,
            alpha: Math.random(),
            dx: (Math.random() - 0.5) * 0.2,
            dy: (Math.random() - 0.5) * 0.2,
            dAlpha: (Math.random() - 0.5) * 0.02
        };
    }

    /** Array de estrellas del fondo. */
    let starsArr = Array.from({ length: 127 }, randomStar);

    /**
     * Dibuja y actualiza el fondo animado de estrellas.
     */
    function drawStars() {
        starsCtx.clearRect(0, 0, sw, sh);

        for (const s of starsArr) {
            starsCtx.beginPath();
            starsCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            starsCtx.fillStyle = `rgba(255,255,255,${clamp(
                Math.abs(s.alpha),
                0.05,
                1
            )})`;
            starsCtx.shadowColor = '#fff';
            starsCtx.shadowBlur = 8;
            starsCtx.fill();

            // Movimiento suave y efecto de parpadeo
            s.x += s.dx;
            s.y += s.dy;
            s.alpha += s.dAlpha;

            if (s.alpha < 0.05 || s.alpha > 1) {
                s.dAlpha *= -1;
            }

            // Si se sale de pantalla, se regenera en otra posición
            if (s.x < 0 || s.x > sw || s.y < 0 || s.y > sh) {
                Object.assign(s, randomStar());
            }
        }

        requestAnimationFrame(drawStars);
    }

    // Iniciar animación del fondo
    drawStars();

    /* =============================================
       Partículas (explosiones de proyectiles)
       ============================================= */

    /**
     * Crea un pequeño grupo de partículas en la posición indicada.
     *
     * @param {number} px - Posición X origen.
     * @param {number} py - Posición Y origen.
     */
    function spawnProjectileParticles(px, py) {
        for (let i = 0; i < 20; i++) {
            particles.push({
                x: px,
                y: py,
                dx: (Math.random() - 0.5) * 8,
                dy: (Math.random() - 0.5) * 8,
                r: Math.random() * 4 + 1,
                color: generarColorHslAleatorio(),
                life: 50
            });
        }
    }

    /**
     * Dibuja y actualiza todas las partículas activas.
     *
     * @param {CanvasRenderingContext2D} [localCtx=ctx] - Contexto donde dibujar.
     */
    function drawParticles(localCtx = ctx) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            p.x += p.dx;
            p.y += p.dy;
            p.life--;

            localCtx.beginPath();
            localCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            localCtx.fillStyle = p.color;
            localCtx.shadowBlur = 15;
            localCtx.shadowColor = p.color;
            localCtx.fill();

            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    /* =============================================
       Proyectiles
       ============================================= */

    /**
     * Genera un nuevo proyectil en un borde al azar apuntando al jugador
     * (con algo de aleatoriedad extra en modo destrucción).
     */
    function spawnProjectile() {
        if (!playing) return;

        const side = Math.floor(Math.random() * 4);
        let x, y;

        // Elegir borde de aparición
        if (side === 0) {
            x = Math.random() * canvas.width;
            y = -30;
        } else if (side === 1) {
            x = canvas.width + 30;
            y = Math.random() * canvas.height;
        } else if (side === 2) {
            x = Math.random() * canvas.width;
            y = canvas.height + 30;
        } else {
            x = -30;
            y = Math.random() * canvas.height;
        }

        // Ángulo hacia el jugador
        let angle = Math.atan2(player.y - y, player.x - x);

        // En destrucción añadimos ruido al ángulo para hacerlo menos predecible
        if (gameMode === 'destruccion') {
            angle += Math.random() * (0.65 - 0.1) + 0.1;
        }

        projectiles.push({
            x,
            y,
            vx: Math.cos(angle) * projectileSpeed,
            vy: Math.sin(angle) * projectileSpeed,
            r: Math.random() * 11 + 14,
            color: generarColorHslAleatorio()
        });

        // Programar el siguiente spawn con un intervalo ligeramente aleatorio
        const t = Math.random() * spawnTime + spawnTime;
        if (playing) {
            setRegTimeout(spawnProjectile, t);
        }
    }

    /**
     * Dibuja y actualiza todos los proyectiles (trayectoria, colisiones, puntuación).
     */
    function drawProjectiles() {
        // Efecto de "trail" ligero para las estelas
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#05050a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];

            // Movimiento
            p.x += p.vx;
            p.y += p.vy;

            // Dibujo
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 20;
            ctx.shadowColor = p.color;
            ctx.fill();

            const dx = p.x - player.x;
            const dy = p.y - player.y;

            // Colisión con el jugador
            if (Math.hypot(dx, dy) < p.r + player.r) {
                spawnProjectileParticles(p.x, p.y);

                if (gameMode === 'destruccion') {
                    // Puntuación por impacto en destrucción
                    const points = multiplierEffectActive ? 2 : 1;
                    score += points;

                    // Bonus de tiempo cada cierto número de puntos
                    destructionBonusCounter += points;
                    while (destructionBonusCounter >= PUNTOS_PARA_BONUS_TIEMPO) {
                        destructionBonusCounter -= PUNTOS_PARA_BONUS_TIEMPO;
                        destructionTimeLeft += SEGUNDOS_BONUS;
                    }

                    // Aumentar velocidad hasta un máximo
                    if (projectileSpeed < 30) {
                        projectileSpeed += 0.035 * points;
                    }

                    // Reducir tiempo entre spawns hasta un mínimo
                    if (spawnTime > 200) {
                        spawnTime -= 0.65 * points;
                    }

                    ui.scoreEl.innerText = 'Puntos: ' + score;

                    // Actualizar récord de destrucción si se supera
                    if (score > record) {
                        if (gameMode === 'destruccion') {
                            setRecordDestruccion(score);
                        }
                        record = score;
                        actualizarTextoRecord();
                    }

                    projectiles.splice(i, 1);
                    updateProgressBar();
                    continue;
                }

                // Modo Huida: primero intentamos consumir escudo
                if (shieldEffectActive) {
                    // Escudo consumido
                    shieldEffectActive = false;
                    shield.active = false;
                    clearRegTimeout(shieldEffectTimeoutId);
                    shieldEffectTimeoutId = null;
                    projectiles.splice(i, 1);
                    continue;
                } else {
                    // Sin escudo: fin de la partida
                    endGame();
                    projectiles.splice(i, 1);
                    continue;
                }
            }

            // Proyectil sale de la pantalla
            if (
                p.x < -50 ||
                p.x > canvas.width + 50 ||
                p.y < -50 ||
                p.y > canvas.height + 50
            ) {
                spawnProjectileParticles(p.x, p.y);
                projectiles.splice(i, 1);

                if (gameMode === 'huida') {
                    const points = multiplierEffectActive ? 2 : 1;
                    score += points;

                    // Aumentar velocidad hasta un máximo
                    if (projectileSpeed < 30) {
                        projectileSpeed += 0.075;
                    }

                    // Reducir tiempo entre spawns hasta un mínimo
                    if (spawnTime > 200) {
                        spawnTime -= 0.5;
                    }

                    ui.scoreEl.innerText = 'Puntos: ' + score;

                    // Actualizar récord de huida si se supera
                    if (score > record) {
                        setRecordHuida(score);
                        record = recordHuida;
                        actualizarTextoRecord();
                    }

                    updateProgressBar();
                }
            }
        }
    }

    /* =============================================
       Barra de progreso (modo huida / destrucción)
       ============================================= */

    /**
     * Actualiza el aspecto de la barra de progreso.
     * - En destrucción: porcentaje de tiempo restante.
     * - En huida: porcentaje respecto al récord actual.
     */
    function updateProgressBar() {
        if (!ui.progressBar) return;

        if (gameMode === 'destruccion') {
            const ratio = destructionTimeLeft / destructionTotalTime;
            const percent = ratio * 100;

            ui.progressBar.style.width = percent + '%';
            ui.progressText.textContent = destructionTimeLeft.toFixed(1) + 's';

            // Cambiar color si se ha igualado/superado récord
            if (score >= recordDestruccion) {
                ui.progressBar.style.background =
                    'linear-gradient(90deg, #ff595e 60%, #be1e2d 100%)';
                ui.progressBar.style.boxShadow = '0 0 12px #ff595e99';
            } else {
                ui.progressBar.style.background =
                    'linear-gradient(90deg,#00eaff 60%,#00b6c9 100%)';
                ui.progressBar.style.boxShadow =
                    '0 0 12px var(--neon-alpha-1)';
            }
        } else {
            const rec = Math.max(1, recordHuida);
            const percent = (Math.min(score, rec) / rec) * 100;

            ui.progressBar.style.width = percent + '%';

            if (score >= recordHuida) {
                ui.progressBar.style.background =
                    'linear-gradient(90deg, #ff595e 60%, #be1e2d 100%)';
                ui.progressBar.style.boxShadow = '0 0 12px #ff595e99';
            } else {
                ui.progressBar.style.background =
                    'linear-gradient(90deg,#00eaff 60%,#00b6c9 100%)';
                ui.progressBar.style.boxShadow =
                    '0 0 12px var(--neon-alpha-1)';
            }
        }
    }

    /* =============================================
       Temporizador de modo destrucción
       ============================================= */

    /**
     * Inicia el temporizador de modo destrucción.
     * Decrementa el tiempo cada 100 ms y termina la partida al llegar a 0.
     */
    function iniciarTemporizadorDestruccion() {
        destructionTimeLeft = destructionTotalTime;
        updateProgressBar();

        if (destructionIntervalId) {
            clearRegInterval(destructionIntervalId);
        }

        destructionIntervalId = setRegInterval(() => {
            if (!playing) return;

            destructionTimeLeft = Number(
                (destructionTimeLeft - 0.1).toFixed(1)
            );

            if (destructionTimeLeft <= 0) {
                destructionTimeLeft = 0;
                updateProgressBar();
                clearRegInterval(destructionIntervalId);
                destructionIntervalId = null;
                endGame();
                return;
            }

            updateProgressBar();
        }, 100);
    }

    /* =============================================
       Power‑up: multiplicador x2 de puntos
       ============================================= */

    /**
     * Genera el power‑up de multiplicador x2 en una posición aleatoria.
     * Solo aparece si no hay otro multiplicador visible ni activo.
     */
    function spawnMultiplier() {
        if (multiplier.show || multiplierEffectActive || !playing) return;

        multiplier.x = Math.random() * (canvas.width - 100) + 50;
        multiplier.y = Math.random() * (canvas.height - 100) + 50;
        multiplier.show = true;

        clearRegTimeout(multiplier.timer);
        multiplier.timer = setRegTimeout(() => {
            multiplier.show = false;
            multiplier.timer = null;
        }, 4000);
    }

    /**
     * Dibuja el icono del multiplicador x2.
     */
    function drawMultiplier() {
        if (!multiplier.show) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(multiplier.x, multiplier.y, multiplier.r, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#fff700';
        ctx.stroke();

        ctx.font = "bold 32px 'Orbitron', Arial";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff700';
        ctx.globalAlpha = 0.85;
        ctx.fillText('x2', multiplier.x, multiplier.y);
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    /**
     * Detecta colisión entre el jugador y el multiplicador x2.
     * Si lo recoge, activa el efecto durante 5 segundos.
     */
    function checkMultiplierCollision() {
        if (!multiplier.show) return;

        const dx = player.x - multiplier.x;
        const dy = player.y - multiplier.y;

        if (Math.hypot(dx, dy) < player.r + multiplier.r) {
            multiplier.show = false;
            clearRegTimeout(multiplier.timer);
            multiplier.timer = null;

            multiplierEffectActive = true;
            multiplier.active = true;

            clearRegTimeout(multiplierEffectTimeoutId);
            multiplierEffectTimeoutId = setRegTimeout(() => {
                multiplierEffectActive = false;
                multiplier.active = false;
                multiplierEffectTimeoutId = null;
            }, 5000);
        }
    }

    /**
     * Programa apariciones periódicas del multiplicador x2 mientras se está jugando.
     */
    function scheduleMultiplier() {
        if (!playing) return;

        setRegTimeout(() => {
            if (playing && !multiplierEffectActive) {
                spawnMultiplier();
            }
            scheduleMultiplier();
        }, 20000 + Math.random() * 15000);
    }

    /* =============================================
       Power‑up: escudo (solo modo huida)
       ============================================= */

    /**
     * Genera el power‑up de escudo en una posición aleatoria
     * (no aparece en modo destrucción).
     */
    function spawnShield() {
        if (gameMode === 'destruccion') return;
        if (shield.show || shieldEffectActive || !playing) return;

        shield.x = Math.random() * (canvas.width - 100) + 50;
        shield.y = Math.random() * (canvas.height - 100) + 50;
        shield.show = true;

        clearRegTimeout(shield.timer);
        shield.timer = setRegTimeout(() => {
            shield.show = false;
            shield.timer = null;
        }, 6000);
    }

    /**
     * Dibuja el power‑up de escudo usando el símbolo actual de la skin.
     */
    function drawShieldPowerup() {
        if (!shield.show) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(shield.x, shield.y, shield.r, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00eaff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00eaff';
        ctx.stroke();

        ctx.font = "38px 'Press Start 2P', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#00eaff';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00eaff';
        ctx.strokeText(currentSkin.type, shield.x, shield.y);

        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#00eaff';
        ctx.fillText(currentSkin.type, shield.x, shield.y);
        ctx.globalAlpha = 1;

        ctx.restore();
        ctx.restore();
    }

    /**
     * Detecta colisión entre el jugador y el escudo y activa el efecto.
     */
    function checkShieldCollision() {
        if (!shield.show) return;

        const dx = player.x - shield.x;
        const dy = player.y - shield.y;

        if (Math.hypot(dx, dy) < player.r + shield.r) {
            shield.show = false;
            clearRegTimeout(shield.timer);
            shield.timer = null;

            shieldEffectActive = true;
            shield.active = true;

            clearRegTimeout(shieldEffectTimeoutId);
            // La desactivación se controla al consumir el escudo en una colisión
        }
    }

    /**
     * Programa apariciones periódicas del escudo mientras se está jugando
     * (solo en modo Huida).
     */
    function scheduleShield() {
        if (!playing) return;

        setRegTimeout(() => {
            if (playing && !shieldEffectActive) {
                spawnShield();
            }
            scheduleShield();
        }, 25000 + Math.random() * 20000);
    }

    /* =============================================
       Power‑up: +10s (solo destrucción)
       ============================================= */

    /**
     * Genera el power‑up de +10 segundos para el modo destrucción.
     */
    function spawnTimeBonus() {
        if (
            timeBonus.show ||
            timeBonusEffectActive ||
            !playing ||
            gameMode !== 'destruccion'
        ) {
            return;
        }

        timeBonus.x = Math.random() * (canvas.width - 100) + 50;
        timeBonus.y = Math.random() * (canvas.height - 100) + 50;
        timeBonus.show = true;

        clearRegTimeout(timeBonus.timer);
        timeBonus.timer = setRegTimeout(() => {
            timeBonus.show = false;
            timeBonus.timer = null;
        }, 4000);
    }

    /**
     * Dibuja el icono de +10s en pantalla.
     */
    function drawTimeBonus() {
        if (!timeBonus.show) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(timeBonus.x, timeBonus.y, timeBonus.r, 0, Math.PI * 2);
        ctx.strokeStyle = '#3bc4ff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#3bc4ff';
        ctx.stroke();

        ctx.font = "bold 28px 'Orbitron', Arial";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#3bc4ff';
        ctx.globalAlpha = 0.85;
        ctx.fillText('+10s', timeBonus.x, timeBonus.y);
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    /**
     * Comprueba si el jugador recoge el +10s y, en ese caso,
     * añade tiempo y activa un pequeño efecto visual.
     */
    function checkTimeBonusCollision() {
        if (!timeBonus.show) return;

        const dx = player.x - timeBonus.x;
        const dy = player.y - timeBonus.y;

        if (Math.hypot(dx, dy) < player.r + timeBonus.r) {
            // Ocultar power‑up
            timeBonus.show = false;
            clearRegTimeout(timeBonus.timer);
            timeBonus.timer = null;

            // Activar efecto
            timeBonusEffectActive = true;
            timeBonus.active = true;

            if (gameMode === 'destruccion') {
                destructionTimeLeft += 10;
            }

            // Efecto visual corto (0.5s) para indicar recogida
            clearRegTimeout(timeBonusEffectTimeoutId);
            timeBonusEffectTimeoutId = setRegTimeout(() => {
                timeBonusEffectActive = false;
                timeBonus.active = false;
                timeBonusEffectTimeoutId = null;
            }, 500);
        }
    }

    /**
     * Programa apariciones periódicas del power‑up de +10s
     * mientras se está en modo destrucción.
     */
    function scheduleTimeBonus() {
        if (!playing) return;

        setRegTimeout(() => {
            if (playing && !timeBonusEffectActive && gameMode === 'destruccion') {
                spawnTimeBonus();
            }
            scheduleTimeBonus();
        }, 17500 + Math.random() * 17500);
    }

    /* =============================================
       Jugador
       ============================================= */

    /**
     * Estado del jugador (posición, radio y ángulo de rotación).
     * @type {{x:number,y:number,r:number,angle:number}}
     */
    let player = { x: sw / 2, y: sh / 2, r: 25, angle: 0 };

    /**
     * Dibuja el jugador en su posición actual con la skin seleccionada
     * y los efectos de escudo / multiplicador si están activos.
     */
    function drawPlayer() {
        // Velocidad de giro mayor si hay multiplicador activo
        player.angle += multiplierEffectActive ? 0.3 : 0.12;

        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);

        // Efecto de escudo
        if (shieldEffectActive) {
            ctx.save();
            ctx.font = skinsGrandes.includes(currentSkin.type)
                ? "90px 'Press Start 2P', monospace"
                : "130px 'Press Start 2P', monospace";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#00eaff';
            ctx.lineWidth = 5;
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#00eaff';
            ctx.strokeText(currentSkin.type, 0, 0);

            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#00eaff';
            ctx.fillText(currentSkin.type, 0, 0);
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Color normal o pulsante si está activo el multiplicador
        let strokeColor = currentSkin.color;
        if (multiplierEffectActive) {
            // Oscilación de brillo para efecto pulsante
            const pulse = (Math.sin(Date.now() * 0.01) + 1) / 2; // [0,1]
            strokeColor = `rgba(255, 235, 59, ${0.5 + 0.5 * pulse})`;
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = strokeColor;

        ctx.font = skinsGrandes.includes(currentSkin.type)
            ? "70px 'Press Start 2P', monospace"
            : "100px 'Press Start 2P', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(currentSkin.type, 0, 0);

        ctx.globalAlpha = 0.15;
        ctx.fillStyle = currentSkin.color;
        ctx.fillText(currentSkin.type, 0, 0);
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    /* =============================================
       Bucle principal de renderizado
       ============================================= */

    /**
     * Bucle principal del juego:
     * limpia el canvas, dibuja elementos y comprueba colisiones.
     */
    function update() {
        if (!playing) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawPlayer();
        drawProjectiles();
        drawParticles();
        drawMultiplier();
        drawShieldPowerup();
        drawTimeBonus();

        checkMultiplierCollision();
        checkShieldCollision();
        checkTimeBonusCollision();

        rafId = requestAnimationFrame(update);
    }

    /* =============================================
       Fin de partida y limpieza
       ============================================= */

    /**
     * Termina la partida actual, muestra la pantalla de Game Over,
     * limpia timers y sincroniza tiempo jugado y récords con el servidor.
     */
    function endGame() {
        // Parar temporizador de destrucción y timers de modo
        if (destructionIntervalId) {
            clearRegInterval(destructionIntervalId);
            destructionIntervalId = null;
        }
        if (modeTimerId) {
            clearRegTimeout(modeTimerId);
            modeTimerId = null;
        }

        if (godMode) {
            // En godMode se ignora el fin de partida
            return;
        }

        playing = false;

        ui.gameOverEl.style.display = 'block';
        ui.gameOverEl.setAttribute('aria-hidden', 'false');
        htmlRoot.style.cursor = 'auto';

        // Limpiar todos los timeouts/intervalos registrados
        clearAllTimers();

        // Calcular tiempo jugado en esta sesión y guardarlo
        let elapsedSec = 0;
        if (sessionStart) {
            elapsedSec = Math.max(
                0,
                Math.floor((Date.now() - sessionStart) / 1000)
            );

            // Actualizar contador acumulado local
            const prev = parseInt(
                localStorage.getItem('neonSpinnerPlayTime') || '0',
                10
            );
            localStorage.setItem(
                'neonSpinnerPlayTime',
                String(prev + elapsedSec)
            );

            sessionStart = null;
        }

        // Sincronizar récords y tiempo jugado con el servidor si hay sesión
        if (sessionUser) {
            api('save_records.php', 'POST', {
                recordHuida,
                recordDestruccion,
                playTime: elapsedSec
            });
            setTimeout(loadLeaderboardTables, 250);
        }
    }
    /* =============================================
       Input de teclado y ratón
       ============================================= */

    /**
     * Manejo de teclas global (recarga, devMode, godMode, cheats, skins secretas).
     */
    document.addEventListener('keydown', (e) => {
        // Recargar la página con Escape
        if (e.key === 'Escape') {
            location.reload();
            console.log('Página recargada');
        }

        // Activar el devMode con Tab + K
        if (e.key === 'Tab') {
            const onNextKey = (ev) => {
                if (ev.key === 'k' || ev.key === 'K') {
                    devMode = !devMode;
                    console.log('Dev Mode:', devMode ? 'ON' : 'OFF');
                }
                document.removeEventListener('keydown', onNextKey);
            };
            document.addEventListener('keydown', onNextKey);
        }

        // God Mode con devMode + G
        if (devMode && (e.key === 'g' || e.key === 'G')) {
            godMode = !godMode;
            console.log('God Mode:', godMode ? 'ON' : 'OFF');
        }

        // Activar/desactivar multiplicador con devMode + A
        if (devMode && (e.key === 'a' || e.key === 'A')) {
            multiplierEffectActive = !multiplierEffectActive;
            console.log(
                'multiplierEffectActive:',
                multiplierEffectActive ? 'ON' : 'OFF'
            );
        }

        // Activar/desactivar escudo con devMode + S
        if (devMode && (e.key === 's' || e.key === 'S')) {
            shieldEffectActive = !shieldEffectActive;
            console.log(
                'shieldEffectActive:',
                shieldEffectActive ? 'ON' : 'OFF'
            );
        }

        // Añadir +10s a destrucción con devMode + D
        if (devMode && (e.key === 'd' || e.key === 'D')) {
            destructionTimeLeft += 10;
            updateProgressBar();
            console.log('Destruction time increased by 10s');
        }

        // Activar skins secretas con L en la pestaña de inventario
        if (
            ui.inventoryModal.style.display === 'block' &&
            !skinsSecretasActivas &&
            (e.key === 'l' || e.key === 'L')
        ) {
            skinsSecretasActivas = true;

            const skinsSecretas = ['卐', 'Σ', '☭'].map((type) => ({
                type,
                color: generarColorHslAleatorio()
            }));

            playerSkins.push(...skinsSecretas);
            updateInventoryView();
            console.log('Skins secretas: ON');
        }
    });

    /**
     * Movimiento del jugador siguiendo el ratón cuando se está jugando.
     */
    document.addEventListener('mousemove', (e) => {
        if (!playing) return;
        player.x = e.clientX;
        player.y = e.clientY;
    });

    /* =============================================
       Inicio / reinicio de partida
       ============================================= */

    /**
     * Reinicia todo el estado de la partida y arranca el bucle principal.
     * Respeta el modo actual (huida / destrucción).
     */
    function iniciarPartida() {
        // Cancelar bucle de render anterior
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        // Limpiar todos los timers activos (spawn, power‑ups, etc.)
        clearAllTimers();

        // Reset de estado base
        score = 0;
        projectileSpeed = initialSpeed;
        projectiles = [];
        particles = [];
        player = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            r: 25,
            angle: 0
        };

        ui.scoreEl.innerText = 'Puntos: 0';
        ui.gameOverEl.style.display = 'none';
        htmlRoot.style.cursor = 'none';

        ui.scoreEl.style.display = 'inline';
        ui.recordEl.style.display = 'inline';
        ui.mainMenu.style.display = 'none';
        ui.menuLeaderboardBtn.style.display = 'none';
        ui.usernameDisplay.style.display = 'none';

        playing = true;

        // Reset de power‑ups
        multiplier.show = false;
        multiplier.active = false;
        multiplierEffectActive = false;

        shield.show = false;
        shield.active = false;
        shieldEffectActive = false;

        multiplier.timer = null;
        multiplierEffectTimeoutId = null;
        shield.timer = null;
        shieldEffectTimeoutId = null;

        if (modeTimerId) {
            clearRegTimeout(modeTimerId);
            modeTimerId = null;
        }

        actualizarTextoRecord();
        updateProgressBar();

        // Empezar a spawnear proyectiles y power‑ups
        spawnProjectile();
        scheduleMultiplier();

        if (gameMode === 'huida') {
            scheduleShield();
            updateProgressBar();
        } else {
            // Modo destrucción: temporizador y +10s
            iniciarTemporizadorDestruccion();
            scheduleTimeBonus();
        }

        // Nuevo inicio de sesión de juego (para estadísticas de tiempo)
        sessionStart = Date.now();

        // Lanzar el bucle principal
        update();
    }

    /* =============================================
       Botones principales (modo huida / destrucción / retry / back)
       ============================================= */

    // Nota: los botones de jugar ya están protegidos por canStartGame
    // en la parte superior del script; aquí solo forzamos el modo.

    if (ui.playHuida) {
        ui.playHuida.addEventListener(
            'click',
            () => {
                gameMode = 'huida';
                // el listener superior llamará a iniciarPartida()
            },
            { passive: true }
        );
    }

    if (ui.playDestructionBtn) {
        ui.playDestructionBtn.addEventListener(
            'click',
            () => {
                gameMode = 'destruccion';
                // el listener superior llamará a iniciarPartida()
            },
            { passive: true }
        );
    }

    if (ui.retryBtn) {
        ui.retryBtn.addEventListener(
            'click',
            () => iniciarPartida(),
            { passive: true }
        );
    }

    if (ui.backMenuBtn) {
        ui.backMenuBtn.addEventListener(
            'click',
            () => location.reload(),
            { passive: true }
        );
    }

    /* =============================================
       Inventario y skins
       ============================================= */

    /**
     * Crea un pequeño canvas con un símbolo y color dados,
     * usado como icono de skin.
     *
     * @param {string} symbol - Símbolo a dibujar.
     * @param {string} color - Color del símbolo.
     * @param {number} [size=56] - Tamaño del canvas.
     * @returns {HTMLCanvasElement}
     */
    function createIconCanvas(symbol, color, size = 56) {
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
     * Rellena la lista de skins en el panel de inventario.
     */
    function renderSkinsList() {
        if (!ui.skinsList) return;
        ui.skinsList.innerHTML = '';

        playerSkins.forEach((skin) => {
            const item = document.createElement('div');
            item.className = 'skin-item';

            // Marcar si es la seleccionada
            if (skin.type === currentSkin.type) {
                item.classList.add('selected');
            }

            const canvasIcon = createIconCanvas(skin.type, skin.color);
            item.appendChild(canvasIcon);

            item.addEventListener('click', () => {
                currentSkin = skin;
                updateInventoryView();
                saveEquippedSkin(); // Guardar cambios
            });

            ui.skinsList.appendChild(item);
        });
    }

    /**
     * Actualiza la vista del inventario (lista + vista grande + nombre/color).
     */
    function updateInventoryView() {
        if (!ui.skinsList || !ui.bigSkinView) return;

        renderSkinsList();

        ui.bigSkinView.innerHTML = '';
        const bigCanvas = createIconCanvas(
            currentSkin.type,
            currentSkin.color,
            250
        );
        ui.bigSkinView.appendChild(bigCanvas);

        if (ui.skinName) {
            ui.skinName.textContent = currentSkin.type;
        }

        if (ui.colorPicker) {
            ui.colorPicker.value = currentSkin.color;
            // Asegurar que el listener solo se añada una vez o usar onchange
            ui.colorPicker.onchange = (e) => {
                currentSkin.color = e.target.value;
                updateInventoryView();
                saveEquippedSkin();
            };
        }
    }

    /**
     * Muestra la pestaña indicada del inventario ('skins' o 'color').
     *
     * @param {'skins'|'color'} tab
     */
    function showTab(tab) {
        currentInventoryTab = tab;

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

    ui.tabSkins.addEventListener(
        'click',
        () => showTab('skins'),
        { passive: true }
    );
    ui.tabColor.addEventListener(
        'click',
        () => showTab('color'),
        { passive: true }
    );

    ui.inventoryBtn.addEventListener(
        'click',
        () => {
            ui.inventoryModal.style.display = 'block';
            updateInventoryView();
            showTab('skins');
        },
        { passive: true }
    );

    ui.closeInventoryBtn.addEventListener(
        'click',
        () => {
            ui.inventoryModal.style.display = 'none';
        },
        { passive: true }
    );

    if (ui.colorPicker) {
        ui.colorPicker.addEventListener('input', (e) => {
            if (currentInventoryTab !== 'color') return;
            currentSkin.color = e.target.value;
            updateInventoryView();
        });
    }

    ui.changeSkinBtn.addEventListener(
        'click',
        () => {
            let newSkin;
            do {
                newSkin =
                    playerSkins[
                    Math.floor(Math.random() * playerSkins.length)
                    ];
            } while (newSkin === currentSkin && playerSkins.length > 1);

            currentSkin = newSkin;
            updateInventoryView();
        },
        { passive: true }
    );

    /* =============================================
       FPS, música y visibilidad de botones
       ============================================= */

    // FPS ticker
    (function fpsTicker() {
        let last = performance.now();
        let frames = 0;

        function tick(now) {
            frames++;
            if (now - last >= 1000) {
                ui.FPS.textContent =
                    (frames / ((now - last) / 1000)).toFixed(2) + ' FPS';
                frames = 0;
                last = now;
            }
            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    })();

    // Cursor y auto‑play de música (en el primer click del usuario)
    htmlRoot.style.cursor = 'auto';
    const bgmusic = ui.bgmusic;

    function tryPlayMusic() {
        if (bgmusic && bgmusic.paused) {
            bgmusic.play().catch(() => { });
        }
        document.removeEventListener('click', tryPlayMusic);
    }

    document.addEventListener('click', tryPlayMusic, { passive: true });

    // Mostrar/ocultar botón de versiones y reset según estado del menú principal
    const mo = new MutationObserver(() => {
        const menuVisible =
            window.getComputedStyle(ui.mainMenu).display !== 'none';

        if (menuVisible) {
            ui.versionsBtn.style.display = 'block';
            if (ui.resetBtn) ui.resetBtn.style.display = 'block';
        } else {
            ui.versionsBtn.style.display = 'none';
            if (ui.resetBtn) ui.resetBtn.style.display = 'none';
            ui.versionsMenu.style.display = 'none';
            ui.versionsMenu.setAttribute('aria-hidden', 'true');
            ui.versionsBtn.setAttribute('aria-expanded', 'false');
        }
    });

    mo.observe(ui.mainMenu, { attributes: true, attributeFilter: ['style'] });

    // Valores iniciales
    updateInventoryView();
    actualizarTextoRecord();

    {
        const menuVisible =
            window.getComputedStyle(ui.mainMenu).display !== 'none';
        if (!menuVisible) {
            ui.versionsBtn.style.display = 'none';
            if (ui.resetBtn) ui.resetBtn.style.display = 'none';
        }
    }

    // El botón de reset ya se gestiona arriba (sin duplicar listeners aquí)

    // CIERRE FINAL del DOMContentLoaded
});
