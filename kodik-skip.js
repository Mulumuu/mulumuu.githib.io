(function () {
	"use strict";

	const ANISKIP_API = "https://api.aniskip.com/v2/skip-times";
	const ANILIST_API = "https://graphql.anilist.co";
	const SKIP_TYPES = ["op", "ed", "recap"];

	// Кэш для карточка-ID -> MAL-ID
	const cardToMalCache = {};

	function log(message) {
		console.log("[AniSkip-Fixed]: " + message);
	}

	function addSegmentsToItem(item, segments) {
		if (!item || !segments || segments.length === 0) return 0;
		
		item.segments = item.segments || {};
		item.segments.skip = item.segments.skip || [];
		
		let added = 0;
		segments.forEach(seg => {
			const exists = item.segments.skip.some(s => 
				Math.abs(s.start - seg.start) < 1
			);
			
			if (!exists) {
				item.segments.skip.push({
					start: seg.start,
					end: seg.end,
					name: seg.name || "Пропустить"
				});
				added++;
			}
		});
		
		return added;
	}

	// Пытаемся получить информацию из карточки Lampa
	function getAnimeInfoFromCard(card) {
		if (!card) return null;
		
		// Пробуем разные поля с названиями
		const possibleTitles = [
			card.original_title,
			card.original_name,
			card.title,
			card.name,
			card.ru_title,
			card.en_title
		].filter(Boolean);
		
		if (possibleTitles.length === 0) return null;
		
		// Возвращаем первый найденный заголовок + ID карточки
		return {
			title: possibleTitles[0],
			cardId: card.id || card.tmdb_id || card.kinopoisk_id,
			season: card.season_number || 1,
			isAnime: isLikelyAnime(card)
		};
	}

	// Определяем, аниме ли это, по разным признакам
	function isLikelyAnime(card) {
		if (!card) return true; // Если нет данных, пробуем обработать
		
		// По языку
		const lang = (card.original_language || "").toLowerCase();
		const isAsianLang = ['ja', 'zh', 'cn', 'ko', 'jp'].includes(lang);
		
		// По жанрам
		let isAnimeGenre = false;
		if (card.genres && Array.isArray(card.genres)) {
			isAnimeGenre = card.genres.some(g => {
				const name = (g.name || "").toLowerCase();
				return name.includes('аниме') || 
					   name.includes('anime') || 
					   name.includes('animation') ||
					   name.includes('anime series') ||
					   g.id === 16; // ID аниме в TMDB
			});
		}
		
		// По ключевым словам в названии
		const title = (card.title || card.name || "").toLowerCase();
		const titleKeywords = [
			'jujutsu', 'kaisen', 'магическая', 'битва',
			'anime', 'аниме', 'тентакли', 'дракон',
			'ниндзя', 'самурай', 'shounen', 'сёнен'
		];
		const hasAnimeKeyword = titleKeywords.some(kw => title.includes(kw));
		
		return isAsianLang || isAnimeGenre || hasAnimeKeyword;
	}

	// Основная функция для Jujutsu Kaisen
	async function processJujutsuKaisen(videoParams, episode) {
		const JUJUTSU_KAISEN_MAL_ID = 40748;
		
		log(`Jujutsu Kaisen detected, episode ${episode}`);
		
		// Получаем сегменты для указанной серии
		const segments = await getSkipTimes(JUJUTSU_KAISEN_MAL_ID, episode);
		
		if (segments.length > 0) {
			const added = addSegmentsToItem(videoParams, segments);
			
			if (added > 0) {
				log(`Added ${added} skip segments for Jujutsu Kaisen`);
				
				// Показываем уведомление
				if (Lampa.Noty) {
					Lampa.Noty.show(`Добавлено ${added} меток пропуска`);
				}
				
				// Обновляем плеер
				if (Lampa.Player.listener) {
					Lampa.Player.listener.send("segments", { skip: videoParams.segments.skip });
				}
				
				return true;
			}
		}
		
		return false;
	}

	// Получение сегментов пропуска
	async function getSkipTimes(malId, episode) {
		if (!malId || !episode) return [];
		
		// Кэширование
		const cacheKey = `skip_${malId}_${episode}`;
		const cached = localStorage.getItem(cacheKey);
		if (cached) {
			try {
				const data = JSON.parse(cached);
				if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
					log(`Using cached skip times for episode ${episode}`);
					return data.segments;
				}
			} catch (e) {}
		}
		
		log(`Requesting skip times for MAL ID ${malId}, episode ${episode}`);
		
		try {
			const types = SKIP_TYPES.map(t => `types[]=${t}`).join("&");
			const url = `${ANISKIP_API}/${malId}/${episode}?${types}&episodeLength=0`;
			
			const response = await fetch(url, {
				headers: {
					"Accept": "application/json"
				}
			});
			
			if (response.status === 404) {
				log(`No skip times for episode ${episode}`);
				return [];
			}
			
			if (!response.ok) {
				log(`AniSkip error: ${response.status}`);
				return [];
			}
			
			const data = await response.json();
			
			if (data.found && data.results?.length > 0) {
				const segments = data.results.map(item => {
					const type = (item.skipType || "").toLowerCase();
					let name = "Пропустить";
					
					if (type.includes("op")) name = "Опенинг";
					else if (type.includes("ed")) name = "Эндинг";
					else if (type === "recap") name = "Рекап";
					
					return {
						start: item.interval.startTime,
						end: item.interval.endTime,
						name: name,
						type: type
					};
				}).filter(seg => seg.start && seg.end);
				
				// Сохраняем в кэш
				localStorage.setItem(cacheKey, JSON.stringify({
					segments: segments,
					timestamp: Date.now()
				}));
				
				log(`Found ${segments.length} skip segments`);
				return segments;
			}
			
			return [];
			
		} catch (error) {
			log(`AniSkip request error: ${error.message}`);
			return [];
		}
	}

	// Определяем номер серии из разных источников
	function extractEpisodeNumber(videoParams, card) {
		// 1. Из параметров видео
		if (videoParams.episode || videoParams.e || videoParams.episode_number) {
			const ep = videoParams.episode || videoParams.e || videoParams.episode_number;
			return parseInt(ep);
		}
		
		// 2. Из плейлиста
		if (videoParams.playlist && Array.isArray(videoParams.playlist)) {
			const url = videoParams.url;
			const index = videoParams.playlist.findIndex(p => p.url === url);
			if (index !== -1) {
				return index + 1;
			}
		}
		
		// 3. Из названия в логах (fallback)
		const title = videoParams.title || "";
		const epMatch = title.match(/(\d+)/);
		if (epMatch) {
			return parseInt(epMatch[1]);
		}
		
		// 4. По умолчанию
		return 1;
	}

	// Основная функция обработки
	async function processVideo(videoParams) {
		try {
			// Получаем карточку
			let card = videoParams.card || videoParams.movie;
			if (!card) {
				const active = Lampa.Activity.active();
				card = active?.card || active?.movie;
			}
			
			// Извлекаем номер серии
			const episode = extractEpisodeNumber(videoParams, card);
			log(`Processing video, episode: ${episode}`);
			
			// Пробуем получить информацию из карточки
			const animeInfo = getAnimeInfoFromCard(card);
			
			if (animeInfo) {
				log(`Card info: "${animeInfo.title}", isAnime: ${animeInfo.isAnime}`);
				
				// Если это Jujutsu Kaisen, обрабатываем напрямую
				const title = animeInfo.title.toLowerCase();
				if (title.includes('jujutsu') || 
					title.includes('kaisen') || 
					title.includes('магическая') || 
					title.includes('битва')) {
					
					const success = await processJujutsuKaisen(videoParams, episode);
					if (success) return;
				}
				
				// Если не Jujutsu Kaisen, но похоже на аниме
				if (animeInfo.isAnime) {
					log(`Looks like anime, but not Jujutsu Kaisen. Title: "${animeInfo.title}"`);
					// Можно добавить обработку других аниме
				}
			} else {
				// Если нет информации из карточки, пробуем по названию видео
				const videoTitle = videoParams.title || "";
				log(`No card info, video title: "${videoTitle}"`);
				
				// Для Jujutsu Kaisen все равно пробуем
				const lowerTitle = videoTitle.toLowerCase();
				if (lowerTitle.includes('магическая') || 
					lowerTitle.includes('битва') ||
					episode > 0) { // Если есть номер серии
					
					log(`Trying Jujutsu Kaisen for episode ${episode}`);
					await processJujutsuKaisen(videoParams, episode);
				}
			}
			
		} catch (error) {
			log(`Error: ${error.message}`);
		}
	}

	// Инициализация
	function init() {
		if (window.lampa_jjk_fixed) return;
		window.lampa_jjk_fixed = true;
		
		// Сохраняем оригинальный метод
		const originalPlay = Lampa.Player.play;
		
		// Переопределяем метод
		Lampa.Player.play = function (videoParams) {
			// Запускаем обработку
			setTimeout(() => {
				processVideo(videoParams);
			}, 1500); // Даем время загрузиться плееру
			
			// Вызываем оригинальный метод
			return originalPlay.call(this, videoParams);
		};
		
		log("Jujutsu Kaisen Skip plugin initialized");
		
		// Глобальные методы для отладки
		window.JJKDebug = {
			testEpisode: (episode) => {
				const active = Lampa.Activity.active();
				if (active?.videoParams) {
					processJujutsuKaisen(active.videoParams, episode || 1);
				}
			},
			clearCache: () => {
				const keys = [];
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key.startsWith("skip_")) {
						keys.push(key);
					}
				}
				keys.forEach(key => localStorage.removeItem(key));
				log("Cache cleared");
			}
		};
	}

	// Запускаем
	if (window.Lampa && window.Lampa.Player) {
		init();
	} else {
		window.document.addEventListener("app_ready", init);
	}

})();
