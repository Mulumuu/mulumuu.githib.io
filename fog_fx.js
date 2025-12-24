// ====================================================
// Fog Plugin for Lampa (CUB)
// Based on snow_new.js structure and integration
// ====================================================
(function() {
    'use strict';
    
    // Проверка на повторную загрузку
    if (window.fog_plugin_loaded) return;
    window.fog_plugin_loaded = true;
    
    console.log('Fog Plugin: loading...');
    
    // ===== КОНСТАНТЫ =====
    const PLUGIN_NAME = 'fog_plugin';
    const STORAGE_KEY = 'fog_enabled';
    const DEFAULT_ENABLED = false; // По умолчанию выключен
    
    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
    // Взяты из snow_new.js
    function isTizen() {
        return navigator.userAgent.toLowerCase().indexOf('tizen') > -1 ||
               navigator.userAgent.toLowerCase().indexOf('samsung') > -1 ||
               /SmartHub|Tizen|Samsung/i.test(navigator.userAgent);
    }
    
    function isAndroid() {
        return /Android/i.test(navigator.userAgent) && !isTizen();
    }
    
    function isDesktop() {
        return !isTizen() && !isAndroid();
    }
    
    function storageGet(key, def) {
        try {
            var val = localStorage.getItem(key);
            return val === null ? def : JSON.parse(val);
        } catch(e) {
            return def;
        }
    }
    
    function storageSet(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch(e) {}
    }
    
    function num(v, def) {
        v = parseInt(v);
        return isNaN(v) ? def : v;
    }
    
    // ===== ДЕТЕКТОР АКТИВНОСТИ =====
    // Определяем, на каком экране находимся
    var ALLOWED_COMPONENTS = {
        'main': true,
        'cub': true,
        'home': true,
        'favorite': true,
        'search': true,
        'movie': true,
        'tv': true
    };
    
    function isAllowedActivity(e) {
        return !!(ALLOWED_COMPONENTS[e.component] || 
                 (e.component === 'full' && ALLOWED_COMPONENTS[e.params.source]));
    }
    
    // ===== ОСНОВНОЙ КЛАСС ТУМАНА =====
    var Fog = function() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = 0;
        this.width = 0;
        this.height = 0;
        this.lastTime = 0;
        this.platform = isTizen() ? 'tizen' : isAndroid() ? 'android' : 'desktop';
        this.settings = {
            enabled: false,
            density: 0,
            speed: 0,
            size: 0
        };
    };
    
    Fog.prototype.init = function() {
        if (this.canvas) return;
        
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fog-canvas';
        this.canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9998; opacity:1;';
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', this.resize.bind(this));
    };
    
    Fog.prototype.resize = function() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
        this.resetParticles(true);
    };
    
    Fog.prototype.resetParticles = function(keepExisting) {
        var count = this.getParticleCount();
        
        if (keepExisting && this.particles.length === count) return;
        
        this.particles = [];
        for (var i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                z: Math.random() * 0.5 + 0.5, // 0.5 - 1.0
                size: 0,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.2,
                opacity: 0.1 + Math.random() * 0.15,
                drift: Math.random() * 0.05,
                driftSeed: Math.random() * 100
            });
        }
        this.updateParticleParams();
    };
    
    Fog.prototype.getParticleCount = function() {
        var density = this.settings.density;
        var platform = this.platform;
        
        if (platform === 'tizen') return 20;
        if (platform === 'android') {
            if (density === 1) return 25;
            if (density === 2) return 40;
            if (density === 3) return 60;
            return 40; // auto
        }
        // desktop
        if (density === 1) return 35;
        if (density === 2) return 55;
        if (density === 3) return 80;
        return 55; // auto
    };
    
    Fog.prototype.updateParticleParams = function() {
        var sizeMultiplier = this.settings.size === 1 ? 0.7 : 
                            this.settings.size === 2 ? 1.0 : 
                            this.settings.size === 3 ? 1.4 : 1.0;
        
        var speedMultiplier = this.settings.speed === 1 ? 0.6 :
                             this.settings.speed === 2 ? 1.0 :
                             this.settings.speed === 3 ? 1.5 : 1.0;
        
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            p.size = 60 * p.z * sizeMultiplier;
            p.speedX *= speedMultiplier;
            p.speedY *= speedMultiplier;
        }
    };
    
    Fog.prototype.animate = function(time) {
        if (!this.lastTime) this.lastTime = time;
        var delta = Math.min(50, time - this.lastTime) / 1000;
        this.lastTime = time;
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            
            // Плавный дрейф
            var driftX = Math.sin(time * 0.001 + p.driftSeed) * p.drift;
            var driftY = Math.cos(time * 0.001 + p.driftSeed * 0.7) * p.drift * 0.5;
            
            p.x += (p.speedX + driftX) * delta * 60;
            p.y += (p.speedY + driftY) * delta * 60;
            
            // Границы с "телепортацией"
            if (p.x < -p.size) p.x = this.width + p.size;
            if (p.x > this.width + p.size) p.x = -p.size;
            if (p.y < -p.size) p.y = this.height + p.size;
            if (p.y > this.height + p.size) p.y = -p.size;
            
            // Рисуем частицу тумана
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
        
        this.animationId = requestAnimationFrame(this.animate.bind(this));
    };
    
    Fog.prototype.start = function() {
        if (this.animationId || !this.settings.enabled) return;
        
        this.init();
        this.resetParticles();
        this.lastTime = 0;
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        console.log('Fog Plugin: started');
    };
    
    Fog.prototype.stop = function() {
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
        
        console.log('Fog Plugin: stopped');
    };
    
    Fog.prototype.updateSettings = function() {
        this.settings = {
            enabled: num(storageGet(STORAGE_KEY, DEFAULT_ENABLED ? 1 : 0), DEFAULT_ENABLED ? 1 : 0) === 1,
            density: num(storageGet('fog_density', 0), 0),
            speed: num(storageGet('fog_speed', 0), 0),
            size: num(storageGet('fog_size', 0), 0)
        };
    };
    
    // ===== ГЛАВНЫЙ ОБЪЕКТ ПЛАГИНА =====
    var plugin = {
        fog: null,
        current_state: false,
        on_allowed_screen: false,
        overlay_open: false,
        
        init: function() {
            console.log('Fog Plugin: initializing...');
            
            this.fog = new Fog();
            this.updateState();
            
            // Слушаем события активности Lampa
            if (window.Lampa && Lampa.Activity) {
                Lampa.Activity.active(this.onActivityChange.bind(this));
            }
            
            // Проверяем открытые overlay (модальные окна, плеер)
            this.startOverlayChecker();
            
            // Добавляем пункт в меню настроек
            this.addToMenu();
        },
        
        onActivityChange: function(e) {
            this.on_allowed_screen = isAllowedActivity(e);
            this.updateState();
        },
        
        startOverlayChecker: function() {
            var self = this;
            setInterval(function() {
                var newOverlayState = self.detectOverlayOpen();
                if (newOverlayState !== self.overlay_open) {
                    self.overlay_open = newOverlayState;
                    self.updateState();
                }
            }, 500);
        },
        
        detectOverlayOpen: function() {
            // Проверяем, открыто ли модальное окно или плеер
            return !!document.querySelector('.layer--modal, .player, .fullscreen, [data-layer="modal"]');
        },
        
        updateState: function() {
            this.fog.updateSettings();
            
            var shouldBeActive = this.fog.settings.enabled && 
                                this.on_allowed_screen && 
                                !this.overlay_open;
            
            if (shouldBeActive && !this.current_state) {
                this.fog.start();
                this.current_state = true;
            } else if (!shouldBeActive && this.current_state) {
                this.fog.stop();
                this.current_state = false;
            }
        },
        
        // ===== ИНТЕГРАЦИЯ С МЕНЮ LAMPA =====
        // ТОЧНО КАК В snow_new.js
        addToMenu: function() {
            if (!window.Lampa || !Lampa.Settings) {
                console.log('Fog Plugin: Lampa.Settings not found, retrying in 1 second...');
                setTimeout(this.addToMenu.bind(this), 1000);
                return;
            }
            
            console.log('Fog Plugin: Adding to Lampa menu...');
            
            // Иконка тумана в SVG
            var fogIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
                          '<path d="M3 15h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 11c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/>' +
                          '</svg>';
            
            // Добавляем вкладку в настройки
            Lampa.Settings.add({
                title: 'Эффект тумана',
                name: PLUGIN_NAME,
                component: PLUGIN_NAME,
                icon: fogIcon
            });
            
            // Регистрируем компонент
            Lampa.Component.add(PLUGIN_NAME, {
                template: { 'fog_settings': 1 },
                create: function() {
                    // Получаем HTML шаблон
                    this.html = Lampa.Template.get('fog_settings', {});
                    
                    // Находим все селекторы
                    this.enabled = this.html.find('.selector-select[data-name="enabled"]');
                    this.density = this.html.find('.selector-select[data-name="density"]');
                    this.speed = this.html.find('.selector-select[data-name="speed"]');
                    this.size = this.html.find('.selector-select[data-name="size"]');
                    
                    // Устанавливаем текущие значения
                    var enabledVal = storageGet(STORAGE_KEY, DEFAULT_ENABLED ? 1 : 0) ? '1' : '0';
                    this.enabled.val(enabledVal).trigger('change');
                    
                    this.density.val(storageGet('fog_density', 0)).trigger('change');
                    this.speed.val(storageGet('fog_speed', 0)).trigger('change');
                    this.size.val(storageGet('fog_size', 0)).trigger('change');
                    
                    // Обработчики изменений
                    var self = this;
                    this.html.find('.selector-select').on('change', function() {
                        var name = $(this).data('name');
                        var value = $(this).val();
                        
                        if (name === 'enabled') {
                            storageSet(STORAGE_KEY, value === '1' ? 1 : 0);
                        } else {
                            storageSet('fog_' + name, parseInt(value));
                        }
                        
                        // Обновляем эффект
                        plugin.updateState();
                    });
                }
            });
            
            // Регистрируем HTML шаблон
            Lampa.Template.add('fog_settings',
                '<div class="settings-layer">' +
                '  <div class="settings-layer__name">Эффект тумана</div>' +
                '  <div class="settings-list">' +
                '    <div class="selector selector-focusable">' +
                '      <div class="selector__body">' +
                '        <div class="selector__items">' +
                '          <select class="selector-select" data-name="enabled">' +
                '            <option value="0">Выключено</option>' +
                '            <option value="1">Включено</option>' +
                '          </select>' +
                '        </div>' +
                '        <div class="selector__name">Состояние</div>' +
                '      </div>' +
                '    </div>' +
                '    <div class="selector selector-focusable">' +
                '      <div class="selector__body">' +
                '        <div class="selector__items">' +
                '          <select class="selector-select" data-name="density">' +
                '            <option value="0">Авто</option>' +
                '            <option value="1">Низкая</option>' +
                '            <option value="2">Средняя</option>' +
                '            <option value="3">Высокая</option>' +
                '          </select>' +
                '        </div>' +
                '        <div class="selector__name">Плотность</div>' +
                '      </div>' +
                '    </div>' +
                '    <div class="selector selector-focusable">' +
                '      <div class="selector__body">' +
                '        <div class="selector__items">' +
                '          <select class="selector-select" data-name="speed">' +
                '            <option value="0">Авто</option>' +
                '            <option value="1">Медленно</option>' +
                '            <option value="2">Нормально</option>' +
                '            <option value="3">Быстро</option>' +
                '          </select>' +
                '        </div>' +
                '        <div class="selector__name">Скорость</div>' +
                '      </div>' +
                '    </div>' +
                '    <div class="selector selector-focusable">' +
                '      <div class="selector__body">' +
                '        <div class="selector__items">' +
                '          <select class="selector-select" data-name="size">' +
                '            <option value="0">Авто</option>' +
                '            <option value="1">Маленькие</option>' +
                '            <option value="2">Средние</option>' +
                '            <option value="3">Крупные</option>' +
                '          </select>' +
                '        </div>' +
                '        <div class="selector__name">Размер частиц</div>' +
                '      </div>' +
                '    </div>' +
                '    <div class="settings-description">' +
                '      Атмосферный эффект тумана на фоне интерфейса. Автоматически отключается при открытии плеера или модальных окон.' +
                '    </div>' +
                '  </div>' +
                '</div>'
            );
            
            console.log('Fog Plugin: Successfully added to Lampa menu');
        }
    };
    
    // ===== ЗАПУСК ПЛАГИНА =====
    // Ждем загрузки страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                plugin.init();
            }, 1000);
        });
    } else {
        setTimeout(function() {
            plugin.init();
        }, 1000);
    }
    
})();
