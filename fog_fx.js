// ====================================================
// FOG PLUGIN - DYNAMIC MENU INTEGRATION
// Добавляет пункт при ОТКРЫТИИ меню настроек
// ====================================================
(function() {
    'use strict';
    
    if (window.FOG_DYNAMIC_LOADED) return;
    window.FOG_DYNAMIC_LOADED = true;
    
    console.log('[FOG Dynamic] Plugin loading...');
    
    // ===== КОНСТАНТЫ =====
    const PLUGIN_ID = 'fog_dynamic';
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
            this.settings = { enabled: false };
            this.loadSettings();
        }
        
        loadSettings() {
            try {
                this.settings.enabled = localStorage.getItem(STORAGE_ENABLED) === '1';
            } catch(e) {}
        }
        
        saveSettings(enabled) {
            try {
                localStorage.setItem(STORAGE_ENABLED, enabled ? '1' : '0');
                this.settings.enabled = enabled;
            } catch(e) {}
        }
        
        // ... (остальные методы класса FogEffect из предыдущего кода)
        // initCanvas(), generateParticles(), animate(), start(), stop()
        // Вставьте сюда ВСЕ методы из предыдущего класса FogEffect
    }
    
    // ===== ДИНАМИЧЕСКИЙ ИНТЕГРАТОР МЕНЮ =====
    class DynamicMenuIntegrator {
        constructor(fogInstance) {
            this.fog = fogInstance;
            this.menuAdded = false;
            this.menuObserver = null;
            this.iconSVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 14h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 10c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/></svg>';
            
            // Создаем плавающую кнопку сразу
            this.createFloatingButton();
        }
        
        // МЕТОД 1: Наблюдаем за открытием меню
        startMenuObserver() {
            console.log('[FOG Dynamic] Starting menu observer...');
            
            // Следим за изменениями в DOM
            this.menuObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    // Проверяем, появилось ли меню настроек
                    if (mutation.addedNodes.length > 0) {
                        this.checkForSettingsMenu();
                    }
                });
            });
            
            // Начинаем наблюдение
            this.menuObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Также проверяем по таймеру
            setInterval(() => this.checkForSettingsMenu(), 1000);
        }
        
        // Проверяем наличие меню настроек
        checkForSettingsMenu() {
            if (this.menuAdded) return;
            
            // Ищем меню настроек Lampa
            const menuSelectors = [
                '.settings-layer',
                '.settings__layer',
                '[data-component="settings"]',
                '.layer--settings'
            ];
            
            for (const selector of menuSelectors) {
                const menu = document.querySelector(selector);
                if (menu) {
                    console.log(`[FOG Dynamic] Found settings menu: ${selector}`);
                    this.addToMenu(menu);
                    break;
                }
            }
        }
        
        // Добавляем пункт в найденное меню
        addToMenu(menuContainer) {
            if (this.menuAdded) return;
            
            try {
                console.log('[FOG Dynamic] Adding menu item...');
                
                // Ищем контейнер для пунктов меню
                let itemsContainer = menuContainer.querySelector('.settings-list, .settings__list, .selector-list');
                
                if (!itemsContainer) {
                    // Если не нашли, используем сам контейнер меню
                    itemsContainer = menuContainer;
                }
                
                // Создаем HTML для нашего пункта
                const menuItemHTML = `
                    <div class="selector selector-focusable" data-name="${PLUGIN_ID}">
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
                    </div>
                `;
                
                // Создаем элемент
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = menuItemHTML;
                const menuItem = tempDiv.firstChild;
                
                // Добавляем обработчик клика
                menuItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const enabled = !this.fog.settings.enabled;
                    
                    this.fog.saveSettings(enabled);
                    
                    if (enabled) {
                        this.fog.start();
                    } else {
                        this.fog.stop();
                    }
                    
                    // Обновляем отображение
                    const valueSpan = menuItem.querySelector('.selector-select__value');
                    if (valueSpan) {
                        valueSpan.textContent = enabled ? 'Вкл' : 'Выкл';
                    }
                    
                    // Анимация
                    menuItem.style.transform = 'scale(0.95)';
                    setTimeout(() => menuItem.style.transform = '', 150);
                });
                
                // Добавляем в меню
                itemsContainer.appendChild(menuItem);
                
                this.menuAdded = true;
                console.log('[FOG Dynamic] Menu item added successfully!');
                
                // Останавливаем наблюдение
                if (this.menuObserver) {
                    this.menuObserver.disconnect();
                }
                
            } catch (error) {
                console.warn('[FOG Dynamic] Failed to add menu item:', error);
            }
        }
        
        // МЕТОД 2: Плавающая кнопка (всегда доступна)
        createFloatingButton() {
            console.log('[FOG Dynamic] Creating floating button...');
            
            const button = document.createElement('div');
            button.id = 'fog-dynamic-button';
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
            
            // Обработчик клика
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const enabled = !this.fog.settings.enabled;
                
                this.fog.saveSettings(enabled);
                button.innerHTML = enabled ? '🌫️' : '☁️';
                
                if (enabled) {
                    this.fog.start();
                } else {
                    this.fog.stop();
                }
                
                // Обновляем пункт в меню (если он есть)
                this.updateMenuItems(enabled);
                
                // Анимация
                button.style.transform = 'scale(0.9)';
                setTimeout(() => button.style.transform = 'scale(1.1)', 100);
                setTimeout(() => button.style.transform = 'scale(1)', 200);
            });
            
            document.body.appendChild(button);
        }
        
        // Обновляем все пункты меню
        updateMenuItems(enabled) {
            const menuItems = document.querySelectorAll(`[data-name="${PLUGIN_ID}"]`);
            menuItems.forEach(item => {
                const valueSpan = item.querySelector('.selector-select__value');
                if (valueSpan) {
                    valueSpan.textContent = enabled ? 'Вкл' : 'Выкл';
                }
            });
        }
        
        // Запуск интеграции
        integrate() {
            console.log('[FOG Dynamic] Starting integration...');
            
            // Сразу пробуем найти меню (на случай если оно уже открыто)
            this.checkForSettingsMenu();
            
            // Запускаем наблюдение
            this.startMenuObserver();
            
            // Запускаем эффект если включен
            if (this.fog.settings.enabled) {
                setTimeout(() => this.fog.start(), 500);
            }
        }
    }
    
    // ===== ИНИЦИАЛИЗАЦИЯ =====
    function initialize() {
        console.log('[FOG Dynamic] Initializing...');
        
        // Создаем эффект
        const fog = new FogEffect();
        
        // Создаем интегратор
        const integrator = new DynamicMenuIntegrator(fog);
        
        // Запускаем интеграцию
        setTimeout(() => integrator.integrate(), 1000);
        
        // Экспортируем для отладки
        window.FogDynamic = {
            fog: fog,
            integrator: integrator
        };
        
        console.log('[FOG Dynamic] Initialized');
    }
    
    // ===== ЗАПУСК =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initialize, 1500);
        });
    } else {
        setTimeout(initialize, 1500);
    }
    
})();
