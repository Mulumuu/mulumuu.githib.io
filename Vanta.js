/*!
 * Vanta.js Background Plugin for Lampa
 * Adds animated fog background using Vanta.js
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
        console.log('Vanta.js: Initializing background plugin...');
        
        // Ждем пока Lampa полностью загрузится
        if (typeof Lampa === 'undefined') {
            setTimeout(initPlugin, 500);
            return;
        }

        // Создаем конфигурацию плагина
        const VantaBackground = {
            name: 'Vanta Background',
            version: '1.0.0',
            author: 'Lampa Community',
            description: 'Анимированный фон с эффектом тумана',
            
            // Настройки по умолчанию
            settings: {
                enabled: true,
                highlightColor: 0xe0e0ed,
                midtoneColor: 0x9d9d9d,
                lowlightColor: 0x20202,
                baseColor: 0x727272,
                speed: 0.60,
                zoom: 1.50
            },
            
            // Ссылка на эффект Vanta
            vantaEffect: null,
            
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
                background.id = 'vanta-background-' + Date.now();
                
                // Применяем стили
                this.applyStyles(background);
                
                // Запускаем Vanta.js эффект
                this.startVantaEffect(background.id);
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
                element.style.transition = 'opacity 0.5s ease';
            },
            
            // Запуск эффекта Vanta.js
            startVantaEffect: function(elementId) {
                // Если уже есть эффект, удаляем его
                if (this.vantaEffect) {
                    this.vantaEffect.destroy();
                }
                
                // Конвертируем цвета из hex в 0x формат
                const highlightColor = this.hexToThreeColor(this.settings.highlightColor);
                const midtoneColor = this.hexToThreeColor(this.settings.midtoneColor);
                const lowlightColor = this.hexToThreeColor(this.settings.lowlightColor);
                const baseColor = this.hexToThreeColor(this.settings.baseColor);
                
                try {
                    this.vantaEffect = VANTA.FOG({
                        el: '#' + elementId,
                        mouseControls: true,
                        touchControls: true,
                        gyroControls: false,
                        minHeight: 200.00,
                        minWidth: 200.00,
                        highlightColor: highlightColor,
                        midtoneColor: midtoneColor,
                        lowlightColor: lowlightColor,
                        baseColor: baseColor,
                        speed: this.settings.speed,
                        zoom: this.settings.zoom
                    });
                    
                    console.log('Vanta.js: Effect started successfully');
                } catch (error) {
                    console.error('Vanta.js: Failed to start effect:', error);
                }
            },
            
            // Удаление фона
            removeBackground: function() {
                if (this.vantaEffect) {
                    this.vantaEffect.destroy();
                    this.vantaEffect = null;
                }
                
                const background = document.querySelector('.background');
                if (background && background.dataset.originalContent) {
                    background.innerHTML = background.dataset.originalContent;
                    background.removeAttribute('id');
                    background.style.cssText = '';
                }
            },
            
            // Конвертация цвета из hex в формат Three.js
            hexToThreeColor: function(hex) {
                // Удаляем # если есть
                hex = hex.replace('#', '');
                
                // Если короткая запись цвета
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                
                // Конвертируем в 0x формат
                return parseInt('0x' + hex);
            },
            
            // Добавление настроек в интерфейс Lampa
            addSettings: function() {
                // Проверяем доступность API настроек Lampa
                if (typeof Lampa.Settings === 'undefined') {
                    console.log('Vanta.js: Settings API not available');
                    return;
                }
                
                // Добавляем раздел настроек
                Lampa.Settings.add({
                    title: 'Vanta Background',
                    group: 'vanta',
                    items: [
                        {
                            component: 'checkbox',
                            title: 'Включить анимированный фон',
                            name: 'enabled',
                            value: this.settings.enabled,
                            onChange: (value) => {
                                this.settings.enabled = value;
                                this.applyBackground();
                                this.saveSettings();
                            }
                        },
                        {
                            component: 'color',
                            title: 'Основной цвет',
                            name: 'baseColor',
                            value: this.settings.baseColor,
                            onChange: (value) => {
                                this.settings.baseColor = value;
                                this.applyBackground();
                                this.saveSettings();
                            }
                        },
                        {
                            component: 'color',
                            title: 'Цвет подсветки',
                            name: 'highlightColor',
                            value: this.settings.highlightColor,
                            onChange: (value) => {
                                this.settings.highlightColor = value;
                                this.applyBackground();
                                this.saveSettings();
                            }
                        },
                        {
                            component: 'slider',
                            title: 'Скорость анимации',
                            name: 'speed',
                            value: this.settings.speed,
                            min: 0.1,
                            max: 3,
                            step: 0.1,
                            onChange: (value) => {
                                this.settings.speed = value;
                                this.applyBackground();
                                this.saveSettings();
                            }
                        },
                        {
                            component: 'slider',
                            title: 'Масштаб',
                            name: 'zoom',
                            value: this.settings.zoom,
                            min: 0.1,
                            max: 2,
                            step: 0.1,
                            onChange: (value) => {
                                this.settings.zoom = value;
                                this.applyBackground();
                                this.saveSettings();
                            }
                        },
                        {
                            component: 'button',
                            title: 'Сбросить настройки',
                            name: 'reset',
                            onChange: () => {
                                this.resetSettings();
                            }
                        }
                    ]
                });
            },
            
            // Сохранение настроек
            saveSettings: function() {
                try {
                    localStorage.setItem('vanta_background_settings', JSON.stringify(this.settings));
                } catch (error) {
                    console.error('Vanta.js: Failed to save settings:', error);
                }
            },
            
            // Загрузка настроек
            loadSettings: function() {
                try {
                    const saved = localStorage.getItem('vanta_background_settings');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        Object.assign(this.settings, parsed);
                    }
                } catch (error) {
                    console.error('Vanta.js: Failed to load settings:', error);
                }
            },
            
            // Сброс настроек
            resetSettings: function() {
                this.settings = {
                    enabled: true,
                    highlightColor: '#f0f0f0',
                    midtoneColor: '#cdcdcd',
                    lowlightColor: '#bbbbbb',
                    baseColor: '#919191',
                    speed: 1.5,
                    zoom: 0.8
                };
                
                this.saveSettings();
                this.applyBackground();
                
                // Перезагружаем страницу настроек
                if (Lampa.Settings && Lampa.Settings.update) {
                    Lampa.Settings.update();
                }
            },
            
            // Привязка событий
            bindEvents: function() {
                // Обработка изменения размера окна
                window.addEventListener('resize', () => {
                    if (this.vantaEffect && this.vantaEffect.resize) {
                        setTimeout(() => {
                            this.vantaEffect.resize();
                        }, 100);
                    }
                });
                
                // Обработка видимости страницы
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        if (this.vantaEffect && this.vantaEffect.pause) {
                            this.vantaEffect.pause();
                        }
                    } else {
                        if (this.vantaEffect && this.vantaEffect.play) {
                            this.vantaEffect.play();
                        }
                    }
                });
            },
            
            // Деструктор
            destroy: function() {
                this.removeBackground();
                
                // Удаляем обработчики событий
                window.removeEventListener('resize', this.handleResize);
                document.removeEventListener('visibilitychange', this.handleVisibilityChange);
                
                console.log('Vanta.js: Plugin destroyed');
            }
        };
        
        // Загружаем сохраненные настройки
        VantaBackground.loadSettings();
        
        // Инициализируем плагин
        setTimeout(() => {
            VantaBackground.init();
        }, 2000);
        
        // Экспортируем плагин
        window.VantaBackground = VantaBackground;
        
        // Добавляем CSS стили
        this.addCustomCSS();
    }
    
    // Добавление CSS стилей
    function addCustomCSS() {
        const style = document.createElement('style');
        style.id = 'vanta-background-styles';
        style.textContent = `
            /* Улучшение читаемости контента поверх анимированного фона */
            .wrap__content {
                position: relative;
                z-index: 1;
                background: rgba(29, 31, 32, 0.7);
                backdrop-filter: blur(1px);
                min-height: 100vh;
            }
            
            .wrap__left {
                position: relative;
                z-index: 1;
                background: rgba(29, 31, 32, 0.95);
            }
            
            .head {
                position: relative;
                z-index: 2;
            }
            
            .activity {
                position: relative;
                z-index: 1;
            }
            
            /* Плавное появление */
            .background {
                opacity: 1 !important;
                transition: opacity 1s ease-in-out;
            }
            
            /* Адаптивность для мобильных устройств */
            @media (max-width: 768px) {
                #vanta-background-* {
                    min-height: 100vh !important;
                }
                
                .wrap__content {
                    background: rgba(29, 31, 32, 0.85);
                }
            }
            
            /* Отключение эффекта для слабых устройств */
            @media (prefers-reduced-motion: reduce) {
                .background {
                    background: rgb(29, 31, 32) !important;
                }
                
                .background canvas {
                    display: none !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Автоматическая проверка зависимостей и инициализация
    if (checkDependencies()) {
        // Если зависимости уже загружены
        setTimeout(initPlugin, 1000);
    }
    
    // Экспорт для ручного управления
    window.initVantaBackground = function() {
        if (typeof VANTA !== 'undefined' && typeof VANTA.FOG !== 'undefined') {
            initPlugin();
        } else {
            checkDependencies();
        }
    };
    
    // Дебаг функция
    window.debugVantaBackground = function() {
        console.log('Vanta Background Debug:');
        console.log('- Vanta available:', typeof VANTA !== 'undefined');
        console.log('- THREE available:', typeof THREE !== 'undefined');
        console.log('- Background element:', document.querySelector('.background'));
        console.log('- Current effect:', window.VantaBackground ? window.VantaBackground.vantaEffect : 'Not initialized');
    };
    
})();
