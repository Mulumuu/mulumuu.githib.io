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

    var FOG_ICON = '<svg class="fogfx-menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3 15h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 11c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/></svg>';

    // Определение платформы
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

    // Работа с хранилищем
    function storageGet(key, def) {
        try { 
            if (window.Lampa && Lampa.Storage && Lampa.Storage.get) {
                return Lampa.Storage.get(key, def);
            }
        } catch (e) {}
        try {
            var val = localStorage.getItem(key);
            return val !== null ? JSON.parse(val) : def;
        } catch (e) {
            return def;
        }
    }

    function storageSet(key, val) {
        try {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.set) {
                Lampa.Storage.set(key, val);
                return;
            }
        } catch (e) {}
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {}
    }

    function num(v, def) {
        v = Number(v);
        return isNaN(v) ? def : v;
    }

    // Определение оверлеев (упрощенная версия)
    function detectOverlayOpen() {
        var sels = [
            '.settings',
            '.settings__content',
            '.settings__layer',
            '.modal',
            '.dialog',
            '.selectbox',
            '.notification'
        ];
        
        for (var i = 0; i < sels.length; i++) {
            var el = document.querySelector(sels[i]);
            if (el && el.offsetParent !== null) {
                var style = window.getComputedStyle(el);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    return true;
                }
            }
        }
        return false;
    }

    // Определение активного экрана
    var ALLOWED_COMPONENTS = {
        main: 1, home: 1, start: 1,
        movies: 1, movie: 1,
        tv: 1, series: 1,
        category: 1, catalog: 1
    };

    var on_allowed_screen = true;
    var overlay_open = false;

    // Конфигурация
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
        return 60;
    }

    function getSizeMult(size, platform) {
        if (platform === 'tizen') {
            if (size === 1) return 0.65;
            if (size === 2) return 0.90;
            if (size === 3) return 1.20;
            if (size === 4) return 1.40;
            return 0.85;
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
        
        var density = num(storageGet(KEY_DENSITY, 0), 0);
        var settle = num(storageGet(KEY_SETTLE, desktop ? 1 : 0), desktop ? 1 : 0);
        var size = num(storageGet(KEY_SIZE, 0), 0);
        var settleSpeed = num(storageGet(KEY_SETTLE_SPEED, 0), 0);
        var fallSpeed = num(storageGet(KEY_FALL_SPEED, 0), 0);
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
            platform: tizen ? 'tizen' : android ? 'android' : desktop ? 'desktop' : 'other'
        };
    }

    // Ядро эффекта тумана
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
        this.resetParticles();
    };

    FogFX.prototype.resetParticles = function () {
        var targetCount = getTargetByDensity(this.config.density, this.config.platform);
        this.particles = [];
        
        var baseSize = 40 * getSizeMult(this.config.size, this.config.platform);
        var fallSpeed = getFallSpeedMult(this.config.fallSpeed, this.config.platform);
        
        for (var i = 0; i < targetCount; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                z: Math.random() * 0.6 + 0.4,
                size: baseSize * (Math.random() * 0.6 + 0.4),
                speedX: (Math.random() - 0.5) * 0.8,
                speedY: (Math.random() * 0.3 + 0.1) * fallSpeed,
                opacity: Math.random() * 0.15 + 0.05,
                waveSeed: Math.random() * 100,
                targetX: Math.random() * this.width
            });
        }
    };

    FogFX.prototype.animate = function (time) {
        if (!this.lastTime) this.lastTime = time;
        var delta = Math.min(50, time - this.lastTime) / 1000;
        this.lastTime = time;
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Обновление и отрисовка частиц
        var settleIntensity = getSettleIntensity(this.config.settleSpeed, this.config.platform);
        
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            
            // Волнообразное движение
            var waveX = Math.sin(time * 0.001 + p.waveSeed) * 0.3;
            p.x += (p.speedX + waveX) * delta * 60;
            p.y += p.speedY * delta * 60;
            
            // Границы экрана
            if (p.x < -p.size) p.x = this.width + p.size;
            if (p.x > this.width + p.size) p.x = -p.size;
            if (p.y > this.height + p.size) {
                p.y = -p.size;
                p.x = Math.random() * this.width;
            }
            
            // Создание градиента для частицы тумана
            var gradient = this.ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, p.size
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, ' + (p.opacity * 0.8) + ')');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.beginPath();
            this.ctx.fillStyle = gradient;
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Осевший туман внизу экрана
        if (this.config.settle && this.settledLayers.length > 0) {
            for (var i = 0; i < this.settledLayers.length; i++) {
                var layer = this.settledLayers[i];
                this.ctx.globalAlpha = layer.opacity;
                
                var gradient = this.ctx.createLinearGradient(
                    0, this.height - layer.height,
                    0, this.height
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, ' + layer.density + ')');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, this.height - layer.height, this.width, layer.height);
            }
            this.ctx.globalAlpha = 1.0;
        }
        
        this.animationId = requestAnimationFrame(this.animate.bind(this));
    };

    FogFX.prototype.start = function () {
        if (this.animationId || !this.config.enabled) return;
        
        this.config = computeConfig();
        if (!this.config.enabled) return;
        
        this.init();
        this.resetParticles();
        this.lastTime = 0;
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
        var oldEnabled = this.config.enabled;
        this.config = computeConfig();
        
        if (this.config.enabled && !oldEnabled) {
            this.start();
        } else if (!this.config.enabled && oldEnabled) {
            this.stop();
        } else if (this.config.enabled) {
            // Обновляем параметры частиц
            this.resetParticles();
        }
    };

    // Инициализация и управление
    var fogInstance = new FogFX();

    function updateStateAndStart() {
        if (fogInstance.config.enabled && on_allowed_screen && !overlay_open) {
            fogInstance.start();
        } else {
            fogInstance.stop();
        }
    }

    // Проверка оверлеев
    setInterval(function () {
        var newOverlayState = detectOverlayOpen();
        if (newOverlayState !== overlay_open) {
            overlay_open = newOverlayState;
            updateStateAndStart();
        }
    }, 500);

    // Меню настроек
    function createMenu() {
        if (!window.Lampa || !Lampa.Settings) {
            setTimeout(createMenu, 1000);
            return;
        }

        // Добавляем раздел в меню
        Lampa.Settings.add({
            title: 'Эффект тумана',
            name: 'plugin_fog_fx',
            component: 'plugin_fog_fx',
            icon: FOG_ICON
        });

        // Создаем компонент настроек
        Lampa.Component.add('plugin_fog_fx', {
            template: { 'plugin_fog_fx': 1 },
            create: function () {
                var self = this;
                self.html = Lampa.Template.get('plugin_fog_fx', {});
                
                // Находим все селекторы
                var selectors = ['enabled', 'density', 'settle', 'size', 'settle_speed', 'fall_speed', 'in_card'];
                
                selectors.forEach(function(name) {
                    var selector = self.html.find('.selector-select[data-name="' + name + '"]');
                    if (selector.length) {
                        var key = 'fogfx_' + name;
                        var defaultValue = name === 'enabled' ? 1 : 0;
                        selector.val(storageGet(key, defaultValue));
                        
                        selector.on('change', function() {
                            var value = $(this).val();
                            storageSet(key, value);
                            fogInstance.update();
                        });
                    }
                });
            }
        });

        // Шаблон HTML для настроек
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
            '    <div class="selector" data-name="settle">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Оседание тумана</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Выкл</option>' +
            '          <option value="1">Вкл</option>' +
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
            '          <option value="4">Огромные</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="selector" data-name="settle_speed">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Скорость оседания</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Авто</option>' +
            '          <option value="1">Медленно</option>' +
            '          <option value="2">Средне</option>' +
            '          <option value="3">Быстро</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="selector" data-name="fall_speed">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Скорость дрейфа</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Авто</option>' +
            '          <option value="1">Медленно</option>' +
            '          <option value="2">Средне</option>' +
            '          <option value="3">Быстро</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="selector" data-name="in_card">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Показывать в карточке</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Нет</option>' +
            '          <option value="1">Да</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>'
        );
        
        console.log('FogFX: Меню настроек добавлено');
    }

    // Инициализация
    document.addEventListener('DOMContentLoaded', function() {
        fogInstance.update(); // Загружаем настройки
        
        // Добавляем меню настроек
        setTimeout(createMenu, 1000);
        
        // Автозапуск
        setTimeout(function() {
            if (fogInstance.config.enabled) {
                fogInstance.start();
            }
        }, 2000);
    });

    // Для ручного управления из консоли
    window.FogFX = fogInstance;
    
    console.log('FogFX: Плагин загружен');
})();
