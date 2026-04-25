/**
 * Sistema de partículas.
 */

import { state } from '../core/estado.js';
import { generarColorHslAleatorio } from '../core/utils.js';

/**
 * Crea un grupo de partículas (explosión).
 * @param {number} px - Posición X.
 * @param {number} py - Posición Y.
 */
export function spawnProjectileParticles(px, py) {
    for (let i = 0; i < 20; i++) {
        state.particles.push({
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
 * Dibuja y actualiza partículas.
 * @param {CanvasRenderingContext2D} ctx 
 */
export function drawParticles(ctx) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];

        p.x += p.dx;
        p.y += p.dy;
        p.life--;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fill();

        if (p.life <= 0) {
            state.particles.splice(i, 1);
        }
    }
}
