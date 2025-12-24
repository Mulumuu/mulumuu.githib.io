(function () {
	"use strict";

	// Конфигурация
	const ANISKIP_API = "https://api.aniskip.com/v2/skip-times";
	const ANILIST_API = "https://graphql.anilist.co";
	const SKIP_TYPES = ["op", "ed", "recap"];

	// Руководство по названиям (русское -> английское)
	const ANIME_MAPPING = {
		// Jujutsu Kaisen
		"магическая битва": "Jujutsu Kaisen",
		"джуцзу кайсен": "Jujutsu Kaisen",
		"jujutsu kaisen": "Jujutsu Kaisen",
		"jjк": "Jujutsu Kaisen",
		
		// Attack on Titan
		"атака титанов": "Attack on Titan",
		"attack on titan": "Attack on Titan",
		"shingeki no kyojin": "Attack on Titan",
		
		// One Piece
		"ван пис": "One Piece",
		"one piece": "One Piece",
		"вон пис": "One Piece",
		
		// Naruto
		"наруто": "Naruto",
		"naruto": "Naruto",
		
		// Bleach
		"блич": "Bleach",
		"bleach": "Bleach",
		
		// Demon Slayer
		"истребитель демонов": "Demon Slayer",
		"клинок рассекающий демонов": "Demon Slayer",
		"demon slayer": "Demon Slayer",
		
		// My Hero Academia
		"моя геройская академия": "My Hero Academia",
		"my hero academia": "My Hero Academia",
		"академия героев": "My Hero Academia",
		
		// Chainsaw Man
		"человек бензопила": "Chainsaw Man",
		"chainsaw man": "Chainsaw Man",
		
		// Spy x Family
		"шпионская семья": "Spy x Family",
		"spy x family": "Spy x Family",
		
		// Tokyo Revengers
		"токийские мстители": "Tokyo Revengers",
		"tokyo revengers": "Tokyo Revengers",
		
		// Vinland Saga
		"сага о винланде": "Vinland Saga",
		"vinland saga": "Vinland Saga",
		
		// Mob Psycho 100
		"моб психо 100": "Mob Psycho 100",
		"mob psycho 100": "Mob Psycho 100",
		
		// One Punch Man
		"ванпанчмен": "One Punch Man",
		"one punch man": "One Punch Man",
		
		// Dr. Stone
		"доктор стоун": "Dr. Stone",
		"dr. stone": "Dr. Stone",
		"dr stone": "Dr. Stone",
		
		// Haikyuu!!
		"хайкю": "Haikyuu!!",
		"haikyuu": "Haikyuu!!",
		
		// Black Clover
		"блэк кловер": "Black Clover",
		"black clover": "Black Clover",
		
		// Sword Art Online
		"мастер меча онлайн": "Sword Art Online",
		"sword art online": "Sword Art Online",
		"сао": "Sword Art Online",
		
		// Re:Zero
		"ре зеро": "Re:Zero",
		"re zero": "Re:Zero",
		"re:zero": "Re:Zero",
		
		// Konosuba
		"богиня благословляет этот прекрасный мир": "Konosuba",
		"konosuba": "Konosuba",
		
		// Overlord
		"оверлорд": "Overlord",
		"overlord": "Overlord",
		
		// That Time I Got Reincarnated as a Slime
		"перерождение в слизь": "That Time I Got Reincarnated as a Slime",
		"tensura": "That Time I Got Reincarnated as a Slime",
		
		// Mushoku Tensei
		"бесполезное перерождение": "Mushoku Tensei",
		"mushoku tensei": "Mushoku Tensei"
	};

	function log(message) {
		console.log("[AniSkip]: " + message);
	}

	function addSegmentsToItem(item, segments) {
		if (!item || !segments || segments.length === 0) return 0;
		
		item.segments = item.segments || {};
		item.segments.skip = item.segments.skip || [];
		
		let added = 0;
		segments.forEach(seg => {
			const exists = item.segments.skip.some(s => 
				Math.abs(s.start - seg.start) < 1 && 
				Math.abs(s.end - seg.end) < 1
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

	// Улучшенный парсинг названия
	function parseVideoInfo(title) {
		if (!title) return { name: "", episode: 1 };
		
		// Удаляем лишнее
		let cleanTitle = title
			.replace(/\(\s*\d+\s*серия\s*\)/gi, "")
			.replace(/-\s*\d+\s*серия/gi, "")
			.replace(/\s*серия\s*\d+/gi, "")
			.replace(/episode\s*\d+/gi, "")
			.replace(/\(.*?\)/g, "")
			.replace(/\s+/g, " ")
			.trim();
		
		// Извлекаем номер эпизода
		let episode = 1;
		const episodeMatch = title.match(/(\d+)\s*(?:серия|серии|эпизод|episode|эп)/i);
		if (episodeMatch) {
			episode = parseInt(episodeMatch[1]);
		} else {
			// Пробуем найти число в конце
			const numberAtEnd = title.match(/(\d+)\s*$/);
			if (numberAtEnd) episode = parseInt(numberAtEnd[1]);
		}
		
		return { name: cleanTitle, episode: episode };
	}

	// Преобразование русского названия в английское
	function translateToEnglish(name) {
		const lowerName = name.toLowerCase();
		
		// Проверяем ручной маппинг
		for (const [rus, eng] of Object.entries(ANIME_MAPPING)) {
			if (lowerName.includes(rus)) {
				return eng;
			}
		}
		
		// Если не нашли, возвращаем оригинал
		return name;
	}

	// Получение MAL ID через AniList
	async function getMALId(englishName) {
		// Проверяем кэш
		const cacheKey = `mal_${englishName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
		const cached = localStorage.getItem(cacheKey);
		if (cached) {
			const data = JSON.parse(cached);
			if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 дней
				return data.malId;
			}
		}
		
		log(`Searching MAL ID for: "${englishName}"`);
		
		try {
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
					variables: { search: englishName }
				})
			});
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			
			const data = await response.json();
			
			if (data?.data?.Media?.idMal) {
				const malId = data.data.Media.idMal;
				
				// Сохраняем в кэш
				localStorage.setItem(cacheKey, JSON.stringify({
					malId: malId,
					timestamp: Date.now(),
					title: data.data.Media.title.romaji || englishName
				}));
				
				log(`Found MAL ID: ${malId} (${data.data.Media.title.romaji || englishName})`);
				return malId;
			}
			
			// Пробуем поиск с несколькими результатами
			const searchQuery = `
				query ($search: String) {
					Page(page: 1, perPage: 3) {
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
					variables: { search: englishName }
				})
			});
			
			const searchData = await searchResponse.json();
			
			if (searchData?.data?.Page?.media?.length > 0) {
				for (const media of searchData.data.Page.media) {
					if (media.idMal) {
						const malId = media.idMal;
						
						localStorage.setItem(cacheKey, JSON.stringify({
							malId: malId,
							timestamp: Date.now(),
							title: media.title.romaji || englishName
						}));
						
						log(`Found MAL ID in search: ${malId} (${media.title.romaji})`);
						return malId;
					}
				}
			}
			
			return null;
			
		} catch (error) {
			log(`AniList error: ${error.message}`);
			return null;
		}
	}

	// Получение сегментов пропуска
	async function getSkipTimes(malId, episode) {
		if (!malId || !episode) return [];
		
		// Проверяем кэш
		const cacheKey = `skip_${malId}_${episode}`;
		const cached = localStorage.getItem(cacheKey);
		if (cached) {
			const data = JSON.parse(cached);
			if (Date.now() - data.timestamp < 30 * 24 * 60 * 60 * 1000) { // 30 дней
				log(`Using cached skip times for episode ${episode}`);
				return data.segments;
			}
		}
		
		log(`Requesting skip times for MAL ID ${malId}, episode ${episode}`);
		
		try {
			const types = SKIP_TYPES.map(t => `types[]=${t}`).join("&");
			const url = `${ANISKIP_API}/${malId}/${episode}?${types}&episodeLength=0`;
			
			const response = await fetch(url, {
				headers: {
					"Accept": "application/json",
					"User-Agent": "LampaAnimeSkip/1.0"
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
					const type = (item.skipType || item.skip_type || "").toLowerCase();
					let name = "Пропустить";
					
					if (type.includes("op")) name = "Опенинг";
					else if (type.includes("ed")) name = "Эндинг";
					else if (type === "recap") name = "Рекап";
					
					return {
						start: item.interval.startTime ?? item.interval.start_time,
						end: item.interval.endTime ?? item.interval.end_time,
						name: name,
						type: type
					};
				}).filter(seg => seg.start && seg.end);
				
				// Сохраняем в кэш
				localStorage.setItem(cacheKey, JSON.stringify({
					segments: segments,
					timestamp: Date.now(),
					count: segments.length
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

	// Определяем, аниме ли это
	function isAnime(title) {
		if (!title) return false;
		
		const lowerTitle = title.toLowerCase();
		
		// Ключевые слова, указывающие на аниме
		const animeKeywords = [
			'аниме', 'anime', 'магическая', 'битва', 'ниндзя',
			'дракон', 'самурай', 'магия', 'сёнен', 'сёдзё',
			'shonen', 'shoujo', 'seinen', 'josei', 'эпизод',
			'серия', 'opening', 'ending', 'опенинг', 'эндинг'
		];
		
		// Проверяем по ключевым словам
		for (const keyword of animeKeywords) {
			if (lowerTitle.includes(keyword)) {
				return true;
			}
		}
		
		// Проверяем по ручному маппингу
		for (const rusName of Object.keys(ANIME_MAPPING)) {
			if (lowerTitle.includes(rusName)) {
				return true;
			}
		}
		
		return false;
	}

	// Основная функция
	async function processVideo(videoParams) {
		try {
			// Получаем название из параметров
			const title = videoParams.title || "";
			
			if (!title) {
				log("No title provided");
				return;
			}
			
			log(`Processing: "${title}"`);
			
			// Проверяем, аниме ли это
			if (!isAnime(title)) {
				log("Not an anime, skipping");
				return;
			}
			
			// Парсим информацию
			const videoInfo = parseVideoInfo(title);
			log(`Parsed: "${videoInfo.name}", Episode: ${videoInfo.episode}`);
			
			// Переводим на английский
			const englishName = translateToEnglish(videoInfo.name);
			log(`Translated to: "${englishName}"`);
			
			// Получаем MAL ID
			const malId = await getMALId(englishName);
			
			if (!malId) {
				log(`Could not find MAL ID for "${englishName}"`);
				return;
			}
			
			// Получаем сегменты пропуска
			const segments = await getSkipTimes(malId, videoInfo.episode);
			
			if (segments.length > 0) {
				// Добавляем сегменты
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
			log(`Error: ${error.message}`);
		}
	}

	// Инициализация
	function init() {
		if (window.lampa_anime_skip_simple) return;
		window.lampa_anime_skip_simple = true;
		
		// Сохраняем оригинальный метод
		const originalPlay = Lampa.Player.play;
		
		// Переопределяем метод
		Lampa.Player.play = function (videoParams) {
			// Запускаем обработку в фоне
			setTimeout(() => {
				processVideo(videoParams);
			}, 1000); // Задержка для стабильности
			
			// Вызываем оригинальный метод
			return originalPlay.call(this, videoParams);
		};
		
		log("Simple Anime Skip plugin initialized");
		
		// Добавляем глобальные методы для отладки
		window.AniSkipDebug = {
			clearCache: () => {
				const keys = [];
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key.startsWith("mal_") || key.startsWith("skip_")) {
						keys.push(key);
					}
				}
				keys.forEach(key => localStorage.removeItem(key));
				log("Cache cleared");
			},
			getInfo: (title) => {
				const info = parseVideoInfo(title);
				const english = translateToEnglish(info.name);
				return { ...info, englishName: english };
			}
		};
	}

	// Запускаем при готовности Lampa
	if (window.Lampa && window.Lampa.Player) {
		init();
	} else {
		window.document.addEventListener("app_ready", init);
	}

})();
