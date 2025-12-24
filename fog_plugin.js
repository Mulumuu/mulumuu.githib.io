(function () {
    'use strict';
    if (window.__fogfx_loaded__) return;
    window.__fogfx_loaded__ = true;

    var KEY_ENABLED = 'fogfx_enabled';
    var KEY_DENSITY = 'fogfx_density';
    var KEY_SETTLE = 'fogfx_settle';
    var KEY_SIZE = 'fogfx_particle_size';
    var KEY_SETTLE_SPEED = 'fogfx_settle_speed';
    var KEY_FALL_SPEED = 'fogfx_fall_speed';
    var KEY_IN_CARD = 'fogfx_in_card';

    var FOG_ICON = '<svg class="fogfx-menu-icon" width="88" height="83" viewBox="0 0 88 83" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><ellipse cx="44" cy="41.5" rx="32" ry="8.5" opacity="0.7"/><ellipse cx="44" cy="51.5" rx="28" ry="6.5"/><ellipse cx="44" cy="59.5" rx="24" ry="4.5"/></g></svg>';

    // === 1. ФУНКЦИИ ОПРЕДЕЛЕНИЯ ПЛАТФОРМЫ И УТИЛИТЫ (полностью из snow_new.js) ===
    function isTizen() {
        try { if (window.Lampa && Lampa.Platform && Lampa.Platform.is && Lampa.Platform.is('tizen')) return true; } catch (e) {}
        return /Tizen/i.test(navigator.userAgent || '');
    }
    function isAndroid() {
        try { if (window.Lampa && Lampa.Platform && Lampa.Platform.is && Lampa.Platform.is('android')) return true; } catch (e) {}
        return /Android/i.test(navigator.userAgent || '');
    }
    function isMobileUA() {
        var ua = navigator.userAgent || '';
        return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    }
    function isDesktop() {
        return !isMobileUA() && !isTizen();
    }
    function prefersReduceMotion() {
        try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
        catch (e) { return false; }
    }
    function storageGet(key, def) {
        try { if (window.Lampa && Lampa.Storage && Lampa.Storage.get) return Lampa.Storage.get(key, def); }
        catch (e) {}
        return def;
    }
    function num(v, def) {
        v = Number(v);
        return isNaN(v) ? def : v;
    }
    function isElVisible(el) {
        if (!el) return false;
        try {
            var r = el.getBoundingClientRect();
            if (!r || r.width < 10 || r.height < 10) return false;
            var Wv = window.innerWidth || 1;
            var Hv = window.innerHeight || 1;
            if (r.right <= 0 || r.bottom <= 0 || r.left >= Wv || r.top >= Hv) return false;
            var cs = window.getComputedStyle ? getComputedStyle(el) : null;
            if (cs) {
                if (cs.display === 'none' || cs.visibility === 'hidden') return false;
                if (Number(cs.opacity) === 0) return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    }
    // Функция detectOverlayOpen() берется целиком из snow_new.js
    // Функции isAllowedActivity(e), isDetailsActivity(e), isDetailsScreen(), detectActuallyInPlayer() берутся целиком из snow_new.js

    // === 2. КОНСТАНТЫ И ГЛОБАЛЬНЫЕ ФЛАГИ (адаптированы) ===
    var ALLOWED_COMPONENTS = {
        main: 1, home: 1, start: 1,
        cub: 1,
        movies: 1, movie: 1,
        tv: 1, series: 1, serial: 1, serials: 1,
        tvshow: 1, tvshows: 1,
        category: 1, categories: 1,
        catalog: 1,
        genre: 1, genres: 1
    };
    var DETAILS_COMPONENTS = {
        full: 1,
        details: 1,
        detail: 1,
        card: 1,
        info: 1
    };

    var on_allowed_screen = true;
    var in_player = false;
    var overlay_open = false;
    var in_details_activity = false;

    // === 3. КОНФИГУРАЦИЯ ДЛЯ ТУМАНА (переписана в стиле snow_new.js) ===
    function getTargetByDensity(density, platform) {
        if (platform === 'tizen') return 25;
        if (platform === 'android') {
            if (density === 1) return 50;
            if (density === 2) return 80;
            if (density === 3) return 110;
            return 80;
        }
        if (platform === 'desktop') {
            if (density === 1) return 70;
            if (density === 2) return 110;
            if (density === 3) return 150;
            return 110;
        }
        if (density === 1) return 40;
        if (density === 2) return 60;
        if (density === 3) return 85;
        return 60;
    }
    function getSizeMult(size, platform) {
        if (platform === 'tizen') {
            if (size === 0) return 0.85;
            if (size === 1) return 0.65;
            if (size === 2) return 0.90;
            return 0.95;
        }
        if (size === 1) return 0.75;
        if (size === 2) return 1.00;
        if (size === 3) return 1.40;
        if (size === 4) return 1.80;
        return 1.00;
    }
    function getSettleIntensity(speed, platform) {
        if (platform === 'tizen') return 0.0;
        if (speed === 1) return 0.50;
        if (speed === 2) return 1.00;
        if (speed === 3) return 1.60;
        return 1.00;
    }
    function getFallSpeedMult(speed, platform) {
        if (platform === 'tizen') {
            if (speed === 1) return 0.55;
            if (speed === 2) return 0.80;
            if (speed === 3) return 1.05;
            return 0.80;
        }
        if (speed === 1) return 0.60;
        if (speed === 2) return 1.00;
        if (speed === 3) return 1.50;
        return 1.00;
    }
    function computeConfig() {
        var tizen = isTizen();
        var android = isAndroid();
        var desktop = isDesktop();
        var density = num(storageGet(KEY_DENSITY, 0), 0) | 0;
        if (density < 0) density = 0;
        if (density > 3) density = 3;
        var settleDefault = tizen ? 0 : 1;
        var settle = num(storageGet(KEY_SETTLE, settleDefault), settleDefault);
        var size = num(storageGet(KEY_SIZE, 0), 0) | 0;
        if (size < 0) size = 0;
        if (size > 4) size = 4;
        var settleSpeed = num(storageGet(KEY_SETTLE_SPEED, 0), 0) | 0;
        var fallSpeed = num(storageGet(KEY_FALL_SPEED, 0), 0) | 0;
        var inCard = num(storageGet(KEY_IN_CARD, 0), 0);
        var enabled = num(storageGet(KEY_ENABLED, 1), 1);

        return {
            enabled: enabled,
            density: density,
            settle: settle,
            size: size,
            settleSpeed: settleSpeed,
            fallSpeed: fallSpeed,
            inCard: inCard,
            platform: tizen ? 'tizen' : android ? 'android' : desktop ? 'desktop' : 'other',
            reduceMotion: prefersReduceMotion()
        };
    }

    // === 4. ЯДРО ЭФФЕКТА ТУМАНА (переписано с физикой тумана) ===
    var FogFX = function () {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = 0;
        this.width = 0;
        this.height = 0;
        this.lastTime = 0;
        this.config = {};
        this.settledLayers = [];
        this.maxSettledLayers = 5;
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
        this.settledLayers = [];
    };
    FogFX.prototype.resetParticles = function (keepExisting) {
        var newCount = getTargetByDensity(this.config.density, this.config.platform);
        if (keepExisting && this.particles.length === newCount) return;
        this.particles = [];
        var baseSize = 40 * getSizeMult(this.config.size, this.config.platform);
        var fallSpeed = getFallSpeedMult(this.config.fallSpeed, this.config.platform);
        for (var i = 0; i < newCount; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                z: Math.random() * 0.6 + 0.4,
                size: 0,
                speedX: (Math.random() - 0.5) * 0.8,
                speedY: (Math.random() * 0.3 + 0.1) * fallSpeed,
                opacity: Math.random() * 0.15 + 0.05,
                waveSeed: Math.random() * 100,
                targetX: Math.random() * this.width,
                settleY: 0
            });
        }
        this.updateParticleParams();
    };
    FogFX.prototype.updateParticleParams = function () {
        var baseSize = 40 * getSizeMult(this.config.size, this.config.platform);
        var fallSpeed = getFallSpeedMult(this.config.fallSpeed, this.config.platform);
        var settleIntensity = getSettleIntensity(this.config.settleSpeed, this.config.platform);
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            p.size = baseSize * p.z;
            p.speedY = (Math.random() * 0.3 + 0.1) * fallSpeed;
            p.settleY = (this.height - 50) * (0.7 + Math.random() * 0.3);
        }
    };
    FogFX.prototype.animate = function (time) {
        if (!this.lastTime) this.lastTime = time;
        var delta = Math.min(50, time - this.lastTime) / 1000;
        this.lastTime = time;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Рендер осевшего тумана
        for (var i = 0; i < this.settledLayers.length; i++) {
            var layer = this.settledLayers[i];
            this.ctx.globalAlpha = layer.opacity;
            var gradient = this.ctx.createLinearGradient(0, this.height - layer.height, 0, this.height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, ' + layer.density + ')');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, this.height - layer.height, this.width, layer.height);
        }
        this.ctx.globalAlpha = 1.0;

        // Обновление и рендер движущихся частиц
        var settleIntensity = getSettleIntensity(this.config.settleSpeed, this.config.platform);
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var waveX = Math.sin(time * 0.001 + p.waveSeed) * 0.3;
            p.x += (p.speedX + waveX) * delta * 60;
            p.y += p.speedY * delta * 60;
            if (this.config.settle && p.y > p.settleY && Math.random() < 0.002 * delta * 60 * settleIntensity) {
                this.addSettledLayer(p);
                p.y = Math.random() * -100;
                p.x = Math.random() * this.width;
            }
            if (p.x < -p.size) p.x = this.width + p.size;
            if (p.x > this.width + p.size) p.x = -p.size;
            if (p.y > this.height + p.size) {
                p.y = -p.size;
                p.x = Math.random() * this.width;
            }
            var gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, 'rgba(255, 255, 255, ' + (p.opacity * 0.8) + ')');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            this.ctx.beginPath();
            this.ctx.fillStyle = gradient;
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.animationId = requestAnimationFrame(this.animate.bind(this));
    };
    FogFX.prototype.addSettledLayer = function (p) {
        var newHeight = 15 + Math.random() * 25;
        var newDensity = 0.03 + Math.random() * 0.04;
        this.settledLayers.push({ height: newHeight, density: newDensity, opacity: 1.0 });
        if (this.settledLayers.length > this.maxSettledLayers) {
            this.settledLayers.shift();
        }
    };
    FogFX.prototype.start = function () {
        if (this.animationId) return;
        this.lastTime = 0;
        this.config = computeConfig();
        if (!this.config.enabled || this.config.reduceMotion) return;
        this.init();
        this.resetParticles();
        this.settledLayers = [];
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
        this.settledLayers = [];
    };
    FogFX.prototype.update = function () {
        var wasEnabled = this.config.enabled;
        var oldDensity = this.config.density;
        var oldSize = this.config.size;
        var oldSettle = this.config.settle;
        var oldFallSpeed = this.config.fallSpeed;
        var oldSettleSpeed = this.config.settleSpeed;
        this.config = computeConfig();
        if (!this.config.enabled || this.config.reduceMotion) {
            this.stop();
        } else if (!wasEnabled) {
            this.start();
        } else {
            var needReset = oldDensity !== this.config.density || oldSize !== this.config.size || oldFallSpeed !== this.config.fallSpeed || oldSettleSpeed !== this.config.settleSpeed;
            if (needReset) {
                this.updateParticleParams();
            }
            if (oldSettle !== this.config.settle && !this.config.settle) {
                this.settledLayers = [];
            }
        }
    };

    // === 5. ИНТЕГРАЦИЯ И УПРАВЛЕНИЕ СОСТОЯНИЕМ (логика snow_new.js) ===
    var fogInstance = new FogFX();

    function updateStateAndStart() {
        var shouldShow = fogInstance.config.enabled && on_allowed_screen && !overlay_open && !in_player;
        if (isDetailsScreen()) {
            shouldShow = shouldShow && fogInstance.config.inCard;
        }
        if (shouldShow) {
            fogInstance.start();
        } else {
            fogInstance.stop();
        }
    }

    // Подписка на события Lampa
    if (window.Lampa && Lampa.Activity) {
        Lampa.Activity.active(function (e) {
            on_allowed_screen = isAllowedActivity(e);
            in_details_activity = isDetailsActivity(e);
            updateStateAndStart();
        });
    }
    if (window.Lampa && Lampa.Player && Lampa.Player.listener) {
        Lampa.Player.listener.follow('start', function () {
            in_player = true;
            updateStateAndStart();
        });
        Lampa.Player.listener.follow('destroy', function () {
            in_player = false;
            updateStateAndStart();
        });
    }

    // Фоллбек-определение плеера и проверка оверлеев
    setInterval(function () {
        if (!in_player) {
            var detected = detectActuallyInPlayer();
            if (detected !== in_player) {
                in_player = detected;
                updateStateAndStart();
            }
        }
        var newOverlayState = detectOverlayOpen();
        if (newOverlayState !== overlay_open) {
            overlay_open = newOverlayState;
            updateStateAndStart();
        }
    }, 1000);

    // === 6. МЕНЮ НАСТРОЕК (полностью переписано в стиле snow_new.js) ===
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
                var html = Lampa.Template.get('plugin_fog_fx', {});
                this.html = html;
                var selectors = ['enabled', 'density', 'settle', 'size', 'settle_speed', 'fall_speed', 'in_card'];
                var self = this;
                selectors.forEach(function (name) {
                    var sel = html.find('.selector-select[data-name="' + name + '"]');
                    if (sel.length) {
                        var key = 'fogfx_' + name;
                        var def = name === 'enabled' ? 1 : 0;
                        sel.val(storageGet(key, def)).trigger('change');
                        sel.on('change', function () {
                            var val = $(this).val();
                            storageSet(key, val);
                            fogInstance.update();
                        });
                    }
                });
            }
        });
        // Шаблон HTML для панели настроек
        Lampa.Template.add('plugin_fog_fx',
            '<div class="settings-layer">' +
            '  <div class="settings__content">' +
            '    <div class="selector" data-name="enabled"><div class="selector__body"><div class="selector-title">Включить эффект тумана</div><select class="selector-select"><option value="1">Да</option><option value="0">Нет</option></select></div></div>' +
            '    <div class="selector" data-name="density"><div class="selector__body"><div class="selector-title">Плотность тумана</div><select class="selector-select"><option value="0">Авто</option><option value="1">Низкая</option><option value="2">Средняя</option><option value="3">Высокая</option></select></div></div>' +
            '    <div class="selector" data-name="settle"><div class="selector__body"><div class="selector-title">Оседание тумана</div><select class="selector-select"><option value="0">Выкл</option><option value="1">Вкл</option></select></div></div>' +
            '    <div class="selector" data-name="size"><div class="selector__body"><div class="selector-title">Размер частиц</div><select class="selector-select"><option value="0">Авто</option><option value="1">Маленькие</option><option value="2">Средние</option><option value="3">Крупные</option><option value="4">Огромные</option></select></div></div>' +
            '    <div class="selector" data-name="settle_speed"><div class="selector__body"><div class="selector-title">Скорость оседания</div><select class="selector-select"><option value="0">Авто</option><option value="1">Медленно</option><option value="2">Средне</option><option value="3">Быстро</option></select></div></div>' +
            '    <div class="selector" data-name="fall_speed"><div class="selector__body"><div class="selector-title">Скорость дрейфа</div><select class="selector-select"><option value="0">Авто</option><option value="1">Медленно</option><option value="2">Средне</option><option value="3">Быстро</option></select></div></div>' +
            '    <div class="selector" data-name="in_card"><div class="selector__body"><div class="selector-title">Показывать в карточке</div><select class="selector-select"><option value="0">Нет</option><option value="1">Да</option></select></div></div>' +
            '  </div>' +
            '</div>'
        );
    }
    // Инициализация меню
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createMenu);
    } else {
        createMenu();
    }
    // Запуск после небольшой задержки
    setTimeout(function () {
        fogInstance.update();
    }, 1500);
})();
