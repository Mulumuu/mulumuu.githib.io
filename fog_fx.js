(function () {
    'use strict';
    
    // Проверяем, не загружен ли уже плагин
    if (window.__fogfx_loaded__) return;
    window.__fogfx_loaded__ = true;
    
    console.log('FogFX: Плагин загружается...');
    
    // Ждем полной загрузки Lampa
    var initAttempts = 0;
    var maxAttempts = 10;
    
    function initializePlugin() {
        console.log('FogFX: Попытка инициализации ' + (initAttempts + 1) + '/' + maxAttempts);
        
        if (!window.Lampa) {
            console.log('FogFX: Lampa не найдена, ждем...');
            if (++initAttempts < maxAttempts) {
                setTimeout(initializePlugin, 1000);
            }
            return;
        }
        
        // Проверяем наличие необходимых компонентов Lampa
        if (!Lampa.Settings || !Lampa.Settings.add) {
            console.log('FogFX: Lampa.Settings не готов, ждем...');
            if (++initAttempts < maxAttempts) {
                setTimeout(initializePlugin, 1000);
            }
            return;
        }
        
        console.log('FogFX: Lampa готова, начинаем инициализацию плагина');
        initFogFX();
    }
    
    function initFogFX() {
        // Константы для настроек
        var KEY_ENABLED = 'fogfx_enabled';
        var KEY_DENSITY = 'fogfx_density';
        var KEY_SPEED = 'fogfx_speed';
        var KEY_OPACITY = 'fogfx_opacity';
        
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
                opacity: num(storageGet(KEY_OPACITY, 2), 2)
            };
        };
        
        FogFX.prototype.init = function() {
            if (this.canvas || !this.config.enabled) return;
            
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'fog-fx-canvas';
            this.canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9998; opacity:0.7;';
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
            var count = [30, 45, 60, 80][this.config.density] || 60;
            
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
            if (this.running || !this.config.enabled) return;
            
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
        
        FogFX.prototype.toggle = function() {
            this.config.enabled = !this.config.enabled;
            storageSet(KEY_ENABLED, this.config.enabled ? 1 : 0);
            
            if (this.config.enabled) {
                this.start();
            } else {
                this.stop();
            }
            
            return this.config.enabled;
        };
        
        // Создаем экземпляр
        var fogInstance = new FogFX();
        
        // Автозапуск эффекта
        setTimeout(function() {
            if (fogInstance.config.enabled) {
                fogInstance.start();
            }
        }, 2000);
        
        // Делаем глобально доступным
        window.FogFX = fogInstance;
        
        // === ДОБАВЛЕНИЕ МЕНЮ НАСТРОЕК ===
        console.log('FogFX: Добавляем меню настроек...');
        
        // Добавляем пункт в меню настроек
        Lampa.Settings.add({
            title: 'Эффект тумана',
            name: 'fog_fx_settings',
            component: 'fog_fx_settings',
            icon: FOG_ICON,
            position: 10
        });
        
        // Создаем компонент настроек
        Lampa.Component.add('fog_fx_settings', {
            template: { 'fog_fx_settings': 1 },
            create: function() {
                console.log('FogFX: Создание компонента настроек');
                
                var self = this;
                
                // Загружаем шаблон
                self.html = Lampa.Template.get('fog_fx_settings', {});
                
                // Находим все селекторы
                var selectors = ['enabled', 'density', 'speed', 'opacity'];
                
                for (var i = 0; i < selectors.length; i++) {
                    var name = selectors[i];
                    var selector = self.html.find('.selector-select[data-name="' + name + '"]');
                    
                    if (selector.length) {
                        var key = 'fogfx_' + name;
                        var defaultValue = name === 'enabled' ? 1 : 2;
                        
                        // Устанавливаем сохраненное значение или значение по умолчанию
                        var savedValue = storageGet(key, defaultValue);
                        selector.val(savedValue);
                        
                        // Добавляем обработчик изменения
                        selector.on('change', function() {
                            var name = $(this).data('name');
                            var value = $(this).val();
                            var key = 'fogfx_' + name;
                            
                            console.log('FogFX: Изменена настройка ' + name + ' = ' + value);
                            storageSet(key, value);
                            
                            // Обновляем конфиг и перезапускаем эффект
                            fogInstance.config[name] = num(value, 2);
                            
                            if (fogInstance.config.enabled) {
                                fogInstance.stop();
                                setTimeout(function() {
                                    fogInstance.start();
                                }, 100);
                            }
                        });
                    }
                }
            }
        });
        
        // Добавляем шаблон для настроек
        Lampa.Template.add('fog_fx_settings',
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
            '          <option value="0">Низкая</option>' +
            '          <option value="1">Средняя</option>' +
            '          <option value="2" selected>Высокая</option>' +
            '          <option value="3">Очень высокая</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="selector" data-name="speed">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Скорость движения</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Медленно</option>' +
            '          <option value="1">Средне</option>' +
            '          <option value="2" selected>Быстро</option>' +
            '          <option value="3">Очень быстро</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="selector" data-name="opacity">' +
            '      <div class="selector__body">' +
            '        <div class="selector-title">Непрозрачность</div>' +
            '        <select class="selector-select">' +
            '          <option value="0">Слабая</option>' +
            '          <option value="1">Средняя</option>' +
            '          <option value="2" selected>Сильная</option>' +
            '          <option value="3">Очень сильная</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>'
        );
        
        console.log('FogFX: Меню настроек успешно добавлено!');
        console.log('FogFX: Плагин полностью инициализирован');
    }
    
    // Запускаем инициализацию
    setTimeout(initializePlugin, 1000);
})();
