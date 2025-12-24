(function () {
	"use strict";

	const ANISKIP_API = "https://api.aniskip.com/v2/skip-times";
	const SKIP_TYPES = ["op", "ed", "recap"];
	
	// CORS прокси для обхода ограничений
	const CORS_PROXY = "https://corsproxy.io/?"; // или https://api.allorigins.win/raw?url=
	const ANILIST_API = "https://graphql.anilist.co";

	function log(message, showNotify = false) {
		console.log("[AniSkip-Fixed]: " + message);
		if (showNotify && typeof Lampa !== "undefined" && Lampa.Noty) {
			// Можно включить уведомления
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

	// Парсинг названия с улучшенной логикой
	function parseAnimeInfo(title) {
		// Удаляем лишнее из названия
		let cleanTitle = title
			.replace(/\(\s*\d+\s*серия\s*\)/gi, "")
			.replace(/-\s*\d+\s*серия/gi, "")
			.replace(/серия\s*\d+/gi, "")
			.replace(/\s*\(\s*\d{4}\s*\)/g, "")
			.replace(/\(.*?\)/g, "")
			.replace(/\s+/g, " ")
			.trim();
		
		// Извлекаем номер эпизода
		let episode = 1;
		const episodeMatch = title.match(/(\d+)\s*(?:серия|серии|эпизод|episode)/i);
		if (episodeMatch) episode = parseInt(episodeMatch[1]);
		
		return { name: cleanTitle, episode: episode };
	}

	// Получение MAL ID через AniList GraphQL (работает без CORS)
	async function getMALIdFromAnimeName(animeName) {
		// Кэширование
		const cacheKey = `malid_${animeName.toLowerCase().replace(/\s+/g, '_')}`;
		const cached = localStorage.getItem(cacheKey);
		if (cached) return parseInt(cached);
		
		log(`Searching for: "${animeName}"`);
		
		try {
			// Запрос к AniList GraphQL
			const query = `
				query ($search: String) {
					Media(search: $search, type: ANIME) {
						id
						idMal
						title {
							romaji
							english
							native
							userPreferred
						}
					}
				}
			`;
			
			const response = await fetch(ANILIST_API, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json"
				},
				body: JSON.stringify({
					query: query,
					variables: { search: animeName }
				})
			});
			
			if (!response.ok) {
				throw new Error(`AniList API error: ${response.status}`);
			}
			
			const data = await response.json();
			
			if (data?.data?.Media?.idMal) {
				const malId = data.data.Media.idMal;
				localStorage.setItem(cacheKey, malId.toString());
				log(`Found MAL ID: ${malId} for "${animeName}"`);
				return malId;
			}
			
			// Если не нашли по точному названию, пробуем поиск
			log("Exact match not found, trying search...");
			
			const searchQuery = `
				query ($search: String) {
					Page(page: 1, perPage: 5) {
						media(search: $search, type: ANIME) {
							id
							idMal
							title {
								romaji
								english
								native
							}
						}
					}
				}
			`;
			
			const searchResponse = await fetch(ANILIST_API, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json"
				},
				body: JSON.stringify({
					query: searchQuery,
					variables: { search: animeName }
				})
			});
			
			const searchData = await searchResponse.json();
			
			if (searchData?.data?.Page?.media?.length > 0) {
				// Ищем лучшее совпадение
				const media = searchData.data.Page.media;
				for (const item of media) {
					if (item.idMal) {
						const malId = item.idMal;
						localStorage.setItem(cacheKey, malId.toString());
						log(`Found MAL ID in search: ${malId} for "${item.title.romaji || item.title.english}"`);
						return malId;
					}
				}
			}
			
			return null;
			
		} catch (error) {
			log(`AniList search error: ${error.message}`);
			return null;
		}
	}

	// Получение сегментов пропуска через AniSkip
	async function getSkipSegments(malId, episode) {
		if (!malId || !episode) return [];
		
		const cacheKey = `segments_${malId}_${episode}`;
		const cached = localStorage.getItem(cacheKey);
		if (cached) {
			try {
				return JSON.parse(cached);
			} catch {
				// ignore
			}
		}
		
		// AniSkip принимает как shikimori_id, так и mal_id
		// Обычно это одно и то же число для большинства аниме
		const types = SKIP_TYPES.map((t) => "types[]=" + t).join("&");
		const url = `${ANISKIP_API}/${malId}/${episode}?${types}&episodeLength=0`;
		
		log(`Requesting skip times for MAL ID ${malId}, episode ${episode}`);
		
		try {
			// Используем прокси для обхода CORS если нужно
			const fetchUrl = url; // Можно использовать CORS_PROXY + encodeURIComponent(url) если нужно
			
			const response = await fetch(fetchUrl, {
				headers: {
					"Accept": "application/json",
					"User-Agent": "LampaAnimeSkip/1.0"
				}
			});
			
			if (response.status === 404) {
				log(`No skip times found for episode ${episode}`);
				return [];
			}
			
			if (!response.ok) {
				log(`AniSkip error: ${response.status}`);
				return [];
			}
			
			const data = await response.json();
			
			if (data.found && data.results?.length > 0) {
				const segments = data.results.map((item) => {
					const type = (item.skipType || item.skip_type || "").toLowerCase();
					let name = "Пропустить";
					if (type.includes("op")) name = "Опенинг";
					else if (type.includes("ed")) name = "Эндинг";
					else if (type === "recap") name = "Рекап";
					
					return {
						start: item.interval.startTime ?? item.interval.start_time,
						end: item.interval.endTime ?? item.interval.end_time,
						name: name
					};
				}).filter(s => s.start && s.end);
				
				// Сохраняем в кэш
				localStorage.setItem(cacheKey, JSON.stringify(segments));
				log(`Found ${segments.length} skip segments`);
				return segments;
			}
			
			return [];
			
		} catch (error) {
			log(`AniSkip request error: ${error.message}`);
			return [];
		}
	}

	// Проверка, является ли контент аниме
	function isAnimeContent(card, title) {
		if (!card) {
			// Проверяем по названию
			const lowerTitle = title.toLowerCase();
			const animeKeywords = [
				'магическая', 'битва', 'аниме', 'anime',
				'ниндзя', 'дракон', 'самурай', 'магия',
				'shounen', 'shoujo', 'сёнен', 'сёдзё'
			];
			
			return animeKeywords.some(keyword => lowerTitle.includes(keyword));
		}
		
		// Проверяем язык
		const lang = (card.original_language || "").toLowerCase();
		const isAsian = ['ja', 'zh', 'cn', 'ko'].includes(lang);
		
		// Проверяем жанры
		const isAnimation = card.genres?.some(g => 
			g.id === 16 || 
			(g.name && g.name.toLowerCase().includes('аниме')) ||
			(g.name && g.name.toLowerCase().includes('animation'))
		);
		
		return isAsian || isAnimation;
	}

	// Основная функция обработки
	async function processAnimeSkip(videoParams) {
		try {
			// Получаем информацию о видео
			let card = videoParams.movie || videoParams.card;
			if (!card) {
				const active = Lampa.Activity.active();
				if (active) card = active.movie || active.card;
			}
			
			// Название из параметров или карточки
			const title = card?.title || videoParams.title || "";
			
			// Парсим информацию
			const animeInfo = parseAnimeInfo(title);
			log(`Processing: "${animeInfo.name}", Episode: ${animeInfo.episode}`);
			
			// Проверяем, аниме ли это
			if (!isAnimeContent(card, animeInfo.name)) {
				log("Not an anime, skipping");
				return;
			}
			
			// Для "МАГИЧЕСКАЯ БИТВА" - это Jujutsu Kaisen (MAL ID: 40748)
			// Можно добавить ручной маппинг для популярных аниме
			const manualMapping = {
				"магическая битва": 40748, // Jujutsu Kaisen
				"jujutsu kaisen": 40748,
				"джуцзу кайсен": 40748,
				"атака титанов": 16498, // Attack on Titan
				"attack on titan": 16498,
				"наруто": 20,
				"naruto": 20,
				"ван пис": 21, // One Piece
				"one piece": 21,
				"блич": 269, // Bleach
				"bleach": 269
			};
			
			let malId = null;
			const lowerName = animeInfo.name.toLowerCase();
			
			// Проверяем ручной маппинг
			for (const [key, id] of Object.entries(manualMapping)) {
				if (lowerName.includes(key)) {
					malId = id;
					log(`Manual mapping found: ${animeInfo.name} -> MAL ID: ${malId}`);
					break;
				}
			}
			
			// Если нет в маппинге, ищем через API
			if (!malId) {
				malId = await getMALIdFromAnimeName(animeInfo.name);
			}
			
			if (!malId) {
				log(`Could not find MAL ID for "${animeInfo.name}"`);
				return;
			}
			
			// Получаем сегменты пропуска
			const segments = await getSkipSegments(malId, animeInfo.episode);
			
			if (segments.length > 0) {
				const added = addSegmentsToItem(videoParams, segments);
				
				if (added > 0) {
					log(`Successfully added ${added} skip segments`);
					
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
				log("No skip segments available for this episode");
			}
			
		} catch (error) {
			log(`Error: ${error.message}`);
		}
	}

	// Инициализация плагина
	function init() {
		if (window.lampa_anime_skip_fixed) return;
		window.lampa_anime_skip_fixed = true;
		
		const originalPlay = Lampa.Player.play;
		
		Lampa.Player.play = function (videoParams) {
			// Запускаем поиск сегментов
			setTimeout(() => {
				processAnimeSkip(videoParams).catch(e => {
					console.error("[AniSkip] Error:", e);
				});
			}, 500); // Небольшая задержка для стабильности
			
			// Воспроизводим видео
			return originalPlay.call(this, videoParams);
		};
		
		log("AniSkip Plugin initialized (fixed version)");
		
		// Добавляем ручное обновление сегментов
		if (window.Lampa) {
			window.Lampa.AniSkip = {
				refresh: () => {
					const active = Lampa.Activity.active();
					if (active && active.videoParams) {
						processAnimeSkip(active.videoParams);
					}
				},
				clearCache: () => {
					const keys = [];
					for (let i = 0; i < localStorage.length; i++) {
						const key = localStorage.key(i);
						if (key.startsWith("malid_") || key.startsWith("segments_")) {
							keys.push(key);
						}
					}
					keys.forEach(key => localStorage.removeItem(key));
					log("Cache cleared");
				}
			};
		}
	}

	// Запуск
	if (window.Lampa?.Player) {
		init();
	} else {
		document.addEventListener("app_ready", init);
	}

})();
