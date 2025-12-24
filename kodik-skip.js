(function () {
	"use strict";

	const ANISKIP_API = "https://api.aniskip.com/v2/skip-times";
	const SKIP_TYPES = ["op", "ed", "recap"];

	function log(message) {
		console.log("[AniSkip-JJK]: " + message);
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

	// Проверяем все варианты названий Jujutsu Kaisen
	function isJujutsuKaisenTitle(title) {
		if (!title) return false;
		
		const lowerTitle = title.toLowerCase();
		
		// Все возможные названия Jujutsu Kaisen
		const jjkNames = [
			// Английские
			'jujutsu kaisen',
			'jujutsu',
			'kaisen',
			'jjk',
			
			// Русские
			'магическая битва',
			'магическая',
			'битва',
			'джуцзу кайсен',
			
			// Японские
			'呪術廻戦',
			'呪術回戦',
			'じゅじゅつかいせん',
			'じゅつかいせん',
			
			// Китайские
			'咒术回战',
			'呪術迴戰'
		];
		
		// Проверяем каждое название
		for (const name of jjkNames) {
			if (title.includes(name) || lowerTitle.includes(name.toLowerCase())) {
				return true;
			}
		}
		
		// Также проверяем части названия
		const words = title.split(/[\s\-_.,:;]/);
		for (const word of words) {
			if (word === '呪術' || word === '廻戦' || word === '回戦') {
				return true;
			}
		}
		
		return false;
	}

	// Главная функция для Jujutsu Kaisen
	async function processJujutsuKaisenDirectly(videoParams, episodeNumber) {
		const JUJUTSU_KAISEN_MAL_ID = 40748;
		
		// Всегда показываем эту информацию
		log(`FORCING Jujutsu Kaisen for episode ${episodeNumber}`);
		
		// Получаем сегменты
		const segments = await getSkipTimes(JUJUTSU_KAISEN_MAL_ID, episodeNumber);
		
		if (segments.length > 0) {
			const added = addSegmentsToItem(videoParams, segments);
			
			if (added > 0) {
				log(`✅ SUCCESS: Added ${added} skip segments for Jujutsu Kaisen episode ${episodeNumber}`);
				
				// Показываем уведомление
				if (Lampa.Noty) {
					Lampa.Noty.show(`Добавлено ${added} меток пропуска для эпизода ${episodeNumber}`);
				}
				
				// Обновляем плеер
				if (Lampa.Player.listener) {
					Lampa.Player.listener.send("segments", { skip: videoParams.segments.skip });
				}
				
				return true;
			}
		} else {
			log(`⚠️ No skip times found for episode ${episodeNumber}`);
		}
		
		return false;
	}

	// Получение сегментов пропуска
	async function getSkipTimes(malId, episode) {
		if (!malId || !episode) return [];
		
		// Кэширование
		const cacheKey = `jjk_skip_${malId}_${episode}`;
		try {
			const cached = localStorage.getItem(cacheKey);
			if (cached) {
				const data = JSON.parse(cached);
				if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
					log(`Using cached skip times for episode ${episode}`);
					return data.segments;
				}
			}
		} catch (e) {}
		
		log(`Requesting skip times for MAL ID ${malId}, episode ${episode}`);
		
		try {
			const types = SKIP_TYPES.map(t => `types[]=${t}`).join("&");
			const url = `${ANISKIP_API}/${malId}/${episode}?${types}&episodeLength=0`;
			
			const response = await fetch(url, {
				headers: { "Accept": "application/json" }
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
						name: name
					};
				}).filter(seg => seg.start && seg.end);
				
				// Сохраняем в кэш
				try {
					localStorage.setItem(cacheKey, JSON.stringify({
						segments: segments,
						timestamp: Date.now()
					}));
				} catch (e) {}
				
				log(`Found ${segments.length} skip segments`);
				return segments;
			}
			
			return [];
			
		} catch (error) {
			log(`AniSkip request error: ${error.message}`);
			return [];
		}
	}

	// Определяем номер эпизода
	function extractEpisodeNumber(videoParams) {
		// Пробуем разные источники
		if (videoParams.episode || videoParams.e || videoParams.episode_number) {
			const ep = videoParams.episode || videoParams.e || videoParams.episode_number;
			return parseInt(ep) || 1;
		}
		
		// Из плейлиста
		if (videoParams.playlist && videoParams.url) {
			const index = videoParams.playlist.findIndex(p => p.url === videoParams.url);
			if (index !== -1) return index + 1;
		}
		
		// По умолчанию
		return 1;
	}

	// Основная функция
	async function processVideo(videoParams) {
		try {
			// Определяем номер эпизода
			const episode = extractEpisodeNumber(videoParams);
			
			// ВАЖНО: всегда пробуем обработать как Jujutsu Kaisen
			// независимо от названия в логах
			log(`Starting process for episode ${episode}`);
			
			// Пробуем получить информацию о карточке
			let cardInfo = null;
			try {
				// Пробуем разные способы получить карточку
				if (videoParams.card) cardInfo = videoParams.card;
				else if (videoParams.movie) cardInfo = videoParams.movie;
				else {
					const active = Lampa.Activity.active();
					cardInfo = active?.card || active?.movie;
				}
			} catch (e) {}
			
			if (cardInfo) {
				const title = cardInfo.title || cardInfo.original_title || cardInfo.original_name || "";
				log(`Card title: "${title}"`);
				
				// Проверяем, Jujutsu Kaisen ли это
				if (isJujutsuKaisenTitle(title)) {
					log(`Confirmed Jujutsu Kaisen by title: "${title}"`);
				} else {
					log(`Title doesn't match JJK: "${title}"`);
				}
			} else {
				log("No card info available");
			}
			
			// ВСЕГДА пробуем обработать как Jujutsu Kaisen
			// для эпизодов 1-24 (первый сезон)
			if (episode >= 1 && episode <= 24) {
				log(`Trying Jujutsu Kaisen for episode ${episode}`);
				await processJujutsuKaisenDirectly(videoParams, episode);
			} else {
				log(`Episode ${episode} outside JJK S1 range, skipping`);
			}
			
		} catch (error) {
			log(`Error: ${error.message}`);
		}
	}

	// Инициализация
	function init() {
		if (window.lampa_jjk_final) return;
		window.lampa_jjk_final = true;
		
		const originalPlay = Lampa.Player.play;
		
		Lampa.Player.play = function (videoParams) {
			// Запускаем обработку
			setTimeout(() => {
				processVideo(videoParams);
			}, 2000); // Даем больше времени на загрузку
			
			return originalPlay.call(this, videoParams);
		};
		
		log("Jujutsu Kaisen AniSkip FINAL plugin initialized");
		
		// Глобальные методы для отладки
		window.JJKSkip = {
			test: (episode) => {
				const active = Lampa.Activity.active();
				if (active?.videoParams) {
					processJujutsuKaisenDirectly(active.videoParams, episode || 1);
				} else {
					log("No active video params");
				}
			},
			clearCache: () => {
				const keys = [];
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key.startsWith("jjk_skip_")) {
						keys.push(key);
					}
				}
				keys.forEach(key => localStorage.removeItem(key));
				log("JJK cache cleared");
			},
			forceEpisode: (episode) => {
				log(`Manually forcing episode ${episode}`);
				const active = Lampa.Activity.active();
				if (active?.videoParams) {
					processVideo(active.videoParams);
				}
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
