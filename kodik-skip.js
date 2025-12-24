(function () {
	"use strict";

	const ANISKIP_API = "https://api.aniskip.com/v2/skip-times";
	const SHIKIMORI_API = "https://shikimori.me/api/animes";
	const SKIP_TYPES = ["op", "ed", "recap"];

	function log(message, showNotify = false) {
		console.log("[UltimateSkip-Shikimori]: " + message);
		if (showNotify && typeof Lampa !== "undefined" && Lampa.Noty) {
		}
	}

	function addSegmentsToItem(item, newSegments) {
		if (!item || typeof item !== "object") return 0;

		item.segments = item.segments || {};
		item.segments.skip = item.segments.skip || [];

		let count = 0;
		newSegments.forEach((newSeg) => {
			const exists = item.segments.skip.some((s) => s.start === newSeg.start);
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

	function updatePlaylist(playlist, currentSeason, currentEpisode, segments) {
		if (playlist && Array.isArray(playlist)) {
			playlist.forEach((item, index) => {
				const itemSeason = item.season || item.s || currentSeason;
				const itemEpisode = item.episode || item.e || item.episode_number || index + 1;

				if (parseInt(itemEpisode) === parseInt(currentEpisode) && parseInt(itemSeason) === parseInt(currentSeason)) {
					addSegmentsToItem(item, segments);
				}
			});
		}
	}

	// Основная функция для получения shikimoriId
	async function getShikimoriId(card, season) {
		// Пробуем разные источники shikimoriId
		const possibleIds = [
			card.shikimori_id,
			card.shikimoriId,
			card.shikimori,
			card.external_ids?.shikimori,
			card.external_ids?.shikimori_id
		];

		let shikimoriId = possibleIds.find(id => id && !isNaN(parseInt(id)));
		
		if (shikimoriId) {
			log(`Found shikimoriId in metadata: ${shikimoriId}`);
			return parseInt(shikimoriId);
		}

		// Если нет в метаданных, пробуем поискать через Shikimori API
		log("Shikimori ID not found in metadata, searching via API...");
		
		const cleanName = card.original_name || card.original_title || card.name || card.title;
		if (!cleanName) return null;

		const searchQuery = cleanName
			.replace(/\(\d{4}\)/g, "")
			.replace(/\(TV\)/gi, "")
			.replace(/Season \d+/gi, "")
			.replace(/Part \d+/gi, "")
			.replace(/[:\-]/g, " ")
			.replace(/\s+/g, " ")
			.trim();

		try {
			const url = `${SHIKIMORI_API}?search=${encodeURIComponent(searchQuery)}&limit=5`;
			log(`Searching Shikimori for: ${searchQuery}`);
			
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'LampaAnimeSkip/1.0'
				}
			});
			
			if (!response.ok) {
				log(`Shikimori API error: ${response.status}`);
				return null;
			}
			
			const results = await response.json();
			
			if (!results || results.length === 0) {
				log("No results found on Shikimori");
				return null;
			}
			
			// Если несколько сезонов, пытаемся определить правильный
			if (season > 1) {
				const seasonKeywords = [
					`${season} сезон`,
					`Season ${season}`,
					`${season}nd Season`,
					`${season}rd Season`,
					`${season}th Season`
				];
				
				for (const anime of results) {
					const russianName = anime.russian || "";
					const englishName = anime.name || "";
					
					for (const keyword of seasonKeywords) {
						if (russianName.includes(keyword) || englishName.includes(keyword)) {
							log(`Found season ${season} match: ${anime.name} (ID: ${anime.id})`);
							return anime.id;
						}
					}
				}
			}
			
			// Берем первый результат
			const firstResult = results[0];
			log(`Selected first result: ${firstResult.name} (ID: ${firstResult.id})`);
			return firstResult.id;
			
		} catch (error) {
			log(`Shikimori search error: ${error.message}`);
			return null;
		}
	}

	// Получение сегментов пропуска через AniSkip с shikimoriId
	async function getSkipSegments(shikimoriId, episode) {
		if (!shikimoriId || !episode) {
			log("Missing shikimoriId or episode number");
			return [];
		}

		const types = SKIP_TYPES.map((t) => "types[]=" + t).join("&");
		const url = `${ANISKIP_API}/${shikimoriId}/${episode}?${types}&episodeLength=0`;
		
		log(`Requesting AniSkip for shikimoriId ${shikimoriId}, episode ${episode}`);
		
		try {
			const response = await fetch(url, {
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'LampaAnimeSkip/1.0'
				}
			});
			
			if (response.status === 404) {
				log(`No skip times found for episode ${episode}`);
				return [];
			}
			
			if (!response.ok) {
				log(`AniSkip API error: ${response.status}`);
				return [];
			}
			
			const data = await response.json();
			
			if (data.found && data.results && data.results.length > 0) {
				log(`Found ${data.results.length} skip segments`);
				return data.results;
			}
			
			return [];
			
		} catch (error) {
			log(`AniSkip request error: ${error.message}`);
			return [];
		}
	}

	async function searchAndApply(videoParams) {
		let card = videoParams.movie || videoParams.card;
		if (!card) {
			const active = Lampa.Activity.active();
			if (active) card = active.movie || active.card;
		}
		if (!card) return;

		const position = (function (params, defaultSeason = 1) {
			if (params.episode || params.e || params.episode_number) {
				return {
					season: parseInt(params.season || params.s || defaultSeason),
					episode: parseInt(params.episode || params.e || params.episode_number),
				};
			}
			if (params.playlist && Array.isArray(params.playlist)) {
				const url = params.url;
				const index = params.playlist.findIndex((p) => p.url && p.url === url);
				if (index !== -1) {
					const item = params.playlist[index];
					return {
						season: parseInt(item.season || item.s || defaultSeason),
						episode: index + 1,
					};
				}
			}
			return { season: defaultSeason, episode: 1 };
		})(videoParams, 1);

		let episode = position.episode;
		let season = position.season;

		// Проверяем, является ли контент аниме
		const lang = (card.original_language || "").toLowerCase();
		const isAsian = lang === "ja" || lang === "zh" || lang === "cn" || lang === "ko";
		const isAnimation = card.genres && card.genres.some((g) => 
			g.id === 16 || 
			(g.name && g.name.toLowerCase().includes("аниме")) ||
			(g.name && g.name.toLowerCase().includes("anime"))
		);

		if (isAsian || isAnimation) {
			log(`Anime detected: ${card.title} (S${season} E${episode})`);
			
			// Получаем shikimoriId
			const shikimoriId = await getShikimoriId(card, season);
			
			if (shikimoriId) {
				// Получаем сегменты пропуска
				const segmentsData = await getSkipSegments(shikimoriId, episode);
				
				// Преобразуем данные в нужный формат
				const finalSegments = segmentsData.map((segment) => {
					const type = (segment.skipType || segment.skip_type || "").toLowerCase();
					let name = "Пропустить";
					
					if (type.includes("op")) name = "Опенинг";
					else if (type.includes("ed")) name = "Эндинг";
					else if (type === "recap") name = "Рекап";
					
					const start = segment.interval.startTime !== undefined ? segment.interval.startTime : segment.interval.start_time;
					const end = segment.interval.endTime !== undefined ? segment.interval.endTime : segment.interval.end_time;
					
					return { start, end, name };
				}).filter(segment => segment.start !== undefined && segment.end !== undefined);
				
				// Добавляем сегменты если найдены
				if (finalSegments.length > 0) {
					const added = addSegmentsToItem(videoParams, finalSegments);
					updatePlaylist(videoParams.playlist, season, episode, finalSegments);
					
					if (added > 0) {
						Lampa.Noty.show(`Загружено ${added} таймкодов для серии ${episode}`);
						
						// Обновляем плеер
						if (window.Lampa.Player.listener) {
							window.Lampa.Player.listener.send("segments", { skip: videoParams.segments.skip });
						}
						
						log(`Successfully added ${added} skip segments`);
					}
				} else {
					log("No skip segments found for this episode");
				}
			} else {
				log("Could not determine shikimoriId for this anime");
			}
		} else {
			log("Content is not anime, skipping");
		}
	}

	function init() {
		if (window.lampa_ultimate_skip_shikimori) return;
		window.lampa_ultimate_skip_shikimori = true;

		const originalPlay = Lampa.Player.play;

		Lampa.Player.play = function (videoParams) {
			const context = this;
			
			// Запускаем поиск сегментов асинхронно
			searchAndApply(videoParams)
				.finally(() => {
					// Всегда воспроизводим видео
					originalPlay.call(context, videoParams);
				});
		};
		
		log("Shikimori AniSkip Plugin Loaded");
	}

	// Инициализация
	if (window.Lampa && window.Lampa.Player) {
		init();
	} else {
		window.document.addEventListener("app_ready", init);
	}
})();
