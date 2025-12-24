// ====================================================
// FOG PLUGIN - COMPLETE WORKING VERSION
// ====================================================
(function() {
    'use strict';
    
    if (window.FOG_WORKING_LOADED) return;
    window.FOG_WORKING_LOADED = true;
    
    console.log('[FOG WORKING] Plugin loading...');
    
    // ===== КОНСТАНТЫ =====
    const STORAGE_ENABLED = 'fog_enabled';
    const DEFAULT_ENABLED = false;
    
    // ===== КЛАСС ЭФФЕКТА ТУМАНА =====
    class FogEffect {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
            this.animationId = null;
            this.isActive = false;
            this.settings = { enabled: DEFAULT_ENABLED };
            this.loadSettings();
        }
        
        loadSettings() {
            try {
                const saved = localStorage.getItem(STORAGE_ENABLED);
                this.settings.enabled = saved === '1';
            } catch(e) {
                console.warn('[FOG] Failed to load settings');
            }
        }
        
        saveSettings(enabled) {
            try {
                localStorage.setItem(STORAGE_ENABLED, enabled ? '1' : '0');
                this.settings.enabled = enabled;
            } catch(e) {
                console.warn('[FOG] Failed to save settings');
            }
        }
        
        initCanvas() {
            if (this.canvas) return;
            
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'fog-working-canvas';
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
            this.particles = [];
            const count = 40;
            
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: 40 + Math.random() * 80,
                    speedX: (Math.random() - 0.5) * 0.4,
                    speedY: (Math.random() - 0.5) * 0.3,
                    opacity: 0.05 + Math.random() * 0.1,
                    drift: Math.random() * 0.02,
                    driftSeed: Math.random() * 100
                });
            }
        }
        
        animate(timestamp) {
            if (!this.lastTime) this.lastTime = timestamp;
            const delta = (timestamp - this.lastTime) / 16;
            this.lastTime = timestamp;
            
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            for (const p of this.particles) {
                const driftX = Math.sin(timestamp * 0.001 + p.driftSeed) * p.drift;
                const driftY = Math.cos(timestamp * 0.001 + p.driftSeed * 1.3) * p.drift * 0.7;
                
                p.x += (p.speedX + driftX) * delta;
                p.y += (p.speedY + driftY) * delta;
                
                if (p.x < -p.size) p.x = this.canvas.width + p.size;
                if (p.x > this.canvas.width + p.size) p.x = -p.size;
                if (p.y < -p.size) p.y = this.canvas.height + p.size;
                if (p.y > this.canvas.height + p.size) p.y = -p.size;
                
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
            const enabled = !this.settings.enabled;
            this.saveSettings(enabled);
            
            if (enabled) {
                this.start();
            } else {
                this.stop();
            }
            
            return enabled;
        }
    }
    
    // ===== МЕНЕДЖЕР МЕНЮ =====
    class MenuManager {
        constructor(fogInstance) {
            this.fog = fogInstance;
            this.menuAdded = false;
            this.observer = null;
            
            // Создаем плавающую кнопку сразу
            this.createFloatingButton();
        }
        
        // Наблюдаем за появлением меню
        watchForMenu() {
            console.log('[FOG] Watching for menu...');
            
            // Ищем меню сразу
            this.checkForMenu();
            
            // Наблюдаем за DOM
            this.observer = new MutationObserver(() => {
                this.checkForMenu();
            });
            
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Также проверяем по таймеру
            setInterval(() => this.checkForMenu(), 1000);
        }
        
        // Проверяем наличие меню
        checkForMenu() {
            if (this.menuAdded) return;
            
            // Попробуем разные селекторы меню CUB
            const menuSelectors = [
                '.settings-layer',
                '.settings-list',
                '.selector-list',
                '.settings__layer',
                '.settings__list',
                '[data-component="settings"]',
                '.layer--settings'
            ];
            
            for (const selector of menuSelectors) {
                const menu = document.querySelector(selector);
                if (menu && menu.offsetParent !== null) { // Видимое меню
                    console.log(`[FOG] Found menu: ${selector}`);
                    this.addMenuItem(menu, selector);
                    break;
                }
            }
        }
        
        // Добавляем пункт в меню
        addMenuItem(menuContainer, selector) {
            try {
                console.log('[FOG] Adding menu item...');
                
                // Ищем контейнер для пунктов
                let itemsContainer = null;
                
                if (selector === '.settings-layer') {
                    itemsContainer = menuContainer.querySelector('.settings-list');
                } else if (selector.includes('settings')) {
                    itemsContainer = menuContainer.querySelector('.selector-list, .settings__list');
                }
                
                if (!itemsContainer) {
                    itemsContainer = menuContainer;
                }
                
                // Создаем пункт меню
                const menuItem = document.createElement('div');
                menuItem.className = 'selector selector-focusable';
                menuItem.dataset.name = 'fog_effect';
                menuItem.innerHTML = `
                    <div class="selector__body">
                        <div class="selector__items">
                            <div class="selector-select">
                                <span>Туман</span>
                                <span class="selector-select__value">${this.fog.settings.enabled ? 'Вкл' : 'Выкл'}</span>
                            </div>
                        </div>
                        <div class="selector__name">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; vertical-align: middle;">
                                <path d="M3 14h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 10c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/>
                            </svg>
                            Эффект тумана
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
                    
                    // Обновляем плавающую кнопку
                    this.updateFloatingButton(enabled);
                    
                    // Анимация
                    menuItem.style.transform = 'scale(0.95)';
                    setTimeout(() => menuItem.style.transform = '', 150);
                });
                
                // Добавляем в меню
                itemsContainer.appendChild(menuItem);
                
                this.menuAdded = true;
                console.log('[FOG] Menu item added successfully!');
                
            } catch (error) {
                console.warn('[FOG] Failed to add menu item:', error);
            }
        }
        
        // Плавающая кнопка
        createFloatingButton() {
            const button = document.createElement('div');
            button.id = 'fog-working-button';
            button.innerHTML = this.fog.settings.enabled ? '🌫️' : '☁️';
            button.title = 'Туман (клик: вкл/выкл)';
            
            button.style.cssText = `
                position: fixed;
                bottom: 20px;
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
                transition: all 0.3s;
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                border: 2px solid rgba(255,255,255,0.15);
            `;
            
            // Эффекты
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.1)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
            });
            
            // Клик
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const enabled = this.fog.toggle();
                
                button.innerHTML = enabled ? '🌫️' : '☁️';
                
                // Обновляем пункт в меню (если есть)
                this.updateMenuItems(enabled);
                
                // Анимация
                button.style.transform = 'scale(0.9)';
                setTimeout(() => button.style.transform = 'scale(1.1)', 100);
                setTimeout(() => button.style.transform = 'scale(1)', 200);
            });
            
            document.body.appendChild(button);
            console.log('[FOG] Floating button created');
        }
        
        updateFloatingButton(enabled) {
            const button = document.getElementById('fog-working-button');
            if (button) {
                button.innerHTML = enabled ? '🌫️' : '☁️';
            }
        }
        
        updateMenuItems(enabled) {
            const menuItems = document.querySelectorAll('[data-name="fog_effect"]');
            menuItems.forEach(item => {
                const valueSpan = item.querySelector('.selector-select__value');
                if (valueSpan) {
                    valueSpan.textContent = enabled ? 'Вкл' : 'Выкл';
                }
            });
        }
    }
    
    // ===== ИНИЦИАЛИЗАЦИЯ =====
    function initPlugin() {
        console.log('[FOG WORKING] Initializing...');
        
        // Создаем эффект
        const fog = new FogEffect();
        
        // Создаем менеджер меню
        const menuManager = new MenuManager(fog);
        
        // Начинаем наблюдение за меню
        setTimeout(() => menuManager.watchForMenu(), 2000);
        
        // Запускаем эффект если включен
        if (fog.settings.enabled) {
            setTimeout(() => fog.start(), 1000);
        }
        
        // Экспортируем для отладки
        window.FogWorking = {
            fog: fog,
            menu: menuManager,
            toggle: () => fog.toggle()
        };
        
        console.log('[FOG WORKING] Plugin ready');
    }
    
    // ===== ЗАПУСК =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initPlugin, 1000);
        });
    } else {
        setTimeout(initPlugin, 1000);
    }
    
})();
