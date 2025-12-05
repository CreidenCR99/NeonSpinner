/**
 * Constantes globales del juego.
 */

/** Resolución fija del canvas del juego. */
export const GAME_WIDTH = 1912;
export const GAME_HEIGHT = 954;

/**
 * Indica si se está ejecutando en entorno local sin servidor PHP real.
 * @type {boolean}
 */
export const USE_FAKE_SERVER = false;
//    location.protocol === 'file:' ||
//    location.hostname === '127.0.0.1' ||
//    location.hostname === 'localhost';

export const versionsList = [
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

/** Modo mantenimiento. */
export const MANTENIMIENTO = false; // o false según necesites


/** Duración total del modo destrucción en segundos. */
export const DESTRUCTION_TOTAL_TIME = 30;

/** Puntos necesarios para obtener bonus de tiempo en modo destrucción. */
export const POINTS_FOR_TIME_BONUS = 10;

/** Segundos añadidos por cada bonus en modo destrucción. */
export const BONUS_SECONDS = 3;

/** Velocidad base de los proyectiles. */
export const INITIAL_SPEED = 15;

/** Tiempo base (ms) entre apariciones de proyectiles. */
export const SPAWN_TIME = 300;

/**
 * Catálogo completo de skins disponibles.
 * Se rellenará con colores aleatorios en tiempo de ejecución si es necesario,
 * pero aquí definimos los tipos base.
 */
export const SKIN_TYPES = [
    // Letras / Básicos
    'X', 'Y', 'I', '+',
    // Números / Especiales
    '67', '69', 'π', '∞', 
    // Geométricos simples
    '●', '◎', '△', '⟁',
    // Cartas y símbolos clásicos
    '◆', '♠', '♣', '♥',
    // Estrellas / Brillo / Decorativos
    '★', '✧', '✦', '✹', '✵', '𖣘', '⍟', '⌖',
    // Místicos / Religiosos / Ocultismo
    '⛥', '✟', '✠', 'ψ', 'Ω', '☯', '☬', '🧿',
    // Peligro / Biohazard
    '☢', '☣', '⌬',
    // Naturaleza / Elementos / Fenómenos
    '☄', '🌚', '🌞',
    // Runas
    'ᛉ', 'ᛟ',
    // Objetos / Ítems
    '⚙', '🗿',
    // Objetos reconocibles
    '💣', '📛', '🍀', '🎲', '💋',
    // Deportivos
    '⚽', '🏀', '🥎', '⚾️', '🏐', '🏈',
    // Comida
    '🍄', '🥘', '🥚', '🫒', '🥒',
    // Animales
    '🦊',
    // Navidad
    '🎄', '❄️', '🎁',
    // Halloween
    '🎃', '💀', '🕸️', '🕷️',
    // Leaderboard
    '#', '⚵', '💥'
];

/* Las skins sin asignar a nada son: +, 69, ⍟, ⌖, 🥎, 🥘, 🫒, 🦊, 🌚, 🌞
*  Las skins exclusivas son:    🎄, ❄️, 🎁
*                               🎃, 💀, 🕸️, 🕷️
*/


/** Skins desbloqueadas por defecto. */
export const DEFAULT_UNLOCKED_SKINS = ['X', '●', '♠', '★', 'ᛉ', '⚙', '67', '⚽', '💣'];

/** Skins que se renderizan más grandes. */
export const BIG_SKINS = [
    '67', '69',
    '𖣘',
    '🧿',
    '🌚', '🌞',
    '🗿', '💣', '📛', '🍀', '🎲', '💋',
    '⚽', '🏀', '🥎', '⚾️', '🏐', '🏈',
    '🍄', '🥘', '🥚', '🫒', '🥒',
    '🦊',
    '🎄', '❄️', '🎁',
    '🎃', '💀', '🕸️', '🕷️',
    '💥',
];

/**
 * Configuración del Pase de Batalla.
 * 25 Niveles.
 * Free: Niveles impares (1, 3, 5...).
 * Premium: Todos los niveles (1-25).
 */
export const BATTLE_PASS = {
    FREE: [
        { level: 1, type: 'Y' }, { level: 2, type: '🥒'}, { level: 3, type: 'I' },
        { level: 5, type: 'π' }, { level: 7, type: '♥' }, { level: 9, type: '☣' },
        { level: 10, type: '◆' }, { level: 11, type: '✠' }, { level: 13, type: '⟁' },
        { level: 15, type: '♣' }, { level: 17, type: '◎' }, { level: 19, type: '✧' },
        { level: 21, type: '☯' }, { level: 23, type: '✹' }, { level: 24, type: '✵' },
        { level: 25, type: '🗿' }
    ],
    PREMIUM: [
        { level: 1, type: '𖣘' }, { level: 2, type: '✟' }, { level: 3, type: '⛥' },
        { level: 4, type: 'ψ' }, { level: 5, type: 'Ω' }, { level: 6, type: '✦' },
        { level: 7, type: '☬' }, { level: 8, type: '☢' }, { level: 9, type: '△' },
        { level: 10, type: '☄' }, { level: 11, type: '∞' }, { level: 12, type: 'ᛉ' },
        { level: 13, type: 'ᛟ' }, { level: 14, type: '⚙' }, { level: 15, type: '⌬' },
        { level: 16, type: '🏀' }, { level: 17, type: '🥚' }, { level: 18, type: '⚾️' },
        { level: 19, type: '🏐' }, { level: 20, type: '🏈' }, { level: 21, type: '🧿' },
        { level: 22, type: '📛' }, { level: 23, type: '🍀' }, { level: 24, type: '🍄' },
        { level: 25, type: '🎲' }
    ]
};
