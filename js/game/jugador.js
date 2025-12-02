/**
 * Lógica y renderizado del jugador.
 * Optimizado con caching para evitar shadowBlur costoso en cada frame.
 */

import { state } from '../core/estado.js';
import { BIG_SKINS } from '../core/constantes.js';

// Cache para la skin del jugador
let playerCanvas = document.createElement('canvas');
let playerCtx = playerCanvas.getContext('2d');
let lastSkinType = null;
let lastSkinColor = null;

// Cache para el efecto de escudo (texto grande)
let shieldCanvas = document.createElement('canvas');
let shieldCtx = shieldCanvas.getContext('2d');
let lastShieldType = null;

/**
 * Actualiza el caché de la skin del jugador.
 */
function updatePlayerCache() {
    const skin = state.currentSkin;
    const isBig = BIG_SKINS.includes(skin.type);
    const size = isBig ? 100 : 150; // Tamaño suficiente para el texto y sombra
    const fontSize = isBig ? 70 : 100;

    playerCanvas.width = size;
    playerCanvas.height = size;
    playerCtx.clearRect(0, 0, size, size);

    playerCtx.font = `${fontSize}px 'Press Start 2P', monospace`;
    playerCtx.textAlign = 'center';
    playerCtx.textBaseline = 'middle';

    // Fondo opaco para evitar que las estrellas se vean a través (glow fix)
    // Solo para el caché base
    playerCtx.save();
    playerCtx.fillStyle = '#05050a';
    playerCtx.fillText(skin.type, size / 2, size / 2);
    playerCtx.restore();

    // Sombra y borde
    playerCtx.strokeStyle = skin.color;
    playerCtx.lineWidth = 2;
    playerCtx.shadowBlur = 20;
    playerCtx.shadowColor = skin.color;
    playerCtx.strokeText(skin.type, size / 2, size / 2);

    // Relleno
    playerCtx.globalAlpha = 0.15;
    playerCtx.fillStyle = skin.color;
    playerCtx.fillText(skin.type, size / 2, size / 2);
    playerCtx.globalAlpha = 1;

    lastSkinType = skin.type;
    lastSkinColor = skin.color;
}

/**
 * Actualiza el caché del efecto de escudo.
 */
function updateShieldCache() {
    const skin = state.currentSkin;
    const isBig = BIG_SKINS.includes(skin.type);
    const size = 200;
    const fontSize = isBig ? 90 : 130;

    shieldCanvas.width = size;
    shieldCanvas.height = size;
    shieldCtx.clearRect(0, 0, size, size);

    shieldCtx.font = `${fontSize}px 'Press Start 2P', monospace`;
    shieldCtx.textAlign = 'center';
    shieldCtx.textBaseline = 'middle';

    // Estilo del escudo
    shieldCtx.globalAlpha = 0.7;
    shieldCtx.strokeStyle = '#00eaff';
    shieldCtx.lineWidth = 5;
    shieldCtx.shadowBlur = 18;
    shieldCtx.shadowColor = '#00eaff';
    shieldCtx.strokeText(skin.type, size / 2, size / 2);

    shieldCtx.globalAlpha = 0.18;
    shieldCtx.fillStyle = '#00eaff';
    shieldCtx.fillText(skin.type, size / 2, size / 2);
    shieldCtx.globalAlpha = 1;

    lastShieldType = skin.type;
}

/**
 * Dibuja al jugador.
 * @param {CanvasRenderingContext2D} ctx 
 */
export function drawPlayer(ctx) {
    const p = state.player;
    const skin = state.currentSkin;

    // Verificar si necesitamos actualizar caché
    if (skin.type !== lastSkinType || skin.color !== lastSkinColor) {
        updatePlayerCache();
    }
    if (state.shieldEffectActive && skin.type !== lastShieldType) {
        updateShieldCache();
    }

    // Actualizar ángulo
    p.angle += state.multiplierEffectActive ? 0.3 : 0.1;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Dibujar Escudo (si activo)
    if (state.shieldEffectActive) {
        const size = shieldCanvas.width;
        ctx.drawImage(shieldCanvas, -size / 2, -size / 2);
    }

    // Dibujar Jugador
    // Efecto pulsante si hay multiplicador
    if (state.multiplierEffectActive) {
        const pulse = (Math.sin(Date.now() * 0.01) + 1) / 2;
        const isBig = BIG_SKINS.includes(skin.type);
        const fontSize = isBig ? 70 : 100;

        // Fondo opaco para evitar que las estrellas se vean a través (glow fix)
        ctx.save();
        ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#05050a'; // Color de fondo del juego
        ctx.fillText(skin.type, 0, 0);
        ctx.restore();

        // Aplicar efecto amarillo pulsante
        const yellowIntensity = 0.5 + 0.5 * pulse;
        ctx.shadowColor = `rgba(255, 235, 59, ${yellowIntensity})`;
        ctx.shadowBlur = 30 + (20 * pulse); // Pulsación del brillo
        ctx.strokeStyle = `rgba(255, 235, 59, ${yellowIntensity})`;
        ctx.lineWidth = 3;

        ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(skin.type, 0, 0);

        // Relleno con el color elegido por el jugador
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = skin.color;
        ctx.fillText(skin.type, 0, 0);
        ctx.globalAlpha = 1;

    } else {
        // Dibujado normal optimizado
        const size = playerCanvas.width;
        ctx.drawImage(playerCanvas, -size / 2, -size / 2);
    }

    ctx.restore();
}
