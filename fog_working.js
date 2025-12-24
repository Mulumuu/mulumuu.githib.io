(function() {
    'use strict';

    // Проверяем, не загружен ли уже плагин
    if (window.__fogfx_loaded__) return;
    window.__fogfx_loaded__ = true;

    // Ключи для хранения настроек
    var KEY_ENABLED = 'fogfx_enabled';
    var KEY_DENSITY = 'fogfx_density';     // 0-3: auto, low, mid, high
    var KEY_SPEED = 'fogfx_speed';         // 0-3: auto, slow, medium, fast
    var KEY_OPACITY = 'fogfx_opacity';     // 0-3: auto, low, medium, high
    var KEY_COLOR = 'fogfx_color';         // 0-3: blue, purple, gray, green
    var KEY_SIZE = 'fogfx_particle_size';  // 0-3: auto, small, medium, large
    var KEY_IN_DETAILS = 'fogfx_in_details'; // 0-1: выкл/вкл в карточке

    // Иконка для меню (в стиле Lampa)
    var FOG_ICON =
        '<svg class="fogfx-menu-icon" width="88" height="83" viewBox="0 0 88 83" xmlns="http://www.w3.org/2000/svg">' +
            '<g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">' +
                '<path d="M10 20C10 15 15 10 20 10H68C73 10 78 15 78 20V63C78 68 73 73 68 73H20C15 73 10 68 10 63V20Z" fill-opacity="0.1"/>' +
                '<path d="M25 30C25 28 26 27 28 27H60C62 27 63 28 63 30V53C63 55 62 56 60 56H28C26 56 25 55 25 53V30Z" fill-opacity="0.2"/>' +
                '<circle cx="44" cy="41" r="15" fill-opacity="0.3"/>' +
                '<circle cx="35" cy="35" r="8" fill-opacity="0.4"/>' +
                '<circle cx="53" cy="47" r="6" fill-opacity="0.4"/>' +
            '</g>' +
        '</svg>';

    // --- Вспомогательные функции из snow_new.js ---
    function storageGet(key, def) {
        try {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.get) {
                return Lampa.Storage.get(key, def);
            }
        } catch (e) {}
        // Fallback для локального хранилища
        try {
            var val = localStorage.getItem(key);
            return val !== null ? JSON.parse(val) : def;
        } catch (e) {
            return def;
        }
    }

    function storageSet(key, value) {
        try {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.set) {
                Lampa.Storage.set(key, value);
                return;
            }
        } catch (e) {}
        // Fallback для локального хранилища
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
    }

    function num(v, def) {
        v = Number(v);
        return isNaN(v) ? def : v;
    }

    // Определение платформы
    function isTizen() {
        try {
            if (window.Lampa && Lampa.Platform && Lampa.Platform.is && Lampa.Platform.is('tizen')) return true;
        } catch (e) {}
        return /Tizen/i.test(navigator.userAgent || '');
    }

    function isAndroid() {
        try {
            if (window.Lampa && Lampa.Platform && Lampa.Platform.is && Lampa.Platform.is('android')) return true;
        } catch (e) {}
        return /Android/i.test(navigator.userAgent || '');
    }

    function isDesktop() {
        var ua = navigator.userAgent || '';
        return !(/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) && !isTizen();
    }

    // --- Основной класс тумана ---
    var FogFX = function() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
        this.enabled = false;
        this.active = false;
        
        // Текущая конфигурация
        this.config = {
            enabled: num(storageGet(KEY_ENABLED, 0), 0) === 1,
            density: num(storageGet(KEY_DENSITY, 0), 0),
            speed: num(storageGet(KEY_SPEED, 0), 0),
            opacity: num(storageGet(KEY_OPACITY, 0), 0),
            color: num(storageGet(KEY_COLOR, 0), 0),
            size: num(storageGet(KEY_SIZE, 0), 0),
            inDetails: num(storageGet(KEY_IN_DETAILS, 0), 0) === 1
        };
        
        this.init();
    };

    FogFX.prototype.init = function() {
        console.log('[FOG FX] Initializing...');
        
        // Создаем canvas с отрицательным z-index для фона
        this.createCanvas();
        
        // Добавляем пункт в меню настроек
        this.addMenuEntry();
        
        // Запускаем проверку активности
        this.startActivityCheck();
        
        // Сохраняем глобально
        window.FogFX = this;
        
        console.log('[FOG FX] Initialized, enabled:', this.config.enabled);
    };

    // Создание canvas на фоне
    FogFX.prototype.createCanvas = function() {
        // Удаляем старый canvas если есть
        var oldCanvas = document.querySelector('.fogfx-canvas');
        if (oldCanvas) oldCanvas.remove();
        
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fogfx-canvas';
        
        // Отрицательный z-index для фона
        this.canvas.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            pointer-events: none !important;
            z-index: -1 !important;
            opacity: 0.7 !important;
            display: none;
        `;
        
        // Вставляем первым элементом
        document.body.insertBefore(this.canvas, document.body.firstChild);
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        window.addEventListener('resize', this.resizeCanvas.bind(this));
    };

    FogFX.prototype.resizeCanvas = function() {
        if (this.canvas) {
            var dpr = window.devicePixelRatio || 1;
            this.canvas.width = window.innerWidth * dpr;
            this.canvas.height = window.innerHeight * dpr;
            this.ctx.scale(dpr, dpr);
        }
    };

    // --- Меню настроек (как в snow_new.js) ---
    FogFX.prototype.addMenuEntry = function() {
        var self = this;
        
        // Ждем инициализации меню
        var checkInterval = setInterval(function() {
            try {
                // Ищем контейнер меню настроек
                var menuContainer = document.querySelector('.settings__body .scroll__body');
                if (!menuContainer) return;
                
                // Проверяем, не добавлен ли уже пункт
                if (document.querySelector('[data-component="fog_fx"]')) {
                    clearInterval(checkInterval);
                    return;
                }
                
                // Создаем элемент меню
                var fogItem = document.createElement('div');
                fogItem.className = 'settings-folder selector';
                fogItem.dataset.component = 'fog_fx';
                fogItem.innerHTML = `
                    <div class="settings-folder__icon">
                        ${FOG_ICON}
                    </div>
                    <div class="settings-folder__name">Атмосферный туман</div>
                `;
                
                // Обработчик клика - открываем настройки
                fogItem.addEventListener('click', function(e) {
                    e.stopPropagation();
                    self.openSettings();
                });
                
                // Добавляем в меню (перед Backup)
                var foldersContainer = menuContainer.querySelector('div');
                var backupFolder = foldersContainer.querySelector('[data-component="backup"]');
                
                if (foldersContainer && backupFolder) {
                    foldersContainer.insertBefore(fogItem, backupFolder);
                    console.log('[FOG FX] Menu item added');
                    clearInterval(checkInterval);
                }
                
            } catch (error) {
                console.error('[FOG FX] Error adding menu:', error);
            }
        }, 1000);
    };

    // Открытие настроек (стиль snow_new.js)
    FogFX.prototype.openSettings = function() {
        var self = this;
        
        // Закрываем предыдущее окно если есть
        var oldWindow = document.querySelector('.settings-window.fogfx-settings');
        if (oldWindow) oldWindow.remove();
        
        // Создаем окно настроек в стиле Lampa
        var settingsWindow = document.createElement('div');
        settingsWindow.className = 'settings-window fogfx-settings';
        settingsWindow.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Основной контент
        var content = document.createElement('div');
        content.className = 'settings-window__content';
        content.style.cssText = `
            width: 600px;
            max-width: 90%;
            max-height: 80%;
            background: var(--settings-background, #1a1d28);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        `;
        
        // Заголовок
        var header = document.createElement('div');
        header.className = 'settings-window__header';
        header.innerHTML = `
            <div class="settings-window__title">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:24px;">🌫️</div>
                    <div>
                        <div style="font-size:20px; font-weight:500;">Настройки тумана</div>
                        <div style="font-size:13px; opacity:0.7;">Атмосферный эффект фона</div>
                    </div>
                </div>
                <button class="settings-window__close" style="
                    background:transparent;
                    border:none;
                    color:white;
                    font-size:24px;
                    cursor:pointer;
                    padding:8px;
                ">×</button>
            </div>
        `;
        
        // Тело настроек
        var body = document.createElement('div');
        body.className = 'settings-window__body';
        body.style.cssText = 'padding:20px; overflow-y:auto; max-height:400px;';
        
        // Генерируем настройки
        body.innerHTML = this.generateSettingsHTML();
        
        content.appendChild(header);
        content.appendChild(body);
        settingsWindow.appendChild(content);
        document.body.appendChild(settingsWindow);
        
        // Добавляем обработчики
        this.addSettingsHandlers(settingsWindow);
        
        // Блокируем скролл
        document.body.style.overflow = 'hidden';
    };

    // Генерация HTML настроек
    FogFX.prototype.generateSettingsHTML = function() {
        var config = this.config;
        
        // Тексты для значений
        var densityTexts = ['Авто', 'Низкая', 'Средняя', 'Высокая'];
        var speedTexts = ['Авто', 'Медленно', 'Средне', 'Быстро'];
        var opacityTexts = ['Авто', 'Слабая', 'Средняя', 'Сильная'];
        var colorTexts = ['Синий', 'Фиолетовый', 'Серый', 'Зеленый'];
        var sizeTexts = ['Авто', 'Мелкие', 'Средние', 'Крупные'];
        
        return `
            <div class="settings-group" style="margin-bottom:25px;">
                <div class="settings-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:rgba(255,255,255,0.05); border-radius:8px;">
                    <div>
                        <div style="font-weight:500; margin-bottom:4px;">Включить эффект тумана</div>
                        <div style="font-size:13px; opacity:0.7;">Атмосферный фон под интерфейсом</div>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="fog-enabled" ${config.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-group" style="margin-bottom:25px;">
                <div class="settings-subtitle" style="font-size:16px; font-weight:500; margin-bottom:15px; padding-left:5px;">
                    Основные параметры
                </div>
                
                <div class="settings-item" style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>Плотность тумана</span>
                        <span id="density-value" style="color:#4CAF50;">${densityTexts[config.density]}</span>
                    </div>
                    <input type="range" id="fog-density" min="0" max="3" step="1" value="${config.density}" 
                           style="width:100%; height:6px; background:linear-gradient(to right, #2d3748, #3b82f6); border-radius:3px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; opacity:0.7; margin-top:5px;">
                        <span>Авто</span><span>Низкая</span><span>Средняя</span><span>Высокая</span>
                    </div>
                </div>
                
                <div class="settings-item" style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>Скорость движения</span>
                        <span id="speed-value" style="color:#4CAF50;">${speedTexts[config.speed]}</span>
                    </div>
                    <input type="range" id="fog-speed" min="0" max="3" step="1" value="${config.speed}" 
                           style="width:100%; height:6px; background:linear-gradient(to right, #2d3748, #3b82f6); border-radius:3px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; opacity:0.7; margin-top:5px;">
                        <span>Авто</span><span>Медленно</span><span>Средне</span><span>Быстро</span>
                    </div>
                </div>
                
                <div class="settings-item" style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>Прозрачность</span>
                        <span id="opacity-value" style="color:#4CAF50;">${opacityTexts[config.opacity]}</span>
                    </div>
                    <input type="range" id="fog-opacity" min="0" max="3" step="1" value="${config.opacity}" 
                           style="width:100%; height:6px; background:linear-gradient(to right, #2d3748, #3b82f6); border-radius:3px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; opacity:0.7; margin-top:5px;">
                        <span>Авто</span><span>Слабая</span><span>Средняя</span><span>Сильная</span>
                    </div>
                </div>
            </div>
            
            <div class="settings-group" style="margin-bottom:25px;">
                <div class="settings-subtitle" style="font-size:16px; font-weight:500; margin-bottom:15px; padding-left:5px;">
                    Внешний вид
                </div>
                
                <div class="settings-item" style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>Цвет тумана</span>
                        <span id="color-value" style="color:#4CAF50;">${colorTexts[config.color]}</span>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
                        <button class="color-btn ${config.color === 0 ? 'active' : ''}" data-color="0" 
                                style="background:#3b82f6; color:white; padding:10px; border:none; border-radius:6px; cursor:pointer;">
                            Синий
                        </button>
                        <button class="color-btn ${config.color === 1 ? 'active' : ''}" data-color="1" 
                                style="background:#8b5cf6; color:white; padding:10px; border:none; border-radius:6px; cursor:pointer;">
                            Фиолетовый
                        </button>
                        <button class="color-btn ${config.color === 2 ? 'active' : ''}" data-color="2" 
                                style="background:#6b7280; color:white; padding:10px; border:none; border-radius:6px; cursor:pointer;">
                            Серый
                        </button>
                        <button class="color-btn ${config.color === 3 ? 'active' : ''}" data-color="3" 
                                style="background:#10b981; color:white; padding:10px; border:none; border-radius:6px; cursor:pointer;">
                            Зеленый
                        </button>
                    </div>
                </div>
                
                <div class="settings-item" style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>Размер частиц</span>
                        <span id="size-value" style="color:#4CAF50;">${sizeTexts[config.size]}</span>
                    </div>
                    <input type="range" id="fog-size" min="0" max="3" step="1" value="${config.size}" 
                           style="width:100%; height:6px; background:linear-gradient(to right, #2d3748, #3b82f6); border-radius:3px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; opacity:0.7; margin-top:5px;">
                        <span>Авто</span><span>Мелкие</span><span>Средние</span><span>Крупные</span>
                    </div>
                </div>
            </div>
            
            <div class="settings-group">
                <div class="settings-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:rgba(255,255,255,0.05); border-radius:8px;">
                    <div>
                        <div style="font-weight:500; margin-bottom:4px;">Показывать в карточке</div>
                        <div style="font-size:13px; opacity:0.7;">Эффект на странице фильма/сериала</div>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="fog-in-details" ${config.inDetails ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            
            <div style="margin-top:30px; display:flex; gap:12px;">
                <button id="fog-apply" style="flex:1; background:#4CAF50; color:white; border:none; padding:14px; border-radius:8px; cursor:pointer; font-weight:500;">
                    Применить
                </button>
                <button id="fog-close" style="background:#6b7280; color:white; border:none; padding:14px 24px; border-radius:8px; cursor:pointer; font-weight:500;">
                    Закрыть
                </button>
            </div>
        `;
    };

    // Добавление обработчиков для настроек
    FogFX.prototype.addSettingsHandlers = function(settingsWindow) {
        var self = this;
        
        // Кнопка закрытия
        settingsWindow.querySelector('.settings-window__close').addEventListener('click', function() {
            settingsWindow.remove();
            document.body.style.overflow = '';
        });
        
        // Кнопка "Закрыть"
        document.getElementById('fog-close').addEventListener('click', function() {
            settingsWindow.remove();
            document.body.style.overflow = '';
        });
        
        // Переключатель включения
        document.getElementById('fog-enabled').addEventListener('change', function(e) {
            self.config.enabled = e.target.checked;
            storageSet(KEY_ENABLED, self.config.enabled ? 1 : 0);
            
            if (self.config.enabled && self.active) {
                self.start();
            } else {
                self.stop();
            }
        });
        
        // Слайдеры
        var sliders = [
            {id: 'fog-density', key: KEY_DENSITY, valueId: 'density-value', texts: ['Авто', 'Низкая', 'Средняя', 'Высокая']},
            {id: 'fog-speed', key: KEY_SPEED, valueId: 'speed-value', texts: ['Авто', 'Медленно', 'Средне', 'Быстро']},
            {id: 'fog-opacity', key: KEY_OPACITY, valueId: 'opacity-value', texts: ['Авто', 'Слабая', 'Средняя', 'Сильная']},
            {id: 'fog-size', key: KEY_SIZE, valueId: 'size-value', texts: ['Авто', 'Мелкие', 'Средние', 'Крупные']}
        ];
        
        sliders.forEach(function(slider) {
            var element = document.getElementById(slider.id);
            var valueElement = document.getElementById(slider.valueId);
            
            element.addEventListener('input', function(e) {
                var value = parseInt(e.target.value);
                valueElement.textContent = slider.texts[value];
                self.config[slider.id.replace('fog-', '')] = value;
                storageSet(slider.key, value);
                
                if (self.enabled) {
                    self.updateParticles();
                }
            });
        });
        
        // Кнопки цветов
        document.querySelectorAll('.color-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                var color = parseInt(e.target.dataset.color);
                
                // Обновляем активную кнопку
                document.querySelectorAll('.color-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Обновляем значение
                document.getElementById('color-value').textContent = 
                    ['Синий', 'Фиолетовый', 'Серый', 'Зеленый'][color];
                
                self.config.color = color;
                storageSet(KEY_COLOR, color);
                
                if (self.enabled) {
                    self.updateParticles();
                }
            });
        });
        
        // Переключатель "в карточке"
        document.getElementById('fog-in-details').addEventListener('change', function(e) {
            self.config.inDetails = e.target.checked;
            storageSet(KEY_IN_DETAILS, self.config.inDetails ? 1 : 0);
        });
        
        // Кнопка "Применить"
        document.getElementById('fog-apply').addEventListener('click', function() {
            // Сохраняем все настройки
            storageSet(KEY_ENABLED, self.config.enabled ? 1 : 0);
            storageSet(KEY_DENSITY, self.config.density);
            storageSet(KEY_SPEED, self.config.speed);
            storageSet(KEY_OPACITY, self.config.opacity);
            storageSet(KEY_COLOR, self.config.color);
            storageSet(KEY_SIZE, self.config.size);
            storageSet(KEY_IN_DETAILS, self.config.inDetails ? 1 : 0);
            
            // Применяем изменения
            if (self.config.enabled && self.active) {
                self.stop();
                self.updateParticles();
                self.start();
            } else if (!self.config.enabled) {
                self.stop();
            }
            
            // Закрываем окно
            settingsWindow.remove();
            document.body.style.overflow = '';
            
            // Показываем уведомление
            self.showNotification('Настройки тумана применены');
        });
        
        // Стили для переключателей
        var style = document.createElement('style');
        style.textContent = `
            .switch {
                position: relative;
                display: inline-block;
                width: 60px;
                height: 34px;
            }
            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .slider {
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
            .slider:before {
                position: absolute;
                content: "";
                height: 26px;
                width: 26px;
                left: 4px;
                bottom: 4px;
                background: white;
                transition: .4s;
                border-radius: 50%;
            }
            input:checked + .slider {
                background: #4CAF50;
            }
            input:checked + .slider:before {
                transform: translateX(26px);
            }
            .color-btn.active {
                box-shadow: 0 0 0 2px white;
                transform: scale(1.05);
            }
            input[type="range"] {
                -webkit-appearance: none;
            }
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                cursor: pointer;
                border: 2px solid #3b82f6;
            }
        `;
        document.head.appendChild(style);
    };

    // --- Система частиц и анимации ---
    FogFX.prototype.initParticles = function() {
        this.particles = [];
        
        // Определяем параметры на основе настроек и платформы
        var platform = isTizen() ? 'tizen' : isAndroid() ? 'android' : isDesktop() ? 'desktop' : 'other';
        
        // Количество частиц
        var baseCount = platform === 'tizen' ? 40 : 
                       platform === 'android' ? 60 : 
                       platform === 'desktop' ? 80 : 50;
        
        var densityMult = this.config.density === 0 ? 1.0 : 
                         this.config.density === 1 ? 0.7 : 
                         this.config.density === 2 ? 1.0 : 1.5;
        
        var count = Math.floor(baseCount * densityMult);
        
        // Размер частиц
        var sizeBase = platform === 'tizen' ? 30 : 40;
        var sizeMult = this.config.size === 0 ? 1.0 : 
                      this.config.size === 1 ? 0.7 : 
                      this.config.size === 2 ? 1.0 : 1.3;
        
        // Цвета
        var colors = [
            {r: 100, g: 150, b: 220}, // синий
            {r: 150, g: 100, b: 220}, // фиолетовый
            {r: 150, g: 150, b: 180}, // серый
            {r: 100, g: 180, b: 150}  // зеленый
        ];
        var color = colors[this.config.color];
        
        // Скорость
        var speedMult = this.config.speed === 0 ? 1.0 : 
                       this.config.speed === 1 ? 0.7 : 
                       this.config.speed === 2 ? 1.0 : 1.4;
        
        // Прозрачность
        var opacityMult = this.config.opacity === 0 ? 1.0 : 
                         this.config.opacity === 1 ? 0.6 : 
                         this.config.opacity === 2 ? 1.0 : 1.4;
        
        // Создаем частицы
        for (var i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: sizeBase * sizeMult * (0.7 + Math.random() * 0.6),
                speedX: (Math.random() - 0.5) * 0.15 * speedMult,
                speedY: (Math.random() - 0.5) * 0.1 * speedMult,
                color: color,
                opacity: (0.03 + Math.random() * 0.04) * opacityMult
            });
        }
    };

    FogFX.prototype.animate = function() {
        if (!this.enabled || !this.ctx || !this.canvas) return;
        
        // Легкий fade эффект
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Обновляем и рисуем частицы
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            
            // Движение
            p.x += p.speedX;
            p.y += p.speedY;
            
            // Легкий дрейф
            p.speedX += (Math.random() - 0.5) * 0.005;
            p.speedY += (Math.random() - 0.5) * 0.003;
            
            // Ограничение скорости
            p.speedX = Math.max(-0.2, Math.min(0.2, p.speedX));
            p.speedY = Math.max(-0.15, Math.min(0.15, p.speedY));
            
            // Возврат на экран
            if (p.x < -100) p.x = window.innerWidth + 100;
            if (p.x > window.innerWidth + 100) p.x = -100;
            if (p.y < -100) p.y = window.innerHeight + 100;
            if (p.y > window.innerHeight + 100) p.y = -100;
            
            // Рисуем частицу
            var gradient = this.ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, p.size
            );
            
            gradient.addColorStop(0, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.opacity + ')');
            gradient.addColorStop(1, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',0)');
            
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
        
        this.animationId = requestAnimationFrame(this.animate.bind(this));
    };

    FogFX.prototype.start = function() {
        if (this.enabled) return;
        
        this.enabled = true;
        this.canvas.style.display = 'block';
        this.resizeCanvas();
        this.animate();
        
        console.log('[FOG FX] Effect started');
    };

    FogFX.prototype.stop = function() {
        if (!this.enabled) return;
        
        this.enabled = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.canvas.style.display = 'none';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        console.log('[FOG FX] Effect stopped');
    };

    FogFX.prototype.updateParticles = function() {
        this.initParticles();
        if (this.enabled) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    };

    // --- Проверка активности (как в snow_new.js) ---
    FogFX.prototype.startActivityCheck = function() {
        var self = this;
        
        // Функция проверки, нужно ли показывать туман
        function checkActivity() {
            var shouldBeActive = self.shouldBeActive();
            
            if (shouldBeActive && !self.active) {
                self.active = true;
                if (self.config.enabled) {
                    self.initParticles();
                    self.start();
                }
            } else if (!shouldBeActive && self.active) {
                self.active = false;
                self.stop();
            }
        }
        
        // Проверяем каждые 500ms
        setInterval(checkActivity, 500);
        
        // Также проверяем при изменении видимости страницы
        document.addEventListener('visibilitychange', checkActivity);
    };

    FogFX.prototype.shouldBeActive = function() {
        // Не показываем если страница не видна
        if (document.hidden) return false;
        
        // Проверяем, не открыты ли настройки/модалки
        if (this.isOverlayOpen()) return false;
        
        // Проверяем, не в плеере ли мы
        if (this.isInPlayer()) return false;
        
        // Проверяем, разрешен ли текущий экран
        return this.isAllowedScreen();
    };

    FogFX.prototype.isOverlayOpen = function() {
        // Проверяем открытые оверлеи (настройки, модалки и т.д.)
        var overlays = [
            '.settings', '.settings__content', '.settings__layer',
            '.modal', '.dialog', '.selectbox', '.notification'
        ];
        
        for (var i = 0; i < overlays.length; i++) {
            var el = document.querySelector(overlays[i]);
            if (el && this.isElementVisible(el)) {
                return true;
            }
        }
        
        return false;
    };

    FogFX.prototype.isInPlayer = function() {
        // Проверяем HTML5 video
        try {
            var videos = document.getElementsByTagName('video');
            for (var i = 0; i < videos.length; i++) {
                var v = videos[i];
                if (v && typeof v.paused === 'boolean') {
                    if (!v.paused && !v.ended) return true;
                }
            }
        } catch (e) {}
        
        // Проверяем контейнеры плеера
        var playerEl = document.querySelector('.player, .player__content, .player-layer');
        return !!(playerEl && this.isElementVisible(playerEl));
    };

    FogFX.prototype.isAllowedScreen = function() {
        // Всегда разрешаем если включена опция "в карточке"
        if (this.config.inDetails) {
            return true;
        }
        
        // Иначе только на главных экранах
        var allowedPaths = ['main', 'home', 'cub', 'movies', 'tv', 'category', 'catalog'];
        
        try {
            // Пытаемся получить текущий компонент из Lampa
            if (window.Lampa && Lampa.Activity) {
                var activity = Lampa.Activity.current();
                if (activity && activity.component) {
                    return allowedPaths.includes(activity.component);
                }
            }
            
            // Fallback: проверяем по URL
            var path = window.location.pathname + window.location.search;
            return allowedPaths.some(function(p) {
                return path.includes(p);
            });
        } catch (e) {
            return true; // Если не можем определить, разрешаем
        }
    };

    FogFX.prototype.isElementVisible = function(el) {
        if (!el) return false;
        
        try {
            var rect = el.getBoundingClientRect();
            if (!rect || rect.width < 10 || rect.height < 10) return false;
            
            var viewWidth = window.innerWidth || 1;
            var viewHeight = window.innerHeight || 1;
            
            // Проверяем пересечение с viewport
            if (rect.right <= 0 || rect.bottom <= 0 || 
                rect.left >= viewWidth || rect.top >= viewHeight) {
                return false;
            }
            
            // Проверяем стили
            var style = window.getComputedStyle ? getComputedStyle(el) : null;
            if (style) {
                if (style.display === 'none' || style.visibility === 'hidden') return false;
                if (parseFloat(style.opacity) === 0) return false;
            }
            
            return true;
        } catch (e) {
            return false;
        }
    };

    FogFX.prototype.showNotification = function(message) {
        var notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 1001;
            animation: fogNotification 3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        notification.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div>✅</div>
                <div>${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Добавляем анимацию
        if (!document.querySelector('#fog-notification-style')) {
            var style = document.createElement('style');
            style.id = 'fog-notification-style';
            style.textContent = `
                @keyframes fogNotification {
                    0% { transform: translateX(100%); opacity: 0; }
                    15% { transform: translateX(0); opacity: 1; }
                    85% { transform: translateX(0); opacity: 1; }
                    100% { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Удаляем через 3 секунды
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    };

    // --- Автоматическая инициализация ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            new FogFX();
        });
    } else {
        new FogFX();
    }

})();
