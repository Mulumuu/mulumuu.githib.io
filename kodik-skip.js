(function () {
	"use strict";

	const ANISKIP_API = "https://api.aniskip.com/v2/skip-times";
	const SKIP_TYPES = ["op", "ed", "recap"];
	
	// Добавляем кэш для улучшения производительности
	const cache = {
		get: (key) => {
			try {
				return JSON.parse(localStorage.getItem(`anime_skip_${key}`));
			} catch {
				return null;
			}
		},
		set: (key, value) => {
			try {
				localStorage.setItem(`anime_skip_${key}`, JSON.stringify(value));
			} catch {}
		}
	};

	function log(message, showNotify = false) {
		console.log("[AniSkip-Shikimori]: " + message);
		if (showNotify && typeof Lampa !== "undefined" && Lampa.Noty) {
			// Уведомления можно включить при необходимости
		}
	}

	function addSegmentsToItem(item, newSegments) {
		if (!item || typeof item !== "object") return 0;

		item.segments = item.segments || {};
		item.segments.skip = item.segments.skip || [];

		let count = 0;
		newSegments.forEach((newSeg) => {
			const exists = item.segments.skip.some((s) => Math.abs(s.start - newSeg.start) < 1);
			if (!exists) {
				item.segments.skip.push({
					start: newSeg.start,
					end: newSeg.end,
					name: newSeg.name || "Пропустить",
				});
				count++;
			}
		});
		return count;
	}

	// Улучшенный парсинг названия для извлечения информации об аниме
	function parseAnimeInfo(title) {
		const patterns = [
			// Русские названия с серией
			/^(.*?)\s*\((\d+)\s*серия\)/i,
			/^(.*?)\s*-\s*(\d+)\s*серия/i,
			/^(.*?)\s*серия\s*(\d+)/i,
			// Английские названия
			/^(.*?)\s*[Ee]pisode\s*(\d+)/i,
			/^(.*?)\s*-?\s*(\d+)$/,
			// Без номера серии
			/^(.*?)$/
		];

		for (const pattern of patterns) {
			const match = title.match(pattern);
			if (match) {
				return {
					name: match[1].trim(),
					episode: match[2] ? parseInt(match[2]) : 1
				};
			}
		}
		
		return { name: title, episode: 1 };
	}

	// Функция для поиска shikimoriId по названию через разные источники
	async function findShikimoriId(animeName, season = 1) {
		const cacheKey = `shikimori_${animeName.toLowerCase().replace(/\s+/g, '_')}_s${season}`;
		const cached = cache.get(cacheKey);
		if (cached) return cached;

		log(`Searching Shikimori ID for: "${animeName}" Season ${season}`);

		// Список возможных API для поиска
		const searchApis = [
			// 1. Прямой запрос к Shikimori API (может требовать CORS прокси)
			{
				name: "Shikimori API",
				url: `https://shikimori.me/api/animes?search=${encodeURIComponent(animeName)}&limit=5`,
				parser: (data) => data?.[0]?.id
			},
			// 2. Через AniList GraphQL (хорошая альтернатива)
			{
				name: "AniList GraphQL",
				url: "https://graphql.anilist.co",
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json"
				},
				body: JSON.stringify({
					query: `
						query ($search: String) {
							Media(search: $search, type: ANIME) {
								id
								idMal
								title { romaji english native }
								synonyms
							}
						}
					`,
					variables: { search: animeName }
				}),
				parser: (data) => data?.data?.Media?.idMal // MAL ID, но подойдет
			},
			// 3. Через Kitsu API
			{
				name: "Kitsu API",
				url: `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(animeName)}&page[limit]=5`,
				parser: (data) => data?.data?.[0]?.id
			}
		];

		for (const api of searchApis) {
			try {
				log(`Trying ${api.name}...`);
				
				const options = {
					method: api.method || "GET",
					headers: api.headers || {
						"User-Agent": "LampaAnimeSkip/1.0"
					}
				};
				
				if (api.body) options.body = api.body;
				
				const response = await fetch(api.url, options);
				
				if (response.ok) {
					const data = await response.json();
					const id = api.parser(data);
					
					if (id) {
						log(`Found ID via ${api.name}: ${id}`);
						cache.set(cacheKey, id);
						return id;
					}
				}
			} catch (error) {
				log(`${api.name} error: ${error.message}`);
				continue;
			}
		}

		// Если ничего не нашли, пробуем закодированные названия
		const encodedNames = [
			encodeURIComponent(animeName),
			encodeURIComponent(animeName.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, " ")),
			encodeURIComponent(animeName.split(" ")[0]) // Первое слово
		];

		for (const encodedName of encodedNames) {
			try {
				const response = await fetch(
					`https://api.aniskip.com/v2/search?query=${encodedName}&limit=1`
				);
				if (response.ok) {
					const data = await response.json();
					if (data?.results?.[0]?.malId) {
						const malId = data.results[0].malId;
						log(`Found via AniSkip search: MAL ID ${malId}`);
						cache.set(cacheKey, malId);
						return malId; // AniSkip принимает и MAL ID
					}
				}
			} catch (error) {
				continue;
			}
		}

		log("Could not find Shikimori/MAL ID");
		return null;
	}

	// Получение сегментов пропуска
	async function getSkipSegments(animeId, episode) {
		const cacheKey = `segments_${animeId}_${episode}`;
		const cached = cache.get(cacheKey);
		if (cached) {
			log(`Using cached segments for episode ${episode}`);
			return cached;
		}

		const types = SKIP_TYPES.map((t) => "types[]=" + t).join("&");
		const url = `${ANISKIP_API}/${animeId}/${episode}?${types}&episodeLength=0`;
		
		try {
			const response = await fetch(url);
			
			if (response.status === 404) {
				log(`No skip times for episode ${episode}`);
				return [];
			}
			
			if (!response.ok) {
				log(`AniSkip API error: ${response.status}`);
				return [];
			}
			
			const data = await response.json();
			
			if (data.found && data.results?.length > 0) {
				const segments = data.results.map((s) => ({
					start: s.interval.startTime ?? s.interval.start_time,
					end: s.interval.endTime ?? s.interval.end_time,
					type: s.skipType || s.skip_type,
					name: getSegmentName(s.skipType || s.skip_type)
				})).filter(s => s.start && s.end);
				
				cache.set(cacheKey, segments);
				log(`Found ${segments.length} segments for episode ${episode}`);
				return segments;
			}
			
			return [];
			
		} catch (error) {
			log(`AniSkip request error: ${error.message}`);
			return [];
		}
	}

	function getSegmentName(type) {
		switch (type?.toLowerCase()) {
			case 'op': return 'Опенинг';
			case 'ed': return 'Эндинг';
			case 'recap': return 'Рекап';
			default: return 'Пропустить';
		}
	}

	// Основная функция обработки
	async function processAnimeSkip(videoParams) {
		try {
			// Пытаемся получить карточку с метаданными
			let card = videoParams.movie || videoParams.card;
			if (!card) {
				const active = Lampa.Activity.active();
				if (active) card = active.movie || active.card;
			}
			
			// Если нет карточки, используем заголовок из параметров
			const title = card?.title || videoParams.title || "";
			log(`Processing: ${title}`);
			
			// Парсим информацию из названия
			const animeInfo = parseAnimeInfo(title);
			log(`Parsed: "${animeInfo.name}", Episode: ${animeInfo.episode}`);
			
			// Определяем, аниме ли это
			const isLikelyAnime = isAnimeContent(card, animeInfo.name);
			
			if (!isLikelyAnime) {
				log("Not an anime, skipping");
				return;
			}
			
			// Ищем ID аниме
			const animeId = await findShikimoriId(animeInfo.name, 1); // season = 1
			
			if (!animeId) {
				log("Could not identify anime");
				return;
			}
			
			// Получаем сегменты пропуска
			const segments = await getSkipSegments(animeId, animeInfo.episode);
			
			if (segments.length > 0) {
				// Добавляем сегменты в параметры видео
				const added = addSegmentsToItem(videoParams, segments);
				
				if (added > 0) {
					log(`Added ${added} skip segments`);
					
					// Показываем уведомление
					if (Lampa.Noty) {
						Lampa.Noty.show(`Добавлено ${added} меток пропуска`);
					}
					
					// Обновляем плеер
					if (Lampa.Player.listener) {
						Lampa.Player.listener.send("segments", { skip: videoParams.segments.skip });
					}
				}
			} else {
				log("No skip segments available");
			}
			
		} catch (error) {
			log(`Processing error: ${error.message}`);
		}
	}

	// Функция для определения, является ли контент аниме
	function isAnimeContent(card, title) {
		if (!card) {
			// Если нет карточки, проверяем по названию
			const animeKeywords = [
				'аниме', 'anime', 'тентакли', 'магическая',
				'битва', 'shounen', 'shoujo', 'сенен',
				'дракон', 'ниндзя', 'самурай', 'магия'
			];
			
			const lowerTitle = title.toLowerCase();
			return animeKeywords.some(keyword => lowerTitle.includes(keyword));
		}
		
		// Проверяем язык
		const lang = (card.original_language || "").toLowerCase();
		const isAsian = ['ja', 'zh', 'cn', 'ko'].includes(lang);
		
		// Проверяем жанры
		const isAnimation = card.genres?.some(g => 
			g.id === 16 || 
			(g.name && g.name.toLowerCase().includes('аниме')) ||
			(g.name && g.name.toLowerCase().includes('anime'))
		);
		
		return isAsian || isAnimation;
	}

	// Инициализация плагина
	function init() {
		if (window.lampa_anime_skip_v2) return;
		window.lampa_anime_skip_v2 = true;
		
		const originalPlay = Lampa.Player.play;
		
		Lampa.Player.play = function (videoParams) {
			// Запускаем поиск сегментов в фоне
			setTimeout(() => {
				processAnimeSkip(videoParams).catch(console.error);
			}, 100);
			
			// Воспроизводим видео
			return originalPlay.call(this, videoParams);
		};
		
		log("Anime Skip Plugin initialized");
	}

	// Запуск при готовности Lampa
	if (window.Lampa?.Player) {
		init();
	} else {
		document.addEventListener("app_ready", init);
	}

})();
