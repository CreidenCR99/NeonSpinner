/**
 * Gestión del fondo de estrellas (Parallax).
 * Optimizado usando pre-renderizado (caching) para evitar shadowBlur costoso en cada frame.
 */

import { state } from '../core/estado.js';
import { clamp } from '../core/utils.js';

/** Canvas para el fondo de estrellas. */
let starsCanvas;
let starsCtx;

/** Sprite pre-renderizado de una estrella. */
const starSprite = document.createElement('canvas');
starSprite.width = 32;
starSprite.height = 32;
const sCtx = starSprite.getContext('2d');

// Dibujar la estrella base en el sprite
sCtx.beginPath();
sCtx.arc(16, 16, 3, 0, Math.PI * 2);
sCtx.fillStyle = '#ffffff';
sCtx.shadowBlur = 8;
sCtx.shadowColor = '#ffffff';
sCtx.fill();

/** Array de estrellas. */
let starsArr = [];
let running = false;

/**
 * Inicializa el sistema de estrellas.
 * @param {HTMLCanvasElement} canvas - Canvas del DOM.
 */
export function initStars(canvas) {
    starsCanvas = canvas;
    starsCtx = canvas.getContext('2d');

    // Inicializar estrellas
    starsArr = Array.from({ length: 512 }, randomStar);

    // Iniciar bucle solo si no está corriendo ya
    if (!running) {
        running = true;
        loop();
    }
}

/**
 * Crea una estrella con propiedades aleatorias.
 */
function randomStar() {
    return {
        x: Math.random() * (state.width || window.innerWidth),
        y: Math.random() * (state.height || window.innerHeight),
        r: Math.random() * 1.2 + 0.2, // Radio original lógica
        alpha: Math.random(),
        dx: (Math.random() - 0.5) * 0.1,
        dy: (Math.random() - 0.5) * 0.1,
        dAlpha: (Math.random() - 0.5) * 0.02
    };
}

/**
 * Bucle de renderizado de estrellas.
 */
function loop() {
    if (!starsCtx) {
        requestAnimationFrame(loop);
        return;
    }

    // Si no hay dimensiones, no dibujamos pero seguimos el loop
    if (!state.width || !state.height) {
        requestAnimationFrame(loop);
        return;
    }

    starsCtx.clearRect(0, 0, state.width, state.height);

    for (const s of starsArr) {
        // Actualizar posición
        s.x += s.dx;
        s.y += s.dy;
        s.alpha += s.dAlpha;

        if (s.alpha < 0.05 || s.alpha > 1) {
            s.dAlpha *= -1;
        }

        // Regenerar si sale de pantalla
        if (s.x < 0 || s.x > state.width || s.y < 0 || s.y > state.height) {
            Object.assign(s, randomStar());
        }

        // Dibujar usando el sprite cacheado
        const scale = s.r * 2; // Ajuste visual
        const size = 32 * (scale / 6); // Normalizar tamaño

        starsCtx.globalAlpha = clamp(Math.abs(s.alpha), 0.05, 1);
        starsCtx.drawImage(starSprite, s.x - size / 2, s.y - size / 2, size, size);
    }

    starsCtx.globalAlpha = 1;
    requestAnimationFrame(loop);
}
