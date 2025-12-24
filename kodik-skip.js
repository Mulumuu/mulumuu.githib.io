(function () {
	"use strict";

	const ANISKIP_API = "https://api.aniskip.com/v2/skip-times";
	const SKIP_TYPES = ["op", "ed", "recap"];
	const JUJUTSU_KAISEN_MAL_ID = 40748;

	function log(message) {
		console.log("[AniSkip-JJK-FINAL]: " + message);
	}

	// Ключевая функция: правильная инъекция сегментов
	function injectSkipSegments(videoParams, segments) {
		if (!segments || segments.length === 0) {
			log("No segments to inject");
			return false;
		}
		
		log(`Injecting ${segments.length} segments`);
		
		try {
			// ========== МЕТОД 1: Через videoParams (основной) ==========
			if (videoParams) {
				// Очищаем старые сегменты
				videoParams.segments = videoParams.segments || {};
				videoParams.segments.skip = segments;
				
				log("✓ Segments added to videoParams");
				
				// Дополнительно: обновляем в Activity
				const activity = Lampa.Activity.active();
				if (activity && activity.videoParams) {
					activity.videoParams.segments = activity.videoParams.segments || {};
					activity.videoParams.segments.skip = segments;
					log("✓ Segments updated in Activity");
				}
			}
			
			// ========== МЕТОД 2: Через Player.listener ==========
			if (Lampa.Player && Lampa.Player.listener) {
				try {
					// Отправляем сегменты через listener
					Lampa.Player.listener.send("segments", { 
						skip: segments,
						type: "skip"
					});
					log("✓ Segments sent via Player.listener");
				} catch (e) {
					log(`Player.listener error: ${e.message}`);
				}
			}
			
			// ========== МЕТОД 3: Прямой доступ к видеоплееру ==========
			try {
				// Ищем видеоплеер в DOM
				const videoElement = document.querySelector('video');
				if (videoElement) {
					// Добавляем сегменты как свойство
					videoElement._skipSegments = segments;
					
					// Создаем событие для обновления интерфейса
					const event = new CustomEvent('skipSegmentsUpdated', {
						detail: { segments: segments }
					});
					videoElement.dispatchEvent(event);
					
					log("✓ Segments attached to video element");
				}
			} catch (e) {
				log(`Video element error: ${e.message}`);
			}
			
			// ========== МЕТОД 4: Через глобальное событие ==========
			try {
				window.dispatchEvent(new CustomEvent('aniskip-segments-loaded', {
					detail: {
						segments: segments,
						source: 'jjk-plugin',
						timestamp: Date.now()
					}
				}));
				log("✓ Global event dispatched");
			} catch (e) {
				log(`Global event error: ${e.message}`);
			}
			
			// ========== МЕТОД 5: Через Timeline API (если есть) ==========
			if (window.Lampa && Lampa.Timeline) {
				try {
					// Очищаем старые метки
					Lampa.Timeline.clear();
					
					// Добавляем новые
					segments.forEach(seg => {
						Lampa.Timeline.add({
							time: seg.start,
							duration: seg.end - seg.start,
							title: seg.name,
							type: "skip",
							color: seg.type === "op" ? "#FF6B6B" : "#4ECDC4"
						});
					});
					log("✓ Segments added via Timeline API");
				} catch (e) {
					log(`Timeline API error: ${e.message}`);
				}
			}
			
			// ========== МЕТОД 6: Обновление интерфейса вручную ==========
			try {
				// Ищем элементы интерфейса Lampa
				setTimeout(() => {
					// Попробуем найти кнопки сегментов
					const timeline = document.querySelector('.player__timeline, .timeline');
					if (timeline) {
						// Помечаем, что сегменты загружены
						timeline.dataset.skipSegments = 'loaded';
						log("✓ Timeline marked with skip segments");
					}
				}, 1000);
			} catch (e) {
				log(`UI update error: ${e.message}`);
			}
			
			// ========== Уведомление пользователя ==========
			if (Lampa.Noty) {
				try {
					Lampa.Noty.show(`🎬 Добавлено ${segments.length} меток пропуска`);
					log("✓ Notification shown");
				} catch (e) {
					log(`Noty error: ${e.message}`);
				}
			}
			
			// Сохраняем для отладки
			window._lastInjectedSegments = {
				segments: segments,
				timestamp: Date.now(),
				videoParams: videoParams
			};
			
			log("✅ All injection methods attempted");
			return true;
			
		} catch (error) {
			log(`❌ Critical injection error: ${error.message}`);
			return false;
		}
	}

	// Получение сегментов из AniSkip
	async function getSkipTimes(episode) {
		if (!episode || episode < 1) return [];
		
		// Кэширование
		const cacheKey = `jjk_skip_${JUJUTSU_KAISEN_MAL_ID}_${episode}`;
		try {
			const cached = localStorage.getItem(cacheKey);
			if (cached) {
				const data = JSON.parse(cached);
				if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
					log(`Using cached segments for episode ${episode}`);
					return data.segments;
				}
			}
		} catch (e) {}
		
		log(`Requesting skip times for episode ${episode}`);
		
		try {
			const types = SKIP_TYPES.map(t => `types[]=${t}`).join("&");
			const url = `${ANISKIP_API}/${JUJUTSU_KAISEN_MAL_ID}/${episode}?${types}&episodeLength=0`;
			
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
		
		// По умолчанию
		return 1;
	}

	// Проверяем Jujutsu Kaisen по названию
	function isJujutsuKaisen(title) {
		if (!title) return false;
		
		const lowerTitle = title.toLowerCase();
		const jjkNames = [
			'магическая битва', 'магическая', 'битва',
			'jujutsu kaisen', 'jujutsu', 'kaisen', 'jjk',
			'呪術廻戦', '呪術回戦', 'じゅじゅつかいせん'
		];
		
		return jjkNames.some(name => 
			title.includes(name) || lowerTitle.includes(name.toLowerCase())
		);
	}

	// Основная функция обработки
	async function processVideo(videoParams) {
		try {
			// Определяем номер эпизода
			const episode = extractEpisodeNumber(videoParams);
			log(`Processing episode ${episode}`);
			
			// Проверяем название
			let title = "";
			if (videoParams.card) title = videoParams.card.title || "";
			else if (videoParams.movie) title = videoParams.movie.title || "";
			
			if (title) {
				log(`Video title: "${title}"`);
				if (!isJujutsuKaisen(title)) {
					log("Not Jujutsu Kaisen, skipping");
					return;
				}
			}
			
			// Получаем сегменты
			const segments = await getSkipTimes(episode);
			
			if (segments.length > 0) {
				// Инъекция сегментов
				const success = injectSkipSegments(videoParams, segments);
				
				if (success) {
					log(`✅ SUCCESS: ${segments.length} segments injected`);
					
					// Дополнительно: повторная попытка через 3 секунды
					setTimeout(() => {
						log("Retrying injection after delay...");
						injectSkipSegments(videoParams, segments);
					}, 3000);
					
				} else {
					log(`⚠️ Injection may have failed`);
				}
			} else {
				log(`No skip segments found for episode ${episode}`);
			}
			
		} catch (error) {
			log(`Processing error: ${error.message}`);
		}
	}

	// Инициализация плагина
	function initPlugin() {
		if (window.lampa_jjk_plugin_loaded) return;
		window.lampa_jjk_plugin_loaded = true;
		
		log("Initializing Jujutsu Kaisen Skip Plugin");
		
		// ========== СПОСОБ 1: Перехват Player.play ==========
		if (Lampa.Player && Lampa.Player.play) {
			const originalPlay = Lampa.Player.play;
			
			Lampa.Player.play = function (videoParams) {
				log("Player.play intercepted");
				
				// Вызываем оригинальный метод
				const result = originalPlay.call(this, videoParams);
				
				// Запускаем обработку
				setTimeout(() => {
					processVideo(videoParams);
				}, 1500);
				
				return result;
			};
			
			log("✓ Player.play interception successful");
		}
		
		// ========== СПОСОБ 2: Мониторинг изменений ==========
		let lastProcessedUrl = "";
		
		function monitorPlayer() {
			try {
				const activity = Lampa.Activity.active();
				if (activity && activity.videoParams) {
					const currentUrl = activity.videoParams.url || "";
					if (currentUrl && currentUrl !== lastProcessedUrl) {
						log(`New video detected: ${currentUrl.substring(0, 50)}...`);
						lastProcessedUrl = currentUrl;
						
						setTimeout(() => {
							processVideo(activity.videoParams);
						}, 2000);
					}
				}
			} catch (e) {}
		}
		
		// Запускаем мониторинг
		setInterval(monitorPlayer, 3000);
		
		// ========== Отладочные функции ==========
		window.JJKSkip = {
			// Принудительная инъекция
			inject: (episode) => {
				log(`Manual injection for episode ${episode || 1}`);
				getSkipTimes(episode || 1).then(segments => {
					const activity = Lampa.Activity.active();
					if (activity?.videoParams) {
						injectSkipSegments(activity.videoParams, segments);
					}
				});
			},
			
			// Тестовые сегменты
			test: () => {
				const testSegments = [
					{ start: 85, end: 105, name: "Тест опенинг", type: "op" },
					{ start: 1320, end: 1340, name: "Тест эндинг", type: "ed" }
				];
				
				const activity = Lampa.Activity.active();
				if (activity?.videoParams) {
					injectSkipSegments(activity.videoParams, testSegments);
				}
			},
			
			// Проверка API
			checkAPI: () => {
				log("=== Lampa API Check ===");
				log(`Lampa.Player: ${!!Lampa.Player}`);
				log(`Lampa.Player.listener: ${!!Lampa.Player?.listener}`);
				log(`Lampa.Activity: ${!!Lampa.Activity}`);
				log(`Lampa.Activity.active(): ${!!Lampa.Activity?.active()}`);
				log(`Lampa.Noty: ${!!Lampa.Noty}`);
				log(`Lampa.Timeline: ${!!Lampa.Timeline}`);
				
				// Проверяем методы Player
				if (Lampa.Player) {
					const methods = Object.keys(Lampa.Player).filter(k => typeof Lampa.Player[k] === 'function');
					log(`Player methods: ${methods.join(', ')}`);
				}
			},
			
			// Очистка кэша
			clearCache: () => {
				const keys = [];
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key.startsWith("jjk_skip_")) {
						keys.push(key);
					}
				}
				keys.forEach(key => localStorage.removeItem(key));
				log("Cache cleared");
			},
			
			// Проверка сегментов
			checkSegments: () => {
				const activity = Lampa.Activity.active();
				if (activity?.videoParams?.segments?.skip) {
					log(`Current segments: ${JSON.stringify(activity.videoParams.segments.skip)}`);
				} else {
					log("No segments in videoParams");
				}
			}
		};
		
		log("✅ Jujutsu Kaisen Skip Plugin ready");
	}

	// Запуск плагина
	if (window.Lampa && window.Lampa.Player) {
		// Ждем полной загрузки Lampa
		setTimeout(initPlugin, 3000);
	} else {
		window.addEventListener('app_ready', () => {
			setTimeout(initPlugin, 3000);
		});
	}

})();
