/**
 * Funciones de utilidad y helpers.
 */

/**
 * Limita un valor v al rango [min, max].
 * @param {number} v - Valor actual.
 * @param {number} min - Límite inferior.
 * @param {number} max - Límite superior.
 * @returns {number} Valor ajustado.
 */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Genera un color aleatorio en formato hex (#RRGGBB).
 * @returns {string} Color hexadecimal.
 */
export const generarColorHexAleatorio = () => {
    const num = Math.floor(Math.random() * 0xffffff);
    return '#' + num.toString(16).padStart(6, '0');
};

/**
 * Genera un color HSL con aspecto neón vibrante.
 * @returns {string} Color en formato hsl(h, s%, l%).
 */
export const generarColorHslAleatorio = () => {
    return `hsl(${Math.random() * 360},100%,60%)`;
};

/**
 * Escapa caracteres especiales para mostrarlos de forma segura en HTML.
 * @param {string} s - Texto de entrada.
 * @returns {string} Texto escapado.
 */
export const escapeHtml = (s) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return String(s).replace(/[&<>"']/g, m => map[m]);
};

/* =============================================
   Gestión de timers (Timeouts e Intervalos)
   ============================================= */

/**
 * Conjunto interno de temporizadores activos.
 * @type {Set<number>}
 */
const _timers = new Set();

/**
 * Registra un setTimeout y guarda su ID.
 * @param {Function} fn - Función a ejecutar.
 * @param {number} delay - Retraso en ms.
 * @returns {number} ID del timeout.
 */
export const setRegTimeout = (fn, delay) => {
    const id = setTimeout(() => {
        _timers.delete(id);
        fn();
    }, delay);
    _timers.add(id);
    return id;
};

/**
 * Cancela un timeout registrado.
 * @param {number} id - ID del timeout.
 */
export const clearRegTimeout = (id) => {
    if (!id) return;
    clearTimeout(id);
    _timers.delete(id);
};

/**
 * Registra un setInterval y guarda su ID.
 * @param {Function} fn - Función a ejecutar.
 * @param {number} delay - Intervalo en ms.
 * @returns {number} ID del intervalo.
 */
export const setRegInterval = (fn, delay) => {
    const id = setInterval(fn, delay);
    _timers.add(id);
    return id;
};

/**
 * Cancela un intervalo registrado.
 * @param {number} id - ID del intervalo.
 */
export const clearRegInterval = (id) => {
    if (!id) return;
    clearInterval(id);
    _timers.delete(id);
};

/**
 * Cancela todos los timeouts e intervalos registrados.
 */
export const clearAllTimers = () => {
    for (const id of Array.from(_timers)) {
        clearTimeout(id);
        clearInterval(id);
        _timers.delete(id);
    }
};
