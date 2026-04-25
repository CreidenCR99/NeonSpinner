/**
 * Estado global del juego.
 * Se exporta como un objeto mutable para compartir estado entre módulos.
 */

import { INITIAL_SPEED } from './constantes.js';

export const state = {
    /** @type {string|null} Usuario de la sesión actual. */
    sessionUser: null,

    /** @type {number|null} Timestamp de inicio de sesión. */
    sessionStart: null,

    /** @type {number} Ancho de la pantalla (canvas). */
    width: 0,
    /** @type {number} Alto de la pantalla (canvas). */
    height: 0,

    /** @type {'huida'|'destruccion'} Modo de juego actual. */
    gameMode: 'huida',

    /** @type {number} Puntuación actual. */
    score: 0,

    /** @type {number} Récord modo Huida. */
    recordHuida: 0,

    /** @type {number} Récord modo Destrucción. */
    recordDestruccion: 0,

    /** @type {number} Récord actual visible. */
    record: 0,

    /** @type {number} Experiencia total del usuario. */
    xp: 0,

    /** @type {boolean} Si el usuario tiene el pase premium. */
    hasPremium: false,

    /** @type {number} Tiempo restante en modo destrucción. */
    destructionTimeLeft: 0,

    /** @type {number|null} ID del intervalo de destrucción. */
    destructionIntervalId: null,

    /** @type {number} Contador para bonus de tiempo. */
    destructionBonusCounter: 0,

    /** @type {boolean} Si la partida está en curso. */
    playing: false,

    /** @type {number} Velocidad actual de proyectiles. */
    projectileSpeed: INITIAL_SPEED,

    /** @type {number} Tiempo entre spawns (ms). */
    spawnTime: 300,

    /** @type {Array} Proyectiles activos. */
    projectiles: [],

    /** @type {Array} Partículas activas. */
    particles: [],

    /** @type {Object} Estado del multiplicador. */
    multiplier: {
        active: false,
        x: 0, y: 0, r: 28,
        show: false,
        timer: null
    },
    multiplierEffectActive: false,
    multiplierEffectTimeoutId: null,

    /** @type {Object} Estado del escudo. */
    shield: {
        active: false,
        x: 0, y: 0, r: 28,
        show: false,
        timer: null
    },
    shieldEffectActive: false,
    shieldEffectTimeoutId: null,

    /** @type {Object} Estado del bonus de tiempo. */
    timeBonus: {
        active: false,
        x: 0, y: 0, r: 28,
        show: false,
        timer: null
    },
    timeBonusEffectActive: false,
    timeBonusEffectTimeoutId: null,

    /** @type {Object} Jugador. */
    player: { x: 0, y: 0, r: 25, angle: 0 },

    /** @type {Array} Skins desbloqueadas. */
    playerSkins: [],

    /** @type {Object} Skin actual. */
    currentSkin: null,

    /** @type {boolean} Skins secretas activas. */
    skinsSecretasActivas: false,

    /** @type {'skins'|'color'} Pestaña de inventario. */
    currentInventoryTab: 'skins',

    /** @type {number} Página actual del inventario. */
    inventoryPage: 0,

    /** @type {boolean} Modo desarrollador. */
    devMode: false,

    /** @type {boolean} God mode. */
    godMode: false,

    /** @type {number|null} ID del requestAnimationFrame principal. */
    rafId: null,

    /** @type {number|null} Timer genérico de modo. */
    modeTimerId: null,

    // Factores de escala para traducir coordenadas del mouse
    /** @type {number} Factor de escala CSS en X. */
    scaleX: 1,
    /** @type {number} Factor de escala CSS en Y. */
    scaleY: 1,
    /** @type {number} Offset horizontal del canvas centrado. */
    offsetX: 0,
    /** @type {number} Offset vertical del canvas centrado. */
    offsetY: 0
};
