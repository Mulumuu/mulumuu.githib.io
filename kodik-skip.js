// kodik-skip-times-plugin.js

// Константы для типов таймкодов
const SkipType = {
    OPENING: 'opening',
    ENDING: 'ending',
    INTRO: 'intro',     // Вступление
    OUTRO: 'outro',     // Заключение
    RECAP: 'recap'      // Повтор предыдущей серии
};

class KodikSkipTimesPlugin {
    constructor() {
        this.name = 'Kodik Skip Times Plugin';
        this.version = '1.0.0';
        this.description = 'Добавляет таймкоды для пропуска опенингов и титров из Kodik';
        
        // Регистрируем обработчики
        this._registerHooks();
    }
    
    /**
     * Регистрация обработчиков событий LAMPA
     */
    _registerHooks() {
        // Перехватываем создание видео-источников
        if (typeof window.Lampa !== 'undefined' && window.Lampa.Source) {
            // Патчим метод получения ссылок на видео
            this._patchGetLinks();
        }
        
        // Добавляем обработчик для метаданных
        this._patchGetMeta();
        
        console.log(`[KodikSkipPlugin] Плагин инициализирован`);
    }
    
    /**
     * Патчим метод getLinks для перехвата ссылок на видео
     */
    _patchGetLinks() {
        // Сохраняем оригинальный метод
        const originalGetLinks = window.Lampa.Source.prototype.getLinks;
        
        // Переопределяем метод
        window.Lampa.Source.prototype.getLinks = async function(params) {
            try {
                // Получаем ссылки оригинальным методом
                const links = await originalGetLinks.call(this, params);
                
                // Если это Kodik-источник и есть таймкоды
                if (this.type === 'kodik' || params.source?.includes('kodik')) {
                    // Извлекаем таймкоды из параметров или meta
                    const skipTimes = this._extractSkipTimes(params);
                    
                    if (skipTimes && skipTimes.length > 0) {
                        // Добавляем таймкоды к каждой ссылке
                        links.forEach(link => {
                            link.skipTimes = skipTimes;
                            link.metadata = link.metadata || {};
                            link.metadata.skipTimes = skipTimes;
                        });
                    }
                }
                
                return links;
            } catch (error) {
                console.error('[KodikSkipPlugin] Ошибка в getLinks:', error);
                return await originalGetLinks.call(this, params);
            }
        };
    }
    
    /**
     * Патчим метод getMeta для добавления таймкодов в метаданные
     */
    _patchGetMeta() {
        if (!window.Lampa || !window.Lampa.Meta) return;
        
        // Перехватываем обновление метаданных
        const originalUpdateMeta = window.Lampa.Meta.update;
        
        window.Lampa.Meta.update = function(meta) {
            // Вызываем оригинальный метод
            originalUpdateMeta.call(this, meta);
            
            // Если есть таймкоды в meta, передаём их в плеер
            if (meta.skipTimes) {
                setTimeout(() => {
                    this._injectSkipTimesToPlayer(meta.skipTimes);
                }, 500);
            }
        };
    }
    
    /**
     * Извлечение таймкодов из параметров Kodik
     * @param {Object} params - Параметры запроса
     * @returns {Array} - Массив таймкодов в формате LAMPA
     */
    _extractSkipTimes(params) {
        const skipTimes = [];
        
        // Вариант 1: Таймкоды уже есть в параметрах
        if (params.skipTimes) {
            this._addSkipTimesFromObject(params.skipTimes, skipTimes);
        }
        
        // Вариант 2: Извлекаем из URL или meta (если переданы)
        if (params.meta && params.meta.skipTimes) {
            this._addSkipTimesFromObject(params.meta.skipTimes, skipTimes);
        }
        
        // Вариант 3: Парсим из данных Kodik API
        if (params.kodikData) {
            this._parseKodikSkipTimes(params.kodikData, skipTimes);
        }
        
        return skipTimes;
    }
    
    /**
     * Парсинг таймкодов из структуры данных Kodik
     * @param {Object} kodikData - Данные от Kodik API
     * @param {Array} skipTimes - Массив для заполнения
     */
    _parseKodikSkipTimes(kodikData, skipTimes) {
        // Пример структуры данных Kodik (нужно уточнить по API)
        if (kodikData.skip_times) {
            kodikData.skip_times.forEach(item => {
                const skipTime = {
                    start: item.start_time,  // Начало в секундах
                    end: item.end_time,      // Конец в секундах
                    type: this._mapKodikType(item.type), // Тип (opening, ending и т.д.)
                    episode: item.episode || 1, // Номер эпизода
                    season: item.season || 1     // Номер сезона
                };
                
                // Проверяем валидность таймкода
                if (skipTime.start >= 0 && skipTime.end > skipTime.start) {
                    skipTimes.push(skipTime);
                }
            });
        }
        
        // Альтернативный формат (если есть кадры вместо секунд)
        if (kodikData.frames && kodikData.fps) {
            this._convertFramesToSeconds(kodikData.frames, kodikData.fps, skipTimes);
        }
    }
    
    /**
     * Преобразование типа таймкода из формата Kodik в внутренний формат
     * @param {string} kodikType - Тип из Kodik
     * @returns {string} - Внутренний тип
     */
    _mapKodikType(kodikType) {
        const typeMap = {
            'op': SkipType.OPENING,
            'ed': SkipType.ENDING,
            'intro': SkipType.INTRO,
            'outro': SkipType.OUTRO,
            'recap': SkipType.RECAP,
            'preview': 'preview'  // Превью следующей серии
        };
        
        return typeMap[kodikType] || kodikType;
    }
    
    /**
     * Конвертация таймкодов из кадров в секунды
     * @param {Array} frames - Массив кадров [начало, конец]
     * @param {number} fps - Кадров в секунду
     * @param {Array} skipTimes - Массив для заполнения
     */
    _convertFramesToSeconds(frames, fps, skipTimes) {
        if (!fps || fps <= 0) fps = 24; // Значение по умолчанию
        
        frames.forEach(frame => {
            const startTime = frame[0] / fps;
            const endTime = frame[1] / fps;
            
            skipTimes.push({
                start: startTime,
                end: endTime,
                type: SkipType.OPENING, // Или определять по контексту
                source: 'frames'
            });
        });
    }
    
    /**
     * Добавление таймкодов из объекта
     * @param {Object} skipData - Объект с таймкодами
     * @param {Array} skipTimes - Массив для заполнения
     */
    _addSkipTimesFromObject(skipData, skipTimes) {
        // Формат: { opening: [start, end], ending: [start, end] }
        Object.keys(skipData).forEach(key => {
            const times = skipData[key];
            if (Array.isArray(times) && times.length >= 2) {
                skipTimes.push({
                    start: times[0],
                    end: times[1],
                    type: key,
                    source: 'kodik'
                });
            }
        });
    }
    
    /**
     * Внедрение таймкодов в видеоплеер LAMPA
     * @param {Array} times - Массив таймкодов
     */
    _injectSkipTimesToPlayer(times) {
        // Ищем активный видеоплеер
        const videoPlayer = document.querySelector('video');
        if (!videoPlayer) return;
        
        // Создаем или получаем контейнер для кнопок пропуска
        this._createSkipButtons(videoPlayer, times);
        
        // Добавляем обработчики времени воспроизведения
        this._addTimeUpdateHandler(videoPlayer, times);
    }
    
    /**
     * Создание кнопок для пропуска таймкодов
     * @param {HTMLVideoElement} videoPlayer - Элемент видео
     * @param {Array} skipTimes - Массив таймкодов
     */
    _createSkipButtons(videoPlayer, skipTimes) {
        const playerContainer = videoPlayer.parentElement;
        if (!playerContainer) return;
        
        // Удаляем старые кнопки
        const oldButtons = playerContainer.querySelectorAll('.skip-time-btn');
        oldButtons.forEach(btn => btn.remove());
        
        // Создаем кнопки для каждого таймкода
        skipTimes.forEach(skipTime => {
            if (skipTime.start < 5) return; // Не показывать для очень ранних таймкодов
            
            const button = document.createElement('div');
            button.className = `skip-time-btn skip-${skipTime.type}`;
            button.innerHTML = `
                <span>⏭️ Пропустить ${this._getSkipLabel(skipTime.type)}</span>
                <small>(${Math.round(skipTime.end - skipTime.start)}с)</small>
            `;
            
            button.style.cssText = `
                position: absolute;
                bottom: 80px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
                z-index: 1000;
                display: none;
                transition: opacity 0.3s;
            `;
            
            button.addEventListener('click', () => {
                videoPlayer.currentTime = skipTime.end;
                button.style.display = 'none';
            });
            
            playerContainer.appendChild(button);
            
            // Отслеживаем, когда показывать кнопку
            const checkTime = () => {
                const currentTime = videoPlayer.currentTime;
                if (currentTime >= skipTime.start - 10 && currentTime < skipTime.end) {
                    button.style.display = 'block';
                } else {
                    button.style.display = 'none';
                }
            };
            
            videoPlayer.addEventListener('timeupdate', checkTime);
        });
    }
    
    /**
     * Обработчик обновления времени для автоматического пропуска
     * @param {HTMLVideoElement} videoPlayer - Элемент видео
     * @param {Array} skipTimes - Массив таймкодов
     */
    _addTimeUpdateHandler(videoPlayer, skipTimes) {
        let lastSkipTime = null;
        
        videoPlayer.addEventListener('timeupdate', () => {
            const currentTime = videoPlayer.currentTime;
            
            // Проверяем каждый таймкод
            for (const skipTime of skipTimes) {
                if (currentTime >= skipTime.start && currentTime < skipTime.end) {
                    // Если еще не пропускали этот сегмент
                    if (lastSkipTime !== skipTime.start) {
                        console.log(`[KodikSkipPlugin] Автопропуск ${skipTime.type}: ${skipTime.start}-${skipTime.end}`);
                        
                        // Можно добавить автоматический пропуск
                        if (this.autoSkipEnabled) {
                            videoPlayer.currentTime = skipTime.end;
                        }
                        
                        lastSkipTime = skipTime.start;
                    }
                    break;
                }
            }
        });
    }
    
    /**
     * Получение читаемого названия для типа пропуска
     * @param {string} type - Тип таймкода
     * @returns {string} - Название
     */
    _getSkipLabel(type) {
        const labels = {
            [SkipType.OPENING]: 'опенинг',
            [SkipType.ENDING]: 'титры',
            [SkipType.INTRO]: 'вступление',
            [SkipType.OUTRO]: 'заключение',
            [SkipType.RECAP]: 'повтор'
        };
        
        return labels[type] || 'сегмент';
    }
}

// Автоматическая инициализация плагина при загрузке
if (typeof window !== 'undefined') {
    // Ждем загрузки LAMPA
    if (window.addEventListener) {
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                window.KodikSkipPlugin = new KodikSkipTimesPlugin();
            }, 2000);
        });
    }
}

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KodikSkipTimesPlugin;
}
