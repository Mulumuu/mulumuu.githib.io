(function() {
    'use strict';
    
    console.log('Добавление эффекта дыма в Lampa...');
    
    // Находим контейнер фона
    const background = document.querySelector('.background');
    if (!background) {
        console.error('Контейнер фона не найден!');
        return;
    }
    
    // Создаем отдельный canvas для дыма
    const smokeCanvas = document.createElement('canvas');
    smokeCanvas.className = 'background__smoke';
    smokeCanvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        opacity: 0.6;
        pointer-events: none;
    `;
    
    // Вставляем перед существующими canvas
    background.insertBefore(smokeCanvas, background.firstChild);
    
    const ctx = smokeCanvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    smokeCanvas.width = width;
    smokeCanvas.height = height;
    
    // Параметры дыма
    const smokeParticles = [];
    const PARTICLE_COUNT = 35;
    const SMOKE_COLORS = [
        'rgba(45, 45, 45, ',  // Темный серый
        'rgba(60, 60, 60, ',  // Серый
        'rgba(75, 75, 75, ',  // Светло-серый
        'rgba(35, 35, 35, '   // Очень темный
    ];
    
    // Инициализация частиц
    function initParticles() {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            smokeParticles.push({
                x: Math.random() * width,
                y: height + Math.random() * 300,
                size: 80 + Math.random() * 180,
                speed: 0.15 + Math.random() * 0.35,
                opacity: 0.04 + Math.random() * 0.08,
                drift: (Math.random() - 0.5) * 1.5,
                color: SMOKE_COLORS[Math.floor(Math.random() * SMOKE_COLORS.length)],
                wave: Math.random() * Math.PI * 2,
                waveSpeed: 0.01 + Math.random() * 0.02,
                turbulence: Math.random() * 0.1
            });
        }
    }
    
    // Отрисовка кадра
    function render() {
        // Плавное затухание предыдущего кадра
        ctx.fillStyle = 'rgba(29, 31, 32, 0.05)';
        ctx.fillRect(0, 0, width, height);
        
        // Обновляем и рисуем каждую частицу
        smokeParticles.forEach(particle => {
            // Волнистое движение
            particle.wave += particle.waveSpeed;
            const waveOffset = Math.sin(particle.wave) * particle.turbulence * 20;
            
            // Обновление позиции
            particle.x += particle.drift * 0.03 + waveOffset * 0.1;
            particle.y -= particle.speed;
            
            // Легкие изменения параметров
            particle.drift += (Math.random() - 0.5) * 0.02;
            particle.size += (Math.random() - 0.5) * 0.2;
            particle.size = Math.max(60, Math.min(220, particle.size));
            
            // Перерождение частицы внизу
            if (particle.y < -particle.size * 2) {
                particle.x = Math.random() * width;
                particle.y = height + Math.random() * 100;
                particle.size = 80 + Math.random() * 180;
                particle.color = SMOKE_COLORS[Math.floor(Math.random() * SMOKE_COLORS.length)];
            }
            
            // Создаем градиент для частицы дыма
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );
            
            const opacityVariation = particle.opacity * (0.8 + Math.sin(Date.now() * 0.001 + particle.x) * 0.2);
            gradient.addColorStop(0, particle.color + opacityVariation + ')');
            gradient.addColorStop(0.4, particle.color + (opacityVariation * 0.6) + ')');
            gradient.addColorStop(0.8, particle.color + (opacityVariation * 0.2) + ')');
            gradient.addColorStop(1, particle.color + '0)');
            
            // Применяем размытие
            ctx.save();
            ctx.filter = `blur(${Math.max(15, particle.size / 6)}px)`;
            ctx.globalCompositeOperation = 'lighter';
            
            // Рисуем частицу
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.restore();
        });
        
        requestAnimationFrame(render);
    }
    
    // Обработка изменения размера окна
    function handleResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        smokeCanvas.width = width;
        smokeCanvas.height = height;
        
        // Перераспределяем частицы
        smokeParticles.forEach(particle => {
            if (particle.x > width) particle.x = Math.random() * width;
            if (particle.y > height) particle.y = Math.random() * height;
        });
    }
    
    // Оптимизация при скрытии вкладки
    let animationFrame;
    function animate() {
        render();
        animationFrame = requestAnimationFrame(animate);
    }
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationFrame);
        } else {
            animate();
        }
    });
    
    // Инициализация
    initParticles();
    window.addEventListener('resize', handleResize);
    animate();
    
    console.log('✅ Эффект дыма успешно добавлен!');
    
    // Команды для управления из консоли
    window.smokeEffect = {
        setOpacity: function(value) {
            smokeCanvas.style.opacity = value;
            console.log('Прозрачность дыма изменена на:', value);
        },
        setParticleCount: function(count) {
            smokeParticles.length = 0;
            for (let i = 0; i < count; i++) {
                smokeParticles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: 80 + Math.random() * 180,
                    speed: 0.15 + Math.random() * 0.35,
                    opacity: 0.04 + Math.random() * 0.08,
                    drift: (Math.random() - 0.5) * 1.5,
                    color: SMOKE_COLORS[Math.floor(Math.random() * SMOKE_COLORS.length)],
                    wave: Math.random() * Math.PI * 2,
                    waveSpeed: 0.01 + Math.random() * 0.02,
                    turbulence: Math.random() * 0.1
                });
            }
            console.log('Количество частиц изменено на:', count);
        }
    };
    
})();
