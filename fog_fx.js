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

    // Простой эффект тумана
    var FogFX = function () {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = 0;
        this.running = false;
        this.enabled = true;
        this.menuAdded = false;
    };

    FogFX.prototype.init = function () {
        if (this.canvas || !this.enabled) return;
        
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fog-fx-canvas';
        this.canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9998; opacity:0.7;';
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', this.resize.bind(this));
        
        this.createParticles(80);
    };

    FogFX.prototype.resize = function () {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.createParticles(80);
    };

    FogFX.prototype.createParticles = function (count) {
        this.particles = [];
        for (var i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * (this.canvas ? this.canvas.width : window.innerWidth),
                y: Math.random() * (this.canvas ? this.canvas.height : window.innerHeight),
                size: Math.random() * 60 + 30,
                speedX: (Math.random() - 0.5) * 0.4,
                speedY: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.25 + 0.05,
                wave: Math.random() * Math.PI * 2
            });
        }
    };

    FogFX.prototype.animate = function () {
        if (!this.ctx || !this.canvas || !this.running) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        var time = Date.now() * 0.001;
        
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            
            // Волнообразное движение для эффекта тумана
            p.x += p.speedX + Math.sin(time + p.wave) * 0.1;
            p.y += p.speedY + Math.cos(time + p.wave * 0.7) * 0.05;
            
            // Плавное изменение размера
            p.size += Math.sin(time * 2 + i) * 0.1;
            
            // Границы с запасом
            var margin = p.size * 2;
            if (p.x < -margin) p.x = this.canvas.width + margin;
            if (p.x > this.canvas.width + margin) p.x = -margin;
            if (p.y < -margin) p.y = this.canvas.height + margin;
            if (p.y > this.canvas.height + margin) p.y = -margin;
            
            // Градиент для частицы тумана
            var gradient = this.ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, p.size
            );
            
            // Мягкий белый туман
            gradient.addColorStop(0, 'rgba(255, 255, 255, ' + (p.opacity * 0.9) + ')');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, ' + (p.opacity * 0.3) + ')');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.beginPath();
            this.ctx.fillStyle = gradient;
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        if (this.running) {
            this.animationId = requestAnimationFrame(this.animate.bind(this));
        }
    };

    FogFX.prototype.start = function () {
        if (this.running || !this.enabled) return;
        this.init();
        this.running = true;
        this.animate();
        console.log('FogFX: Эффект запущен');
    };

    FogFX.prototype.stop = function () {
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

    FogFX.prototype.toggle = function () {
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.start();
        } else {
            this.stop();
        }
        return this.enabled;
    };

    // Глобальный объект
    var fog = new FogFX();

    // ==================== ФУНКЦИЯ ДОБАВЛЕНИЯ МЕНЮ ====================
    function addMenuToSettings() {
        console.log('FogFX: Попытка добавить меню...');
        
        // Проверяем наличие необходимых объектов Lampa
        if (!window.Lampa) {
            console.log('FogFX: Lampa не загружена, ждем...');
            setTimeout(addMenuToSettings, 1000);
            return;
        }
        
        if (!Lampa.Settings || !Lampa.Settings.add) {
            console.log('FogFX: Lampa.Settings не доступен, ждем...');
            setTimeout(addMenuToSettings, 1000);
            return;
        }
        
        // Проверяем, не добавлено ли уже меню
        if (fog.menuAdded) {
            console.log('FogFX: Меню уже добавлено');
            return;
        }
        
        try {
            // Добавляем пункт в настройки
            Lampa.Settings.add({
                title: 'Эффект тумана',
                name: 'fog_fx_settings',
                component: 'fog_fx_settings',
                icon: FOG_ICON
            });
            
            console.log('FogFX: Пункт меню добавлен в Lampa.Settings');
            
            // Создаем компонент настроек
            Lampa.Component.add('fog_fx_settings', {
                template: { 'fog_fx_settings': 1 },
                create: function () {
                    console.log('FogFX: Создание компонента настроек');
                    
                    var self = this;
                    self.html = $('<div class="settings-layer">' +
                        '<div class="settings__content">' +
                        '<div class="selector">' +
                        '<div class="selector__body">' +
                        '<div class="selector-title">Включить эффект тумана</div>' +
                        '<select class="selector-select" id="fog-toggle">' +
                        '<option value="1">Да</option>' +
                        '<option value="0">Нет</option>' +
                        '</select>' +
                        '</div>' +
                        '</div>' +
                        '<div class="selector">' +
                        '<div class="selector__body">' +
                        '<div class="selector-title">Интенсивность тумана</div>' +
                        '<select class="selector-select" id="fog-intensity">' +
                        '<option value="0.3">Слабая</option>' +
                        '<option value="0.5" selected>Средняя</option>' +
                        '<option value="0.7">Сильная</option>' +
                        '<option value="0.9">Очень сильная</option>' +
                        '</select>' +
                        '</div>' +
                        '</div>' +
                        '<div class="selector">' +
                        '<div class="selector__body">' +
                        '<div class="selector-title">Скорость движения</div>' +
                        '<select class="selector-select" id="fog-speed">' +
                        '<option value="0.5">Медленно</option>' +
                        '<option value="1" selected>Нормально</option>' +
                        '<option value="1.5">Быстро</option>' +
                        '<option value="2">Очень быстро</option>' +
                        '</select>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>');
                    
                    // Загружаем сохраненные настройки
                    var savedEnabled = localStorage.getItem('fogfx_enabled');
                    if (savedEnabled !== null) {
                        fog.enabled = savedEnabled === '1';
                        self.html.find('#fog-toggle').val(fog.enabled ? '1' : '0');
                    }
                    
                    var savedIntensity = localStorage.getItem('fogfx_intensity');
                    if (savedIntensity) {
                        self.html.find('#fog-intensity').val(savedIntensity);
                    }
                    
                    var savedSpeed = localStorage.getItem('fogfx_speed');
                    if (savedSpeed) {
                        self.html.find('#fog-speed').val(savedSpeed);
                    }
                    
                    // Обработчики изменений
                    self.html.find('.selector-select').on('change', function () {
                        var id = $(this).attr('id');
                        var value = $(this).val();
                        
                        if (id === 'fog-toggle') {
                            fog.enabled = value === '1';
                            localStorage.setItem('fogfx_enabled', fog.enabled ? '1' : '0');
                            
                            if (fog.enabled) {
                                fog.start();
                            } else {
                                fog.stop();
                            }
                        } else if (id === 'fog-intensity') {
                            localStorage.setItem('fogfx_intensity', value);
                            // Применяем изменение интенсивности
                            fog.stop();
                            setTimeout(function() {
                                if (fog.enabled) fog.start();
                            }, 100);
                        } else if (id === 'fog-speed') {
                            localStorage.setItem('fogfx_speed', value);
                            // Обновляем скорость
                            for (var i = 0; i < fog.particles.length; i++) {
                                fog.particles[i].speedX *= (value / 1);
                                fog.particles[i].speedY *= (value / 1);
                            }
                        }
                        
                        console.log('FogFX: Настройка изменена:', id, '=', value);
                    });
                }
            });
            
            // Добавляем шаблон
            Lampa.Template.add('fog_fx_settings', '<div></div>');
            
            fog.menuAdded = true;
            console.log('FogFX: Меню успешно добавлено в настройки!');
            
        } catch (error) {
            console.error('FogFX: Ошибка при добавлении меню:', error);
            setTimeout(addMenuToSettings, 2000);
        }
    }

    // ==================== АЛЬТЕРНАТИВНЫЙ СПОСОБ: РУЧНОЕ ДОБАВЛЕНИЕ КНОПКИ ====================
    function addManualMenuButton() {
        console.log('FogFX: Пробуем добавить кнопку вручную...');
        
        // Ждем загрузки DOM
        setTimeout(function() {
            // Ищем меню настроек
            var settingsMenu = document.querySelector('.settings__menu, .settings-menu, [data-layer="settings"]');
            
            if (settingsMenu) {
                console.log('FogFX: Найдено меню настроек');
                
                // Создаем элемент меню
                var menuItem = document.createElement('div');
                menuItem.className = 'settings-menu__item selector';
                menuItem.innerHTML = `
                    <div class="selector__body">
                        <div class="selector-title" style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 24px; height: 24px;">${FOG_ICON}</div>
                            <span>Эффект тумана</span>
                        </div>
                        <div class="selector-arrow">
                            <svg width="7" height="12" viewBox="0 0 7 12"><path d="M0 0h2l5 6-5 6H0l5-6z"/></svg>
                        </div>
                    </div>
                `;
                
                // Добавляем обработчик клика
                menuItem.addEventListener('click', function() {
                    console.log('FogFX: Открытие настроек тумана');
                    showFogSettings();
                });
                
                // Добавляем в меню
                settingsMenu.appendChild(menuItem);
                console.log('FogFX: Кнопка добавлена в меню вручную');
                
            } else {
                console.log('FogFX: Меню настроек не найдено, пробуем снова...');
                setTimeout(addManualMenuButton, 1000);
            }
        }, 2000);
    }

    // ==================== ОКНО НАСТРОЕК ТУМАНА ====================
    function showFogSettings() {
        // Создаем модальное окно
        var modal = document.createElement('div');
        modal.className = 'modal fog-settings-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        var content = document.createElement('div');
        content.className = 'modal-content';
        content.style.cssText = `
            background: #1a1a1a;
            padding: 20px;
            border-radius: 10px;
            max-width: 500px;
            width: 90%;
            color: white;
        `;
        
        content.innerHTML = `
            <h2 style="margin-bottom: 20px; color: #fff;">Настройки эффекта тумана</h2>
            
            <div class="setting-row" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #ccc;">Включить эффект:</label>
                <select id="fog-enable-modal" style="width: 100%; padding: 8px; background: #2a2a2a; color: white; border: 1px solid #444; border-radius: 5px;">
                    <option value="1">Да</option>
                    <option value="0">Нет</option>
                </select>
            </div>
            
            <div class="setting-row" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #ccc;">Интенсивность:</label>
                <select id="fog-intensity-modal" style="width: 100%; padding: 8px; background: #2a2a2a; color: white; border: 1px solid #444; border-radius: 5px;">
                    <option value="0.3">Слабая</option>
                    <option value="0.5" selected>Средняя</option>
                    <option value="0.7">Сильная</option>
                    <option value="0.9">Очень сильная</option>
                </select>
            </div>
            
            <div class="setting-row" style="margin-bottom: 25px;">
                <label style="display: block; margin-bottom: 5px; color: #ccc;">Скорость движения:</label>
                <select id="fog-speed-modal" style="width: 100%; padding: 8px; background: #2a2a2a; color: white; border: 1px solid #444; border-radius: 5px;">
                    <option value="0.5">Медленно</option>
                    <option value="1" selected>Нормально</option>
                    <option value="1.5">Быстро</option>
                    <option value="2">Очень быстро</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button id="fog-save-btn" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Сохранить</button>
                <button id="fog-close-btn" style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">Закрыть</button>
            </div>
        `;
        
        // Загружаем сохраненные значения
        var savedEnabled = localStorage.getItem('fogfx_enabled');
        if (savedEnabled !== null) {
            content.querySelector('#fog-enable-modal').value = savedEnabled;
        }
        
        var savedIntensity = localStorage.getItem('fogfx_intensity');
        if (savedIntensity) {
            content.querySelector('#fog-intensity-modal').value = savedIntensity;
        }
        
        var savedSpeed = localStorage.getItem('fogfx_speed');
        if (savedSpeed) {
            content.querySelector('#fog-speed-modal').value = savedSpeed;
        }
        
        // Обработчики событий
        content.querySelector('#fog-save-btn').addEventListener('click', function() {
            var enabled = content.querySelector('#fog-enable-modal').value === '1';
            var intensity = content.querySelector('#fog-intensity-modal').value;
            var speed = content.querySelector('#fog-speed-modal').value;
            
            // Сохраняем настройки
            localStorage.setItem('fogfx_enabled', enabled ? '1' : '0');
            localStorage.setItem('fogfx_intensity', intensity);
            localStorage.setItem('fogfx_speed', speed);
            
            // Применяем настройки
            fog.enabled = enabled;
            
            if (enabled) {
                fog.stop();
                setTimeout(function() {
                    fog.start();
                }, 100);
            } else {
                fog.stop();
            }
            
            // Закрываем окно
            document.body.removeChild(modal);
            console.log('FogFX: Настройки сохранены');
        });
        
        content.querySelector('#fog-close-btn').addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        // Закрытие по клику на фон
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    function initialize() {
        console.log('FogFX: Инициализация плагина');
        
        // Загружаем сохраненные настройки
        var savedEnabled = localStorage.getItem('fogfx_enabled');
        if (savedEnabled !== null) {
            fog.enabled = savedEnabled === '1';
        }
        
        // Пробуем оба способа добавления меню
        addMenuToSettings();
        addManualMenuButton();
        
        // Автозапуск эффекта
        setTimeout(function() {
            if (fog.enabled) {
                console.log('FogFX: Автозапуск эффекта');
                fog.start();
            }
        }, 3000);
        
        // Добавляем в глобальную область видимости для управления из консоли
        window.FogFX = fog;
        
        console.log('FogFX: Плагин инициализирован');
    }

    // Запускаем инициализацию
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 1000);
    }
})();
