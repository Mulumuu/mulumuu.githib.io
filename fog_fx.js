// ==============================================
// Simple Fog FX Plugin for Lampa (CUB)
// Based on the structure of snow_new.js
// ==============================================
(function() {
    'use strict';
    
    // Проверяем, не загружен ли уже плагин
    if (window.SimpleFogLoaded) return;
    window.SimpleFogLoaded = true;
    
    console.log('Simple Fog FX: Плагин начал загрузку');
    
    // ===== КОНСТАНТЫ И НАСТРОЙКИ =====
    const STORAGE_KEY = 'simple_fog_enabled';
    const DEFAULT_ENABLED = true; // По умолчанию включен
    
    // Настройки эффекта (можно менять под свой вкус)
    const CONFIG = {
        particleCount: 40,        // Количество частиц тумана
        particleSizeMin: 40,      // Минимальный размер частицы
        particleSizeMax: 120,     // Максимальный размер частицы
        speedMin: 0.1,           // Минимальная скорость
        speedMax: 0.3,           // Максимальная скорость
        opacityMin: 0.03,        // Минимальная прозрачность
        opacityMax: 0.15,        // Максимальная прозрачность
        color: '255, 255, 255',  // RGB цвет тумана (белый)
        driftStrength: 0.05,     // Сила хаотичного дрейфа
        updateInterval: 30       // Интервал обновления (мс)
    };
    
    // ===== ЯДРО ЭФФЕКТА ТУМАНА =====
    class SimpleFog {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
            this.animationId = null;
            this.isActive = false;
            this.lastUpdate = 0;
            this.width = 0;
            this.height = 0;
            
            // Инициализация
            this.init();
        }
        
        init() {
            // Создаем canvas элемент
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'simple-fog-canvas';
            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9998;
                opacity: 1;
            `;
            
            // Добавляем на страницу
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            
            // Обработчик изменения размера окна
            window.addEventListener('resize', () => this.resize());
            this.resize();
            
            console.log('Simple Fog FX: Инициализирован');
        }
        
        resize() {
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;
            this.generateParticles();
        }
        
        // Генерация частиц тумана
        generateParticles() {
            this.particles = [];
            
            for (let i = 0; i < CONFIG.particleCount; i++) {
                this.particles.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    size: CONFIG.particleSizeMin + Math.random() * (CONFIG.particleSizeMax - CONFIG.particleSizeMin),
                    speedX: (Math.random() - 0.5) * (CONFIG.speedMax - CONFIG.speedMin) + CONFIG.speedMin,
                    speedY: (Math.random() - 0.5) * (CONFIG.speedMax - CONFIG.speedMin) + CONFIG.speedMin,
                    opacity: CONFIG.opacityMin + Math.random() * (CONFIG.opacityMax - CONFIG.opacityMin),
                    driftSeed: Math.random() * 100 // Для псевдослучайного дрейфа
                });
            }
        }
        
        // Обновление позиций частиц
        updateParticles(deltaTime) {
            for (let particle of this.particles) {
                // Хаотичный дрейф (плавное движение)
                const driftX = Math.sin(Date.now() * 0.001 + particle.driftSeed) * CONFIG.driftStrength;
                const driftY = Math.cos(Date.now() * 0.001 + particle.driftSeed * 1.3) * CONFIG.driftStrength * 0.7;
                
                // Обновление позиции
                particle.x += (particle.speedX + driftX) * deltaTime;
                particle.y += (particle.speedY + driftY) * deltaTime;
                
                // "Телепортация" частиц при выходе за границы
                if (particle.x < -particle.size) particle.x = this.width + particle.size;
                if (particle.x > this.width + particle.size) particle.x = -particle.size;
                if (particle.y < -particle.size) particle.y = this.height + particle.size;
                if (particle.y > this.height + particle.size) particle.y = -particle.size;
            }
        }
        
        // Отрисовка тумана
        drawFog() {
            // Очищаем canvas с небольшим затемнением для плавности
            this.ctx.fillStyle = `rgba(0, 0, 0, 0.05)`;
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            // Рисуем каждую частицу как размытое пятно
            for (let particle of this.particles) {
                // Создаем градиент для эффекта "пушистости" тумана
                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size
                );
                
                gradient.addColorStop(0, `rgba(${CONFIG.color}, ${particle.opacity * 0.8})`);
                gradient.addColorStop(0.5, `rgba(${CONFIG.color}, ${particle.opacity * 0.3})`);
                gradient.addColorStop(1, `rgba(${CONFIG.color}, 0)`);
                
                this.ctx.beginPath();
                this.ctx.fillStyle = gradient;
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Главный цикл анимации
        animate(timestamp) {
            if (!this.lastUpdate) this.lastUpdate = timestamp;
            
            const deltaTime = (timestamp - this.lastUpdate) / 16; // Нормализация времени
            this.lastUpdate = timestamp;
            
            this.updateParticles(deltaTime);
            this.drawFog();
            
            this.animationId = requestAnimationFrame((t) => this.animate(t));
        }
        
        // Запуск эффекта
        start() {
            if (this.isActive) return;
            
            this.isActive = true;
            this.lastUpdate = 0;
            this.generateParticles();
            this.animationId = requestAnimationFrame((t) => this.animate(t));
            
            console.log('Simple Fog FX: Эффект запущен');
        }
        
        // Остановка эффекта
        stop() {
            if (!this.isActive) return;
            
            this.isActive = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            // Очищаем canvas
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.width, this.height);
            }
            
            console.log('Simple Fog FX: Эффект остановлен');
        }
        
        // Уничтожение (удаление canvas)
        destroy() {
            this.stop();
            if (this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
        }
    }
    
    // ===== ИНТЕГРАЦИЯ С LAMPA =====
    class LampaIntegration {
        constructor() {
            this.fog = null;
            this.currentState = false;
            this.checkInterval = null;
            
            // Ждем загрузки Lampa
            this.waitForLampa();
        }
        
        async waitForLampa() {
            // Ожидаем появления объекта Lampa (максимум 10 секунд)
            const maxAttempts = 100;
            const interval = 100;
            
            for (let i = 0; i < maxAttempts; i++) {
                if (window.Lampa && Lampa.Settings) {
                    console.log('Simple Fog FX: Lampa найдена');
                    this.setup();
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, interval));
            }
            
            console.log('Simple Fog FX: Lampa не найдена, запускаем автономно');
            this.setupAutonomous();
        }
        
        // Получение состояния из хранилища
        getStorageState() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                return saved !== null ? JSON.parse(saved) : DEFAULT_ENABLED;
            } catch (e) {
                return DEFAULT_ENABLED;
            }
        }
        
        // Сохранение состояния в хранилище
        setStorageState(state) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e) {
                console.warn('Simple Fog FX: Не удалось сохранить настройки');
            }
        }
        
        // Основная настройка с интеграцией в Lampa
        setup() {
            this.currentState = this.getStorageState();
            this.fog = new SimpleFog();
            
            // Создаем пункт в меню настроек Lampa
            this.createSettingsItem();
            
            // Запускаем/останавливаем в зависимости от сохраненного состояния
            this.updateFogState();
            
            // Следим за изменениями активности (опционально)
            this.startActivityMonitor();
            
            console.log('Simple Fog FX: Интеграция с Lampa завершена');
        }
        
        // Автономная настройка (если Lampa не найдена)
        setupAutonomous() {
            this.currentState = this.getStorageState();
            this.fog = new SimpleFog();
            
            // Создаем простую плавающую кнопку для управления
            this.createFloatingButton();
            this.updateFogState();
            
            console.log('Simple Fog FX: Запущен в автономном режиме');
        }
        
        // Создание плавающей кнопки (для автономного режима)
        createFloatingButton() {
            const button = document.createElement('div');
            button.id = 'simple-fog-toggle';
            button.innerHTML = '☁️';
            button.title = 'Включить/выключить туман';
            button.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                cursor: pointer;
                z-index: 9999;
                user-select: none;
                transition: transform 0.2s, background 0.2s;
            `;
            
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.1)';
                button.style.background = 'rgba(0, 0, 0, 0.9)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
                button.style.background = 'rgba(0, 0, 0, 0.7)';
            });
            
            button.addEventListener('click', () => {
                this.currentState = !this.currentState;
                this.setStorageState(this.currentState);
                this.updateFogState();
                
                // Визуальная обратная связь
                button.style.transform = 'scale(0.9)';
                setTimeout(() => button.style.transform = 'scale(1)', 150);
            });
            
            document.body.appendChild(button);
        }
        
        // Создание пункта в настройках Lampa
        createSettingsItem() {
            // Иконка в SVG формате
            const fogIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 14h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zm0 4h18c-.5-1-1.5-2-3-2H6c-1.5 0-2.5 1-3 2zM5 10c1.5 0 2.5-1 3-2h8c.5 1 1.5 2 3 2h5"/>
            </svg>`;
            
            // Добавляем вкладку в настройки
            Lampa.Settings.add({
                title: 'Простой туман',
                name: 'simple_fog',
                component: 'simple_fog',
                icon: fogIcon
            });
            
            // Создаем компонент для настроек
            Lampa.Component.add('simple_fog', {
                template: { 'simple_fog': 1 },
                create: function() {
                    const html = Lampa.Template.get('simple_fog', {});
                    const toggle = html.find('.selector-select[data-name="enabled"]');
                    
                    // Устанавливаем текущее значение
                    toggle.val(this.currentState ? '1' : '0').trigger('change');
                    
                    // Обработчик изменения
                    const self = this;
                    toggle.on('change', function() {
                        const newState = $(this).val() === '1';
                        self.setStorageState(newState);
                        self.currentState = newState;
                        self.updateFogState();
                    });
                }.bind(this)
            });
            
            // HTML шаблон для панели настроек (минимальный)
            Lampa.Template.add('simple_fog',
                `<div class="settings-layer">
                    <div class="settings-layer__name">Простой туман</div>
                    <div class="settings-list">
                        <div class="selector selector-focusable">
                            <div class="selector__body">
                                <div class="selector__items">
                                    <select class="selector-select" data-name="enabled">
                                        <option value="1">Включено</option>
                                        <option value="0">Выключено</option>
                                    </select>
                                </div>
                                <div class="selector__name">Состояние</div>
                            </div>
                        </div>
                        <div class="settings-description">
                            Легкий эффект тумана на фоне интерфейса. Для изменения настроек отредактируйте CONFIG в коде плагина.
                        </div>
                    </div>
                </div>`
            );
        }
        
        // Обновление состояния эффекта
        updateFogState() {
            if (!this.fog) return;
            
            if (this.currentState) {
                this.fog.start();
            } else {
                this.fog.stop();
            }
            
            // Обновляем текст плавающей кнопки (если есть)
            const button = document.getElementById('simple-fog-toggle');
            if (button) {
                button.innerHTML = this.currentState ? '🌫️' : '☁️';
                button.title = this.currentState ? 'Туман включен' : 'Туман выключен';
            }
        }
        
        // Мониторинг активности (упрощенный вариант)
        startActivityMonitor() {
            // Проверяем каждые 2 секунды, не открыто ли модальное окно/плеер
            this.checkInterval = setInterval(() => {
                const modalOpen = document.querySelector('.layer--modal, .player') !== null;
                
                // Останавливаем туман при открытом плеере или модальном окне
                if (modalOpen && this.currentState) {
                    this.fog.stop();
                } else if (!modalOpen && this.currentState) {
                    this.fog.start();
                }
            }, 2000);
        }
        
        // Очистка
        destroy() {
            if (this.checkInterval) clearInterval(this.checkInterval);
            if (this.fog) this.fog.destroy();
            
            // Удаляем плавающую кнопку
            const button = document.getElementById('simple-fog-toggle');
            if (button && button.parentNode) {
                button.parentNode.removeChild(button);
            }
        }
    }
    
    // ===== ЗАПУСК ПЛАГИНА =====
    // Ждем полной загрузки страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.SimpleFogPlugin = new LampaIntegration();
        });
    } else {
        window.SimpleFogPlugin = new LampaIntegration();
    }
    
    // Экспортируем глобально для отладки
    window.SimpleFog = SimpleFog;
    
})();
