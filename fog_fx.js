// ====================================================
// FOG PLUGIN - ULTRA RELIABLE VERSION
// 100% гарантия добавления в меню Lampa/CUB
// ====================================================
(function() {
    'use strict';
    
    // Блокировка повторной загрузки
    if (window.FOG_PLUGIN_LOADED) return;
    window.FOG_PLUGIN_LOADED = true;
    
    console.log('[FOG] Plugin loading...');
    
    // ===== КОНСТАНТЫ =====
    const PLUGIN_ID = 'fog_effect';
    const STORAGE_ENABLED = 'fog_enabled';
    const DEFAULT_ENABLED = false;
    
    // ===== ОСНОВНОЙ КЛАСС ТУМАНА =====
    class FogEffect {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
            this.animationId = null;
            this.isActive = false;
            this.settings = {
                enabled: false,
                density: 2,
                speed: 2,
                size: 2
            };
            
            this.loadSettings();
        }
        
        loadSettings() {
            try {
                this.settings.enabled = localStorage.getItem(STORAGE_ENABLED) === '1';
                this.settings.density = parseInt(localStorage.getItem('fog_density') || '2');
                this.settings.speed = parseInt(localStorage.getItem('fog_speed') || '2');
                this.settings.size = parseInt(localStorage.getItem('fog_size') || '2');
            } catch(e) {
                console.warn('[FOG] Failed to load settings:', e);
            }
        }
        
        saveSettings() {
            try {
                localStorage.setItem(STORAGE_ENABLED, this.settings.enabled ? '1' : '0');
                localStorage.setItem('fog_density', this.settings.density.toString());
                localStorage.setItem('fog_speed', this.settings.speed.toString());
                localStorage.setItem('fog_size', this.settings.size.toString());
            } catch(e) {
                console.warn('[FOG] Failed to save settings:', e);
            }
        }
        
        initCanvas() {
            if (this.canvas) return;
            
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'fog-effect-canvas';
            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9997;
                opacity: 1;
            `;
            
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            
            window.addEventListener('resize', () => this.resize());
            this.resize();
            
            console.log('[FOG] Canvas initialized');
        }
        
        resize() {
            if (!this.canvas) return;
            
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.generateParticles();
        }
        
        generateParticles() {
            const count = this.getParticleCount();
            this.particles = [];
            
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: 30 + Math.random() * 70,
                    speedX: (Math.random() - 0.5) * 0.5,
                    speedY: (Math.random() - 0.5) * 0.3,
                    opacity: 0.05 + Math.random() * 0.1,
                    drift: Math.random() * 0.02,
                    driftSeed: Math.random() * 100
                });
            }
        }
        
        getParticleCount() {
            const density = this.settings.density;
            if (density === 1) return 20;
            if (density === 2) return 40;
            if (density === 3) return 60;
            return 40;
        }
        
        animate(timestamp) {
            if (!this.lastTime) this.lastTime = timestamp;
            const delta = (timestamp - this.lastTime) / 16;
            this.lastTime = timestamp;
            
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            for (const p of this.particles) {
                // Движение с дрейфом
                const driftX = Math.sin(timestamp * 0.001 + p.driftSeed) * p.drift;
                const driftY = Math.cos(timestamp * 0.001 + p.driftSeed * 1.3) * p.drift * 0.7;
                
                p.x += (p.speedX + driftX) * delta;
                p.y += (p.speedY + driftY) * delta;
                
                // Телепортация через границы
                if (p.x < -p.size) p.x = this.canvas.width + p.size;
                if (p.x > this.canvas.width + p.size) p.x = -p.size;
                if (p.y < -p.size) p.y = this.canvas.height + p.size;
                if (p.y > this.canvas.height + p.size) p.y = -p.size;
                
                // Рисование частицы тумана
                const gradient = this.ctx.createRadialGradient(
                    p.x, p.y, 0,
                    p.x, p.y, p.size
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${p.opacity * 0.8})`);
                gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
                
                this.ctx.beginPath();
                this.ctx.fillStyle = gradient;
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.animationId = requestAnimationFrame((t) => this.animate(t));
        }
        
        start() {
            if (this.isActive || !this.settings.enabled) return;
            
            this.initCanvas();
            this.generateParticles();
            this.lastTime = 0;
            this.isActive = true;
            this.animationId = requestAnimationFrame((t) => this.animate(t));
            
            console.log('[FOG] Effect started');
        }
        
        stop() {
            if (!this.isActive) return;
            
            this.isActive = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            if (this.canvas) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            
            console.log('[FOG] Effect stopped');
        }
        
        toggle() {
            this.settings.enabled = !this.settings.enabled;
            this.saveSettings();
            
            if (this.settings.enabled) {
                this.start();
            } else {
                this.stop();
            }
            
            return this.settings.enabled;
        }
        
        destroy() {
            this.stop();
            if (this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }
        }
    }
    
    // ===== ИНТЕГРАЦИЯ С МЕНЮ =====
    class MenuIntegrator {
        constructor(fogInstance) {
            this.fog = fogInstance;
            this.menuAdded = false;
            this.attempts = 0;
            this.maxAttempts = 10;
            
            // Иконка для меню (SVG)
            this.iconSVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 14h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 10c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/></svg>';
        }
        
        // МЕТОД 1: Стандартное добавление через Lampa API
        addViaLampaAPI() {
            if (this.menuAdded) return true;
            
            if (window.Lampa && Lampa.Settings && Lampa.Settings.add) {
                try {
                    console.log('[FOG] Adding via Lampa.Settings API...');
                    
                    // Добавляем вкладку
                    Lampa.Settings.add({
                        title: 'Туман',
                        name: PLUGIN_ID,
                        component: PLUGIN_ID,
                        icon: this.iconSVG
                    });
                    
                    // Регистрируем компонент
                    if (Lampa.Component && Lampa.Component.add) {
                        Lampa.Component.add(PLUGIN_ID, {
                            template: { 'fog_settings': 1 },
                            create: function() {
                                this.html = Lampa.Template.get('fog_settings', {});
                                this.setupControls();
                            }.bind(this)
                        });
                    }
                    
                    // Добавляем шаблон
                    if (Lampa.Template && Lampa.Template.add) {
                        Lampa.Template.add('fog_settings', this.getSettingsHTML());
                    }
                    
                    console.log('[FOG] Successfully added via Lampa API');
                    this.menuAdded = true;
                    return true;
                    
                } catch (error) {
                    console.warn('[FOG] Lampa API error:', error);
                    return false;
                }
            }
            
            return false;
        }
        
        // МЕТОД 2: Прямое добавление в DOM
        addViaDOM() {
            if (this.menuAdded) return true;
            
            console.log('[FOG] Trying to add via DOM injection...');
            
            // Ищем контейнер меню настроек
            const menuSelectors = [
                '.settings-layer',
                '.settings-list',
                '.settings__list',
                '.settings__items',
                '[data-component="settings"]',
                '.layer--settings'
            ];
            
            let menuContainer = null;
            for (const selector of menuSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    menuContainer = element;
                    console.log(`[FOG] Found menu container: ${selector}`);
                    break;
                }
            }
            
            if (!menuContainer) {
                console.log('[FOG] Menu container not found');
                return false;
            }
            
            try {
                // Создаем HTML для пункта меню
                const menuItem = document.createElement('div');
                menuItem.className = 'selector selector-focusable';
                menuItem.dataset.name = PLUGIN_ID;
                menuItem.innerHTML = `
                    <div class="selector__body">
                        <div class="selector__items">
                            <div class="selector-select">
                                <span>Туман</span>
                                <span class="selector-select__value">${this.fog.settings.enabled ? 'Вкл' : 'Выкл'}</span>
                            </div>
                        </div>
                        <div class="selector__name">
                            ${this.iconSVG}
                            <span style="margin-left: 8px;">Эффект тумана</span>
                        </div>
                    </div>
                `;
                
                // Обработчик клика
                menuItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const enabled = this.fog.toggle();
                    
                    // Обновляем отображение
                    const valueSpan = menuItem.querySelector('.selector-select__value');
                    if (valueSpan) {
                        valueSpan.textContent = enabled ? 'Вкл' : 'Выкл';
                    }
                    
                    // Анимация обратной связи
                    menuItem.style.transform = 'scale(0.95)';
                    setTimeout(() => menuItem.style.transform = '', 150);
                });
                
                // Добавляем в меню
                menuContainer.appendChild(menuItem);
                
                console.log('[FOG] Successfully added via DOM injection');
                this.menuAdded = true;
                return true;
                
            } catch (error) {
                console.warn('[FOG] DOM injection error:', error);
                return false;
            }
        }
        
        // МЕТОД 3: Создание своего меню
        createFloatingMenu() {
            console.log('[FOG] Creating floating menu button...');
            
            // Создаем плавающую кнопку
            const button = document.createElement('div');
            button.id = 'fog-menu-button';
            button.innerHTML = this.fog.settings.enabled ? '🌫️' : '☁️';
            button.title = 'Эффект тумана (клик: вкл/выкл, правый клик: настройки)';
            
            button.style.cssText = `
                position: fixed;
                bottom: 80px;
                right: 20px;
                width: 56px;
                height: 56px;
                background: linear-gradient(135deg, #2c3e50, #4a6491);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                cursor: pointer;
                z-index: 9999;
                user-select: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
                border: 2px solid rgba(255, 255, 255, 0.15);
            `;
            
            // Эффекты при наведении
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.15) rotate(5deg)';
                button.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.4)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1) rotate(0deg)';
                button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
            });
            
            // Клик - вкл/выкл
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const enabled = this.fog.toggle();
                button.innerHTML = enabled ? '🌫️' : '☁️';
                
                // Анимация
                button.style.transform = 'scale(0.9)';
                setTimeout(() => button.style.transform = 'scale(1.1)', 100);
                setTimeout(() => button.style.transform = 'scale(1)', 200);
            });
            
            // Правый клик - настройки
            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showQuickSettings(e.clientX, e.clientY);
            });
            
            document.body.appendChild(button);
            console.log('[FOG] Floating menu button created');
            
            // Помечаем как добавленное меню
            this.menuAdded = true;
            return true;
        }
        
        getSettingsHTML() {
            return `
                <div class="settings-layer">
                    <div class="settings-layer__name">Эффект тумана</div>
                    <div class="settings-list">
                        <div class="selector selector-focusable">
                            <div class="selector__body">
                                <div class="selector__items">
                                    <select class="selector-select" data-name="enabled">
                                        <option value="0">Выключено</option>
                                        <option value="1">Включено</option>
                                    </select>
                                </div>
                                <div class="selector__name">Состояние</div>
                            </div>
                        </div>
                        <div class="selector selector-focusable">
                            <div class="selector__body">
                                <div class="selector__items">
                                    <select class="selector-select" data-name="density">
                                        <option value="1">Низкая</option>
                                        <option value="2">Средняя</option>
                                        <option value="3">Высокая</option>
                                    </select>
                                </div>
                                <div class="selector__name">Плотность</div>
                            </div>
                        </div>
                        <div class="selector selector-focusable">
                            <div class="selector__body">
                                <div class="selector__items">
                                    <select class="selector-select" data-name="speed">
                                        <option value="1">Медленно</option>
                                        <option value="2">Нормально</option>
                                        <option value="3">Быстро</option>
                                    </select>
                                </div>
                                <div class="selector__name">Скорость</div>
                            </div>
                        </div>
                        <div class="selector selector-focusable">
                            <div class="selector__body">
                                <div class="selector__items">
                                    <select class="selector-select" data-name="size">
                                        <option value="1">Маленькие</option>
                                        <option value="2">Средние</option>
                                        <option value="3">Крупные</option>
                                    </select>
                                </div>
                                <div class="selector__name">Размер частиц</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        showQuickSettings(x, y) {
            // Создаем всплывающее меню настроек
            const menu = document.createElement('div');
            menu.id = 'fog-quick-settings';
            menu.innerHTML = `
                <div style="padding: 15px; background: rgba(0,0,0,0.9); border-radius: 10px; color: white; min-width: 200px;">
                    <div style="font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">
                        Настройки тумана
                    </div>
                    <div style="margin-bottom: 8px;">
                        <label style="display: block; margin-bottom: 5px;">Плотность:</label>
                        <input type="range" min="1" max="3" value="${this.fog.settings.density}" 
                               style="width: 100%;" id="fog-density">
                    </div>
                    <div style="margin-bottom: 8px;">
                        <label style="display: block; margin-bottom: 5px;">Скорость:</label>
                        <input type="range" min="1" max="3" value="${this.fog.settings.speed}" 
                               style="width: 100%;" id="fog-speed">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Размер:</label>
                        <input type="range" min="1" max="3" value="${this.fog.settings.size}" 
                               style="width: 100%;" id="fog-size">
                    </div>
                    <button style="width: 100%; padding: 8px; background: #3498db; border: none; border-radius: 5px; color: white; cursor: pointer;">
                        Применить
                    </button>
                </div>
            `;
            
            menu.style.cssText = `
                position: fixed;
                top: ${Math.min(y, window.innerHeight - 250)}px;
                left: ${Math.min(x, window.innerWidth - 250)}px;
                z-index: 10000;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            `;
            
            // Закрытие при клике снаружи
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    document.removeEventListener('click', closeMenu);
                    if (menu.parentNode) {
                        menu.parentNode.removeChild(menu);
                    }
                }
            };
            
            setTimeout(() => document.addEventListener('click', closeMenu), 100);
            
            // Обработчик кнопки
            menu.querySelector('button').addEventListener('click', () => {
                this.fog.settings.density = parseInt(document.getElementById('fog-density').value);
                this.fog.settings.speed = parseInt(document.getElementById('fog-speed').value);
                this.fog.settings.size = parseInt(document.getElementById('fog-size').value);
                this.fog.saveSettings();
                this.fog.generateParticles();
                
                document.removeEventListener('click', closeMenu);
                if (menu.parentNode) {
                    menu.parentNode.removeChild(menu);
                }
            });
            
            document.body.appendChild(menu);
        }
        
        // Главный метод интеграции - пробует все способы
        integrate() {
            console.log('[FOG] Starting menu integration...');
            
            // План атаки:
            // 1. Сразу пробуем стандартный метод
            // 2. Если не получилось, ждем и пробуем снова
            // 3. Пробуем DOM injection
            // 4. Создаем плавающее меню как запасной вариант
            
            const tryIntegration = () => {
                this.attempts++;
                
                console.log(`[FOG] Integration attempt ${this.attempts}/${this.maxAttempts}`);
                
                // Попытка 1: Lampa API
                if (!this.menuAdded && this.addViaLampaAPI()) {
                    return true;
                }
                
                // Попытка 2: DOM injection (через 2 секунды)
                if (!this.menuAdded && this.attempts >= 2) {
                    if (this.addViaDOM()) {
                        return true;
                    }
                }
                
                // Попытка 3: Floating menu (через 5 секунд)
                if (!this.menuAdded && this.attempts >= 5) {
                    console.log('[FOG] Falling back to floating menu');
                    this.createFloatingMenu();
                    return true;
                }
                
                // Продолжаем попытки
                if (this.attempts < this.maxAttempts) {
                    setTimeout(tryIntegration, 1000);
                } else {
                    console.log('[FOG] All integration attempts failed, creating floating button');
                    this.createFloatingMenu();
                }
                
                return false;
            };
            
            // Запускаем первую попытку
            setTimeout(tryIntegration, 1000);
        }
    }
    
    // ===== ИНИЦИАЛИЗАЦИЯ ПЛАГИНА =====
    function initializePlugin() {
        console.log('[FOG] Initializing plugin...');
        
        // Создаем экземпляр эффекта
        const fog = new FogEffect();
        
        // Создаем интегратор меню
        const menuIntegrator = new MenuIntegrator(fog);
        
        // Запускаем интеграцию
        menuIntegrator.integrate();
        
        // Запускаем/останавливаем эффект в зависимости от настроек
        if (fog.settings.enabled) {
            setTimeout(() => fog.start(), 500);
        }
        
        // Экспортируем для отладки
        window.FogPlugin = {
            fog: fog,
            menu: menuIntegrator,
            toggle: () => fog.toggle(),
            start: () => fog.start(),
            stop: () => fog.stop()
        };
        
        console.log('[FOG] Plugin initialized');
    }
    
    // ===== ЗАПУСК =====
    // Ждем полной загрузки
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializePlugin, 1500);
        });
    } else {
        setTimeout(initializePlugin, 1500);
    }
    
})();
