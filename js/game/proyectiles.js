/**
 * Lógica de proyectiles (enemigos).
 */

import { state } from '../core/estado.js';
import { generarColorHslAleatorio, setRegTimeout, clearRegTimeout } from '../core/utils.js';
import { SPAWN_TIME, POINTS_FOR_TIME_BONUS, BONUS_SECONDS } from '../core/constantes.js';
import { spawnProjectileParticles } from './particulas.js';
import { ui, updateProgressBar, actualizarTextoRecord } from '../ui/ui.js';

/**
 * Genera un nuevo proyectil.
 * @param {number} canvasWidth 
 * @param {number} canvasHeight 
 */
export function spawnProjectile(canvasWidth, canvasHeight) {
    if (!state.playing) return;

    const side = Math.floor(Math.random() * 4);
    let x, y;

    if (side === 0) {
        x = Math.random() * canvasWidth;
        y = -30;
    } else if (side === 1) {
        x = canvasWidth + 30;
        y = Math.random() * canvasHeight;
    } else if (side === 2) {
        x = Math.random() * canvasWidth;
        y = canvasHeight + 30;
    } else {
        x = -30;
        y = Math.random() * canvasHeight;
    }

    let angle = Math.atan2(state.player.y - y, state.player.x - x);

    // En modo destrucción: ángulo aleatorio, bolas más grandes y más lentas
    if (state.gameMode === 'destruccion') {
        angle += Math.random() * (0.65 - 0.1) + 0.1;
    }

    const baseRadius = state.gameMode === 'destruccion' ? 18 : 14; // Más grandes en destrucción
    const speedMultiplier = state.gameMode === 'destruccion' ? 0.85 : 1; // 25% más lentas en destrucción

    state.projectiles.push({
        x,
        y,
        vx: Math.cos(angle) * state.projectileSpeed * speedMultiplier,
        vy: Math.sin(angle) * state.projectileSpeed * speedMultiplier,
        r: Math.random() * 11 + baseRadius,
        color: generarColorHslAleatorio()
    });

    const t = Math.random() * SPAWN_TIME + SPAWN_TIME;
    if (state.playing) {
        setRegTimeout(() => spawnProjectile(canvasWidth, canvasHeight), t);
    }
}

/**
 * Dibuja y actualiza proyectiles.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} callbacks - { endGame, setRecordHuida, setRecordDestruccion }
 */
export function drawProjectiles(ctx, callbacks) {
    const { endGame, setRecordHuida, setRecordDestruccion } = callbacks;
    const canvasWidth = state.width;
    const canvasHeight = state.height;

    // Trail effect
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];

        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        ctx.fill();

        const dx = p.x - state.player.x;
        const dy = p.y - state.player.y;

        // Colisión con jugador
        if (Math.hypot(dx, dy) < p.r + state.player.r) {
            spawnProjectileParticles(p.x, p.y);

            if (state.gameMode === 'destruccion') {
                const points = state.multiplierEffectActive ? 2 : 1;
                state.score += points;

                state.destructionBonusCounter += points;
                while (state.destructionBonusCounter >= POINTS_FOR_TIME_BONUS) {
                    state.destructionBonusCounter -= POINTS_FOR_TIME_BONUS;
                    state.destructionTimeLeft += BONUS_SECONDS;
                }

                // Por cada punto las pelotas van mas rapido
                if (state.projectileSpeed < 35) {
                    state.projectileSpeed += 0.1 * points;
                }
                // Por cada punto aparecen mas pelotas
                if (state.spawnTime > 100) {
                    state.spawnTime -= 0.5 * points;
                }

                // Actualizar UI
                ui.scoreEl.innerText = 'Puntos: ' + state.score;

                // Animación cada 10 puntos
                if (state.score % 10 === 0) {
                    ui.scoreEl.classList.remove('score-bump');
                    void ui.scoreEl.offsetWidth; // Trigger reflow
                    ui.scoreEl.classList.add('score-bump');
                }

                // Actualizar récord si es necesario
                if (state.score > state.record) {
                    setRecordDestruccion(state.score);
                    state.record = state.score;
                    actualizarTextoRecord();
                    ui.recordEl.classList.remove('score-bump');
                    void ui.recordEl.offsetWidth;
                    ui.recordEl.classList.add('score-bump');
                }

                state.projectiles.splice(i, 1);
                updateProgressBar(state.destructionTotalTime || 30);
                continue;
            }

            // Modo Huida
            if (state.shieldEffectActive) {
                state.shieldEffectActive = false;
                state.shield.active = false;
                clearRegTimeout(state.shieldEffectTimeoutId);
                state.shieldEffectTimeoutId = null;
                state.projectiles.splice(i, 1);
                continue;
            } else {
                endGame();
                state.projectiles.splice(i, 1);
                continue;
            }
        }

        // Salida de pantalla
        if (p.x < -50 || p.x > canvasWidth + 50 || p.y < -50 || p.y > canvasHeight + 50) {
            spawnProjectileParticles(p.x, p.y);
            state.projectiles.splice(i, 1);

            if (state.gameMode === 'huida') {
                const points = state.multiplierEffectActive ? 2 : 1;
                state.score += points;

                if (state.projectileSpeed < 30) {
                    state.projectileSpeed += 0.075;
                }

                // Actualizar UI
                ui.scoreEl.innerText = 'Puntos: ' + state.score;

                // Animación cada 10 puntos
                if (state.score % 10 === 0) {
                    ui.scoreEl.classList.remove('score-bump');
                    void ui.scoreEl.offsetWidth; // Trigger reflow
                    ui.scoreEl.classList.add('score-bump');
                }

                // Actualizar récord si es necesario
                if (state.score > state.recordHuida) {
                    setRecordHuida(state.score);
                    state.record = state.recordHuida;
                    actualizarTextoRecord();
                    ui.recordEl.classList.remove('score-bump');
                    void ui.recordEl.offsetWidth;
                    ui.recordEl.classList.add('score-bump');
                }

                updateProgressBar(30);
            }
        }
    }
}
