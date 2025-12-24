// =========================================
// ИСПРАВЛЕННАЯ ВЕРСИЯ FOG WORKING ПЛАГИНА
// =========================================

(function() {
    'use strict';
    
    console.log('[FOG WORKING] Loading enhanced plugin...');
    
    // Основной класс
    class FogWorking {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
            this.animationId = null;
            this.enabled = false;
            this.button = null;
            
            // Конфигурация
            this.config = {
                particleCount: 60,
                colors: ['180, 200, 255', '150, 180, 240', '120, 160, 220'],
                opacity: { min: 0.03, max: 0.08 },
                size: { min: 40, max: 120 },
                speed: { min: 0.05, max: 0.2 }
            };
            
            this.init();
        }
        
        init() {
            console.log('[FOG WORKING] Initializing...');
            
            // Создаем плавающую кнопку (УЛУЧШЕННУЮ ВЕРСИЮ)
            this.createFloatingButton();
            
            // Создаем canvas для тумана
            this.createCanvas();
            
            // Инициализируем частицы
            this.initParticles();
            
            // Добавляем в меню настроек
            setTimeout(() => this.addToSettingsMenu(), 3000);
            
            console.log('[FOG WORKING] Plugin initialized');
            
            // Делаем глобально доступным
            window.FogWorking = this;
        }
        
        // =========================================
        // УЛУЧШЕННАЯ ПЛАВАЮЩАЯ КНОПКА
        // =========================================
        createFloatingButton() {
            // Удаляем старую кнопку если есть
            const oldButton = document.getElementById('fog-working-button');
            if (oldButton) oldButton.remove();
            
            // Создаем новую кнопку
            this.button = document.createElement('div');
            this.button.id = 'fog-working-button';
            
            // СИЛЬНЫЕ СТИЛИ, чтобы перекрыть CUB
            this.button.style.cssText = `
                position: fixed !important;
                bottom: 80px !important;
                right: 20px !important;
                width: 50px !important;
                height: 50px !important;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                color: white !important;
                font-size: 24px !important;
                cursor: pointer !important;
                z-index: 2147483647 !important; /* Максимальный z-index */
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
                border: 2px solid white !important;
                opacity: 0.9 !important;
                transition: all 0.3s ease !important;
                user-select: none !important;
                pointer-events: auto !important;
                backdrop-filter: blur(5px) !important;
            `;
            
            this.button.innerHTML = '🌫️';
            
            // Добавляем в тело документа
            document.body.appendChild(this.button);
            
            // Обработчик клика
            this.button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
            
            // Эффекты при наведении
            this.button.addEventListener('mouseenter', () => {
                this.button.style.transform = 'scale(1.1)';
                this.button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
            });
            
            this.button.addEventListener('mouseleave', () => {
                this.button.style.transform = 'scale(1)';
                this.button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
            });
            
            console.log('[FOG] Enhanced floating button created');
        }
        
        // =========================================
        // ДОБАВЛЕНИЕ В МЕНЮ НАСТРОЕК (как у вас работает)
        // =========================================
        addToSettingsMenu() {
            // Ждем пока загрузится интерфейс CUB
            setTimeout(() => {
                try {
                    const menuContainer = document.querySelector('.settings__body .scroll__body');
                    
                    if (!menuContainer) {
                        console.log('[FOG] Settings menu not found, retrying...');
                        setTimeout(() => this.addToSettingsMenu(), 2000);
                        return;
                    }
                    
                    // Проверяем, не добавлен ли уже пункт
                    if (document.querySelector('[data-component="fog_effect"]')) {
                        console.log('[FOG] Menu item already exists');
                        return;
                    }
                    
                    // Создаем элемент меню
                    const fogFolder = document.createElement('div');
                    fogFolder.className = 'settings-folder selector';
                    fogFolder.dataset.component = 'fog_effect';
                    fogFolder.innerHTML = `
                        <div class="settings-folder__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z"/>
                                <circle cx="12" cy="12" r="5"/>
                            </svg>
                        </div>
                        <div class="settings-folder__name">Эффект тумана</div>
                    `;
                    
                    // Обработчик клика
                    fogFolder.addEventListener('click', () => {
                        this.toggle();
                        
                        // Визуальная обратная связь
                        const icon = fogFolder.querySelector('svg');
                        if (icon) {
                            icon.style.fill = this.enabled ? '#4CAF50' : 'currentColor';
                        }
                        
                        if (this.button) {
                            this.button.innerHTML = this.enabled ? '🌫️' : '☁️';
                            this.button.style.background = this.enabled 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important'
                                : 'linear-gradient(135deg, #999 0%, #666 100%) !important';
                        }
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
                }
            }, 3000);
        }
        
        // =========================================
        // СОЗДАНИЕ CANVAS ДЛЯ ТУМАНА
        // =========================================
        createCanvas() {
            // Удаляем старый canvas если есть
            const oldCanvas = document.querySelector('.fog-working-canvas');
            if (oldCanvas) oldCanvas.remove();
            
            // Создаем новый canvas
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'fog-working-canvas';
            
            // ВАЖНО: z-index ниже кнопки, но выше контента
            this.canvas.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                pointer-events: none !important;
                z-index: 9998 !important;
                opacity: 0.7 !important;
            `;
            
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            
            // Устанавливаем размеры
            this.resizeCanvas();
            
            // Обработчик изменения размера окна
            window.addEventListener('resize', () => this.resizeCanvas());
            
            console.log('[FOG] Canvas created');
        }
        
        resizeCanvas() {
            if (this.canvas) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
        }
        
        // =========================================
        // ЧАСТИЦЫ ТУМАНА
        // =========================================
        initParticles() {
            this.particles = [];
            
            for (let i = 0; i < this.config.particleCount; i++) {
                this.particles.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    size: this.config.size.min + Math.random() * (this.config.size.max - this.config.size.min),
                    speedX: (Math.random() - 0.5) * 0.2,
                    speedY: (Math.random() - 0.5) * 0.15,
                    color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
                    opacity: this.config.opacity.min + Math.random() * (this.config.opacity.max - this.config.opacity.min),
                    drift: Math.random() * 0.01
                });
            }
        }
        
        // =========================================
        // АНИМАЦИЯ
        // =========================================
        animate() {
            if (!this.enabled || !this.ctx || !this.canvas) return;
            
            // Очищаем с легким fade эффектом
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Обновляем и рисуем частицы
            this.particles.forEach(particle => {
                // Движение
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                // Дрейф
                particle.speedX += (Math.random() - 0.5) * particle.drift;
                particle.speedY += (Math.random() - 0.5) * particle.drift;
                
                // Ограничиваем скорость
                particle.speedX = Math.max(-0.3, Math.min(0.3, particle.speedX));
                particle.speedY = Math.max(-0.3, Math.min(0.3, particle.speedY));
                
                // Границы экрана
                if (particle.x < -particle.size) particle.x = this.canvas.width + particle.size;
                if (particle.x > this.canvas.width + particle.size) particle.x = -particle.size;
                if (particle.y < -particle.size) particle.y = this.canvas.height + particle.size;
                if (particle.y > this.canvas.height + particle.size) particle.y = -particle.size;
                
                // Рисуем частицу
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
        // ОСНОВНЫЕ МЕТОДЫ
        // =========================================
        toggle() {
            this.enabled = !this.enabled;
            
            if (this.enabled) {
                // Включаем
                if (this.canvas) {
                    this.canvas.style.display = 'block';
                    this.resizeCanvas();
                    this.animate();
                }
                
                console.log('[FOG] Effect started');
            } else {
                // Выключаем
                if (this.animationId) {
                    cancelAnimationFrame(this.animationId);
                }
                if (this.canvas) {
                    this.canvas.style.display = 'none';
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }
                
                console.log('[FOG] Effect stopped');
            }
            
            // Обновляем кнопку
            if (this.button) {
                this.button.innerHTML = this.enabled ? '🌫️' : '☁️';
                this.button.style.background = this.enabled 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important'
                    : 'linear-gradient(135deg, #999 0%, #666 100%) !important';
            }
            
            return this.enabled;
        }
        
        // Методы для консоли
        setDensity(multiplier) {
            this.config.particleCount = Math.max(20, Math.min(150, Math.round(60 * multiplier)));
            this.initParticles();
            console.log(`[FOG] Density set to: ${this.config.particleCount} particles`);
        }
        
        setSpeed(multiplier) {
            this.particles.forEach(p => {
                p.speedX *= multiplier;
                p.speedY *= multiplier;
            });
            console.log(`[FOG] Speed multiplied by: ${multiplier}`);
        }
        
        clear() {
            if (this.ctx && this.canvas) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                console.log('[FOG] Canvas cleared');
            }
        }
    }
    
    // Автоматическая инициализация при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new FogWorking();
        });
    } else {
        new FogWorking();
    }
    
})();
