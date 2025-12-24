(function () {
    'use strict';
    if (window.__fogfx_loaded__) return;
    window.__fogfx_loaded__ = true;

    // Константы для хранения настроек
    var KEY_ENABLED = 'fogfx_enabled';
    var KEY_DENSITY = 'fogfx_density'; // 0 auto, 1 low, 2 mid, 3 high
    var KEY_DRIFT = 'fogfx_drift'; // 0 off, 1 subtle, 2 medium, 3 strong
    var KEY_SIZE = 'fogfx_particle_size'; // 0 auto, 1 small, 2 medium, 3 large
    var KEY_SPEED = 'fogfx_speed'; // 0 auto, 1 slow, 2 medium, 3 fast
    var KEY_OPACITY = 'fogfx_opacity'; // 0 auto, 1 light, 2 medium, 3 dense

    // Иконка для меню (простой значок "туман")
    var FOG_ICON = '<svg class="fogfx-menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3 15h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 11c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/></svg>';

    // === Вспомогательные функции (остаются без изменений) ===
    function isTizen() { /* ... */ } // Взять из исходного snow_new.js
    function isAndroid() { /* ... */ }
    function isDesktop() { /* ... */ }
    function storageGet(key, def) { /* ... */ }
    function storageSet(key, val) { /* ... */ }
    function num(v, def) { /* ... */ }
    function detectOverlayOpen() { /* ... */ }
    var ALLOWED_COMPONENTS = { /* ... */ };
    function isAllowedActivity(e) { /* ... */ }
    var on_allowed_screen = true;
    var overlay_open = false;

    // === Конфигурация для тумана ===
    function getTargetParticleCount(density, platform) {
        // Меньше частиц для тумана, т.к. они крупнее и прозрачнее
        if (platform === 'tizen') return 25;
        if (platform === 'android') {
            if (density === 1) return 40;
            if (density === 2) return 65;
            if (density === 3) return 90;
            return 65;
        }
        if (platform === 'desktop') {
            if (density === 1) return 60;
            if (density === 2) return 90;
            if (density === 3) return 130;
            return 90;
        }
        if (density === 1) return 35;
        if (density === 2) return 50;
        if (density === 3) return 75;
        return 50;
    }

    function getParticleBaseSize(size, platform) {
        // Частицы тумана больше "снежинок"
        var base = 50;
        if (platform === 'tizen') base = 40;
        if (size === 1) return base * 0.7;
        if (size === 2) return base * 1.0;
        if (size === 3) return base * 1.4;
        return base;
    }

    function getDriftStrength(drift, platform) {
        if (drift === 1) return 0.03;
        if (drift === 2) return 0.07;
        if (drift === 3) return 0.12;
        return 0.05;
    }

    function getSpeedMultiplier(speed, platform) {
        if (speed === 1) return 0.6;
        if (speed === 2) return 1.0;
        if (speed === 3) return 1.5;
        return 1.0;
    }

    function getOpacityValue(opacity, platform) {
        if (opacity === 1) return 0.15;
        if (opacity === 2) return 0.25;
        if (opacity === 3) return 0.4;
        return 0.25;
    }

    // === Ядро эффекта тумана ===
    var FogFX = function () {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = 0;
        this.width = 0;
        this.height = 0;
        this.lastTime = 0;
        this.config = {};
        this.platform = isTizen() ? 'tizen' : isAndroid() ? 'android' : isDesktop() ? 'desktop' : 'other';
    };

    FogFX.prototype.init = function () {
        if (this.canvas) return;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fog-fx-canvas';
        this.canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9998; opacity:1;';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', this.resize.bind(this));
    };

    FogFX.prototype.resize = function () {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
        this.resetParticles(true);
    };

    FogFX.prototype.resetParticles = function (keepExisting) {
        var newCount = getTargetParticleCount(this.config.density, this.platform);
        if (keepExisting && this.particles.length === newCount) return;

        this.particles = [];
        for (var i = 0; i < newCount; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                z: Math.random() * 0.5 + 0.5,
                size: 0,
                speedX: 0,
                speedY: 0,
                baseSpeed: (Math.random() * 0.3 + 0.1),
                opacity: 0,
                drift: { x: 0, y: 0 },
                driftSeed: Math.random() * 100
            });
        }
        this.updateParticleParams();
    };

    FogFX.prototype.updateParticleParams = function () {
        var baseSize = getParticleBaseSize(this.config.size, this.platform);
        var driftStr = getDriftStrength(this.config.drift, this.platform);
        var speedMul = getSpeedMultiplier(this.config.speed, this.platform);
        var targetOpacity = getOpacityValue(this.config.opacity, this.platform);

        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            p.size = baseSize * p.z;
            p.speedX = (Math.random() - 0.5) * 0.2 * speedMul;
            p.speedY = (Math.random() - 0.5) * 0.15 * speedMul;
            p.opacity = targetOpacity * (0.7 + 0.3 * p.z);
            p.drift = {
                x: (Math.random() - 0.5) * driftStr,
                y: (Math.random() - 0.5) * driftStr * 0.7
            };
        }
    };

    FogFX.prototype.animate = function (time) {
        if (!this.lastTime) this.lastTime = time;
        var delta = Math.min(50, time - this.lastTime) / 1000;
        this.lastTime = time;

        this.ctx.clearRect(0, 0, this.width, this.height);

        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var driftX = Math.sin(time * 0.001 + p.driftSeed) * p.drift.x;
            var driftY = Math.cos(time * 0.001 + p.driftSeed * 0.7) * p.drift.y;

            p.x += (p.speedX + driftX) * delta * 60;
            p.y += (p.speedY + driftY) * delta * 60;

            if (p.x < -p.size) p.x = this.width + p.size;
            if (p.x > this.width + p.size) p.x = -p.size;
            if (p.y < -p.size) p.y = this.height + p.size;
            if (p.y > this.height + p.size) p.y = -p.size;

            // Рисуем частицу тумана как размытое пятно с градиентом
            var gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, 'rgba(255, 255, 255, ' + (p.opacity * 0.7) + ')');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.ctx.beginPath();
            this.ctx.fillStyle = gradient;
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.animationId = requestAnimationFrame(this.animate.bind(this));
    };

    FogFX.prototype.start = function () {
        if (this.animationId) return;
        this.lastTime = 0;
        this.updateConfig();
        this.init();
        this.resetParticles();
        this.animationId = requestAnimationFrame(this.animate.bind(this));
    };

    FogFX.prototype.stop = function () {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = 0;
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
            this.canvas = null;
            this.ctx = null;
        }
        this.particles = [];
    };

    FogFX.prototype.updateConfig = function () {
        this.config = {
            enabled: num(storageGet(KEY_ENABLED, 1), 1),
            density: num(storageGet(KEY_DENSITY, 0), 0),
            drift: num(storageGet(KEY_DRIFT, 2), 2),
            size: num(storageGet(KEY_SIZE, 0), 0),
            speed: num(storageGet(KEY_SPEED, 0), 0),
            opacity: num(storageGet(KEY_OPACITY, 0), 0)
        };
    };

    // === Интеграция с Lampa ===
    var fogInstance = new FogFX();

    function updateAndStart() {
        fogInstance.updateConfig();
        if (fogInstance.config.enabled && on_allowed_screen && !overlay_open) {
            fogInstance.start();
        } else {
            fogInstance.stop();
        }
    }

    // Обработчики событий Lampa
    if (window.Lampa && Lampa.Activity) {
        Lampa.Activity.active(function (e) {
            on_allowed_screen = isAllowedActivity(e);
            updateAndStart();
        });
    }

    setInterval(function () {
        var newOverlayState = detectOverlayOpen();
        if (newOverlayState !== overlay_open) {
            overlay_open = newOverlayState;
            updateAndStart();
        }
    }, 500);

    // === Добавление пункта в меню настроек ===
    function createMenu() {
        if (!window.Lampa || !Lampa.Settings) return;

        Lampa.Settings.add({
            title: 'Эффект тумана',
            name: 'plugin_fog_fx',
            component: 'plugin_fog_fx',
            icon: FOG_ICON
        });

        Lampa.Component.add('plugin_fog_fx', {
            template: { 'plugin_fog_fx': 1 },
            create: function () {
                this.html = Lampa.Template.get('plugin_fog_fx', {});
                this.toggle = this.html.find('.selector-select[data-name="enabled"]');
                this.density = this.html.find('.selector-select[data-name="density"]');
                this.drift = this.html.find('.selector-select[data-name="drift"]');
                this.size = this.html.find('.selector-select[data-name="size"]');
                this.speed = this.html.find('.selector-select[data-name="speed"]');
                this.opacity = this.html.find('.selector-select[data-name="opacity"]');

                // Загрузка текущих значений
                this.toggle.val(storageGet(KEY_ENABLED, 1)).trigger('change');
                this.density.val(storageGet(KEY_DENSITY, 0)).trigger('change');
                this.drift.val(storageGet(KEY_DRIFT, 2)).trigger('change');
                this.size.val(storageGet(KEY_SIZE, 0)).trigger('change');
                this.speed.val(storageGet(KEY_SPEED, 0)).trigger('change');
                this.opacity.val(storageGet(KEY_OPACITY, 0)).trigger('change');

                // Обработчики изменений
                var self = this;
                this.html.find('.selector-select').on('change', function () {
                    var key = $(this).data('name');
                    var val = $(this).val();
                    storageSet(KEY_PREFIX + key, val);
                    updateAndStart();
                });
            }
        });

        // Шаблон HTML для панели настроек
        Lampa.Template.add('plugin_fog_fx',
            '<div class="settings-layer">' +
            '  <div class="settings__content">' +
            '    <div class="selector" data-name="enabled">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Включить эффект тумана</div>' +
            '        <select class="selector-select">' +
            '          <option value="1">Да</option>' +
            '          <option value="0">Нет</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="selector" data-name="density">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Плотность тумана</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Авто</option>' +
            '          <option value="1">Низкая</option>' +
            '          <option value="2">Средняя</option>' +
            '          <option value="3">Высокая</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="selector" data-name="drift">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Случайное смещение</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Нет</option>' +
            '          <option value="1">Слабое</option>' +
            '          <option value="2">Среднее</option>' +
            '          <option value="3">Сильное</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="selector" data-name="size">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Размер частиц</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Авто</option>' +
            '          <option value="1">Маленькие</option>' +
            '          <option value="2">Средние</option>' +
            '          <option value="3">Крупные</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="selector" data-name="speed">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Скорость движения</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Авто</option>' +
            '          <option value="1">Медленно</option>' +
            '          <option value="2">Средне</option>' +
            '          <option value="3">Быстро</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="selector" data-name="opacity">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Непрозрачность</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Авто</option>' +
            '          <option value="1">Лёгкая</option>' +
            '          <option value="2">Средняя</option>' +
            '          <option value="3">Плотная</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>'
        );
    }

    // Инициализация меню после загрузки приложения
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createMenu);
    } else {
        createMenu();
    }

    // Первоначальный запуск
    setTimeout(updateAndStart, 1000);
})();