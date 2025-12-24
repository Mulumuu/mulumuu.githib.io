// =========================================
// FOG WORKING PLUGIN - SETTINGS VERSION
// Версия с настройками через меню CUB
// =========================================

(function() {
    'use strict';
    
    console.log('[FOG WORKING] Loading settings version...');
    
    class FogWorking {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
            this.animationId = null;
            this.enabled = false;
            this.settingsPanel = null;
            
            // Конфигурация с настройками по умолчанию
            this.config = {
                enabled: false,
                density: 1.0,        // 0.1 - 3.0
                speed: 1.0,         // 0.1 - 3.0
                opacity: 1.0,       // 0.1 - 2.0
                colorMode: 'blue',  // blue, purple, night, custom
                particleCount: 60,
                colors: {
                    blue: ['180, 200, 255', '150, 180, 240', '120, 160, 220'],
                    purple: ['200, 180, 255', '180, 150, 240', '160, 120, 220'],
                    night: ['100, 120, 180', '80, 100, 160', '60, 80, 140'],
                    custom: ['180, 200, 255', '150, 180, 240']
                },
                size: { min: 40, max: 120 }
            };
            
            // Загружаем сохраненные настройки
            this.loadSettings();
            
            this.init();
        }
        
        loadSettings() {
            try {
                const saved = localStorage.getItem('fog_working_settings');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    Object.assign(this.config, parsed);
                    console.log('[FOG] Settings loaded');
                }
            } catch (e) {
                console.log('[FOG] Error loading settings:', e);
            }
        }
        
        saveSettings() {
            try {
                localStorage.setItem('fog_working_settings', JSON.stringify({
                    enabled: this.config.enabled,
                    density: this.config.density,
                    speed: this.config.speed,
                    opacity: this.config.opacity,
                    colorMode: this.config.colorMode
                }));
            } catch (e) {
                console.log('[FOG] Error saving settings:', e);
            }
        }
        
        init() {
            console.log('[FOG WORKING] Initializing...');
            
            // Создаем canvas
            this.createCanvas();
            
            // Инициализируем частицы
            this.initParticles();
            
            // Добавляем в меню настроек CUB
            this.addToSettingsMenu();
            
            // Запускаем если включено в настройках
            if (this.config.enabled) {
                this.start();
            }
            
            // Делаем глобально доступным
            window.FogWorking = this;
            
            console.log('[FOG WORKING] Plugin initialized');
        }
        
        // =========================================
        // ДОБАВЛЕНИЕ В МЕНЮ НАСТРОЕК CUB
        // =========================================
        addToSettingsMenu() {
            // Ждем загрузки интерфейса
            const tryAdd = () => {
                try {
                    const menuContainer = document.querySelector('.settings__body .scroll__body');
                    
                    if (!menuContainer) {
                        setTimeout(tryAdd, 1000);
                        return;
                    }
                    
                    // Проверяем, не добавлен ли уже пункт
                    if (document.querySelector('[data-component="fog_settings"]')) {
                        return;
                    }
                    
                    // Создаем элемент меню
                    const fogFolder = document.createElement('div');
                    fogFolder.className = 'settings-folder selector';
                    fogFolder.dataset.component = 'fog_settings';
                    fogFolder.innerHTML = `
                        <div class="settings-folder__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-2 0-3.6-1.6-3.6-3.6s1.6-3.6 3.6-3.6 3.6 1.6 3.6 3.6-1.6 3.6-3.6 3.6z"/>
                            </svg>
                        </div>
                        <div class="settings-folder__name">Эффект тумана</div>
                    `;
                    
                    // Обработчик клика - открываем панель настроек
                    fogFolder.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.openSettingsPanel();
                    });
                    
                    // Добавляем в меню (перед Backup)
                    const foldersContainer = menuContainer.querySelector('div');
                    const backupFolder = foldersContainer.querySelector('[data-component="backup"]');
                    
                    if (foldersContainer && backupFolder) {
                        foldersContainer.insertBefore(fogFolder, backupFolder);
                        console.log('[FOG] ✅ Added to settings menu');
                    }
                    
                } catch (error) {
                    console.log('[FOG] Error adding to menu:', error);
                    setTimeout(tryAdd, 2000);
                }
            };
            
            setTimeout(tryAdd, 2000);
        }
        
        // =========================================
        // ПАНЕЛЬ НАСТРОЕК ТУМАНА
        // =========================================
        openSettingsPanel() {
            // Закрываем предыдущую панель если есть
            if (this.settingsPanel) {
                this.settingsPanel.remove();
            }
            
            // Создаем панель настроек в стиле CUB
            this.settingsPanel = document.createElement('div');
            this.settingsPanel.id = 'fog-settings-panel';
            
            this.settingsPanel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 600px;
                max-width: 90vw;
                max-height: 80vh;
                background: rgba(20, 25, 35, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                z-index: 99999;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                display: flex;
                flex-direction: column;
            `;
            
            // Заголовок панели
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 20px 24px;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            header.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 24px;">🌫️</div>
                    <div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 500;">Настройки эффекта тумана</h2>
                        <div style="font-size: 13px; opacity: 0.7; margin-top: 4px;">Включите и настройте атмосферный эффект</div>
                    </div>
                </div>
                <button id="fog-close-btn" style="
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                ">×</button>
            `;
            
            // Контент с настройками
            const content = document.createElement('div');
            content.style.cssText = `
                padding: 24px;
                flex: 1;
                overflow-y: auto;
            `;
            
            content.innerHTML = `
                <div style="margin-bottom: 30px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div>
                            <div style="font-weight: 500; margin-bottom: 4px;">Включить эффект тумана</div>
                            <div style="font-size: 13px; opacity: 0.7;">Атмосферный эффект поверх интерфейса</div>
                        </div>
                        <label class="fog-switch">
                            <input type="checkbox" id="fog-enabled" ${this.config.enabled ? 'checked' : ''}>
                            <span class="fog-slider"></span>
                        </label>
                    </div>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <div style="font-weight: 500; margin-bottom: 15px;">Настройки тумана</div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Плотность тумана</span>
                            <span id="fog-density-value">${this.config.density.toFixed(1)}x</span>
                        </div>
                        <input type="range" id="fog-density" min="0.1" max="3" step="0.1" 
                               value="${this.config.density}" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.7; margin-top: 5px;">
                            <span>Редкий</span>
                            <span>Обычный</span>
                            <span>Густой</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Скорость движения</span>
                            <span id="fog-speed-value">${this.config.speed.toFixed(1)}x</span>
                        </div>
                        <input type="range" id="fog-speed" min="0.1" max="3" step="0.1" 
                               value="${this.config.speed}" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.7; margin-top: 5px;">
                            <span>Медленно</span>
                            <span>Обычно</span>
                            <span>Быстро</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Прозрачность</span>
                            <span id="fog-opacity-value">${this.config.opacity.toFixed(1)}x</span>
                        </div>
                        <input type="range" id="fog-opacity" min="0.1" max="2" step="0.1" 
                               value="${this.config.opacity}" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.7; margin-top: 5px;">
                            <span>Прозрачный</span>
                            <span>Обычный</span>
                            <span>Плотный</span>
                        </div>
                    </div>
                    
                    <div>
                        <div style="margin-bottom: 8px;">Цвет тумана</div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="color-btn ${this.config.colorMode === 'blue' ? 'active' : ''}" 
                                    data-color="blue" style="background: linear-gradient(135deg, #667eea, #764ba2);">
                                Синий
                            </button>
                            <button class="color-btn ${this.config.colorMode === 'purple' ? 'active' : ''}" 
                                    data-color="purple" style="background: linear-gradient(135deg, #9f7aea, #ed64a6);">
                                Фиолетовый
                            </button>
                            <button class="color-btn ${this.config.colorMode === 'night' ? 'active' : ''}" 
                                    data-color="night" style="background: linear-gradient(135deg, #4a5568, #2d3748);">
                                Ночной
                            </button>
                        </div>
                    </div>
                </div>
                
                <div style="
                    padding: 16px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    font-size: 13px;
                    opacity: 0.8;
                    margin-top: 20px;
                ">
                    💡 <strong>Совет:</strong> Настройте параметры под свои предпочтения. 
                    Эффект сохраняется автоматически и будет применен при следующем запуске.
                </div>
            `;
            
            // Стили для переключателя
            const style = document.createElement('style');
            style.textContent = `
                .fog-switch {
                    position: relative;
                    display: inline-block;
                    width: 60px;
                    height: 34px;
                }
                
                .fog-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .fog-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                    border-radius: 34px;
                }
                
                .fog-slider:before {
                    position: absolute;
                    content: "";
                    height: 26px;
                    width: 26px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                input:checked + .fog-slider {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                }
                
                input:checked + .fog-slider:before {
                    transform: translateX(26px);
                }
                
                .color-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 14px;
                    opacity: 0.7;
                }
                
                .color-btn.active {
                    opacity: 1;
                    transform: scale(1.05);
                    box-shadow: 0 0 0 2px white;
                }
                
                .color-btn:hover {
                    opacity: 0.9;
                    transform: scale(1.02);
                }
                
                input[type="range"] {
                    -webkit-appearance: none;
                    height: 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                    outline: none;
                }
                
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 20px;
                    height: 20px;
                    background: #667eea;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid white;
                }
            `;
            
            // Собираем панель
            this.settingsPanel.appendChild(style);
            this.settingsPanel.appendChild(header);
            this.settingsPanel.appendChild(content);
            document.body.appendChild(this.settingsPanel);
            
            // Добавляем обработчики событий
            this.addSettingsEventListeners();
            
            // Блокируем скролл под панелью
            document.body.style.overflow = 'hidden';
        }
        
        addSettingsEventListeners() {
            // Кнопка закрытия
            document.getElementById('fog-close-btn').addEventListener('click', () => {
                this.closeSettingsPanel();
            });
            
            // Закрытие по клику вне панели
            this.settingsPanel.addEventListener('click', (e) => {
                if (e.target === this.settingsPanel) {
                    this.closeSettingsPanel();
                }
            });
            
            // Переключатель включения
            document.getElementById('fog-enabled').addEventListener('change', (e) => {
                this.config.enabled = e.target.checked;
                this.saveSettings();
                
                if (this.config.enabled) {
                    this.start();
                } else {
                    this.stop();
                }
            });
            
            // Слайдер плотности
            const densitySlider = document.getElementById('fog-density');
            const densityValue = document.getElementById('fog-density-value');
            
            densitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                densityValue.textContent = value.toFixed(1) + 'x';
                this.config.density = value;
                this.saveSettings();
                this.updateDensity(value);
            });
            
            // Слайдер скорости
            const speedSlider = document.getElementById('fog-speed');
            const speedValue = document.getElementById('fog-speed-value');
            
            speedSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                speedValue.textContent = value.toFixed(1) + 'x';
                this.config.speed = value;
                this.saveSettings();
                this.updateSpeed(value);
            });
            
            // Слайдер прозрачности
            const opacitySlider = document.getElementById('fog-opacity');
            const opacityValue = document.getElementById('fog-opacity-value');
            
            opacitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                opacityValue.textContent = value.toFixed(1) + 'x';
                this.config.opacity = value;
                this.saveSettings();
                this.updateOpacity(value);
            });
            
            // Кнопки выбора цвета
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const color = e.target.dataset.color;
                    this.config.colorMode = color;
                    this.saveSettings();
                    
                    // Обновляем активную кнопку
                    document.querySelectorAll('.color-btn').forEach(b => {
                        b.classList.remove('active');
                    });
                    e.target.classList.add('active');
                    
                    // Обновляем цвета частиц
                    this.updateColors();
                });
            });
        }
        
        closeSettingsPanel() {
            if (this.settingsPanel) {
                this.settingsPanel.remove();
                this.settingsPanel = null;
            }
            document.body.style.overflow = '';
        }
        
        // =========================================
        // CANVAS И АНИМАЦИЯ
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
                this.particles.push(this.createParticle());
            }
        }
        
        createParticle() {
            const colors = this.config.colors[this.config.colorMode];
            const opacity = (0.03 + Math.random() * 0.05) * this.config.opacity;
            
            return {
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: this.config.size.min + Math.random() * (this.config.size.max - this.config.size.min),
                speedX: (Math.random() - 0.5) * 0.2 * this.config.speed,
                speedY: (Math.random() - 0.5) * 0.15 * this.config.speed,
                color: colors[Math.floor(Math.random() * colors.length)],
                opacity: opacity,
                drift: Math.random() * 0.01
            };
        }
        
        animate() {
            if (!this.enabled || !this.ctx || !this.canvas) return;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.particles.forEach(particle => {
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                particle.speedX += (Math.random() - 0.5) * particle.drift;
                particle.speedY += (Math.random() - 0.5) * particle.drift;
                
                particle.speedX = Math.max(-0.3, Math.min(0.3, particle.speedX));
                particle.speedY = Math.max(-0.3, Math.min(0.3, particle.speedY));
                
                if (particle.x < -particle.size) particle.x = this.canvas.width + particle.size;
                if (particle.x > this.canvas.width + particle.size) particle.x = -particle.size;
                if (particle.y < -particle.size) particle.y = this.canvas.height + particle.size;
                if (particle.y > this.canvas.height + particle.size) particle.y = -particle.size;
                
                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size
                );
                
                gradient.addColorStop(0, `rgba(${particle.color}, ${particle.opacity * 0.8})`);
                gradient.addColorStop(1, `rgba(${particle.color}, 0)`);
                
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
            });
            
            this.animationId = requestAnimationFrame(() => this.animate());
        }
        
        // =========================================
        // МЕТОДЫ УПРАВЛЕНИЯ
        // =========================================
        start() {
            if (this.enabled) return;
            
            this.enabled = true;
            this.canvas.style.display = 'block';
            this.resizeCanvas();
            this.animate();
            
            console.log('[FOG] Effect started');
        }
        
        stop() {
            if (!this.enabled) return;
            
            this.enabled = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            this.canvas.style.display = 'none';
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            console.log('[FOG] Effect stopped');
        }
        
        toggle() {
            if (this.enabled) {
                this.stop();
            } else {
                this.start();
            }
            return this.enabled;
        }
        
        updateDensity(multiplier) {
            const newCount = Math.round(this.config.particleCount * multiplier);
            const currentCount = this.particles.length;
            
            if (newCount > currentCount) {
                // Добавляем частицы
                for (let i = currentCount; i < newCount; i++) {
                    this.particles.push(this.createParticle());
                }
            } else if (newCount < currentCount) {
                // Удаляем частицы
                this.particles.splice(newCount);
            }
            
            if (this.enabled) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        
        updateSpeed(multiplier) {
            this.particles.forEach(p => {
                const baseSpeedX = (p.speedX / this.config.speed) * multiplier;
                const baseSpeedY = (p.speedY / this.config.speed) * multiplier;
                p.speedX = baseSpeedX;
                p.speedY = baseSpeedY;
            });
        }
        
        updateOpacity(multiplier) {
            this.particles.forEach(p => {
                const baseOpacity = (p.opacity / this.config.opacity) * multiplier;
                p.opacity = baseOpacity;
            });
        }
        
        updateColors() {
            const colors = this.config.colors[this.config.colorMode];
            this.particles.forEach(p => {
                p.color = colors[Math.floor(Math.random() * colors.length)];
            });
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
