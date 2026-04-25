/**
 * Lógica de Power-ups (Multiplicador, Escudo, Bonus Tiempo).
 */

import { state } from '../core/estado.js';
import { setRegTimeout, clearRegTimeout } from '../core/utils.js';
import { BIG_SKINS } from '../core/constantes.js';

/* ============================
   MULTIPLICADOR (x2)
   ================================ */

export function spawnMultiplier(canvasWidth, canvasHeight) {
    if (state.multiplier.show || state.multiplierEffectActive || !state.playing) return;

    state.multiplier.x = Math.random() * (canvasWidth - 100) + 50;
    state.multiplier.y = Math.random() * (canvasHeight - 100) + 50;
    state.multiplier.show = true;

    clearRegTimeout(state.multiplier.timer);
    state.multiplier.timer = setRegTimeout(() => {
        state.multiplier.show = false;
        state.multiplier.timer = null;
    }, 4000);
}

export function drawMultiplier(ctx) {
    if (!state.multiplier.show) return;

    const m = state.multiplier;
    ctx.save();
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, 2 * Math.PI);
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
    ctx.fillText('x2', m.x, m.y);
    ctx.globalAlpha = 1;

    ctx.restore();
}

export function checkMultiplierCollision() {
    if (!state.multiplier.show) return;

    const dx = state.player.x - state.multiplier.x;
    const dy = state.player.y - state.multiplier.y;

    if (Math.hypot(dx, dy) < state.player.r + state.multiplier.r) {
        state.multiplier.show = false;
        clearRegTimeout(state.multiplier.timer);
        state.multiplier.timer = null;

        state.multiplierEffectActive = true;
        state.multiplier.active = true;

        clearRegTimeout(state.multiplierEffectTimeoutId);
        state.multiplierEffectTimeoutId = setRegTimeout(() => {
            state.multiplierEffectActive = false;
            state.multiplier.active = false;
            state.multiplierEffectTimeoutId = null;
        }, 5000);
    }
}

export function scheduleMultiplier(canvasWidth, canvasHeight) {
    if (!state.playing) return;

    setRegTimeout(() => {
        if (state.playing && !state.multiplierEffectActive) {
            spawnMultiplier(canvasWidth, canvasHeight);
        }
        scheduleMultiplier(canvasWidth, canvasHeight);
    }, 20000 + Math.random() * 15000);
}

/* ============================
   ESCUDO
   ================================ */

export function spawnShield(canvasWidth, canvasHeight) {
    if (state.gameMode === 'destruccion') return;
    if (state.shield.show || state.shieldEffectActive || !state.playing) return;

    state.shield.x = Math.random() * (canvasWidth - 100) + 50;
    state.shield.y = Math.random() * (canvasHeight - 100) + 50;
    state.shield.show = true;

    clearRegTimeout(state.shield.timer);
    state.shield.timer = setRegTimeout(() => {
        state.shield.show = false;
        state.shield.timer = null;
    }, 6000);
}

export function drawShieldPowerup(ctx) {
    if (!state.shield.show) return;

    const s = state.shield;
    const skin = state.currentSkin;

    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI);
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
    ctx.strokeText(skin.type, s.x, s.y);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#00eaff';
    ctx.fillText(skin.type, s.x, s.y);
    ctx.globalAlpha = 1;

    ctx.restore();
    ctx.restore();
}

export function checkShieldCollision() {
    if (!state.shield.show) return;

    const dx = state.player.x - state.shield.x;
    const dy = state.player.y - state.shield.y;

    if (Math.hypot(dx, dy) < state.player.r + state.shield.r) {
        state.shield.show = false;
        clearRegTimeout(state.shield.timer);
        state.shield.timer = null;

        state.shieldEffectActive = true;
        state.shield.active = true;

        clearRegTimeout(state.shieldEffectTimeoutId);
    }
}

export function scheduleShield(canvasWidth, canvasHeight) {
    if (!state.playing) return;

    setRegTimeout(() => {
        if (state.playing && !state.shieldEffectActive) {
            spawnShield(canvasWidth, canvasHeight);
        }
        scheduleShield(canvasWidth, canvasHeight);
    }, 25000 + Math.random() * 20000);
}

/* ============================
   BONUS TIEMPO (+10s)
   ================================ */

export function spawnTimeBonus(canvasWidth, canvasHeight) {
    if (
        state.timeBonus.show ||
        state.timeBonusEffectActive ||
        !state.playing ||
        state.gameMode !== 'destruccion'
    ) {
        return;
    }

    state.timeBonus.x = Math.random() * (canvasWidth - 100) + 50;
    state.timeBonus.y = Math.random() * (canvasHeight - 100) + 50;
    state.timeBonus.show = true;

    clearRegTimeout(state.timeBonus.timer);
    state.timeBonus.timer = setRegTimeout(() => {
        state.timeBonus.show = false;
        state.timeBonus.timer = null;
    }, 4000);
}

export function drawTimeBonus(ctx) {
    if (!state.timeBonus.show) return;

    const t = state.timeBonus;
    ctx.save();
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
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
    ctx.fillText('+10s', t.x, t.y);
    ctx.globalAlpha = 1;

    ctx.restore();
}

export function checkTimeBonusCollision() {
    if (!state.timeBonus.show) return;

    const dx = state.player.x - state.timeBonus.x;
    const dy = state.player.y - state.timeBonus.y;

    if (Math.hypot(dx, dy) < state.player.r + state.timeBonus.r) {
        state.timeBonus.show = false;
        clearRegTimeout(state.timeBonus.timer);
        state.timeBonus.timer = null;

        state.timeBonusEffectActive = true;
        state.timeBonus.active = true;

        if (state.gameMode === 'destruccion') {
            state.destructionTimeLeft += 10;
        }

        clearRegTimeout(state.timeBonusEffectTimeoutId);
        state.timeBonusEffectTimeoutId = setRegTimeout(() => {
            state.timeBonusEffectActive = false;
            state.timeBonus.active = false;
            state.timeBonusEffectTimeoutId = null;
        }, 500);
    }
}

export function scheduleTimeBonus(canvasWidth, canvasHeight) {
    if (!state.playing) return;

    setRegTimeout(() => {
        if (state.playing && !state.timeBonusEffectActive && state.gameMode === 'destruccion') {
            spawnTimeBonus(canvasWidth, canvasHeight);
        }
        scheduleTimeBonus(canvasWidth, canvasHeight);
    }, 17500 + Math.random() * 17500);
}
