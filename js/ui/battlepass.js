import { state } from '../core/estado.js';
import { BATTLE_PASS } from '../core/constantes.js';
import { ui, createIconCanvas } from './ui.js';
import { api } from '../services/api.js';
import { generarColorHslAleatorio } from '../core/utils.js';

/**
 * Inicializa el módulo del Pase de Batalla.
 */
export function initBattlePass() {
    if (!ui.battlePassModal) return;

    // Renderizar estructura inicial si está vacía
    renderBattlePass();
}

/**
 * Renderiza la tabla del Pase de Batalla.
 */
export function renderBattlePass() {
    const container = document.getElementById('bp-grid');
    if (!container) return;

    container.innerHTML = '';

    // Calcular nivel actual
    const currentLevel = Math.floor((1 + Math.sqrt(1 + 0.16 * state.xp)) / 2);

    // Cabeceras de filas
    const rowHeaders = document.createElement('div');
    rowHeaders.className = 'bp-row-headers';
    rowHeaders.innerHTML = `
        <div class="bp-header-cell">Free</div>
        <div class="bp-header-cell premium">Premium<br><span style="cursor: pointer;" class="price">Comprar<br>(4.99€)</span></div>
    `;
    container.appendChild(rowHeaders);

    // Grid de niveles (1-25)
    const gridContent = document.createElement('div');
    gridContent.className = 'bp-levels-grid';

    for (let i = 1; i <= 25; i++) {
        const col = document.createElement('div');
        col.className = 'bp-level-col';
        if (i <= currentLevel) col.classList.add('unlocked');

        // Número de nivel
        const levelNum = document.createElement('div');
        levelNum.className = 'bp-level-num';
        levelNum.textContent = i;
        col.appendChild(levelNum);

        // Recompensa Free
        const freeReward = BATTLE_PASS.FREE.find(r => r.level === i);
        const freeCell = createRewardCell(freeReward, i, currentLevel, false);
        col.appendChild(freeCell);

        // Recompensa Premium
        const premiumReward = BATTLE_PASS.PREMIUM.find(r => r.level === i);
        const premiumCell = createRewardCell(premiumReward, i, currentLevel, true);
        col.appendChild(premiumCell);

        gridContent.appendChild(col);
    }

    container.appendChild(gridContent);
}

/**
 * Crea una celda de recompensa.
 */
function createRewardCell(reward, level, currentLevel, isPremium) {
    const cell = document.createElement('div');
    cell.className = 'bp-cell';
    if (isPremium) cell.classList.add('premium');

    if (!reward) {
        cell.classList.add('empty');
        return cell;
    }

    // Estado de bloqueo
    const isLevelReached = level <= currentLevel;
    const isPremiumUnlocked = state.hasPremium; // Usar estado real de premium
    const isUnlocked = isPremium ? (isLevelReached && isPremiumUnlocked) : isLevelReached;

    if (!isUnlocked) {
        cell.classList.add('locked');
        // Icono de candado si es premium y no comprado, o nivel no alcanzado
        if (isPremium && !isPremiumUnlocked) {
            cell.innerHTML = '<span class="lock-icon">🔒</span>';
        }
    } else {
        cell.classList.add('claimed'); // Visualmente "reclamado" o disponible
    }

    // Renderizar skin
    // Usamos un color aleatorio neón para que se vea vibrante
    const color = generarColorHslAleatorio();
    const canvas = createIconCanvas(reward.type, color, 50); // Aumentado tamaño ligeramente
    cell.appendChild(canvas);

    // Tooltip simple
    cell.title = `Nivel ${level}: ${reward.type}`;

    return cell;
}

/**
 * Comprueba y reclama recompensas automáticamente.
 * Se llama al cargar sesión y al subir de nivel.
 */
export async function checkAndClaimRewards() {
    if (!state.sessionUser) return;

    const currentLevel = Math.floor((1 + Math.sqrt(1 + 0.16 * state.xp)) / 2);
    let newUnlocks = false;

    // Revisar Free Pass
    for (const reward of BATTLE_PASS.FREE) {
        if (reward.level <= currentLevel) {
            // Intentar desbloquear (la API verifica si ya la tiene)
            const r = await api('unlock_skin.php', 'POST', { skin_type: reward.type });
            if (r.ok && r.data.unlocked) {
                console.log(`🎁 Recompensa Nivel ${reward.level} reclamada: ${reward.type}`);
                newUnlocks = true;
            }
        }
    }

    // Revisar Premium Pass (Si está activo)
    if (state.hasPremium) {
        for (const reward of BATTLE_PASS.PREMIUM) {
            if (reward.level <= currentLevel) {
                const r = await api('unlock_skin.php', 'POST', { skin_type: reward.type });
                if (r.ok && r.data.unlocked) {
                    console.log(`🎁 Recompensa Premium Nivel ${reward.level} reclamada: ${reward.type}`);
                    newUnlocks = true;
                }
            }
        }
    }

    if (newUnlocks) {
        // Recargar datos de usuario para actualizar inventario local
        // O simplemente añadir a state.playerSkins si queremos evitar la llamada
        // Por seguridad, mejor recargar sesión o actualizar lista
        // Pero loadSession es pesado. Mejor añadir manualmente si éxito.
        // Por simplicidad y robustez, dejaremos que la próxima carga o actualización de inventario lo refleje,
        // o forzamos una recarga silenciosa de skins.
    }
}
