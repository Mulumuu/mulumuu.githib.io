(function () {
	"use strict";

	const ANISKIP_API = "https://api.aniskip.com/v2/skip-times";
	const SKIP_TYPES = ["op", "ed", "recap"];

	function log(message) {
		console.log("[AniSkip-JJK-FIXED]: " + message);
	}

	// Ключевая функция: добавляет сегменты в Lampa
	function injectSkipSegments(videoParams, segments) {
		if (!segments || segments.length === 0) return false;
		
		log(`Injecting ${segments.length} segments to player`);
		
		try {
			// Метод 1: Прямая инъекция в videoParams (работает в большинстве случаев)
			if (videoParams) {
				// Создаем объект segments если его нет
				videoParams.segments = videoParams.segments || {};
				videoParams.segments.skip = segments;
				
				log("Segments added to videoParams");
			}
			
			// Метод 2: Используем Lampa Player API для отправки сегментов
			// Это основной метод, который должен работать
			if (window.Lampa && Lampa.Player) {
				// Вариант A: Через listener (если доступен)
				if (Lampa.Player.listener) {
					Lampa.Player.listener.send("segments", { 
						skip: segments,
						type: "skip"
					});
					log("Segments sent via Player.listener");
				}
				
				// Вариант B: Прямое обновление активного плеера
				const player = Lampa.Player.active();
				if (player && player.segments) {
					player.segments.skip = segments;
					log("Segments updated in active player");
				}
				
				// Вариант C: Глобальное событие
				window.dispatchEvent(new CustomEvent('player-segments-update', {
					detail: { segments: segments }
				}));
				
				// Вариант D: Обновление через Activity
				const activity = Lampa.Activity.active();
				if (activity && activity.videoParams) {
					activity.videoParams.segments = activity.videoParams.segments || {};
					activity.videoParams.segments.skip = segments;
					log("Segments updated in activity");
				}
			}
			
			// Метод 3: Используем существующий API для меток времени
			// Проверяем, есть ли плагин меток времени
			if (window.Lampa && Lampa.Timeline) {
				try {
					// Добавляем сегменты как временные метки
					segments.forEach(segment => {
						Lampa.Timeline.add({
							time: segment.start,
							duration: segment.end - segment.start,
							title: segment.name,
							type: "skip"
						});
					});
					log("Segments added via Timeline API");
				} catch (e) {
					log("Timeline API error: " + e.message);
				}
			}
			
			// Метод 4: Используем DOM события (работает с большинством плееров)
			try {
				// Создаем событие для видеоплеера
				const videoElement = document.querySelector('video');
				if (videoElement) {
					const event = new CustomEvent('segmentsloaded', {
						detail: {
							segments: segments,
							type: 'skip'
						}
					});
					videoElement.dispatchEvent(event);
					log("DOM event dispatched to video element");
				}
			} catch (e) {
				log("DOM event error: " + e.message);
			}
			
			// Показываем уведомление пользователю
			if (Lampa.Noty) {
				Lampa.Noty.show(`Добавлено ${segments.length} меток пропуска`);
			}
			
			return true;
			
		} catch (error) {
			log("Error injecting segments: " + error.message);
			return false;
		}
	}

	// Проверяем все варианты названий Jujutsu Kaisen
	function isJujutsuKaisenTitle(title) {
		if (!title) return false;
		
		const lowerTitle = title.toLowerCase();
		const jjkNames = [
			'jujutsu kaisen', 'jujutsu', 'kaisen', 'jjk',
			'магическая битва', 'магическая', 'битва', 'джуцзу кайсен',
			'呪術廻戦', '呪術回戦', 'じゅじゅつかいせん', 'じゅつかいせん',
			'咒术回战', '呪術迴戰'
		];
		
		for (const name of jjkNames) {
			if (title.includes(name) || lowerTitle.includes(name.toLowerCase())) {
				return true;
			}
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
				headers: { 
					"Accept": "application/json",
					"User-Agent": "LampaAnimeSkip/2.0"
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
						type: type,
						color: type.includes("op") ? "#FF6B6B" : 
							   type.includes("ed") ? "#4ECDC4" : "#FFD166"
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
		
		// Из названия
		const title = videoParams.title || "";
		const epMatch = title.match(/(\d+)/);
		if (epMatch) return parseInt(epMatch[1]);
		
		return 1;
	}

	// Главная функция обработки
	async function processJujutsuKaisen(videoParams, episodeNumber) {
		const JUJUTSU_KAISEN_MAL_ID = 40748;
		
		log(`Processing Jujutsu Kaisen episode ${episodeNumber}`);
		
		// Получаем сегменты
		const segments = await getSkipTimes(JUJUTSU_KAISEN_MAL_ID, episodeNumber);
		
		if (segments.length > 0) {
			// Ключевое изменение: используем новую функцию инъекции
			const success = injectSkipSegments(videoParams, segments);
			
			if (success) {
				log(`✅ SUCCESS: ${segments.length} skip segments injected`);
				
				// Дополнительно: сохраняем сегменты для других вызовов
				window._lastSkipSegments = {
					segments: segments,
					timestamp: Date.now(),
					episode: episodeNumber
				};
				
				return true;
			} else {
				log(`❌ FAILED: Could not inject segments`);
			}
		} else {
			log(`⚠️ No skip times found for episode ${episodeNumber}`);
		}
		
		return false;
	}

	// Основная функция
	async function processVideo(videoParams) {
		try {
			// Определяем номер эпизода
			const episode = extractEpisodeNumber(videoParams);
			log(`Starting process for episode ${episode}`);
			
			// Проверяем карточку
			let cardInfo = null;
			try {
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
				
				if (isJujutsuKaisenTitle(title)) {
					log(`Confirmed Jujutsu Kaisen by title: "${title}"`);
				}
			}
			
			// Обрабатываем как Jujutsu Kaisen для эпизодов 1-24
			if (episode >= 1 && episode <= 24) {
				log(`Trying Jujutsu Kaisen for episode ${episode}`);
				await processJujutsuKaisen(videoParams, episode);
			} else {
				log(`Episode ${episode} outside JJK S1 range, skipping`);
			}
			
		} catch (error) {
			log(`Error: ${error.message}`);
		}
	}

	// Инициализация с правильным перехватом
	function init() {
		if (window.lampa_jjk_injected) return;
		window.lampa_jjk_injected = true;
		
		log("Jujutsu Kaisen Skip Plugin INIT");
		
		// Вариант 1: Перехват Player.play (как в оригинальном скрипте)
		if (Lampa.Player && Lampa.Player.play) {
			const originalPlay = Lampa.Player.play;
			
			Lampa.Player.play = function (videoParams) {
				log("Player.play intercepted");
				
				// Запускаем обработку после небольшой задержки
				setTimeout(() => {
					processVideo(videoParams);
				}, 1000);
				
				// Вызываем оригинальный метод
				return originalPlay.call(this, videoParams);
			};
			
			log("Player.play interception successful");
		}
		
		// Вариант 2: Слушаем события плеера
		document.addEventListener('player-video-start', function (e) {
			log("Player video start event");
			if (e.detail && e.detail.params) {
				setTimeout(() => {
					processVideo(e.detail.params);
				}, 1500);
			}
		});
		
		// Вариант 3: Периодическая проверка активного видео
		let checkInterval = null;
		let lastProcessedUrl = '';
		
		function checkActiveVideo() {
			try {
				const activity = Lampa.Activity.active();
				if (activity && activity.videoParams) {
					const currentUrl = activity.videoParams.url || '';
					if (currentUrl && currentUrl !== lastProcessedUrl) {
						log(`New video detected: ${currentUrl.substring(0, 50)}...`);
						lastProcessedUrl = currentUrl;
						processVideo(activity.videoParams);
					}
				}
			} catch (e) {}
		}
		
		// Запускаем проверку каждые 3 секунды
		checkInterval = setInterval(checkActiveVideo, 3000);
		
		// Глобальные методы для отладки
		window.JJKSkipDebug = {
			injectTestSegments: () => {
				const testSegments = [
					{ start: 85, end: 105, name: "Опенинг", type: "op" },
					{ start: 1320, end: 1340, name: "Эндинг", type: "ed" }
				];
				
				const activity = Lampa.Activity.active();
				if (activity?.videoParams) {
					const success = injectSkipSegments(activity.videoParams, testSegments);
					log(`Test injection: ${success ? 'SUCCESS' : 'FAILED'}`);
				} else {
					log("No active video for test");
				}
			},
			
			forceInject: (episode) => {
				const activity = Lampa.Activity.active();
				if (activity?.videoParams) {
					processJujutsuKaisen(activity.videoParams, episode || 1);
				}
			},
			
			checkPlayerAPI: () => {
				log("=== Lampa Player API Check ===");
				log(`Lampa.Player: ${!!Lampa.Player}`);
				log(`Lampa.Player.listener: ${!!Lampa.Player?.listener}`);
				log(`Lampa.Player.active(): ${!!Lampa.Player?.active()}`);
				log(`Lampa.Activity.active(): ${!!Lampa.Activity?.active()}`);
				
				const activity = Lampa.Activity.active();
				if (activity?.videoParams) {
					log(`VideoParams segments: ${!!activity.videoParams.segments}`);
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
			}
		};
		
		log("✅ Jujutsu Kaisen Skip Plugin fully initialized");
	}

	// Запускаем когда Lampa готова
	if (window.Lampa && window.Lampa.Player) {
		setTimeout(init, 2000); // Даем время на полную загрузку
	} else {
		window.document.addEventListener("app_ready", function () {
			setTimeout(init, 2000);
		});
	}

})();
