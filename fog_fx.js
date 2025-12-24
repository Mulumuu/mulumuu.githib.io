(function () {
    'use strict';
    
    // Проверяем, не загружен ли уже плагин
    if (window.__fogfx_loaded__) return;
    window.__fogfx_loaded__ = true;
    
    console.log('FogFX: Плагин загружается...');
    
    // Основные переменные
    var fogInstance = null;
    var menuAdded = false;
    
    // Ждем полной загрузки Lampa
    function waitForLampa(callback) {
        if (window.Lampa) {
            console.log('FogFX: Lampa найдена');
            setTimeout(callback, 500);
        } else {
            setTimeout(function() { waitForLampa(callback); }, 500);
        }
    }
    
    // Инициализация эффекта тумана
    function initFogFX() {
        console.log('FogFX: Инициализация эффекта тумана');
        
        // Константы для настроек
        var KEY_ENABLED = 'fogfx_enabled';
        var KEY_DENSITY = 'fogfx_density';
        var KEY_SPEED = 'fogfx_speed';
        var KEY_OPACITY = 'fogfx_opacity';
        
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
        fogInstance = new FogFX();
        
        // Автозапуск эффекта
        setTimeout(function() {
            if (fogInstance.config.enabled) {
                fogInstance.start();
            }
        }, 2000);
        
        // Делаем глобально доступным
        window.FogFX = fogInstance;
        
        console.log('FogFX: Эффект тумана инициализирован');
        
        // Пробуем добавить меню
        tryAddMenu();
    }
    
    // Функция добавления меню (пробуем разные методы)
    function tryAddMenu() {
        console.log('FogFX: Пробуем добавить меню...');
        
        // Метод 1: Через Lampa.Manager (если существует)
        if (window.Lampa && Lampa.Manager && typeof Lampa.Manager.add === 'function') {
            console.log('FogFX: Используем Lampa.Manager.add');
            try {
                Lampa.Manager.add({
                    title: 'Эффект тумана',
                    name: 'fog_fx_settings',
                    component: 'fog_fx_settings',
                    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 15h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 11c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/></svg>'
                });
                menuAdded = true;
                console.log('FogFX: Меню добавлено через Lampa.Manager');
                return;
            } catch(e) {
                console.error('FogFX: Ошибка через Lampa.Manager:', e);
            }
        }
        
        // Метод 2: Через Lampa.Settings (если правильная структура)
        if (window.Lampa && Lampa.Settings) {
            console.log('FogFX: Проверяем структуру Lampa.Settings');
            console.log('Lampa.Settings keys:', Object.keys(Lampa.Settings));
            
            // Ищем метод добавления в объекте
            for (var key in Lampa.Settings) {
                if (typeof Lampa.Settings[key] === 'function' && 
                    (key.includes('add') || key.includes('register') || key.includes('push'))) {
                    console.log('FogFX: Найден возможный метод:', key);
                    try {
                        Lampa.Settings[key]({
                            title: 'Эффект тумана',
                            name: 'fog_fx_settings',
                            component: 'fog_fx_settings',
                            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 15h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 11c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/></svg>'
                        });
                        menuAdded = true;
                        console.log('FogFX: Меню добавлено через Lampa.Settings.' + key);
                        return;
                    } catch(e) {
                        console.error('FogFX: Ошибка через Lampa.Settings.' + key + ':', e);
                    }
                }
            }
        }
        
        // Метод 3: Прямое добавление в DOM
        setTimeout(function() {
            if (!menuAdded) {
                console.log('FogFX: Пробуем прямое добавление в DOM');
                addMenuDirectly();
            }
        }, 5000);
    }
    
    // Прямое добавление меню в DOM
    function addMenuDirectly() {
        console.log('FogFX: Прямое добавление меню в DOM');
        
        // Функция для создания окна настроек
        function createSettingsWindow() {
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:center;';
            
            var dialog = document.createElement('div');
            dialog.style.cssText = 'background:#1a1a1a; padding:20px; border-radius:10px; max-width:400px; width:90%; color:white;';
            
            dialog.innerHTML = `
                <h2 style="color:#fff; margin-bottom:20px;">Настройки тумана</h2>
                
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; color:#ccc;">Включить эффект:</label>
                    <select id="fogEnable" style="width:100%; padding:8px; background:#2a2a2a; color:white; border:1px solid #444; border-radius:5px;">
                        <option value="1">Да</option>
                        <option value="0">Нет</option>
                    </select>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; color:#ccc;">Плотность:</label>
                    <select id="fogDensity" style="width:100%; padding:8px; background:#2a2a2a; color:white; border:1px solid #444; border-radius:5px;">
                        <option value="0">Низкая</option>
                        <option value="1">Средняя</option>
                        <option value="2" selected>Высокая</option>
                        <option value="3">Очень высокая</option>
                    </select>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; color:#ccc;">Скорость:</label>
                    <select id="fogSpeed" style="width:100%; padding:8px; background:#2a2a2a; color:white; border:1px solid #444; border-radius:5px;">
                        <option value="0">Медленно</option>
                        <option value="1">Средне</option>
                        <option value="2" selected>Быстро</option>
                        <option value="3">Очень быстро</option>
                    </select>
                </div>
                
                <div style="margin-bottom:25px;">
                    <label style="display:block; margin-bottom:5px; color:#ccc;">Непрозрачность:</label>
                    <select id="fogOpacity" style="width:100%; padding:8px; background:#2a2a2a; color:white; border:1px solid #444; border-radius:5px;">
                        <option value="0">Слабая</option>
                        <option value="1">Средняя</option>
                        <option value="2" selected>Сильная</option>
                        <option value="3">Очень сильная</option>
                    </select>
                </div>
                
                <div style="display:flex; gap:10px;">
                    <button id="fogSave" style="flex:1; padding:10px; background:#4CAF50; color:white; border:none; border-radius:5px; cursor:pointer;">Сохранить</button>
                    <button id="fogClose" style="flex:1; padding:10px; background:#f44336; color:white; border:none; border-radius:5px; cursor:pointer;">Закрыть</button>
                </div>
            `;
            
            // Загружаем сохраненные значения
            dialog.querySelector('#fogEnable').value = localStorage.getItem('fogfx_enabled') || '1';
            dialog.querySelector('#fogDensity').value = localStorage.getItem('fogfx_density') || '2';
            dialog.querySelector('#fogSpeed').value = localStorage.getItem('fogfx_speed') || '2';
            dialog.querySelector('#fogOpacity').value = localStorage.getItem('fogfx_opacity') || '2';
            
            // Обработчики
            dialog.querySelector('#fogSave').addEventListener('click', function() {
                var enabled = dialog.querySelector('#fogEnable').value;
                var density = dialog.querySelector('#fogDensity').value;
                var speed = dialog.querySelector('#fogSpeed').value;
                var opacity = dialog.querySelector('#fogOpacity').value;
                
                localStorage.setItem('fogfx_enabled', enabled);
                localStorage.setItem('fogfx_density', density);
                localStorage.setItem('fogfx_speed', speed);
                localStorage.setItem('fogfx_opacity', opacity);
                
                if (window.FogFX) {
                    window.FogFX.config.enabled = enabled === '1';
                    window.FogFX.config.density = parseInt(density);
                    window.FogFX.config.speed = parseInt(speed);
                    window.FogFX.config.opacity = parseInt(opacity);
                    
                    if (window.FogFX.config.enabled) {
                        window.FogFX.stop();
                        setTimeout(function() { window.FogFX.start(); }, 100);
                    } else {
                        window.FogFX.stop();
                    }
                }
                
                document.body.removeChild(overlay);
                console.log('FogFX: Настройки сохранены');
            });
            
            dialog.querySelector('#fogClose').addEventListener('click', function() {
                document.body.removeChild(overlay);
            });
            
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                }
            });
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
        }
        
        // Добавляем кнопку в интерфейс Lampa
        setTimeout(function() {
            // Ищем меню настроек Lampa
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === 1) {
                                // Проверяем, является ли это меню настроек
                                if (node.className && typeof node.className === 'string' &&
                                    (node.className.includes('settings') || 
                                     node.className.includes('menu') ||
                                     node.querySelector && node.querySelector('.selector'))) {
                                    
                                    // Создаем пункт меню
                                    var menuItem = document.createElement('div');
                                    menuItem.className = 'selector';
                                    menuItem.style.cssText = 'cursor:pointer; padding:12px 16px;';
                                    menuItem.innerHTML = `
                                        <div class="selector__body" style="display:flex; align-items:center; gap:12px;">
                                            <div style="width:24px; height:24px;">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M3 15h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 11c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/>
                                                </svg>
                                            </div>
                                            <div class="selector-title" style="color:#fff; font-size:16px;">Эффект тумана</div>
                                            <div class="selector-arrow">
                                                <svg width="7" height="12" viewBox="0 0 7 12">
                                                    <path d="M0 0h2l5 6-5 6H0l5-6z" fill="currentColor"/>
                                                </svg>
                                            </div>
                                        </div>
                                    `;
                                    
                                    menuItem.addEventListener('click', createSettingsWindow);
                                    
                                    // Добавляем в меню
                                    if (node.querySelector('.selector')) {
                                        node.insertBefore(menuItem, node.querySelector('.selector'));
                                        console.log('FogFX: Меню добавлено в DOM');
                                        observer.disconnect();
                                    }
                                }
                            }
                        });
                    }
                });
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
            
            // Также добавляем кнопку в правый верхний угол
            setTimeout(function() {
                var floatBtn = document.createElement('button');
                floatBtn.innerHTML = '🌫️';
                floatBtn.title = 'Настройки тумана';
                floatBtn.style.cssText = `
                    position:fixed;
                    top:15px;
                    right:15px;
                    width:40px;
                    height:40px;
                    border-radius:50%;
                    background:#2196F3;
                    color:white;
                    border:none;
                    font-size:20px;
                    cursor:pointer;
                    z-index:9997;
                    box-shadow:0 4px 8px rgba(0,0,0,0.3);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                `;
                
                floatBtn.addEventListener('click', createSettingsWindow);
                document.body.appendChild(floatBtn);
                
                console.log('FogFX: Плавающая кнопка добавлена');
            }, 3000);
            
        }, 2000);
    }
    
    // Запускаем инициализацию
    waitForLampa(initFogFX);
    
    console.log('FogFX: Загрузка плагина завершена');
})();
