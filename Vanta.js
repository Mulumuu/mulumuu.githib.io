/*1
 * Vanta.js Background Plugin for Lampa
 * Static fog background using Vanta.js (animation stopped after first frame)
 */

(function() {
    'use strict';

    // Проверяем доступность Vanta.js и Three.js
    function checkDependencies() {
        if (typeof VANTA === 'undefined' || typeof VANTA.FOG === 'undefined') {
            console.log('Vanta.js: Loading dependencies...');
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js', function() {
                loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js', initPlugin);
            });
            return false;
        }
        return true;
    }

    // Динамическая загрузка скриптов
    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = callback;
        script.onerror = function() {
            console.error('Vanta.js: Failed to load script:', src);
        };
        document.head.appendChild(script);
    }

    // Инициализация плагина
    function initPlugin() {
        console.log('Vanta.js: Initializing static background plugin...');
        
        // Ждем пока Lampa полностью загрузится
        if (typeof Lampa === 'undefined') {
            setTimeout(initPlugin, 500);
            return;
        }

        // Создаем конфигурацию плагина
        const VantaBackground = {
            name: 'Vanta Static Background',
            version: '1.2.0',
            author: 'Lampa Community',
            description: 'Статичный фон с Vanta.js (анимация остановлена)',
            
            // Настройки по умолчанию
            settings: {
                enabled: true,
                highlightColor: '#E0E0E0',
                midtoneColor: '#9d9d9d',
                lowlightColor: '#020202',
                baseColor: '#727272',
                zoom: 0.8
            },
            
            vantaEffect: null,
            isAnimationStopped: false,
            
            // Инициализация
            init: function() {
                this.applyBackground();
                this.addSettings();
                this.bindEvents();
                
                console.log('Vanta.js: Plugin initialized');
            },
            
            // Применение фона
            applyBackground: function() {
                if (!this.settings.enabled) {
                    this.removeBackground();
                    return;
                }
                
                // Находим элемент фона Lampa
                let background = document.querySelector('.background');
                
                if (!background) {
                    console.error('Vanta.js: Background element not found');
                    return;
                }
                
                // Сохраняем оригинальный фон
                if (!background.dataset.originalContent) {
                    background.dataset.originalContent = background.innerHTML;
                }
                
                // Очищаем существующий фон
                background.innerHTML = '';
                
                // Устанавливаем ID для Vanta.js
                const elementId = 'vanta-bg-' + Date.now();
                background.id = elementId;
                
                // Применяем стили
                this.applyStyles(background);
                
                // Запускаем Vanta.js и останавливаем после первого кадра
                this.startAndFreezeVanta(elementId);
            },
            
            // Применение стилей
            applyStyles: function(element) {
                element.style.position = 'fixed';
                element.style.top = '0';
                element.style.left = '0';
                element.style.width = '100%';
                element.style.height = '100%';
                element.style.zIndex = '-1';
                element.style.pointerEvents = 'none';
                element.style.background = 'rgb(29, 31, 32)';
            },
            
            // Запуск и заморозка Vanta эффекта
            startAndFreezeVanta: function(elementId) {
                // Если уже есть эффект, удаляем его
                if (this.vantaEffect) {
                    try {
                        this.vantaEffect.destroy();
                    } catch(e) {}
                    this.vantaEffect = null;
                }
                
                this.isAnimationStopped = false;
                
                try {
                    // Создаем Vanta эффект с нулевой скоростью
                    this.vantaEffect = VANTA.FOG({
                        el: '#' + elementId,
                        mouseControls: false,
                        touchControls: false,
                        gyroControls: false,
                        minHeight: 200.00,
                        minWidth: 200.00,
                        highlightColor: this.hexToThreeColor(this.settings.highlightColor),
                        midtoneColor: this.hexToThreeColor(this.settings.midtoneColor),
                        lowlightColor: this.hexToThreeColor(this.settings.lowlightColor),
                        baseColor: this.hexToThreeColor(this.settings.baseColor),
                        speed: 0, // Нулевая скорость
                        zoom: this.settings.zoom
                    });
                    
                    console.log('Vanta.js: Effect created, waiting for first frame...');
                    
                    // Ждем завершения первого кадра и останавливаем анимацию
                    this.stopAnimationAfterFirstFrame();
                    
                } catch (error) {
                    console.error('Vanta.js: Failed to create effect:', error);
                    this.createCanvasFallback();
                }
            },
            
            // Остановка анимации после первого кадра
            stopAnimationAfterFirstFrame: function() {
                if (!this.vantaEffect || this.isAnimationStopped) return;
                
                let frameCount = 0;
                const maxFrames = 3; // Несколько кадров для инициализации
                
                // Сохраняем оригинальный метод рендера
                const originalRender = this.vantaEffect.renderer ? this.vantaEffect.renderer.render : null;
                
                // Перехватываем метод рендера
                if (this.vantaEffect.renderer && this.vantaEffect.renderer.render) {
                    const self = this;
                    const renderer = this.vantaEffect.renderer;
                    
                    renderer.render = function(scene, camera) {
                        if (frameCount < maxFrames) {
                            if (originalRender) {
                                originalRender.call(this, scene, camera);
                            }
                            frameCount++;
                            
                            // После последнего кадра останавливаем все
                            if (frameCount >= maxFrames && !self.isAnimationStopped) {
                                self.freezeVantaAnimation();
                            }
                        }
                        // Не вызываем оригинальный рендер после maxFrames
                    };
                }
                
                // Альтернативный метод: таймаут для остановки
                setTimeout(() => {
                    if (!this.isAnimationStopped) {
                        this.freezeVantaAnimation();
                    }
                }, 500);
            },
            
            // Заморозка анимации Vanta
            freezeVantaAnimation: function() {
                if (!this.vantaEffect || this.isAnimationStopped) return;
                
                console.log('Vanta.js: Freezing animation...');
                
                try {
                    // 1. Останавливаем анимационный цикл Vanta
                    if (this.vantaEffect.stop && typeof this.vantaEffect.stop === 'function') {
                        this.vantaEffect.stop();
                    }
                    
                    // 2. Отменяем requestAnimationFrame
                    if (this.vantaEffect.animationFrameId) {
                        cancelAnimationFrame(this.vantaEffect.animationFrameId);
                        this.vantaEffect.animationFrameId = null;
                    }
                    
                    // 3. Отключаем рендерер
                    if (this.vantaEffect.renderer) {
                        // Останавливаем анимацию рендерера
                        this.vantaEffect.renderer.animation = null;
                        
                        // Отключаем автообновление сцены
                        if (this.vantaEffect.scene) {
                            this.vantaEffect.scene.autoUpdate = false;
                        }
                        
                        // Очищаем функцию рендера
                        this.vantaEffect.renderer.render = function() {};
                    }
                    
                    // 4. Удаляем все обработчики анимации
                    if (this.vantaEffect.onUpdate) {
                        this.vantaEffect.onUpdate = null;
                    }
                    
                    // 5. Устанавливаем флаг остановки
                    this.isAnimationStopped = true;
                    
                    console.log('Vanta.js: Animation frozen successfully');
                    
                    // 6. Создаем снапшот для экономии памяти
                    this.createVantaSnapshot();
                    
                } catch (error) {
                    console.error('Vanta.js: Error freezing animation:', error);
                }
            },
            
            // Создание снапшота Vanta (конвертация в статичное изображение)
            createVantaSnapshot: function() {
                if (!this.vantaEffect || !this.vantaEffect.renderer) return;
                
                try {
                    const renderer = this.vantaEffect.renderer;
                    const canvas = renderer.domElement;
                    
                    if (canvas) {
                        // Клонируем canvas для статичного изображения
                        const staticCanvas = document.createElement('canvas');
                        staticCanvas.width = canvas.width;
                        staticCanvas.height = canvas.height;
                        staticCanvas.style.cssText = canvas.style.cssText;
                        
                        // Копируем содержимое
                        const ctx = staticCanvas.getContext('2d');
                        ctx.drawImage(canvas, 0, 0);
                        
                        // Заменяем анимированный canvas на статичный
                        const background = document.querySelector('.background');
                        if (background) {
                            const oldCanvas = background.querySelector('canvas');
                            if (oldCanvas) {
                                oldCanvas.remove();
                            }
                            background.appendChild(staticCanvas);
                        }
                        
                        // Освобождаем память Vanta
                        this.cleanupVantaMemory();
                        
                        console.log('Vanta.js: Snapshot created, Vanta memory freed');
                    }
                } catch (error) {
                    console.error('Vanta.js: Error creating snapshot:', error);
                }
            },
            
            // Очистка памяти Vanta
            cleanupVantaMemory: function() {
                if (!this.vantaEffect) return;
                
                try {
                    // Удаляем ссылки на Three.js объекты
                    if (this.vantaEffect.renderer) {
                        this.vantaEffect.renderer.dispose();
                        this.vantaEffect.renderer.forceContextLoss();
                        this.vantaEffect.renderer = null;
                    }
                    
                    if (this.vantaEffect.scene) {
                        // Очищаем сцену
                        while(this.vantaEffect.scene.children.length > 0) { 
                            this.vantaEffect.scene.remove(this.vantaEffect.scene.children[0]); 
                        }
                        this.vantaEffect.scene = null;
                    }
                    
                    if (this.vantaEffect.camera) {
                        this.vantaEffect.camera = null;
                    }
                    
                    // Очищаем другие ссылки
                    this.vantaEffect.material = null;
                    this.vantaEffect.geometry = null;
                    
                    // Останавливаем сборщик мусора
                    this.vantaEffect = null;
                    
                    if (window.performance && window.performance.memory) {
                        console.log('Vanta.js: Memory cleaned up');
                    }
                    
                } catch (error) {
                    console.error('Vanta.js: Error cleaning memory:', error);
                }
            },
            
            // Fallback на Canvas если Vanta не работает
            createCanvasFallback: function() {
                console.log('Vanta.js: Using canvas fallback');
                
                const background = document.querySelector('.background');
                if (!background) return;
                
                const canvas = document.createElement('canvas');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                
                // Создаем простой градиентный фон
                const gradient = ctx.createRadialGradient(
                    window.innerWidth / 2, window.innerHeight / 2, 0,
                    window.innerWidth / 2, window.innerHeight / 2, 
                    Math.max(window.innerWidth, window.innerHeight) / 2
                );
                
                gradient.addColorStop(0, this.settings.highlightColor);
                gradient.addColorStop(0.5, this.settings.midtoneColor);
                gradient.addColorStop(1, this.settings.lowlightColor);
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                canvas.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 0;
                `;
                
                background.appendChild(canvas);
            },
            
            // Удаление фона
            removeBackground: function() {
                if (this.vantaEffect) {
                    try {
                        this.vantaEffect.destroy();
                    } catch(e) {}
                    this.vantaEffect = null;
                }
                
                this.isAnimationStopped = false;
                
                const background = document.querySelector('.background');
                if (background && background.dataset.originalContent) {
                    background.innerHTML = background.dataset.originalContent;
                    background.removeAttribute('id');
                    background.style.cssText = '';
                }
            },
            
            // Конвертация цвета
            hexToThreeColor: function(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                return parseInt('0x' + hex);
            },
            
            // Обработка изменения размера окна
            handleResize: function() {
                if (this.vantaEffect && this.vantaEffect.resize) {
                    // Пересоздаем эффект при изменении размера
                    this.removeBackground();
                    setTimeout(() => this.applyBackground(), 100);
                }
            },
            
            // Добавление настроек
            addSettings: function() {
                // Можно добавить позже
            },
            
            // Загрузка настроек
            loadSettings: function() {
                try {
                    const saved = localStorage.getItem('vanta_frozen_settings');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        Object.assign(this.settings, parsed);
                    }
                } catch (error) {
                    console.error('Vanta.js: Failed to load settings:', error);
                }
            },
            
            // Привязка событий
            bindEvents: function() {
                const resizeHandler = () => this.handleResize();
                window.addEventListener('resize', resizeHandler);
                this.resizeHandler = resizeHandler;
            },
            
            // Деструктор
            destroy: function() {
                this.removeBackground();
                
                if (this.resizeHandler) {
                    window.removeEventListener('resize', this.resizeHandler);
                }
                
                console.log('Vanta.js: Plugin destroyed');
            }
        };
        
        // Загружаем настройки
        VantaBackground.loadSettings();
        
        // Инициализируем плагин
        setTimeout(() => {
            VantaBackground.init();
        }, 2000);
        
        // Экспортируем плагин
        window.VantaBackground = VantaBackground;
    }
    
    // Автоматическая проверка зависимостей и инициализация
    if (checkDependencies()) {
        setTimeout(initPlugin, 1000);
    }
    
})();
