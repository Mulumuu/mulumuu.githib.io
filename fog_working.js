// =========================================
// FOG WORKING PLUGIN - TV FRIENDLY VERSION
// Настройки для телевизора, туман на фоне
// =========================================

(function() {
    'use strict';
    
    console.log('[FOG TV] Loading TV-friendly version...');
    
    class FogWorkingTV {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
            this.animationId = null;
            this.enabled = false;
            this.settingsPanel = null;
            this.currentFocus = 0; // Для навигации по TV
            this.settingsItems = []; // Элементы настроек для навигации
            
            // Конфигурация оптимизированная для TV
            this.config = {
                enabled: false,
                preset: 'medium', // light, medium, heavy, custom
                density: 1.0,     // 0.5 - 2.0
                speed: 1.0,       // 0.5 - 2.0
                opacity: 1.0,     // 0.5 - 1.5
                color: 'blue',    // blue, purple, gray, green
                particleCount: 60,
                
                // Пресеты для быстрого выбора
                presets: {
                    light: { density: 0.7, speed: 0.8, opacity: 0.7, color: 'blue' },
                    medium: { density: 1.0, speed: 1.0, opacity: 1.0, color: 'blue' },
                    heavy: { density: 1.5, speed: 1.2, opacity: 1.3, color: 'gray' },
                    custom: { density: 1.0, speed: 1.0, opacity: 1.0, color: 'blue' }
                },
                
                colors: {
                    blue: { r: 100, g: 150, b: 220 },
                    purple: { r: 150, g: 100, b: 220 },
                    gray: { r: 150, g: 150, b: 180 },
                    green: { r: 100, g: 180, b: 150 }
                }
            };
            
            this.loadSettings();
            this.init();
        }
        
        loadSettings() {
            try {
                const saved = localStorage.getItem('fog_tv_settings');
                if (saved) {
                    Object.assign(this.config, JSON.parse(saved));
                }
            } catch (e) {}
        }
        
        saveSettings() {
            try {
                localStorage.setItem('fog_tv_settings', JSON.stringify({
                    enabled: this.config.enabled,
                    preset: this.config.preset,
                    density: this.config.density,
                    speed: this.config.speed,
                    opacity: this.config.opacity,
                    color: this.config.color
                }));
            } catch (e) {}
        }
        
        init() {
            console.log('[FOG TV] Initializing for TV...');
            
            // Создаем canvas САМЫМ ПЕРВЫМ элементом на странице
            this.createBackgroundCanvas();
            
            // Инициализируем частицы
            this.initParticles();
            
            // Добавляем в меню настроек CUB
            this.addToSettingsMenu();
            
            // Запускаем если включено
            if (this.config.enabled) {
                this.start();
            }
            
            // Добавляем обработчики клавиш для TV
            this.addTVNavigation();
            
            window.FogWorking = this;
        }
        
        // =========================================
        // CANVAS НА ФОНЕ (ПОД ВСЕМИ ЭЛЕМЕНТАМИ)
        // =========================================
        createBackgroundCanvas() {
            // Удаляем старый canvas если есть
            const oldCanvas = document.querySelector('.fog-bg-canvas');
            if (oldCanvas) oldCanvas.remove();
            
            // Создаем новый canvas
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'fog-bg-canvas';
            
            // ВАЖНО: z-index: -1 чтобы был под всем контентом
            this.canvas.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                pointer-events: none !important;
                z-index: -1 !important; /* Отрицательный z-index для фона */
                opacity: 0.6 !important;
                display: none;
            `;
            
            // Вставляем canvas ПЕРВЫМ элементом в body
            document.body.insertBefore(this.canvas, document.body.firstChild);
            
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
            
            // Обработчик изменения размера окна
            window.addEventListener('resize', () => this.resizeCanvas());
            
            console.log('[FOG TV] Background canvas created (z-index: -1)');
        }
        
        resizeCanvas() {
            if (this.canvas) {
                this.canvas.width = window.innerWidth * window.devicePixelRatio;
                this.canvas.height = window.innerHeight * window.devicePixelRatio;
                this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            }
        }
        
        // =========================================
        // НАВИГАЦИЯ ДЛЯ ТЕЛЕВИЗОРА (DPad, пульт)
        // =========================================
        addTVNavigation() {
            // Обработчик клавиш для навигации в настройках
            document.addEventListener('keydown', (e) => {
                // Работаем только когда открыта панель настроек
                if (!this.settingsPanel || !this.settingsPanel.style.display !== 'flex') {
                    return;
                }
                
                switch(e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        this.navigate(-1);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.navigate(1);
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.adjustSetting(-1);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.adjustSetting(1);
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.activateCurrentItem();
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.closeSettingsPanel();
                        break;
                    case 'Backspace':
                        e.preventDefault();
                        this.closeSettingsPanel();
                        break;
                }
            });
        }
        
        navigate(direction) {
            const items = this.settingsItems;
            if (items.length === 0) return;
            
            // Убираем фокус с текущего элемента
            if (items[this.currentFocus]) {
                items[this.currentFocus].classList.remove('focused');
            }
            
            // Перемещаем фокус
            this.currentFocus += direction;
            
            // Зацикливаем навигацию
            if (this.currentFocus < 0) this.currentFocus = items.length - 1;
            if (this.currentFocus >= items.length) this.currentFocus = 0;
            
            // Добавляем фокус новому элементу
            if (items[this.currentFocus]) {
                items[this.currentFocus].classList.add('focused');
                items[this.currentFocus].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
        
        adjustSetting(direction) {
            const currentItem = this.settingsItems[this.currentFocus];
            if (!currentItem) return;
            
            const type = currentItem.dataset.type;
            const id = currentItem.dataset.id;
            
            if (type === 'slider') {
                const slider = document.getElementById(id);
                if (slider) {
                    const step = parseFloat(slider.step) || 0.1;
                    const newValue = parseFloat(slider.value) + (step * direction);
                    const min = parseFloat(slider.min);
                    const max = parseFloat(slider.max);
                    
                    slider.value = Math.max(min, Math.min(max, newValue));
                    slider.dispatchEvent(new Event('input'));
                }
            } else if (type === 'preset') {
                const presets = ['light', 'medium', 'heavy', 'custom'];
                const currentIndex = presets.indexOf(this.config.preset);
                let newIndex = currentIndex + direction;
                
                if (newIndex < 0) newIndex = presets.length - 1;
                if (newIndex >= presets.length) newIndex = 0;
                
                this.config.preset = presets[newIndex];
                this.applyPreset(this.config.preset);
                this.updatePresetUI();
            } else if (type === 'color') {
                const colors = ['blue', 'purple', 'gray', 'green'];
                const currentIndex = colors.indexOf(this.config.color);
                let newIndex = currentIndex + direction;
                
                if (newIndex < 0) newIndex = colors.length - 1;
                if (newIndex >= colors.length) newIndex = 0;
                
                this.config.color = colors[newIndex];
                this.updateColorUI();
                this.saveSettings();
                this.updateParticles();
            }
        }
        
        activateCurrentItem() {
            const currentItem = this.settingsItems[this.currentFocus];
            if (!currentItem) return;
            
            if (currentItem.dataset.type === 'toggle') {
                const checkbox = document.getElementById('fog-tv-enabled');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            } else if (currentItem.dataset.type === 'button') {
                currentItem.click();
            }
        }
        
        // =========================================
        // МЕНЮ НАСТРОЕК ДЛЯ ТЕЛЕВИЗОРА
        // =========================================
        addToSettingsMenu() {
            const tryAdd = () => {
                try {
                    const menuContainer = document.querySelector('.settings__body .scroll__body');
                    if (!menuContainer) {
                        setTimeout(tryAdd, 1000);
                        return;
                    }
                    
                    if (document.querySelector('[data-component="fog_tv"]')) {
                        return;
                    }
                    
                    const fogFolder = document.createElement('div');
                    fogFolder.className = 'settings-folder selector';
                    fogFolder.dataset.component = 'fog_tv';
                    fogFolder.innerHTML = `
                        <div class="settings-folder__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
                            </svg>
                        </div>
                        <div class="settings-folder__name">Фоновый туман (TV)</div>
                    `;
                    
                    fogFolder.addEventListener('click', () => {
                        this.openTVSettingsPanel();
                    });
                    
                    const foldersContainer = menuContainer.querySelector('div');
                    const backupFolder = foldersContainer.querySelector('[data-component="backup"]');
                    
                    if (foldersContainer && backupFolder) {
                        foldersContainer.insertBefore(fogFolder, backupFolder);
                        console.log('[FOG TV] Added to TV settings menu');
                    }
                    
                } catch (error) {
                    setTimeout(tryAdd, 2000);
                }
            };
            
            setTimeout(tryAdd, 2000);
        }
        
        openTVSettingsPanel() {
            if (this.settingsPanel) {
                this.settingsPanel.remove();
            }
            
            // Создаем панель настроек для TV
            this.settingsPanel = document.createElement('div');
            this.settingsPanel.id = 'fog-tv-settings';
            
            this.settingsPanel.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Arial', sans-serif;
            `;
            
            // Основной контейнер настроек
            const settingsContainer = document.createElement('div');
            settingsContainer.style.cssText = `
                width: 800px;
                max-width: 90%;
                max-height: 90%;
                background: #1a1d28;
                border-radius: 16px;
                overflow: hidden;
                border: 3px solid rgba(255,255,255,0.1);
            `;
            
            // Заголовок
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 30px;
                background: linear-gradient(135deg, #2d3748, #4a5568);
                text-align: center;
                border-bottom: 3px solid rgba(255,255,255,0.1);
            `;
            
            header.innerHTML = `
                <div style="font-size: 40px; margin-bottom: 10px;">🌫️</div>
                <h1 style="margin: 0; font-size: 28px; color: white; font-weight: bold;">
                    Фоновый туман
                </h1>
                <div style="color: rgba(255,255,255,0.7); font-size: 16px; margin-top: 10px;">
                    Настройки для телевизора (используйте стрелки и OK)
                </div>
            `;
            
            // Контент настроек
            const content = document.createElement('div');
            content.style.cssText = `
                padding: 30px;
                overflow-y: auto;
                max-height: 500px;
            `;
            
            content.innerHTML = `
                <div class="tv-setting-item focused" data-type="toggle" data-id="fog-tv-enabled">
                    <div class="tv-setting-label">
                        <div style="font-size: 24px; margin-right: 15px;">⚡</div>
                        <div>
                            <div class="tv-setting-title">Включить эффект тумана</div>
                            <div class="tv-setting-desc">Атмосферный фон под интерфейсом</div>
                        </div>
                    </div>
                    <label class="tv-switch">
                        <input type="checkbox" id="fog-tv-enabled" ${this.config.enabled ? 'checked' : ''}>
                        <span class="tv-slider"></span>
                    </label>
                </div>
                
                <div class="tv-setting-item" data-type="preset" data-id="fog-preset">
                    <div class="tv-setting-label">
                        <div style="font-size: 24px; margin-right: 15px;">🎯</div>
                        <div>
                            <div class="tv-setting-title">Предустановки</div>
                            <div class="tv-setting-desc">Быстрый выбор интенсивности</div>
                        </div>
                    </div>
                    <div class="tv-preset-container">
                        <button class="tv-preset-btn ${this.config.preset === 'light' ? 'active' : ''}" 
                                data-preset="light">Легкий</button>
                        <button class="tv-preset-btn ${this.config.preset === 'medium' ? 'active' : ''}" 
                                data-preset="medium">Средний</button>
                        <button class="tv-preset-btn ${this.config.preset === 'heavy' ? 'active' : ''}" 
                                data-preset="heavy">Интенсивный</button>
                    </div>
                </div>
                
                <div class="tv-setting-item" data-type="slider" data-id="fog-density">
                    <div class="tv-setting-label">
                        <div style="font-size: 24px; margin-right: 15px;">📊</div>
                        <div>
                            <div class="tv-setting-title">Плотность тумана</div>
                            <div class="tv-setting-desc">Количество частиц на экране</div>
                        </div>
                    </div>
                    <div style="flex: 1; margin: 0 20px;">
                        <input type="range" id="fog-density" min="0.5" max="2.0" step="0.1" 
                               value="${this.config.density}" class="tv-slider">
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                            <span style="font-size: 12px; color: #888;">Мало</span>
                            <span style="font-size: 14px; color: #4CAF50; font-weight: bold;" 
                                  id="fog-density-value">${this.config.density.toFixed(1)}x</span>
                            <span style="font-size: 12px; color: #888;">Много</span>
                        </div>
                    </div>
                </div>
                
                <div class="tv-setting-item" data-type="slider" data-id="fog-speed">
                    <div class="tv-setting-label">
                        <div style="font-size: 24px; margin-right: 15px;">⚡</div>
                        <div>
                            <div class="tv-setting-title">Скорость движения</div>
                            <div class="tv-setting-desc">Как быстро движутся частицы</div>
                        </div>
                    </div>
                    <div style="flex: 1; margin: 0 20px;">
                        <input type="range" id="fog-speed" min="0.5" max="2.0" step="0.1" 
                               value="${this.config.speed}" class="tv-slider">
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                            <span style="font-size: 12px; color: #888;">Медленно</span>
                            <span style="font-size: 14px; color: #4CAF50; font-weight: bold;" 
                                  id="fog-speed-value">${this.config.speed.toFixed(1)}x</span>
                            <span style="font-size: 12px; color: #888;">Быстро</span>
                        </div>
                    </div>
                </div>
                
                <div class="tv-setting-item" data-type="slider" data-id="fog-opacity">
                    <div class="tv-setting-label">
                        <div style="font-size: 24px; margin-right: 15px;">👁️</div>
                        <div>
                            <div class="tv-setting-title">Прозрачность</div>
                            <div class="tv-setting-desc">Насколько туман заметен</div>
                        </div>
                    </div>
                    <div style="flex: 1; margin: 0 20px;">
                        <input type="range" id="fog-opacity" min="0.5" max="1.5" step="0.1" 
                               value="${this.config.opacity}" class="tv-slider">
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                            <span style="font-size: 12px; color: #888;">Прозрачный</span>
                            <span style="font-size: 14px; color: #4CAF50; font-weight: bold;" 
                                  id="fog-opacity-value">${this.config.opacity.toFixed(1)}x</span>
                            <span style="font-size: 12px; color: #888;">Непрозрачный</span>
                        </div>
                    </div>
                </div>
                
                <div class="tv-setting-item" data-type="color" data-id="fog-color">
                    <div class="tv-setting-label">
                        <div style="font-size: 24px; margin-right: 15px;">🎨</div>
                        <div>
                            <div class="tv-setting-title">Цвет тумана</div>
                            <div class="tv-setting-desc">Цветовая схема эффекта</div>
                        </div>
                    </div>
                    <div class="tv-color-container">
                        <button class="tv-color-btn ${this.config.color === 'blue' ? 'active' : ''}" 
                                data-color="blue" style="background: #3b82f6;">
                            Синий
                        </button>
                        <button class="tv-color-btn ${this.config.color === 'purple' ? 'active' : ''}" 
                                data-color="purple" style="background: #8b5cf6;">
                            Фиолетовый
                        </button>
                        <button class="tv-color-btn ${this.config.color === 'gray' ? 'active' : ''}" 
                                data-color="gray" style="background: #6b7280;">
                            Серый
                        </button>
                        <button class="tv-color-btn ${this.config.color === 'green' ? 'active' : ''}" 
                                data-color="green" style="background: #10b981;">
                            Зеленый
                        </button>
                    </div>
                </div>
                
                <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid rgba(255,255,255,0.1);">
                    <div class="tv-setting-item" data-type="button" data-id="fog-apply">
                        <button id="fog-apply-btn" class="tv-action-btn" style="background: #4CAF50;">
                            <span style="font-size: 20px; margin-right: 10px;">✅</span>
                            Применить настройки
                        </button>
                    </div>
                    
                    <div class="tv-setting-item" data-type="button" data-id="fog-reset">
                        <button id="fog-reset-btn" class="tv-action-btn" style="background: #ef4444;">
                            <span style="font-size: 20px; margin-right: 10px;">🔄</span>
                            Сбросить к стандартным
                        </button>
                    </div>
                    
                    <div class="tv-setting-item" data-type="button" data-id="fog-close">
                        <button id="fog-close-btn" class="tv-action-btn" style="background: #6b7280;">
                            <span style="font-size: 20px; margin-right: 10px;">❌</span>
                            Закрыть настройки
                        </button>
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <div style="font-size: 24px; margin-right: 15px;">🎮</div>
                        <div style="font-weight: bold; color: white;">Управление с пульта:</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 14px;">
                        <div style="color: #ccc;">⬆️⬇️</div>
                        <div style="color: #aaa;">Навигация вверх/вниз</div>
                        
                        <div style="color: #ccc;">⬅️➡️</div>
                        <div style="color: #aaa;">Изменение значения</div>
                        
                        <div style="color: #ccc;">OK/Enter</div>
                        <div style="color: #aaa;">Выбрать/Включить</div>
                        
                        <div style="color: #ccc;">Назад/Esc</div>
                        <div style="color: #aaa;">Закрыть настройки</div>
                    </div>
                </div>
            `;
            
            settingsContainer.appendChild(header);
            settingsContainer.appendChild(content);
            this.settingsPanel.appendChild(settingsContainer);
            document.body.appendChild(this.settingsPanel);
            
            // Блокируем скролл
            document.body.style.overflow = 'hidden';
            
            // Инициализируем навигацию
            this.initTVNavigation();
            
            // Добавляем обработчики
            this.addTVSettingsEventListeners();
        }
        
        initTVNavigation() {
            // Собираем все элементы для навигации
            this.settingsItems = Array.from(document.querySelectorAll('.tv-setting-item'));
            this.currentFocus = 0;
            
            // Добавляем фокус первому элементу
            if (this.settingsItems[0]) {
                this.settingsItems[0].classList.add('focused');
            }
            
            // Добавляем стили для TV навигации
            this.addTVStyles();
        }
        
        addTVStyles() {
            const style = document.createElement('style');
            style.textContent = `
                /* Стили для TV навигации */
                .tv-setting-item {
                    display: flex;
                    align-items: center;
                    padding: 20px;
                    margin-bottom: 15px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    border: 2px solid transparent;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                
                .tv-setting-item:hover {
                    background: rgba(255,255,255,0.08);
                }
                
                .tv-setting-item.focused {
                    background: rgba(59, 130, 246, 0.15);
                    border-color: #3b82f6;
                    transform: scale(1.02);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                
                .tv-setting-label {
                    display: flex;
                    align-items: center;
                    flex: 1;
                }
                
                .tv-setting-title {
                    color: white;
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 5px;
                }
                
                .tv-setting-desc {
                    color: rgba(255,255,255,0.6);
                    font-size: 14px;
                }
                
                /* Переключатель для TV */
                .tv-switch {
                    position: relative;
                    display: inline-block;
                    width: 70px;
                    height: 36px;
                }
                
                .tv-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .tv-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: #4a5568;
                    transition: .3s;
                    border-radius: 36px;
                }
                
                .tv-slider:before {
                    position: absolute;
                    content: "";
                    height: 28px;
                    width: 28px;
                    left: 4px;
                    bottom: 4px;
                    background: white;
                    transition: .3s;
                    border-radius: 50%;
                }
                
                input:checked + .tv-slider {
                    background: #4CAF50;
                }
                
                input:checked + .tv-slider:before {
                    transform: translateX(34px);
                }
                
                /* Кнопки пресетов */
                .tv-preset-container {
                    display: flex;
                    gap: 10px;
                }
                
                .tv-preset-btn {
                    padding: 12px 20px;
                    border: 2px solid #4a5568;
                    background: transparent;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                    min-width: 80px;
                }
                
                .tv-preset-btn.active {
                    background: #3b82f6;
                    border-color: #3b82f6;
                    transform: scale(1.05);
                }
                
                /* Кнопки цветов */
                .tv-color-container {
                    display: flex;
                    gap: 10px;
                }
                
                .tv-color-btn {
                    padding: 12px 20px;
                    border: 2px solid transparent;
                    background: transparent;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                    min-width: 80px;
                }
                
                .tv-color-btn.active {
                    border-color: white;
                    transform: scale(1.05);
                    box-shadow: 0 0 15px currentColor;
                }
                
                /* Слайдеры для TV */
                input[type="range"].tv-slider {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 10px;
                    background: linear-gradient(to right, #2d3748, #3b82f6);
                    border-radius: 5px;
                    outline: none;
                }
                
                input[type="range"].tv-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 26px;
                    height: 26px;
                    background: white;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 3px solid #3b82f6;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                }
                
                /* Кнопки действий */
                .tv-action-btn {
                    width: 100%;
                    padding: 18px;
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-size: 18px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    transition: all 0.2s;
                    margin-bottom: 10px;
                }
                
                .tv-action-btn:hover, .tv-action-btn:focus {
                    transform: scale(1.02);
                    opacity: 0.9;
                }
                
                /* Скроллбар для TV */
                ::-webkit-scrollbar {
                    width: 12px;
                }
                
                ::-webkit-scrollbar-track {
                    background: #2d3748;
                    border-radius: 6px;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: #4a5568;
                    border-radius: 6px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: #3b82f6;
                }
            `;
            
            document.head.appendChild(style);
        }
        
        addTVSettingsEventListeners() {
            // Переключатель
            document.getElementById('fog-tv-enabled').addEventListener('change', (e) => {
                this.config.enabled = e.target.checked;
                this.saveSettings();
                
                if (this.config.enabled) {
                    this.start();
                } else {
                    this.stop();
                }
            });
            
            // Кнопки пресетов
            document.querySelectorAll('.tv-preset-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const preset = e.target.dataset.preset;
                    this.config.preset = preset;
                    this.applyPreset(preset);
                    this.updatePresetUI();
                });
            });
            
            // Слайдеры
            ['density', 'speed', 'opacity'].forEach(param => {
                const slider = document.getElementById(`fog-${param}`);
                const value = document.getElementById(`fog-${param}-value`);
                
                slider.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    value.textContent = val.toFixed(1) + 'x';
                    this.config[param] = val;
                    this.config.preset = 'custom';
                    this.updatePresetUI();
                    this.saveSettings();
                    this.updateParticles();
                });
            });
            
            // Кнопки цветов
            document.querySelectorAll('.tv-color-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const color = e.target.dataset.color;
                    this.config.color = color;
                    this.config.preset = 'custom';
                    this.updateColorUI();
                    this.updatePresetUI();
                    this.saveSettings();
                    this.updateParticles();
                });
            });
            
            // Кнопка Применить
            document.getElementById('fog-apply-btn').addEventListener('click', () => {
                this.saveSettings();
                this.showTVNotification('Настройки применены!');
                this.closeSettingsPanel();
            });
            
            // Кнопка Сброс
            document.getElementById('fog-reset-btn').addEventListener('click', () => {
                this.config.preset = 'medium';
                this.applyPreset('medium');
                this.updatePresetUI();
                this.updateColorUI();
                this.saveSettings();
                this.updateParticles();
                this.showTVNotification('Настройки сброшены');
            });
            
            // Кнопка Закрыть
            document.getElementById('fog-close-btn').addEventListener('click', () => {
                this.closeSettingsPanel();
            });
        }
        
        applyPreset(preset) {
            const presetData = this.config.presets[preset];
            Object.assign(this.config, presetData);
            this.config.preset = preset;
            
            // Обновляем UI
            ['density', 'speed', 'opacity'].forEach(param => {
                const slider = document.getElementById(`fog-${param}`);
                const value = document.getElementById(`fog-${param}-value`);
                if (slider) slider.value = this.config[param];
                if (value) value.textContent = this.config[param].toFixed(1) + 'x';
            });
            
            this.saveSettings();
            this.updateParticles();
        }
        
        updatePresetUI() {
            document.querySelectorAll('.tv-preset-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.preset === this.config.preset) {
                    btn.classList.add('active');
                }
            });
        }
        
        updateColorUI() {
            document.querySelectorAll('.tv-color-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.color === this.config.color) {
                    btn.classList.add('active');
                }
            });
        }
        
        showTVNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 25px 40px;
                border-radius: 15px;
                z-index: 10001;
                font-size: 22px;
                font-weight: 600;
                text-align: center;
                border: 3px solid #4CAF50;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                animation: tvFade 2s ease;
            `;
            
            notification.innerHTML = `
                <div style="font-size: 36px; margin-bottom: 15px;">✅</div>
                <div>${message}</div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.5s';
                setTimeout(() => notification.remove(), 500);
            }, 1500);
            
            // Добавляем анимацию
            if (!document.querySelector('#tv-fade-animation')) {
                const style = document.createElement('style');
                style.id = 'tv-fade-animation';
                style.textContent = `
                    @keyframes tvFade {
                        0% { opacity: 0; transform: translate(-50%, -40%); }
                        15% { opacity: 1; transform: translate(-50%, -50%); }
                        85% { opacity: 1; transform: translate(-50%, -50%); }
                        100% { opacity: 0; transform: translate(-50%, -60%); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // =========================================
        // ЧАСТИЦЫ И АНИМАЦИЯ (ОПТИМИЗИРОВАНА ДЛЯ TV)
        // =========================================
        initParticles() {
            this.particles = [];
            const count = Math.round(this.config.particleCount * this.config.density);
            
            for (let i = 0; i < count; i++) {
                this.particles.push(this.createParticle());
            }
        }
        
        createParticle() {
            const color = this.config.colors[this.config.color];
            const baseSpeed = 0.1 * this.config.speed;
            
            return {
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: 30 + Math.random() * 70 * this.config.opacity,
                speedX: (Math.random() - 0.5) * baseSpeed,
                speedY: (Math.random() - 0.5) * baseSpeed,
                color: color,
                opacity: 0.03 + Math.random() * 0.04 * this.config.opacity
            };
        }
        
        updateParticles() {
            if (this.enabled) {
                this.initParticles();
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        
        animate() {
            if (!this.enabled || !this.ctx || !this.canvas) return;
            
            // Легкий fade эффект для плавности
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.particles.forEach(particle => {
                // Плавное движение
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                // Легкий дрейф для естественности
                particle.speedX += (Math.random() - 0.5) * 0.005;
                particle.speedY += (Math.random() - 0.5) * 0.005;
                
                // Ограничиваем скорость
                particle.speedX = Math.max(-0.2, Math.min(0.2, particle.speedX));
                particle.speedY = Math.max(-0.2, Math.min(0.2, particle.speedY));
                
                // Возвращаем частицы на экран
                if (particle.x < -100) particle.x = this.canvas.width + 100;
                if (particle.x > this.canvas.width + 100) particle.x = -100;
                if (particle.y < -100) particle.y = this.canvas.height + 100;
                if (particle.y > this.canvas.height + 100) particle.y = -100;
                
                // Рисуем частицу с градиентом
                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size
                );
                
                gradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity})`);
                gradient.addColorStop(1, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, 0)`);
                
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
            });
            
            this.animationId = requestAnimationFrame(() => this.animate());
        }
        
        start() {
            if (this.enabled) return;
            
            this.enabled = true;
            this.canvas.style.display = 'block';
            this.resizeCanvas();
            this.animate();
            
            console.log('[FOG TV] Effect started (background)');
        }
        
        stop() {
            if (!this.enabled) return;
            
            this.enabled = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            this.canvas.style.display = 'none';
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            console.log('[FOG TV] Effect stopped');
        }
        
        closeSettingsPanel() {
            if (this.settingsPanel) {
                this.settingsPanel.remove();
                this.settingsPanel = null;
            }
            this.settingsItems = [];
            document.body.style.overflow = '';
        }
    }
    
    // Автоматическая инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new FogWorkingTV();
        });
    } else {
        new FogWorkingTV();
    }
    
})();
