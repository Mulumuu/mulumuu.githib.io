// kodik-segment-plugin.js
// Полный плагин с интеграцией SegmentTemplate

class KodikSegmentPlugin {
    constructor() {
        this.name = 'Kodik Segment Plugin';
        this.version = '2.0.0';
        this.SegmentTemplate = SegmentTemplate; // Используем наш класс
        
        this.segmentCache = new Map();
        this.activeTemplates = new Map(); // videoElement -> SegmentTemplate
        this.currentVideo = null;
        
        this.init();
    }
    
    init() {
        // Ждем загрузки LAMPA
        if (!this.waitForLampa()) return;
        
        // Перехватываем источники
        this.patchKodikSources();
        
        // Настраиваем наблюдение за видео
        this.setupVideoObserver();
        
        console.log(`[${this.name}] Инициализирован v${this.version}`);
    }
    
    /**
     * Патчим Kodik-источники для добавления сегментов
     */
    patchKodikSources() {
        const self = this;
        
        // Ищем все источники с kodik в названии
        const sources = this.getLampaSources();
        
        sources.forEach((source, name) => {
            if (name.toLowerCase().includes('kodik') || 
                source.type?.toLowerCase().includes('kodik')) {
                
                this.patchSourceGetLinks(source, name);
            }
        });
    }
    
    /**
     * Патчим метод getLinks конкретного источника
     */
    patchSourceGetLinks(source, sourceName) {
        const originalGetLinks = source.getLinks;
        
        source.getLinks = async function(params) {
            try {
                // Получаем ссылки оригинальным методом
                const links = await originalGetLinks.call(this, params);
                
                if (!links || !Array.isArray(links)) {
                    return links;
                }
                
                // Получаем сегменты из Kodik
                const segmentTemplate = await self.fetchSegmentsFromKodik(params);
                
                // Добавляем сегменты к каждой ссылке
                return links.map(link => {
                    // Добавляем данные сегментов в метаданные
                    link.metadata = link.metadata || {};
                    link.metadata.segments = segmentTemplate.toObject();
                    link.metadata.segmentTemplate = segmentTemplate;
                    
                    // Добавляем в кэш
                    const cacheKey = self.generateCacheKey(params);
                    self.segmentCache.set(cacheKey, segmentTemplate);
                    
                    return link;
                });
                
            } catch (error) {
                console.error(`[${sourceName}] Ошибка getLinks:`, error);
                return await originalGetLinks.call(this, params);
            }
        };
    }
    
    /**
     * Получает сегменты из Kodik API
     */
    async fetchSegmentsFromKodik(params) {
        const cacheKey = this.generateCacheKey(params);
        
        // Проверяем кэш
        if (this.segmentCache.has(cacheKey)) {
            return this.segmentCache.get(cacheKey);
        }
        
        // Создаем новый шаблон
        const template = new SegmentTemplate();
        
        try {
            // Получаем данные от Kodik
            const kodikData = await this.fetchKodikData(params);
            
            // Заполняем шаблон
            if (kodikData) {
                // Добавляем сегменты пропуска
                if (kodikData.skip_times) {
                    kodikData.skip_times.forEach(skip => {
                        template.addSkip(skip.start_time, skip.end_time);
                    });
                }
                
                // Добавляем рекламные сегменты (если есть в данных)
                if (kodikData.ads) {
                    kodikData.ads.forEach(ad => {
                        template.addAd(ad.start, ad.end);
                    });
                }
                
                // Альтернативные форматы данных
                if (kodikData.segments) {
                    kodikData.segments.forEach(segment => {
                        if (segment.type === 'skip') {
                            template.addSkip(segment.start, segment.end);
                        } else if (segment.type === 'ad') {
                            template.addAd(segment.start, segment.end);
                        }
                    });
                }
            }
            
            // Кэшируем на 1 час
            this.segmentCache.set(cacheKey, template);
            setTimeout(() => this.segmentCache.delete(cacheKey), 3600000);
            
            return template;
            
        } catch (error) {
            console.error('[KodikSegmentPlugin] Ошибка получения сегментов:', error);
            return template; // Возвращаем пустой шаблон
        }
    }
    
    /**
     * Получает данные от Kodik API
     */
    async fetchKodikData(params) {
        // Используем доступные методы
        if (window.KodikClient) {
            return await window.KodikClient.getVideo({
                id: params.id,
                episode: params.episode,
                with_segments: true,
                with_skip_times: true
            });
        }
        
        // Альтернативный метод: прямой запрос
        const apiUrl = this.buildKodikApiUrl(params);
        const response = await fetch(apiUrl);
        return await response.json();
    }
    
    /**
     * Создает API URL для Kodik
     */
    buildKodikApiUrl(params) {
        const baseUrl = 'https://kodikapi.com/find';
        const queryParams = new URLSearchParams({
            token: 'YOUR_API_TOKEN', // Замените на свой токен
            id: params.id,
            types: 'anime,anime-serial',
            with_episodes: true,
            with_skip_times: true,
            with_segments: true
        });
        
        return `${baseUrl}?${queryParams}`;
    }
    
    /**
     * Настраивает видео плеер для работы с сегментами
     */
    setupVideoPlayer(videoElement, segmentTemplate) {
        if (!videoElement || !segmentTemplate) return;
        
        // Сохраняем шаблон для этого видео
        this.activeTemplates.set(videoElement, segmentTemplate);
        this.currentVideo = videoElement;
        
        // Создаем UI элементы
        this.createSegmentUI(videoElement, segmentTemplate);
        
        // Настраиваем обработчики времени
        this.setupTimeHandlers(videoElement, segmentTemplate);
        
        // Интегрируем с видеоплеером LAMPA
        this.integrateWithLampaPlayer(videoElement, segmentTemplate);
    }
    
    /**
     * Создает UI элементы для сегментов
     */
    createSegmentUI(videoElement, template) {
        const playerContainer = videoElement.parentElement;
        if (!playerContainer) return;
        
        // Контейнер для кнопок пропуска
        const skipContainer = document.createElement('div');
        skipContainer.className = 'kodik-segment-ui';
        skipContainer.style.cssText = `
            position: absolute;
            bottom: 120px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            transition: all 0.3s ease;
        `;
        
        // Создаем кнопки для каждого сегмента пропуска
        template.skips.forEach((skip, index) => {
            const button = this.createSkipButton(skip, index, videoElement);
            skipContainer.appendChild(button);
        });
        
        // Добавляем индикатор рекламы (если есть)
        if (template.ads.length > 0) {
            const adIndicator = this.createAdIndicator(template.ads.length);
            skipContainer.appendChild(adIndicator);
        }
        
        playerContainer.appendChild(skipContainer);
        
        // Добавляем стили
        this.injectStyles();
    }
    
    /**
     * Создает кнопку пропуска
     */
    createSkipButton(skip, index, videoElement) {
        const button = document.createElement('button');
        const category = this.determineSkipCategory(skip);
        const config = this.getCategoryConfig(category);
        
        button.className = `segment-skip-btn skip-${category}`;
        button.dataset.index = index;
        button.dataset.start = skip.start;
        button.dataset.end = skip.end;
        
        button.innerHTML = `
            <span class="skip-icon">${config.icon}</span>
            <span class="skip-label">${config.label}</span>
            <span class="skip-time">${Math.round(skip.end - skip.start)}s</span>
        `;
        
        button.style.cssText = `
            display: none;
            align-items: center;
            gap: 8px;
            padding: 10px 15px;
            background: ${config.color};
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            opacity: 0.9;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        // Эффекты
        button.addEventListener('mouseenter', () => {
            button.style.opacity = '1';
            button.style.transform = 'scale(1.05)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.opacity = '0.9';
            button.style.transform = 'scale(1)';
        });
        
        // Обработчик клика
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            videoElement.currentTime = skip.end;
            button.style.display = 'none';
            this.showSkipNotification(config.label, skip.end - skip.start);
        });
        
        return button;
    }
    
    /**
     * Настраивает обработчики времени
     */
    setupTimeHandlers(videoElement, template) {
        const timeUpdateHandler = () => {
            const currentTime = videoElement.currentTime;
            
            // Проверяем сегменты пропуска
            template.skips.forEach((skip, index) => {
                const button = document.querySelector(`.segment-skip-btn[data-index="${index}"]`);
                if (!button) return;
                
                // Показываем кнопку за 5 секунд до начала сегмента
                if (currentTime >= skip.start - 5 && currentTime < skip.end) {
                    button.style.display = 'flex';
                } else {
                    button.style.display = 'none';
                }
                
                // Автопропуск (если включен)
                if (this.config.autoSkip && 
                    currentTime >= skip.start && 
                    currentTime < skip.end) {
                    videoElement.currentTime = skip.end;
                }
            });
            
            // Проверяем рекламные сегменты
            template.ads.forEach(ad => {
                if (currentTime >= ad.start && currentTime < ad.end) {
                    this.handleAdSegment(videoElement, ad);
                }
            });
        };
        
        videoElement.addEventListener('timeupdate', timeUpdateHandler);
        
        // Сохраняем обработчик для последующей очистки
        this.activeHandlers = this.activeHandlers || new Map();
        this.activeHandlers.set(videoElement, timeUpdateHandler);
    }
    
    /**
     * Интегрирует с плеером LAMPA
     */
    integrateWithLampaPlayer(videoElement, template) {
        // Пытаемся найти API плеера LAMPA
        const playerApi = this.findLampaPlayerApi();
        
        if (playerApi && playerApi.setSegments) {
            // Передаем сегменты в плеер LAMPA
            playerApi.setSegments(template.toVideoJSSegments());
        }
        
        // Добавляем данные в элемент видео для доступа из других плагинов
        videoElement.dataset.kodikSegments = JSON.stringify(template.toObject());
        videoElement.dataset.hasSegments = 'true';
    }
    
    // Вспомогательные методы
    waitForLampa() {
        if (typeof Lampa === 'undefined') {
            setTimeout(() => this.waitForLampa(), 1000);
            return false;
        }
        return true;
    }
    
    getLampaSources() {
        return Lampa.Source?.sources?.() || new Map();
    }
    
    generateCacheKey(params) {
        return `${params.id || ''}_${params.episode || 1}_${params.translation || 1}`;
    }
    
    determineSkipCategory(skip) {
        const duration = skip.end - skip.start;
        if (duration >= 60 && duration <= 95) return 'opening';
        if (duration >= 85 && duration <= 140) return 'ending';
        if (duration <= 45) return 'recap';
        return 'other';
    }
    
    getCategoryConfig(category) {
        const configs = {
            opening: { icon: '🎵', label: 'Пропустить опенинг', color: '#ff6b6b' },
            ending: { icon: '📜', label: 'Пропустить титры', color: '#4ecdc4' },
            recap: { icon: '⏪', label: 'Пропустить повтор', color: '#45b7d1' },
            other: { icon: '⏭️', label: 'Пропустить сегмент', color: '#96ceb4' }
        };
        return configs[category] || configs.other;
    }
    
    showSkipNotification(label, duration) {
        const notification = document.createElement('div');
        notification.textContent = `${label} (${Math.round(duration)}с)`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.opacity = '1', 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .segment-skip-btn:hover {
                opacity: 1 !important;
                transform: scale(1.05) !important;
            }
            
            .skip-opening {
                animation: pulse-opening 2s infinite;
            }
            
            .skip-ending {
                animation: pulse-ending 2s infinite;
            }
            
            @keyframes pulse-opening {
                0% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 107, 107, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
            }
            
            @keyframes pulse-ending {
                0% { box-shadow: 0 0 0 0 rgba(78, 205, 196, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(78, 205, 196, 0); }
                100% { box-shadow: 0 0 0 0 rgba(78, 205, 196, 0); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Конфигурация по умолчанию
KodikSegmentPlugin.prototype.config = {
    autoSkip: false,
    showButtons: true,
    notifications: true,
    debug: false
};

// Автоматическая инициализация
if (typeof window !== 'undefined') {
    // Загружаем SegmentTemplate класс
    if (typeof SegmentTemplate === 'undefined') {
        // Загружаем из отдельного файла или определяем inline
        if (typeof window.SegmentTemplate === 'undefined') {
            // Определяем класс здесь (код из segment-template.js)
            window.SegmentTemplate = class SegmentTemplate { /* ... */ };
        }
    }
    
    // Инициализируем плагин
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.KodikSegmentPlugin = new KodikSegmentPlugin();
        }, 3000);
    });
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KodikSegmentPlugin, SegmentTemplate };
}
