/**
 * Servicio de comunicación con el backend (API).
 */

import { USE_FAKE_SERVER } from '../core/constantes.js';

/* =============================================
   BASE DE DATOS FALSA (FAKE SERVER)
   ============================================= */

/**
 * Inicializa la base de datos falsa si no existe.
 */
if (USE_FAKE_SERVER && !localStorage.getItem('FAKE_DB')) {
    const fakeDB = {
        users: {
            ana: {
                pass: btoa('1234'),
                recordHuida: 45,
                recordDestruccion: 28,
                unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣',
                equipped_skin: JSON.stringify({ type: '★', color: 'hsl(60,100%,50%)' }),
                total_play_time: 360,
                has_premium: false,
                xp: 0
            },
            luis: {
                pass: btoa('1111'),
                recordHuida: 12,
                recordDestruccion: 52,
                unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣',
                equipped_skin: JSON.stringify({ type: '💣', color: 'hsl(0,100%,60%)' }),
                total_play_time: 540,
                has_premium: true,
                xp: 15000
            },
            mario: {
                pass: btoa('0000'),
                recordHuida: 67,
                recordDestruccion: 15,
                unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣',
                equipped_skin: JSON.stringify({ type: '⚽', color: 'hsl(120,80%,50%)' }),
                total_play_time: 720,
                has_premium: true,
                xp: 500
            },
            laura: {
                pass: btoa('abcd'),
                recordHuida: 34,
                recordDestruccion: 41,
                unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣',
                equipped_skin: JSON.stringify({ type: '●', color: 'hsl(280,90%,60%)' }),
                total_play_time: 420,
                has_premium: false,
                xp: 600
            },
            carlos: {
                pass: btoa('pass'),
                recordHuida: 58,
                recordDestruccion: 8,
                unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣',
                equipped_skin: JSON.stringify({ type: 'ᛉ', color: 'hsl(200,70%,50%)' }),
                total_play_time: 600,
                has_premium: false,
                xp: 40
            },
            sofia: {
                pass: btoa('qwerty'),
                recordHuida: 23,
                recordDestruccion: 38,
                unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣',
                equipped_skin: JSON.stringify({ type: '♠', color: 'hsl(320,85%,55%)' }),
                total_play_time: 280,
                has_premium: false,
                xp: 100
            },
            david: {
                pass: btoa('zxcv'),
                recordHuida: 41,
                recordDestruccion: 31,
                unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣',
                equipped_skin: JSON.stringify({ type: '67', color: 'hsl(40,95%,50%)' }),
                total_play_time: 480,
                has_premium: false,
                xp: 200
            },
            juan: {
                pass: btoa('asdf'),
                recordHuida: 5,
                recordDestruccion: 3,
                unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣',
                equipped_skin: JSON.stringify({ type: 'X', color: 'hsl(0,100%,50%)' }),
                total_play_time: 600,
                has_premium: false,
                xp: 300
            },
            val: {
                pass: btoa('123'),
                recordHuida: 100,
                recordDestruccion: 100,
                unlocked_skins: 'X,●,♠,★,ᛉ,⚙,67,⚽,💣',
                equipped_skin: JSON.stringify({ type: '67', color: 'hsl(40,95%,50%)' }),
                total_play_time: 1500,
                has_premium: true,
                xp: 15000
            }
        },
        session: null
    };
    localStorage.setItem('FAKE_DB', JSON.stringify(fakeDB));
}

/**
 * Lee la base de datos falsa.
 * @returns {Object} DB.
 */
function readDB() {
    return JSON.parse(localStorage.getItem('FAKE_DB'));
}

/**
 * Escribe la base de datos falsa.
 * @param {Object} db - DB a guardar.
 */
function writeDB(db) {
    localStorage.setItem('FAKE_DB', JSON.stringify(db));
}

/**
 * Realiza una petición a la API.
 * @param {string} path - Endpoint.
 * @param {string} [method='GET'] - Método HTTP.
 * @param {Object|null} [body=null] - Datos a enviar.
 * @returns {Promise<Object>} Respuesta normalizada.
 */
export async function api(path, method = 'GET', body = null) {
    // --- MODO LOCAL (FAKE SERVER) ---
    if (USE_FAKE_SERVER) {
        const db = readDB();

        // REGISTER
        if (path === 'register.php') {
            const { username, password } = body;
            if (db.users[username]) {
                return { ok: false, status: 400, data: { error: 'user_exists' } };
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
            if (!db.users[username] || atob(db.users[username].pass) !== password) {
                return { ok: false, status: 401, data: { error: 'wrong_credentials' } };
            }
            db.session = username;
            writeDB(db);
            return { ok: true, status: 200, data: { ok: true, username } };
        }

        // LOGOUT
        if (path === 'logout.php') {
            db.session = null;
            writeDB(db);
            return { ok: true, status: 200 };
        }

        // GET USER
        if (path === 'get_user.php') {
            if (!db.session) return { ok: true, status: 200, data: { logged: false } };

            const u = db.users[db.session];

            // Simular lógica de ranking
            let rankSkins = [];
            const allUsers = Object.values(db.users);

            const topHuida = allUsers.sort((a, b) => b.recordHuida - a.recordHuida).slice(0, 3);
            if (topHuida.includes(u)) {
                const pos = topHuida.indexOf(u);
                if (pos <= 2) rankSkins.push('#');
                if (pos <= 1) rankSkins.push('⚵');
                if (pos === 0) rankSkins.push('💥');
            }

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
                ok: true, status: 200,
                data: {
                    logged: true,
                    user: {
                        username: db.session,
                        recordHuida: u.recordHuida,
                        recordDestruccion: u.recordDestruccion,
                        unlocked_skins: finalUnlocked,
                        equipped_skin: u.equipped_skin,
                        xp: u.xp || 0,
                        has_premium: u.has_premium || false
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

        // UNLOCK SKIN
        if (path === 'unlock_skin.php') {
            if (!db.session) return { ok: false, status: 401 };
            const u = db.users[db.session];
            const skinType = body.skin_type;

            const current = (u.unlocked_skins || '').split(',').map(s => s.trim()).filter(s => s);
            if (!current.includes(skinType)) {
                current.push(skinType);
                u.unlocked_skins = current.join(',');
                writeDB(db);
            }
            return { ok: true, status: 200, data: { ok: true, unlocked: skinType } };
        }

        // SAVE RECORDS
        if (path === 'save_records.php') {
            if (!db.session) return { ok: false, status: 401 };
            const u = db.users[db.session];
            u.recordHuida = Math.max(u.recordHuida, body.recordHuida);
            u.recordDestruccion = Math.max(u.recordDestruccion, body.recordDestruccion);

            // XP Logic
            const score = body.score || 0;
            u.xp = (u.xp || 0) + score;

            writeDB(db);
            return { ok: true, status: 200, data: { ok: true, xp: u.xp } };
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

        return { ok: false, status: 404, data: { error: 'invalid_path' } };
    }

    // --- MODO ONLINE ---
    const opts = { method, credentials: 'same-origin' };
    if (body) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(body);
    }

    try {
        const res = await fetch(path, opts);
        if (!res.ok) {
            console.error(`API Error [${path}]:`, res.status, res.statusText);
            const text = await res.text();
            console.error('Response body:', text);
            return { ok: false, status: res.status, error: 'http_error', details: text };
        }
        const json = await res.json().catch(() => null);
        return { ok: res.ok, status: res.status, data: json };
    } catch (e) {
        console.error(`Network Error [${path}]:`, e);
        return { ok: false, error: 'network', details: e.message };
    }
}
