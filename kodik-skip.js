// kodik-wrapper-integration.js
// Прямая интеграция с kodikwrapper

class KodikWrapperIntegration {
    constructor(kodikClient) {
        this.client = kodikClient;
        this.cache = new Map();
    }
    
    /**
     * Получает таймкоды через официальный API
     */
    async getSkipTimes(params) {
        const cacheKey = JSON.stringify(params);
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            // Вариант 1: Прямой запрос к API
            const response = await this.client.request({
                method: 'GET',
                endpoint: '/skip-times',
                params: {
                    anime_id: params.shikimori_id,
                    episode: params.episode
                }
            });
            
            // Вариант 2: Из данных о видео
            const videoData = await this.client.getVideo({
                id: params.id,
                with_skip_times: true
            });
            
            const skipTimes = this.extractSkipTimes(videoData);
            
            // Кэшируем на 1 час
            this.cache.set(cacheKey, skipTimes);
            setTimeout(() => this.cache.delete(cacheKey), 3600000);
            
            return skipTimes;
            
        } catch (error) {
            console.error('Kodik API error:', error);
            return [];
        }
    }
    
    /**
     * Извлекает таймкоды из различных форматов ответа
     */
    extractSkipTimes(data) {
        const results = [];
        
        // Формат 1: Прямой массив skip_times
        if (Array.isArray(data.skip_times)) {
            results.push(...data.skip_times);
        }
        
        // Формат 2: Вложено в episodes
        if (data.episodes && Array.isArray(data.episodes)) {
            data.episodes.forEach(episode => {
                if (episode.skip_times) {
                    results.push(...episode.skip_times.map(t => ({
                        ...t,
                        episode: episode.number
                    })));
                }
            });
        }
        
        // Формат 3: Кадры (frames)
        if (data.frames && data.fps) {
            const frameTimes = data.frames.map(frame => ({
                start_time: frame[0] / data.fps,
                end_time: frame[1] / data.fps,
                type: frame[2] || 'unknown'
            }));
            results.push(...frameTimes);
        }
        
        return results;
    }
}

// Глобальная интеграция
if (typeof window !== 'undefined') {
    window.KodikSkipIntegration = KodikWrapperIntegration;
}
