(function () {
    'use strict';
    
    // Проверяем, не загружен ли уже плагин
    if (window.__fogfx_loaded__) return;
    window.__fogfx_loaded__ = true;
    
    console.log('FogFX: Плагин загружается...');
    
    // Ждем полной загрузки Lampa
    function waitForLampa(callback) {
        if (window.Lampa && Lampa.Manifest && Lampa.Activity) {
            console.log('FogFX: Lampa найдена, запускаем инициализацию');
            setTimeout(callback, 100);
        } else {
            console.log('FogFX: Ожидание Lampa...');
            setTimeout(function() { waitForLampa(callback); }, 500);
        }
    }
    
    // Основная инициализация
    waitForLampa(function() {
        console.log('FogFX: Начинаем инициализацию плагина');
        
        // Константы для настроек
        var KEY_ENABLED = 'fogfx_enabled';
        var KEY_DENSITY = 'fogfx_density';
        var KEY_SPEED = 'fogfx_speed';
        var KEY_OPACITY = 'fogfx_opacity';
        var KEY_IN_CARD = 'fogfx_in_card';
        
        // Иконка для меню
        var FOG_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 15h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 11c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/></svg>';
        
        // Вспомогательные функции
        function storageGet(key, def) {
            try {
                if (window.Lampa && Lampa.Storage && Lampa.Storage.get) {
                    return Lampa.Storage.get(key, def);
                }
            } catch(e) {}
            try {
                var val = localStorage.getItem(key);
                return val !== null ? JSON.parse(val) : def;
            } catch(e) {
                return def;
            }
        }
        
        function storageSet(key, val) {
            try {
                if (window.Lampa && Lampa.Storage && Lampa.Storage.set) {
                    Lampa.Storage.set(key, val);
                    return;
                }
            } catch(e) {}
            try {
                localStorage.setItem(key, JSON.stringify(val));
            } catch(e) {}
        }
        
        function num(v, def) {
            v = Number(v);
            return isNaN(v) ? def : v;
        }
        
        // Определение платформы
        function getPlatform() {
            if (/Tizen/i.test(navigator.userAgent)) return 'tizen';
            if (/Android/i.test(navigator.userAgent)) return 'android';
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
            return 'desktop';
        }
        
        // Класс эффекта тумана
        var FogFX = function() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
            this.animationId = 0;
            this.running = false;
            this.width = 0;
            this.height = 0;
            this.config = {
                enabled: num(storageGet(KEY_ENABLED, 1), 1),
                density: num(storageGet(KEY_DENSITY, 2), 2),
                speed: num(storageGet(KEY_SPEED, 2), 2),
                opacity: num(storageGet(KEY_OPACITY, 2), 2),
                inCard: num(storageGet(KEY_IN_CARD, 0), 0)
            };
            this.platform = getPlatform();
            this.onAllowedScreen = true;
            this.overlayOpen = false;
        };
        
        FogFX.prototype.init = function() {
            if (this.canvas || !this.config.enabled) return;
            
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'fog-fx-canvas';
            this.canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9998; opacity:0.8;';
            document.body.appendChild(this.canvas);
            
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', this.resize.bind(this));
            
            this.createParticles();
        };
        
        FogFX.prototype.resize = function() {
            if (!this.canvas) return;
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;
            this.createParticles();
        };
        
        FogFX.prototype.createParticles = function() {
            // Определяем количество частиц в зависимости от плотности и платформы
            var baseCount = 60;
            if (this.platform === 'tizen') baseCount = 30;
            if (this.platform === 'android') baseCount = 50;
            
            var densityMultiplier = [0.5, 0.8, 1.0, 1.3][this.config.density] || 1.0;
            var count = Math.floor(baseCount * densityMultiplier);
            
            this.particles = [];
            for (var i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    size: Math.random() * 40 + 20,
                    speedX: (Math.random() - 0.5) * 0.5,
                    speedY: (Math.random() - 0.5) * 0.3,
                    opacity: Math.random() * 0.15 + 0.05,
                    wave: Math.random() * Math.PI * 2
                });
            }
        };
        
        FogFX.prototype.animate = function(time) {
            if (!this.ctx || !this.canvas || !this.running) return;
            
            this.ctx.clearRect(0, 0, this.width, this.height);
            
            var speedMultiplier = [0.6, 0.8, 1.0, 1.3][this.config.speed] || 1.0;
            var opacityMultiplier = [0.5, 0.8, 1.0, 1.2][this.config.opacity] || 1.0;
            
            for (var i = 0; i < this.particles.length; i++) {
                var p = this.particles[i];
                
                // Волнообразное движение
                var waveX = Math.sin(time * 0.001 + p.wave) * 0.2;
                var waveY = Math.cos(time * 0.001 + p.wave * 0.7) * 0.1;
                
                p.x += (p.speedX + waveX) * speedMultiplier;
                p.y += (p.speedY + waveY) * speedMultiplier;
                
                // Границы экрана
                var margin = p.size * 2;
                if (p.x < -margin) p.x = this.width + margin;
                if (p.x > this.width + margin) p.x = -margin;
                if (p.y < -margin) p.y = this.height + margin;
                if (p.y > this.height + margin) p.y = -margin;
                
                // Рисуем частицу с градиентом
                var gradient = this.ctx.createRadialGradient(
                    p.x, p.y, 0,
                    p.x, p.y, p.size
                );
                
                var opacity = p.opacity * opacityMultiplier;
                gradient.addColorStop(0, 'rgba(255, 255, 255, ' + (opacity * 0.8) + ')');
                gradient.addColorStop(0.5, 'rgba(255, 255, 255, ' + (opacity * 0.3) + ')');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                this.ctx.beginPath();
                this.ctx.fillStyle = gradient;
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.animationId = requestAnimationFrame(this.animate.bind(this));
        };
        
        FogFX.prototype.start = function() {
            if (this.running || !this.config.enabled || !this.onAllowedScreen || this.overlayOpen) return;
            
            this.init();
            this.running = true;
            this.animate(0);
            console.log('FogFX: Эффект запущен');
        };
        
        FogFX.prototype.stop = function() {
            this.running = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = 0;
            }
            if (this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
                this.canvas = null;
                this.ctx = null;
            }
            console.log('FogFX: Эффект остановлен');
        };
        
        FogFX.prototype.updateConfig = function() {
            this.config = {
                enabled: num(storageGet(KEY_ENABLED, 1), 1),
                density: num(storageGet(KEY_DENSITY, 2), 2),
                speed: num(storageGet(KEY_SPEED, 2), 2),
                opacity: num(storageGet(KEY_OPACITY, 2), 2),
                inCard: num(storageGet(KEY_IN_CARD, 0), 0)
            };
            
            if (this.config.enabled && this.running) {
                this.stop();
                setTimeout(function() { fogInstance.start(); }, 100);
            } else if (!this.config.enabled) {
                this.stop();
            }
        };
        
        // Создаем экземпляр
        var fogInstance = new FogFX();
        
        // Определяем, на каких экранах показывать эффект
        var ALLOWED_COMPONENTS = {
            main: 1, home: 1, start: 1,
            cub: 1,
            movies: 1, movie: 1,
            tv: 1, series: 1, serial: 1,
            category: 1, catalog: 1
        };
        
        function isAllowedActivity(activity) {
            if (!activity || !activity.component) return false;
            return !!ALLOWED_COMPONENTS[activity.component];
        }
        
        // Определение открытых оверлеев (упрощенно)
        function detectOverlayOpen() {
            return !!document.querySelector('.settings, .modal, .dialog, .selectbox, .notification');
        }
        
        // Функция обновления состояния
        function updateState() {
            fogInstance.overlayOpen = detectOverlayOpen();
            
            if (fogInstance.config.enabled && fogInstance.onAllowedScreen && !fogInstance.overlayOpen) {
                fogInstance.start();
            } else {
                fogInstance.stop();
            }
        }
        
        // Подписываемся на события Lampa
        if (Lampa.Activity && Lampa.Activity.active) {
            Lampa.Activity.active(function(activity) {
                fogInstance.onAllowedScreen = isAllowedActivity(activity);
                updateState();
            });
        }
        
        // Проверка оверлеев
        setInterval(function() {
            updateState();
        }, 1000);
        
        // Добавление меню настроек
        function addSettingsMenu() {
            console.log('FogFX: Добавление меню настроек...');
            
            // Ждем, пока Lampa.Settings станет доступен
            if (!Lampa.Settings || !Lampa.Settings.add) {
                console.log('FogFX: Lampa.Settings не доступен, повтор через 1 секунду');
                setTimeout(addSettingsMenu, 1000);
                return;
            }
            
            try {
                // Добавляем пункт в меню настроек
                Lampa.Settings.add({
                    title: 'Эффект тумана',
                    name: 'plugin_fog_fx',
                    component: 'plugin_fog_fx',
                    icon: FOG_ICON
                });
                
                // Создаем компонент настроек
                Lampa.Component.add('plugin_fog_fx', {
                    template: { 'plugin_fog_fx': 1 },
                    create: function() {
                        console.log('FogFX: Создание компонента настроек');
                        
                        this.html = Lampa.Template.get('plugin_fog_fx', {});
                        
                        // Находим все селекторы
                        var selectors = ['enabled', 'density', 'speed', 'opacity', 'in_card'];
                        
                        for (var i = 0; i < selectors.length; i++) {
                            var name = selectors[i];
                            var selector = this.html.find('.selector-select[data-name="' + name + '"]');
                            
                            if (selector.length) {
                                var key = 'fogfx_' + name;
                                var defaultValue = name === 'enabled' ? 1 : (name === 'density' ? 2 : (name === 'speed' ? 2 : (name === 'opacity' ? 2 : 0)));
                                
                                // Устанавливаем сохраненное значение или значение по умолчанию
                                selector.val(storageGet(key, defaultValue));
                                
                                // Добавляем обработчик изменения
                                selector.on('change', function() {
                                    var name = $(this).data('name');
                                    var value = $(this).val();
                                    var key = 'fogfx_' + name;
                                    
                                    storageSet(key, value);
                                    fogInstance.updateConfig();
                                });
                            }
                        }
                    }
                });
                
                // Добавляем шаблон для настроек
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
                    '          <option value="0">Очень низкая</option>' +
                    '          <option value="1">Низкая</option>' +
                    '          <option value="2" selected>Средняя</option>' +
                    '          <option value="3">Высокая</option>' +
                    '        </select>' +
                    '      </div>' +
                    '    </div>' +
                    '    <div class="selector" data-name="speed">' +
                    '      <div class="selector__body">' +
                    '        <div class="selector-title">Скорость движения</div>' +
                    '        <select class="selector-select">' +
                    '          <option value="0">Очень медленно</option>' +
                    '          <option value="1">Медленно</option>' +
                    '          <option value="2" selected>Средняя</option>' +
                    '          <option value="3">Быстро</option>' +
                    '        </select>' +
                    '      </div>' +
                    '    </div>' +
                    '    <div class="selector" data-name="opacity">' +
                    '      <div class="selector__body">' +
                    '        <div class="selector-title">Непрозрачность</div>' +
                    '        <select class="selector-select">' +
                    '          <option value="0">Очень слабая</option>' +
                    '          <option value="1">Слабая</option>' +
                    '          <option value="2" selected>Средняя</option>' +
                    '          <option value="3">Сильная</option>' +
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
                
                console.log('FogFX: Меню настроек успешно добавлено!');
                
            } catch (error) {
                console.error('FogFX: Ошибка при добавлении меню:', error);
            }
        }
        
        // Запускаем добавление меню с задержкой
        setTimeout(addSettingsMenu, 2000);
        
        // Автозапуск эффекта
        setTimeout(function() {
            updateState();
        }, 3000);
        
        // Делаем глобально доступным
        window.FogFX = fogInstance;
        
        console.log('FogFX: Плагин успешно инициализирован');
    });
})();
