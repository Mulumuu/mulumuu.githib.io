// =========================================
// FOG WORKING PLUGIN - SNOW-STYLE SETTINGS
// Настройки с предпросмотром как у снега
// =========================================

(function() {
    'use strict';
    
    console.log('[FOG WORKING] Loading snow-style settings version...');
    
    class FogWorking {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
            this.animationId = null;
            this.enabled = false;
            this.settingsPanel = null;
            this.previewEnabled = false;
            
            // Расширенная конфигурация
            this.config = {
                enabled: false,
                density: 1.0,        // 0.1 - 3.0
                speed: 1.0,         // 0.1 - 3.0
                opacity: 1.0,       // 0.1 - 2.0
                size: 1.0,          // 0.5 - 2.0
                wind: 0.0,          // -1.0 - 1.0
                colorMode: 'blue',  // blue, purple, night, sunset, mystic
                direction: 'random', // random, up, down, left, right
                particleCount: 80,
                
                colors: {
                    blue: [
                        {r: 180, g: 200, b: 255},
                        {r: 150, g: 180, b: 240},
                        {r: 120, g: 160, b: 220}
                    ],
                    purple: [
                        {r: 200, g: 180, b: 255},
                        {r: 180, g: 150, b: 240},
                        {r: 160, g: 120, b: 220}
                    ],
                    night: [
                        {r: 100, g: 120, b: 180},
                        {r: 80, g: 100, b: 160},
                        {r: 60, g: 80, b: 140}
                    ],
                    sunset: [
                        {r: 255, g: 200, b: 180},
                        {r: 255, g: 180, b: 150},
                        {r: 255, g: 160, b: 120}
                    ],
                    mystic: [
                        {r: 180, g: 220, b: 255},
                        {r: 220, g: 180, b: 255},
                        {r: 255, g: 220, b: 180}
                    ]
                }
            };
            
            // Загружаем настройки
            this.loadSettings();
            this.init();
        }
        
        loadSettings() {
            try {
                const saved = localStorage.getItem('fog_working_settings_v2');
                if (saved) {
                    Object.assign(this.config, JSON.parse(saved));
                }
            } catch (e) {}
        }
        
        saveSettings() {
            try {
                const toSave = {
                    enabled: this.config.enabled,
                    density: this.config.density,
                    speed: this.config.speed,
                    opacity: this.config.opacity,
                    size: this.config.size,
                    wind: this.config.wind,
                    colorMode: this.config.colorMode,
                    direction: this.config.direction
                };
                localStorage.setItem('fog_working_settings_v2', JSON.stringify(toSave));
            } catch (e) {}
        }
        
        init() {
            console.log('[FOG WORKING] Initializing...');
            
            // Создаем canvas
            this.createCanvas();
            
            // Инициализируем частицы
            this.initParticles();
            
            // Добавляем в меню настроек CUB
            this.addToSettingsMenu();
            
            // Запускаем если включено
            if (this.config.enabled) {
                this.start();
            }
            
            window.FogWorking = this;
        }
        
        // =========================================
        // ИНТЕГРАЦИЯ В МЕНЮ CUB
        // =========================================
        addToSettingsMenu() {
            const tryAdd = () => {
                try {
                    const menuContainer = document.querySelector('.settings__body .scroll__body');
                    if (!menuContainer) {
                        setTimeout(tryAdd, 1000);
                        return;
                    }
                    
                    if (document.querySelector('[data-component="fog_effects"]')) {
                        return;
                    }
                    
                    const fogFolder = document.createElement('div');
                    fogFolder.className = 'settings-folder selector';
                    fogFolder.dataset.component = 'fog_effects';
                    fogFolder.innerHTML = `
                        <div class="settings-folder__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                            </svg>
                        </div>
                        <div class="settings-folder__name">Атмосферный туман</div>
                    `;
                    
                    fogFolder.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.openSnowStyleSettings();
                    });
                    
                    const foldersContainer = menuContainer.querySelector('div');
                    const backupFolder = foldersContainer.querySelector('[data-component="backup"]');
                    
                    if (foldersContainer && backupFolder) {
                        foldersContainer.insertBefore(fogFolder, backupFolder);
                    }
                    
                } catch (error) {
                    setTimeout(tryAdd, 2000);
                }
            };
            
            setTimeout(tryAdd, 2000);
        }
        
        // =========================================
        // НАСТРОЙКИ В СТИЛЕ SNOW_NEW.JS
        // =========================================
        openSnowStyleSettings() {
            if (this.settingsPanel) {
                this.settingsPanel.remove();
            }
            
            // Создаем главный контейнер
            this.settingsPanel = document.createElement('div');
            this.settingsPanel.id = 'fog-settings-snow-style';
            
            this.settingsPanel.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 99999;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            `;
            
            // Создаем предпросмотр (левый блок)
            const previewContainer = this.createPreviewContainer();
            
            // Создаем настройки (правый блок)
            const settingsContainer = this.createSettingsContainer();
            
            // Основной контент
            const mainContent = document.createElement('div');
            mainContent.style.cssText = `
                display: flex;
                width: 90%;
                max-width: 1400px;
                height: 85%;
                background: #1a1d28;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            `;
            
            mainContent.appendChild(previewContainer);
            mainContent.appendChild(settingsContainer);
            
            // Заголовок и кнопка закрытия
            const header = document.createElement('div');
            header.style.cssText = `
                position: absolute;
                top: 20px;
                left: 20px;
                right: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                z-index: 1;
            `;
            
            header.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 32px;">🌫️</div>
                    <div>
                        <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white;">
                            Настройки атмосферного тумана
                        </h1>
                        <div style="color: rgba(255,255,255,0.6); font-size: 14px; margin-top: 5px;">
                            Настройте эффект под свои предпочтения
                        </div>
                    </div>
                </div>
                <button id="fog-close-main" style="
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            `;
            
            this.settingsPanel.appendChild(header);
            this.settingsPanel.appendChild(mainContent);
            document.body.appendChild(this.settingsPanel);
            
            // Блокируем скролл
            document.body.style.overflow = 'hidden';
            
            // Добавляем обработчики
            this.addSnowStyleEventListeners();
            
            // Запускаем предпросмотр
            this.startPreview();
        }
        
        createPreviewContainer() {
            const container = document.createElement('div');
            container.style.cssText = `
                flex: 1;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            `;
            
            // Заголовок предпросмотра
            const previewHeader = document.createElement('div');
            previewHeader.style.cssText = `
                padding: 25px;
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
            `;
            previewHeader.innerHTML = `
                <h2 style="margin: 0; color: white; font-size: 20px; font-weight: 500;">
                    <span style="opacity: 0.7;">🔄</span> Предпросмотр в реальном времени
                </h2>
                <div style="color: rgba(255,255,255,0.6); font-size: 14px; margin-top: 8px;">
                    Все изменения применяются мгновенно
                </div>
            `;
            
            // Контейнер для предпросмотра
            const previewContent = document.createElement('div');
            previewContent.style.cssText = `
                flex: 1;
                position: relative;
                overflow: hidden;
            `;
            
            // Canvas для предпросмотра
            this.previewCanvas = document.createElement('canvas');
            this.previewCanvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            `;
            
            // Демо контент (как в snow_new.js)
            const demoContent = document.createElement('div');
            demoContent.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: white;
                width: 80%;
                max-width: 500px;
            `;
            
            demoContent.innerHTML = `
                <div style="
                    background: rgba(255,255,255,0.05);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 20px;
                    padding: 40px;
                    margin-bottom: 30px;
                ">
                    <div style="font-size: 48px; margin-bottom: 20px;">🌫️✨</div>
                    <h3 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 500;">
                        Атмосферный туман
                    </h3>
                    <div style="opacity: 0.8; line-height: 1.6;">
                        Регулируйте параметры справа для создания<br>
                        идеальной атмосферы в вашем приложении
                    </div>
                </div>
                <div style="
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    flex-wrap: wrap;
                ">
                    <div style="
                        background: rgba(59, 130, 246, 0.1);
                        border: 1px solid rgba(59, 130, 246, 0.3);
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-size: 14px;
                    ">
                        🎨 Динамические цвета
                    </div>
                    <div style="
                        background: rgba(139, 92, 246, 0.1);
                        border: 1px solid rgba(139, 92, 246, 0.3);
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-size: 14px;
                    ">
                        ⚡ Реальное время
                    </div>
                    <div style="
                        background: rgba(16, 185, 129, 0.1);
                        border: 1px solid rgba(16, 185, 129, 0.3);
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-size: 14px;
                    ">
                        🔧 Гибкие настройки
                    </div>
                </div>
            `;
            
            previewContent.appendChild(demoContent);
            previewContent.appendChild(this.previewCanvas);
            
            container.appendChild(previewHeader);
            container.appendChild(previewContent);
            
            // Инициализируем canvas для предпросмотра
            setTimeout(() => {
                this.previewCanvas.width = previewContent.offsetWidth;
                this.previewCanvas.height = previewContent.offsetHeight;
                this.previewCtx = this.previewCanvas.getContext('2d');
            }, 100);
            
            return container;
        }
        
        createSettingsContainer() {
            const container = document.createElement('div');
            container.style.cssText = `
                width: 450px;
                background: #1e2430;
                overflow-y: auto;
                padding: 30px;
            `;
            
            container.innerHTML = `
                <div style="margin-bottom: 35px;">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 25px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    ">
                        <div>
                            <div style="font-size: 20px; font-weight: 600; color: white; margin-bottom: 5px;">
                                Основные настройки
                            </div>
                            <div style="color: rgba(255,255,255,0.5); font-size: 13px;">
                                Управление эффектом тумана
                            </div>
                        </div>
                        <label class="fog-snow-switch">
                            <input type="checkbox" id="fog-snow-enabled" ${this.config.enabled ? 'checked' : ''}>
                            <span class="fog-snow-slider"></span>
                        </label>
                    </div>
                </div>
                
                <div style="margin-bottom: 35px;">
                    <div style="font-size: 16px; font-weight: 600; color: white; margin-bottom: 20px;">
                        🎚️ Параметры тумана
                    </div>
                    
                    ${this.createSlider('density', 'Плотность', this.config.density, 0.1, 3, 0.1)}
                    ${this.createSlider('speed', 'Скорость', this.config.speed, 0.1, 3, 0.1)}
                    ${this.createSlider('opacity', 'Прозрачность', this.config.opacity, 0.1, 2, 0.1)}
                    ${this.createSlider('size', 'Размер частиц', this.config.size, 0.5, 2, 0.1)}
                    ${this.createSlider('wind', 'Направление ветра', this.config.wind, -1, 1, 0.1, true)}
                </div>
                
                <div style="margin-bottom: 35px;">
                    <div style="font-size: 16px; font-weight: 600; color: white; margin-bottom: 20px;">
                        🎨 Цветовая схема
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        ${this.createColorOption('blue', 'Синий', 'linear-gradient(135deg, #667eea, #764ba2)', this.config.colorMode === 'blue')}
                        ${this.createColorOption('purple', 'Фиолетовый', 'linear-gradient(135deg, #9f7aea, #ed64a6)', this.config.colorMode === 'purple')}
                        ${this.createColorOption('night', 'Ночной', 'linear-gradient(135deg, #4a5568, #2d3748)', this.config.colorMode === 'night')}
                        ${this.createColorOption('sunset', 'Закат', 'linear-gradient(135deg, #f6ad55, #fc8181)', this.config.colorMode === 'sunset')}
                        ${this.createColorOption('mystic', 'Мистика', 'linear-gradient(135deg, #68d391, #63b3ed)', this.config.colorMode === 'mystic')}
                    </div>
                </div>
                
                <div style="margin-bottom: 35px;">
                    <div style="font-size: 16px; font-weight: 600; color: white; margin-bottom: 20px;">
                        📐 Направление движения
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        ${this.createDirectionOption('random', '🎲 Случайное', this.config.direction === 'random')}
                        ${this.createDirectionOption('up', '⬆️ Вверх', this.config.direction === 'up')}
                        ${this.createDirectionOption('down', '⬇️ Вниз', this.config.direction === 'down')}
                        ${this.createDirectionOption('left', '⬅️ Влево', this.config.direction === 'left')}
                        ${this.createDirectionOption('right', '➡️ Вправо', this.config.direction === 'right')}
                    </div>
                </div>
                
                <div style="
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 20px;
                    margin-top: 30px;
                ">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                        <div style="font-size: 20px;">💾</div>
                        <div>
                            <div style="font-weight: 600; color: white; margin-bottom: 4px;">
                                Сохранение настроек
                            </div>
                            <div style="color: rgba(255,255,255,0.6); font-size: 13px;">
                                Все настройки сохраняются автоматически
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button id="fog-apply-btn" style="
                            flex: 1;
                            background: linear-gradient(135deg, #667eea, #764ba2);
                            color: white;
                            border: none;
                            padding: 14px;
                            border-radius: 10px;
                            cursor: pointer;
                            font-weight: 500;
                            transition: transform 0.2s;
                        ">Применить сейчас</button>
                        <button id="fog-reset-btn" style="
                            background: rgba(255,255,255,0.1);
                            color: white;
                            border: none;
                            padding: 14px 20px;
                            border-radius: 10px;
                            cursor: pointer;
                            font-weight: 500;
                            transition: transform 0.2s;
                        ">Сброс</button>
                    </div>
                </div>
            `;
            
            return container;
        }
        
        createSlider(id, label, value, min, max, step, showWind = false) {
            const windLabels = showWind ? `
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 5px;">
                    <span>← Налево</span>
                    <span>Стоит</span>
                    <span>Направо →</span>
                </div>
            ` : '';
            
            return `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div style="color: rgba(255,255,255,0.9);">${label}</div>
                        <div style="color: #667eea; font-weight: 500;" id="fog-${id}-value">
                            ${value.toFixed(1)}${id === 'wind' ? '' : 'x'}
                        </div>
                    </div>
                    <input type="range" 
                           id="fog-${id}" 
                           min="${min}" 
                           max="${max}" 
                           step="${step}" 
                           value="${value}"
                           style="
                               width: 100%;
                               height: 6px;
                               -webkit-appearance: none;
                               background: linear-gradient(to right, #2d3748, #667eea);
                               border-radius: 3px;
                               outline: none;
                           "
                    >
                    ${windLabels}
                </div>
            `;
        }
        
        createColorOption(value, label, gradient, isActive) {
            return `
                <button class="fog-color-btn ${isActive ? 'active' : ''}" 
                        data-color="${value}"
                        style="
                            background: ${gradient};
                            border: none;
                            padding: 12px;
                            border-radius: 10px;
                            color: white;
                            cursor: pointer;
                            transition: all 0.2s;
                            opacity: ${isActive ? '1' : '0.6'};
                            transform: ${isActive ? 'scale(1.05)' : 'scale(1)'};
                            box-shadow: ${isActive ? '0 0 0 2px white, 0 5px 15px rgba(0,0,0,0.3)' : 'none'};
                        ">
                    ${label}
                </button>
            `;
        }
        
        createDirectionOption(value, label, isActive) {
            return `
                <button class="fog-direction-btn ${isActive ? 'active' : ''}" 
                        data-direction="${value}"
                        style="
                            background: ${isActive ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255,255,255,0.05)'};
                            border: 1px solid ${isActive ? '#667eea' : 'rgba(255,255,255,0.1)'};
                            padding: 12px;
                            border-radius: 10px;
                            color: white;
                            cursor: pointer;
                            transition: all 0.2s;
                            opacity: ${isActive ? '1' : '0.7'};
                        ">
                    ${label}
                </button>
            `;
        }
        
        addSnowStyleEventListeners() {
            // Кнопка закрытия
            document.getElementById('fog-close-main').addEventListener('click', () => {
                this.closeSettingsPanel();
            });
            
            // Закрытие по клику на фон
            this.settingsPanel.addEventListener('click', (e) => {
                if (e.target === this.settingsPanel) {
                    this.closeSettingsPanel();
                }
            });
            
            // Переключатель
            document.getElementById('fog-snow-enabled').addEventListener('change', (e) => {
                this.config.enabled = e.target.checked;
                this.saveSettings();
                
                if (this.config.enabled) {
                    this.start();
                } else {
                    this.stop();
                }
            });
            
            // Слайдеры
            ['density', 'speed', 'opacity', 'size', 'wind'].forEach(param => {
                const slider = document.getElementById(`fog-${param}`);
                const value = document.getElementById(`fog-${param}-value`);
                
                slider.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    value.textContent = val.toFixed(1) + (param === 'wind' ? '' : 'x');
                    this.config[param] = val;
                    this.saveSettings();
                    this.updatePreview();
                });
            });
            
            // Кнопки цветов
            document.querySelectorAll('.fog-color-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const color = e.target.dataset.color;
                    this.config.colorMode = color;
                    this.saveSettings();
                    
                    document.querySelectorAll('.fog-color-btn').forEach(b => {
                        b.classList.remove('active');
                        b.style.opacity = '0.6';
                        b.style.transform = 'scale(1)';
                        b.style.boxShadow = 'none';
                    });
                    
                    e.target.classList.add('active');
                    e.target.style.opacity = '1';
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 0 0 2px white, 0 5px 15px rgba(0,0,0,0.3)';
                    
                    this.updatePreview();
                });
            });
            
            // Кнопки направления
            document.querySelectorAll('.fog-direction-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const direction = e.target.dataset.direction;
                    this.config.direction = direction;
                    this.saveSettings();
                    
                    document.querySelectorAll('.fog-direction-btn').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'rgba(255,255,255,0.05)';
                        b.style.borderColor = 'rgba(255,255,255,0.1)';
                    });
                    
                    e.target.classList.add('active');
                    e.target.style.background = 'rgba(102, 126, 234, 0.2)';
                    e.target.style.borderColor = '#667eea';
                    
                    this.updatePreview();
                });
            });
            
            // Кнопка Применить
            document.getElementById('fog-apply-btn').addEventListener('click', () => {
                this.updateMainEffect();
                this.showNotification('Настройки применены!', 'success');
            });
            
            // Кнопка Сброс
            document.getElementById('fog-reset-btn').addEventListener('click', () => {
                if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
                    this.config.density = 1.0;
                    this.config.speed = 1.0;
                    this.config.opacity = 1.0;
                    this.config.size = 1.0;
                    this.config.wind = 0.0;
                    this.config.colorMode = 'blue';
                    this.config.direction = 'random';
                    
                    // Обновляем UI
                    ['density', 'speed', 'opacity', 'size', 'wind'].forEach(param => {
                        const slider = document.getElementById(`fog-${param}`);
                        const value = document.getElementById(`fog-${param}-value`);
                        if (slider) slider.value = this.config[param];
                        if (value) value.textContent = this.config[param].toFixed(1) + (param === 'wind' ? '' : 'x');
                    });
                    
                    this.saveSettings();
                    this.updatePreview();
                    this.showNotification('Настройки сброшены', 'info');
                }
            });
        }
        
        // =========================================
        // ПРЕДПРОСМОТР В РЕАЛЬНОМ ВРЕМЕНИ
        // =========================================
        startPreview() {
            this.previewEnabled = true;
            this.previewParticles = [];
            this.initPreviewParticles();
            this.animatePreview();
        }
        
        initPreviewParticles() {
            this.previewParticles = [];
            const count = 40; // Меньше частиц для предпросмотра
            
            for (let i = 0; i < count; i++) {
                this.previewParticles.push(this.createPreviewParticle());
            }
        }
        
        createPreviewParticle() {
            const colors = this.config.colors[this.config.colorMode];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const baseSpeed = 0.15 * this.config.speed;
            
            let speedX, speedY;
            
            switch (this.config.direction) {
                case 'up':
                    speedX = (Math.random() - 0.5) * 0.1;
                    speedY = -baseSpeed * (0.8 + Math.random() * 0.4);
                    break;
                case 'down':
                    speedX = (Math.random() - 0.5) * 0.1;
                    speedY = baseSpeed * (0.8 + Math.random() * 0.4);
                    break;
                case 'left':
                    speedX = -baseSpeed * (0.8 + Math.random() * 0.4);
                    speedY = (Math.random() - 0.5) * 0.1;
                    break;
                case 'right':
                    speedX = baseSpeed * (0.8 + Math.random() * 0.4);
                    speedY = (Math.random() - 0.5) * 0.1;
                    break;
                default: // random
                    speedX = (Math.random() - 0.5) * baseSpeed;
                    speedY = (Math.random() - 0.5) * baseSpeed;
            }
            
            // Добавляем ветер
            speedX += this.config.wind * 0.3;
            
            return {
                x: Math.random() * this.previewCanvas.width,
                y: Math.random() * this.previewCanvas.height,
                size: (40 + Math.random() * 40) * this.config.size,
                speedX: speedX,
                speedY: speedY,
                color: color,
                opacity: (0.03 + Math.random() * 0.04) * this.config.opacity
            };
        }
        
        animatePreview() {
            if (!this.previewEnabled || !this.previewCtx) return;
            
            // Очищаем с fade эффектом
            this.previewCtx.fillStyle = 'rgba(15, 23, 42, 0.1)';
            this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            
            this.previewParticles.forEach(particle => {
                // Движение
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                // Пересоздаем частицы за границами
                if (particle.x < -particle.size || 
                    particle.x > this.previewCanvas.width + particle.size ||
                    particle.y < -particle.size || 
                    particle.y > this.previewCanvas.height + particle.size) {
                    Object.assign(particle, this.createPreviewParticle());
                    
                    // Помещаем с соответствующего края
                    if (this.config.direction === 'right') particle.x = -particle.size;
                    if (this.config.direction === 'left') particle.x = this.previewCanvas.width + particle.size;
                    if (this.config.direction === 'down') particle.y = -particle.size;
                    if (this.config.direction === 'up') particle.y = this.previewCanvas.height + particle.size;
                }
                
                // Рисуем частицу
                const gradient = this.previewCtx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size
                );
                
                gradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity * 0.8})`);
                gradient.addColorStop(1, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, 0)`);
                
                this.previewCtx.beginPath();
                this.previewCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.previewCtx.fillStyle = gradient;
                this.previewCtx.fill();
            });
            
            requestAnimationFrame(() => this.animatePreview());
        }
        
        updatePreview() {
            // Обновляем все частицы предпросмотра
            this.previewParticles.forEach((particle, i) => {
                const newParticle = this.createPreviewParticle();
                newParticle.x = particle.x;
                newParticle.y = particle.y;
                this.previewParticles[i] = newParticle;
            });
        }
        
        updateMainEffect() {
            this.initParticles();
            if (this.enabled) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        
        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                color: white;
                padding: 12px 24px;
                border-radius: 10px;
                z-index: 100000;
                animation: slideIn 0.3s ease;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            `;
            
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</div>
                    <div>${message}</div>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
            
            // Добавляем стили для анимации
            if (!document.querySelector('#fog-notification-styles')) {
                const style = document.createElement('style');
                style.id = 'fog-notification-styles';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                    
                    .fog-snow-switch {
                        position: relative;
                        display: inline-block;
                        width: 60px;
                        height: 32px;
                    }
                    
                    .fog-snow-switch input {
                        opacity: 0;
                        width: 0;
                        height: 0;
                    }
                    
                    .fog-snow-slider {
                        position: absolute;
                        cursor: pointer;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: #4a5568;
                        transition: .4s;
                        border-radius: 34px;
                    }
                    
                    .fog-snow-slider:before {
                        position: absolute;
                        content: "";
                        height: 24px;
                        width: 24px;
                        left: 4px;
                        bottom: 4px;
                        background: white;
                        transition: .4s;
                        border-radius: 50%;
                    }
                    
                    input:checked + .fog-snow-slider {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                    }
                    
                    input:checked + .fog-snow-slider:before {
                        transform: translateX(28px);
                    }
                    
                    input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 20px;
                        height: 20px;
                        background: white;
                        border-radius: 50%;
                        cursor: pointer;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // =========================================
        // ОСНОВНОЙ CANVAS И МЕТОДЫ
        // =========================================
        createCanvas() {
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'fog-working-canvas';
            this.canvas.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                pointer-events: none !important;
                z-index: 9998 !important;
                opacity: 0.7 !important;
                display: none;
            `;
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
        }
        
        resizeCanvas() {
            if (this.canvas) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
        }
        
        initParticles() {
            this.particles = [];
            const count = Math.round(this.config.particleCount * this.config.density);
            
            for (let i = 0; i < count; i++) {
                this.particles.push(this.createMainParticle());
            }
        }
        
        createMainParticle() {
            const colors = this.config.colors[this.config.colorMode];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const baseSpeed = 0.15 * this.config.speed;
            
            let speedX, speedY;
            
            switch (this.config.direction) {
                case 'up':
                    speedX = (Math.random() - 0.5) * 0.1;
                    speedY = -baseSpeed * (0.8 + Math.random() * 0.4);
                    break;
                case 'down':
                    speedX = (Math.random() - 0.5) * 0.1;
                    speedY = baseSpeed * (0.8 + Math.random() * 0.4);
                    break;
                case 'left':
                    speedX = -baseSpeed * (0.8 + Math.random() * 0.4);
                    speedY = (Math.random() - 0.5) * 0.1;
                    break;
                case 'right':
                    speedX = baseSpeed * (0.8 + Math.random() * 0.4);
                    speedY = (Math.random() - 0.5) * 0.1;
                    break;
                default: // random
                    speedX = (Math.random() - 0.5) * baseSpeed;
                    speedY = (Math.random() - 0.5) * baseSpeed;
            }
            
            // Добавляем ветер
            speedX += this.config.wind * 0.3;
            
            return {
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: (40 + Math.random() * 60) * this.config.size,
                speedX: speedX,
                speedY: speedY,
                color: color,
                opacity: (0.03 + Math.random() * 0.05) * this.config.opacity
            };
        }
        
        animate() {
            if (!this.enabled || !this.ctx || !this.canvas) return;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.particles.forEach(particle => {
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                if (particle.x < -particle.size) particle.x = this.canvas.width + particle.size;
                if (particle.x > this.canvas.width + particle.size) particle.x = -particle.size;
                if (particle.y < -particle.size) particle.y = this.canvas.height + particle.size;
                if (particle.y > this.canvas.height + particle.size) particle.y = -particle.size;
                
                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size
                );
                
                gradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity * 0.8})`);
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
        }
        
        stop() {
            if (!this.enabled) return;
            this.enabled = false;
            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.canvas.style.display = 'none';
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        toggle() {
            this.config.enabled = !this.config.enabled;
            this.saveSettings();
            
            if (this.config.enabled) {
                this.start();
            } else {
                this.stop();
            }
            return this.config.enabled;
        }
        
        closeSettingsPanel() {
            this.previewEnabled = false;
            if (this.settingsPanel) {
                this.settingsPanel.remove();
                this.settingsPanel = null;
            }
            document.body.style.overflow = '';
        }
    }
    
    // Автоматическая инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new FogWorking();
        });
    } else {
        new FogWorking();
    }
    
})();
