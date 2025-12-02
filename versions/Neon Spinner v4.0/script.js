document.addEventListener('DOMContentLoaded', () => {
    // Helpers
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // Timer registry to avoid orphaned timeouts/intervals
    const _timers = new Set();
    const setRegTimeout = (fn, t) => {
        const id = setTimeout(() => { _timers.delete(id); fn(); }, t);
        _timers.add(id);
        return id;
    };
    const clearRegTimeout = id => { if (id) { clearTimeout(id); _timers.delete(id); } };
    const setRegInterval = (fn, t) => {
        const id = setInterval(fn, t);
        _timers.add(id);
        return id;
    };
    const clearRegInterval = id => { if (id) { clearInterval(id); _timers.delete(id); } };
    const clearAllTimers = () => { for (const id of Array.from(_timers)) { clearTimeout(id); clearInterval(id); _timers.delete(id); } };

    // Canvas and contexts
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const starsCanvas = document.getElementById('stars');
    const starsCtx = starsCanvas.getContext('2d');

    // UI elements grouped
    const ui = {
        scoreEl: document.getElementById('score'),
        recordEl: document.getElementById('record'),
        progressBar: document.getElementById('progress-bar'),
        mainMenu: document.getElementById('mainmenu'),
        gameOverEl: document.getElementById('gameover'),
        playBtn: document.getElementById('playbtn'),
        retryBtn: document.getElementById('retry'),
        backMenuBtn: document.getElementById('backmenu'),
        changeSkinBtn: document.getElementById('CambiarSkin'),
        inventoryBtn: document.getElementById('inventorybtn'),
        inventoryModal: document.getElementById('inventory-modal'),
        closeInventoryBtn: document.getElementById('close-inventory'),
        tabSkins: document.getElementById('tab-skins'),
        tabColor: document.getElementById('tab-color'),
        skinsPanel: document.getElementById('skins-panel'),
        colorPanel: document.getElementById('color-panel'),
        skinsList: document.getElementById('skins-list'),
        skinName: document.getElementById('skin-name'),
        bigSkinView: document.getElementById('big-skin-view'),
        skinName: document.getElementById('skin-name'),
        colorPicker: document.getElementById('color-picker'),
        versionsBtn: document.getElementById('versions-btn'),
        versionsMenu: document.getElementById('versions-menu'),
        playDestructionBtn: document.getElementById('play-destruction'),
        FPS: document.getElementById('FPS'),
        bgmusic: document.getElementById('bgmusic'),
        resetBtn: document.getElementById('reset-records-btn'),
        resetPopup: document.getElementById('reset-popup'),
        // Los siguientes se asignan después del DOMContentLoaded
        confirmReset: null,
        cancelReset: null
    };

    const htmlRoot = document.documentElement;

    // Version links (kept)
    const versionsList = [
        'versions/Neon Spinner v1.0.html',
        'versions/Neon Spinner v2.0.html',
        'versions/Neon Spinner v2.1.html',
        'versions/Neon Spinner v2.2.html',
        'versions/Neon Spinner v2.3.html',
        'versions/Neon Spinner v2.4.html',
        'versions/Neon Spinner v3.0.html',
        'versions/Neon Spinner v3.1.html'
    ];
    function renderVersionsMenu() {
        const m = ui.versionsMenu;
        m.innerHTML = '';
        versionsList.forEach(v => {
            const a = document.createElement('a');
            a.href = encodeURI(v);
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = v.split('/').pop();
            a.role = 'menuitem';
            a.addEventListener('click', () => {
                m.style.display = 'none';
                m.setAttribute('aria-hidden', 'true');
                ui.versionsBtn.setAttribute('aria-expanded', 'false');
            }, { passive: true });
            m.appendChild(a);
        });
    }
    ui.versionsBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = ui.versionsMenu.style.display !== 'block';
        if (open) {
            renderVersionsMenu();
            ui.versionsMenu.style.display = 'block';
            ui.versionsMenu.setAttribute('aria-hidden', 'false');
            ui.versionsBtn.setAttribute('aria-expanded', 'true');
        } else {
            ui.versionsMenu.style.display = 'none';
            ui.versionsMenu.setAttribute('aria-hidden', 'true');
            ui.versionsBtn.setAttribute('aria-expanded', 'false');
        }
    }, { passive: true });
    // close versions menu on outside click
    document.addEventListener('click', e => {
        if (!ui.versionsMenu.contains(e.target) && e.target !== ui.versionsBtn) {
            ui.versionsMenu.style.display = 'none';
            ui.versionsMenu.setAttribute('aria-hidden', 'true');
            ui.versionsBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Resize handling (single, debounced)
    let sw = 0;
    let sh = 0;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        starsCanvas.width = canvas.width;
        starsCanvas.height = canvas.height;
        sw = canvas.width;
        sh = canvas.height;
    }

    let _resizeTimeout = null;
    window.addEventListener('resize', () => {
        if (_resizeTimeout) clearRegTimeout(_resizeTimeout);
        _resizeTimeout = setRegTimeout(resize, 50);
    });
    resize();

    // Game variables
    let godMode = false;
    let gameMode = 'huida'; // 'huida' or 'destruccion'
    let score = 0;
    let recordHuida = parseInt(localStorage.getItem('neonSpinnerRecord')) || 0;
    let recordDestruccion = parseInt(localStorage.getItem('neonSpinnerRecordDestruction')) || 0;
    let record = recordHuida;

    const destructionTotalTime = 30; // seconds
    let destructionTimeLeft = 0;
    let destructionIntervalId = null;

    let playing = false;
    let projectileSpeed = 15;
    let modeTimerId = null;

    let projectiles = [];
    let particles = [];

    // powerups/multipliers
    let multiplier = { active: false, x: 0, y: 0, r: 28, show: false, timer: null };
    let multiplierEffectActive = false;
    let multiplierEffectTimeoutId = null;

    let shield = { active: false, x: 0, y: 0, r: 28, show: false, timer: null };
    let shieldEffectActive = false;
    let shieldEffectTimeoutId = null;

    function actualizarTextoRecord() {
        if (gameMode === 'huida') {
            record = recordHuida;
            ui.recordEl.innerText = 'Récord Huida: ' + recordHuida;
        } else {
            record = recordDestruccion;
            ui.recordEl.innerText = 'Récord Destrucción: ' + recordDestruccion;
        }
    }
    actualizarTextoRecord();

    // Random color
    const generarColorHexAleatorio = () => {
        const num = Math.floor(Math.random() * 0xFFFFFF);
        return '#' + num.toString(16).padStart(6, '0');
    };

    // Skins kept as original but stored objects
    const playerSkins = [
        'X', 'Y', 'I', 'π',
        '●', '★', '△',
        '♠', '♣', '♥', '◆',
        '✧', '𖣘', '✠', '✟', '⛥',
        '☢', '☣', '67', '🗿'
    ].map(type => ({ type, color: generarColorHexAleatorio() }));
    let currentSkin = playerSkins[Math.floor(Math.random() * playerSkins.length)];

    let currentInventoryTab = 'skins';
    // Stars
    function randomStar() {
        return {
            x: Math.random() * sw,
            y: Math.random() * sh,
            r: Math.random() * 1.2 + 0.2,
            alpha: Math.random(),
            dx: (Math.random() - 0.5) * 0.2,
            dy: (Math.random() - 0.5) * 0.2,
            dAlpha: (Math.random() - 0.5) * 0.02
        };
    }
    let starsArr = Array.from({ length: 120 }, randomStar);
    function drawStars() {
        starsCtx.clearRect(0, 0, sw, sh);
        for (let s of starsArr) {
            starsCtx.beginPath();
            starsCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            starsCtx.fillStyle = `rgba(255,255,255,${clamp(Math.abs(s.alpha), 0.05, 1)})`;
            starsCtx.shadowColor = '#fff';
            starsCtx.shadowBlur = 8;
            starsCtx.fill();

            s.x += s.dx;
            s.y += s.dy;
            s.alpha += s.dAlpha;
            if (s.alpha < 0.05 || s.alpha > 1) s.dAlpha *= -1;
            if (s.x < 0 || s.x > sw || s.y < 0 || s.y > sh) Object.assign(s, randomStar());
        }
        requestAnimationFrame(drawStars);
    }
    drawStars();

    // Particles
    function spawnProjectileParticles(px, py) {
        for (let i = 0; i < 15; i++) {
            particles.push({
                x: px,
                y: py,
                dx: (Math.random() - 0.5) * 5,
                dy: (Math.random() - 0.5) * 5,
                r: 2 + Math.random() * 3,
                color: generarColorHexAleatorio(),
                life: 50
            });
        }
    }
    function drawParticles(localCtx = ctx) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.dx;
            p.y += p.dy;
            p.life--;
            localCtx.beginPath();
            localCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            localCtx.fillStyle = p.color;
            localCtx.shadowBlur = 15;
            localCtx.shadowColor = p.color;
            localCtx.fill();
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    // Projectiles
    function spawnProjectile() {
        if (!playing) return;
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = Math.random() * canvas.width; y = -30; }
        else if (side === 1) { x = canvas.width + 30; y = Math.random() * canvas.height; }
        else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 30; }
        else { x = -30; y = Math.random() * canvas.height; }

        let angle = Math.atan2(player.y - y, player.x - x);
        // Corrected: add 50 degrees, not 50 radians
        if (gameMode === 'destruccion') angle += 50;

        projectiles.push({
            x, y,
            vx: Math.cos(angle) * projectileSpeed,
            vy: Math.sin(angle) * projectileSpeed,
            r: 14 + Math.random() * 11,
            color: `hsl(${Math.random() * 360},100%,60%)`
        });

        // schedule next spawn (keep reference)
        const t = 250 + Math.random() * 250;
        if (playing) setRegTimeout(spawnProjectile, t);
    }

    function drawProjectiles() {
        // lightweight trail
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#05050a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.x += p.vx;
            p.y += p.vy;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 20;
            ctx.shadowColor = p.color;
            ctx.fill();

            const dx = p.x - player.x;
            const dy = p.y - player.y;
            if (Math.hypot(dx, dy) < p.r + player.r) {
                spawnProjectileParticles(p.x, p.y);

                if (gameMode === 'destruccion') {
                    const points = multiplierEffectActive ? 2 : 1;
                    score += points;
                    ui.scoreEl.innerText = 'Puntos: ' + score;
                    if (score > record) {
                        if (gameMode === 'huida') {
                            recordHuida = score;
                            localStorage.setItem('neonSpinnerRecord', recordHuida);
                        } else {
                            recordDestruccion = score;
                            localStorage.setItem('neonSpinnerRecordDestruction', recordDestruccion);
                        }
                        record = score;
                        actualizarTextoRecord();
                    }
                    projectiles.splice(i, 1);
                    updateProgressBar();
                    continue;
                }

                if (shieldEffectActive) {
                    // shield consumed
                    shieldEffectActive = false;
                    shield.active = false;
                    clearRegTimeout(shieldEffectTimeoutId);
                    shieldEffectTimeoutId = null;
                    projectiles.splice(i, 1);
                    continue;
                } else {
                    endGame();
                    projectiles.splice(i, 1);
                    continue;
                }
            }

            // leaving screen
            if (p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
                spawnProjectileParticles(p.x, p.y);
                projectiles.splice(i, 1);

                if (gameMode === 'huida') {
                    const points = multiplierEffectActive ? 2 : 1;
                    score += points;
                    projectileSpeed += 0.05;
                    ui.scoreEl.innerText = 'Puntos: ' + score;
                    if (score > record) {
                        recordHuida = score;
                        record = recordHuida;
                        localStorage.setItem('neonSpinnerRecord', recordHuida);
                        actualizarTextoRecord();
                    }
                    updateProgressBar();
                }
            }
        }
    }

    // Progress bar
    function updateProgressBar() {
        if (gameMode === 'destruccion') {
            const percent = clamp((destructionTimeLeft / destructionTotalTime) * 100, 0, 100);
            ui.progressBar.style.width = percent + '%';
            if (score >= recordHuida) {
                ui.progressBar.style.background = 'linear-gradient(90deg, #ff595e 60%, #be1e2d 100%)';
                ui.progressBar.style.boxShadow = '0 0 12px #ff595e99';
            } else {
                ui.progressBar.style.background = 'linear-gradient(90deg,#00eaff 60%,#00b6c9 100%)';
                ui.progressBar.style.boxShadow = '0 0 12px var(--neon-alpha-1)';
            }
        } else {
            const rec = Math.max(1, recordHuida);
            const percent = Math.min(score, rec) / rec * 100;
            ui.progressBar.style.width = percent + '%';
            if (score >= recordHuida) {
                ui.progressBar.style.background = 'linear-gradient(90deg, #ff595e 60%, #be1e2d 100%)';
                ui.progressBar.style.boxShadow = '0 0 12px #ff595e99';
            } else {
                ui.progressBar.style.background = 'linear-gradient(90deg,#00eaff 60%,#00b6c9 100%)';
                ui.progressBar.style.boxShadow = '0 0 12px var(--neon-alpha-1)';
            }
        }
    }

    function iniciarTemporizadorDestruccion() {
        destructionTimeLeft = destructionTotalTime;
        updateProgressBar();
        if (destructionIntervalId) clearRegInterval(destructionIntervalId);
        destructionIntervalId = setRegInterval(() => {
            if (!playing) return;
            destructionTimeLeft = +(destructionTimeLeft - 0.1).toFixed(1);
            if (destructionTimeLeft <= 0) {
                destructionTimeLeft = 0;
                updateProgressBar();
                clearRegInterval(destructionIntervalId);
                destructionIntervalId = null;
                endGame();
                return;
            }
            updateProgressBar();
        }, 100);
    }

    // Multiplier
    function spawnMultiplier() {
        if (multiplier.show || multiplierEffectActive || !playing) return;
        multiplier.x = Math.random() * (canvas.width - 100) + 50;
        multiplier.y = Math.random() * (canvas.height - 100) + 50;
        multiplier.show = true;
        clearRegTimeout(multiplier.timer);
        multiplier.timer = setRegTimeout(() => { multiplier.show = false; multiplier.timer = null; }, 4000);
    }
    function drawMultiplier() {
        if (!multiplier.show) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(multiplier.x, multiplier.y, multiplier.r, 0, 2 * Math.PI);
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
        ctx.fillText('x2', multiplier.x, multiplier.y);
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    function checkMultiplierCollision() {
        if (!multiplier.show) return;
        const dx = player.x - multiplier.x, dy = player.y - multiplier.y;
        if (Math.hypot(dx, dy) < player.r + multiplier.r) {
            multiplier.show = false;
            clearRegTimeout(multiplier.timer);
            multiplier.timer = null;
            multiplierEffectActive = true;
            multiplier.active = true;
            clearRegTimeout(multiplierEffectTimeoutId);
            multiplierEffectTimeoutId = setRegTimeout(() => {
                multiplierEffectActive = false;
                multiplier.active = false;
                multiplierEffectTimeoutId = null;
            }, 5000);
        }
    }
    function scheduleMultiplier() {
        if (!playing) return;
        setRegTimeout(() => {
            if (playing && !multiplierEffectActive) spawnMultiplier();
            scheduleMultiplier();
        }, 20000 + Math.random() * 15000);
    }

    // Shield (no shield in destruction mode)
    function spawnShield() {
        if (gameMode === 'destruccion') return;
        if (shield.show || shieldEffectActive || !playing) return;
        shield.x = Math.random() * (canvas.width - 100) + 50;
        shield.y = Math.random() * (canvas.height - 100) + 50;
        shield.show = true;
        clearRegTimeout(shield.timer);
        shield.timer = setRegTimeout(() => { shield.show = false; shield.timer = null; }, 6000);
    }
    function drawShieldPowerup() {
        if (!shield.show) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(shield.x, shield.y, shield.r, 0, 2 * Math.PI);
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
        ctx.strokeText(currentSkin.type, shield.x, shield.y);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#00eaff';
        ctx.fillText(currentSkin.type, shield.x, shield.y);
        ctx.globalAlpha = 1;
        ctx.restore();
        ctx.restore();
    }
    function checkShieldCollision() {
        if (!shield.show) return;
        const dx = player.x - shield.x, dy = player.y - shield.y;
        if (Math.hypot(dx, dy) < player.r + shield.r) {
            shield.show = false;
            clearRegTimeout(shield.timer);
            shield.timer = null;
            shieldEffectActive = true;
            shield.active = true;
            clearRegTimeout(shieldEffectTimeoutId);
            // shieldEffectTimeoutId remains until game end or until consumed
        }
    }
    function scheduleShield() {
        if (!playing) return;
        setRegTimeout(() => {
            if (playing && !shieldEffectActive) spawnShield();
            scheduleShield();
        }, 25000 + Math.random() * 20000);
    }

    // Player draw
    let player = { x: sw / 2, y: sh / 2, r: 25, angle: 0 };
    function drawPlayer() {
        player.angle += 0.12;
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);

        if (shieldEffectActive) {
            ctx.save();
            ctx.font = "130px 'Press Start 2P', monospace";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#00eaff';
            ctx.lineWidth = 5;
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#00eaff';
            ctx.strokeText(currentSkin.type, 0, 0);
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#00eaff';
            ctx.fillText(currentSkin.type, 0, 0);
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        ctx.strokeStyle = currentSkin.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = currentSkin.color;
        ctx.font = "100px 'Press Start 2P', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(currentSkin.type, 0, 0);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = currentSkin.color;
        ctx.fillText(currentSkin.type, 0, 0);
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // Main update loop
    function update() {
        if (!playing) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPlayer();
        drawProjectiles();
        drawParticles();
        drawMultiplier();
        drawShieldPowerup();
        checkMultiplierCollision();
        checkShieldCollision();
        requestAnimationFrame(update);
    }

    // End game & cleanup
    function endGame() {
        // clear destruction interval
        if (destructionIntervalId) {
            clearRegInterval(destructionIntervalId);
            destructionIntervalId = null;
        }
        // clear mode timer
        if (modeTimerId) { clearRegTimeout(modeTimerId); modeTimerId = null; }

        if (!godMode) {
            playing = false;
            ui.gameOverEl.style.display = 'block';
            ui.gameOverEl.setAttribute('aria-hidden', 'false');
            htmlRoot.style.cursor = 'auto';

            // clear scheduled timeouts/intervals to avoid orphaned behavior
            clearAllTimers();
        } else {
            // if godMode active, do nothing (player stays alive)
            return;
        }
    }

    // Input & controls
    document.addEventListener('keydown', e => {
        if (e.key === 'g' || e.key === 'G') {
            godMode = !godMode;
            console.log('God Mode:', godMode ? 'ON' : 'OFF');
        }
        // fixed redundant condition (only one 'r')
        if (e.key === 'r' || e.key === 'R') {
            location.reload();
        }
    });

    document.addEventListener('mousemove', e => {
        if (!playing) return;
        player.x = e.clientX;
        player.y = e.clientY;
    });

    // Start/reset game
    function iniciarPartida() {
        // clear previously scheduled timers to start fresh
        clearAllTimers();

        score = 0;
        projectileSpeed = 15;
        projectiles = [];
        particles = [];
        player = { x: canvas.width / 2, y: canvas.height / 2, r: 25, angle: 0 };
        ui.scoreEl.innerText = 'Puntos: 0';
        ui.gameOverEl.style.display = 'none';
        htmlRoot.style.cursor = 'none';
        ui.scoreEl.style.display = 'inline';
        ui.recordEl.style.display = 'inline';
        playing = true;

        multiplier.show = false; multiplier.active = false; multiplierEffectActive = false;
        shield.show = false; shield.active = false; shieldEffectActive = false;

        multiplier.timer = null; multiplierEffectTimeoutId = null;
        shield.timer = null; shieldEffectTimeoutId = null;

        if (modeTimerId) { clearRegTimeout(modeTimerId); modeTimerId = null; }

        actualizarTextoRecord();
        updateProgressBar();

        spawnProjectile();
        scheduleMultiplier();
        if (gameMode === 'huida') {
            scheduleShield();
            updateProgressBar();
        } else {
            iniciarTemporizadorDestruccion();
        }
        update();

        if (gameMode === 'destruccion') {
            // mode fallback safety
            modeTimerId = setRegTimeout(() => { if (playing) endGame(); }, 60000);
        }
    }

    // Buttons
    ui.playBtn.addEventListener('click', () => {
        gameMode = 'huida';
        ui.mainMenu.style.display = 'none';
        ui.scoreEl.style.display = 'inline';
        ui.recordEl.style.display = 'inline';
        htmlRoot.style.cursor = 'none';
        iniciarPartida();
    }, { passive: true });

    ui.playDestructionBtn.addEventListener('click', () => {
        gameMode = 'destruccion';
        ui.mainMenu.style.display = 'none';
        ui.scoreEl.style.display = 'inline';
        ui.recordEl.style.display = 'inline';
        htmlRoot.style.cursor = 'none';
        iniciarPartida();
    }, { passive: true });

    ui.retryBtn.addEventListener('click', () => iniciarPartida(), { passive: true });
    ui.backMenuBtn.addEventListener('click', () => location.reload(), { passive: true });

    // Inventory / skins
    function createIconCanvas(symbol, color, size = 56) {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ic = c.getContext('2d');

        ic.save();
        ic.translate(size / 2, size / 2);

        ic.strokeStyle = color;
        ic.lineWidth = Math.max(1, size / 28);
        ic.shadowBlur = 10;
        ic.shadowColor = color;

        ic.font = `${Math.floor(size * 0.68)}px 'Press Start 2P', monospace`;
        ic.textAlign = 'center';
        ic.textBaseline = 'middle';

        ic.strokeText(symbol, 0, 0);
        ic.globalAlpha = 0.15;
        ic.fillStyle = color;
        ic.fillText(symbol, 0, 0);
        ic.globalAlpha = 1;

        ic.restore();
        return c;
    }

    function renderSkinsList() {
        ui.skinsList.innerHTML = '';

        playerSkins.forEach(skin => {
            const capsule = document.createElement('div');
            capsule.className = 'skin-capsule' + (skin === currentSkin ? ' selected' : '');

            const iconCanvas = createIconCanvas(skin.type, skin.color, 56);
            capsule.appendChild(iconCanvas);
            capsule.title = skin.type;

            capsule.addEventListener('click', () => {
                currentSkin = skin;
                updateInventoryView();
            }, { passive: true });

            ui.skinsList.appendChild(capsule);
        });
    }

    function updateInventoryView() {
        // Si por algún motivo no existe la lista o la vista grande, no hacemos nada
        if (!ui.skinsList || !ui.bigSkinView) return;

        renderSkinsList();

        ui.bigSkinView.innerHTML = '';
        const bigCanvas = createIconCanvas(currentSkin.type, currentSkin.color, 180);
        ui.bigSkinView.appendChild(bigCanvas);

        // Proteger: solo tocar el nombre si el elemento existe
        if (ui.skinName) {
            ui.skinName.textContent = currentSkin.type;
        }

        // Proteger: solo tocar el input de color si existe
        if (ui.colorPicker) {
            ui.colorPicker.value = currentSkin.color;
        }
    }

    function showTab(tab) {
        currentInventoryTab = tab;

        if (tab === 'skins') {
            ui.tabSkins.classList.add('active');
            ui.tabColor.classList.remove('active');
            ui.skinsPanel.style.display = '';
            ui.colorPanel.style.display = 'none';
        } else {
            ui.tabSkins.classList.remove('active');
            ui.tabColor.classList.add('active');
            ui.skinsPanel.style.display = 'none';
            ui.colorPanel.style.display = '';
        }
    }

    // Eventos de pestañas
    ui.tabSkins.addEventListener('click', () => showTab('skins'), { passive: true });
    ui.tabColor.addEventListener('click', () => showTab('color'), { passive: true });

    // Abrir / cerrar inventario
    ui.inventoryBtn.addEventListener('click', () => {
        ui.inventoryModal.style.display = 'block';
        updateInventoryView();
        showTab('skins'); // siempre empieza en Skins
    }, { passive: true });

    ui.closeInventoryBtn.addEventListener('click', () => {
        ui.inventoryModal.style.display = 'none';
    }, { passive: true });

    // Selector de color: solo actúa si estás en la pestaña Color
    if (ui.colorPicker) {
        ui.colorPicker.addEventListener('input', e => {
            if (currentInventoryTab !== 'color') return;

            currentSkin.color = e.target.value;
            updateInventoryView();
        });
    }

    // Botón “Cambiar Skin” aleatoria
    ui.changeSkinBtn.addEventListener('click', () => {
        let newSkin;
        do {
            newSkin = playerSkins[Math.floor(Math.random() * playerSkins.length)];
        } while (newSkin === currentSkin && playerSkins.length > 1);

        currentSkin = newSkin;
        updateInventoryView();
    }, { passive: true });


    // FPS ticker (cleaner)
    (function fpsTicker() {
        let last = performance.now(), frames = 0;
        function tick(now) {
            frames++;
            if (now - last >= 1000) {
                ui.FPS.textContent = (frames / ((now - last) / 1000)).toFixed(2) + ' FPS';
                frames = 0;
                last = now;
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    })();

    // Mouse cursor & music autoplay attempt
    htmlRoot.style.cursor = 'auto';
    const bgmusic = ui.bgmusic;
    function tryPlayMusic() {
        if (bgmusic && bgmusic.paused) {
            bgmusic.play().catch(() => { });
        }
        document.removeEventListener('click', tryPlayMusic);
    }
    document.addEventListener('click', tryPlayMusic, { passive: true });

    // Versions/reset button visibility observer
    const mo = new MutationObserver(() => {
        const menuVisible = window.getComputedStyle(ui.mainMenu).display !== 'none';
        if (menuVisible) {
            ui.versionsBtn.style.display = 'block';
            if (ui.resetBtn) ui.resetBtn.style.display = 'block';
        } else {
            ui.versionsBtn.style.display = 'none';
            if (ui.resetBtn) ui.resetBtn.style.display = 'none';
            ui.versionsMenu.style.display = 'none';
            ui.versionsMenu.setAttribute('aria-hidden', 'true');
            ui.versionsBtn.setAttribute('aria-expanded', 'false');
        }
    });

    mo.observe(ui.mainMenu, { attributes: true, attributeFilter: ['style'] });

    // Start values
    updateInventoryView();
    actualizarTextoRecord();

    // Fix: also ensure visibility of versions/reset button at load
    {
        const menuVisible = window.getComputedStyle(ui.mainMenu).display !== 'none';
        if (!menuVisible) {
            ui.versionsBtn.style.display = 'none';
            if (ui.resetBtn) ui.resetBtn.style.display = 'none';
        }
    }

    // Botón de reset usando confirm() del navegador
    if (ui.resetBtn) {
        ui.resetBtn.addEventListener('click', () => {
            const confirmar = window.confirm(
                '¿Seguro que quieres borrar los récords de puntuación de ambos modos?'
            );
            if (!confirmar) return;

            // Borrar records de localStorage
            localStorage.removeItem('neonSpinnerRecord');            // récord huida
            localStorage.removeItem('neonSpinnerRecordDestruction'); // récord destrucción
            localStorage.removeItem('neonSpinnerRecordDestruccion'); // variante por si acaso

            // Reset variables internas
            recordHuida = 0;
            recordDestruccion = 0;
            score = 0;

            // Actualizar UI
            actualizarTextoRecord();
            ui.scoreEl.innerText = 'Puntos: 0';
            updateProgressBar();
        });
    }

    // CIERRE FINAL del DOMContentLoaded
});
