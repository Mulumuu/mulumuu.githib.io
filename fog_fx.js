// Туман эффект
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;
    
    // Настройки тумана
    const fogSettings = {
        particleCount: 150,    // Количество частиц тумана
        maxParticles: 200,    // Максимальное количество частиц
        particleSize: 80,     // Размер частиц тумана
        speed: 0.3,          // Скорость движения
        opacity: 0.05,       // Прозрачность тумана
        color: '#e8f4ff',    // Цвет тумана (голубовато-белый)
        wind: 0.1,           // Направление ветра
        turbulence: 0.3,     // Турбулентность
        layers: 3,           // Количество слоев тумана
        density: 0.7         // Плотность тумана
    };
    
    // Инициализация canvas
    function initCanvas() {
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(canvas);
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    // Изменение размера canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    }
    
    // Класс частицы тумана
    class FogParticle {
        constructor(layer = 0) {
            this.layer = layer;
            this.reset();
            // Начальная позиция случайно по всему экрану
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.opacity = Math.random() * 0.1 + fogSettings.opacity;
            this.size = Math.random() * fogSettings.particleSize * (1 - layer * 0.3) + 20;
        }
        
        reset() {
            // Разные слои двигаются с разной скоростью
            const layerFactor = 1 - this.layer * 0.2;
            
            this.x = Math.random() * canvas.width * 1.2 - canvas.width * 0.1;
            this.y = Math.random() * canvas.height * 1.5;
            this.speed = (Math.random() * fogSettings.speed + 0.1) * layerFactor;
            this.opacity = Math.random() * 0.08 + fogSettings.opacity * layerFactor;
            this.size = Math.random() * fogSettings.particleSize * layerFactor + 20;
            this.wind = (Math.random() - 0.5) * fogSettings.wind;
            this.wobble = Math.random() * fogSettings.turbulence;
            this.wobbleSpeed = Math.random() * 0.02 + 0.005;
            this.wobbleOffset = Math.random() * Math.PI * 2;
        }
        
        update() {
            // Плавное движение вверх с ветром
            this.y -= this.speed;
            this.x += Math.sin(Date.now() * this.wobbleSpeed + this.wobbleOffset) * this.wobble + this.wind;
            
            // Медленное изменение прозрачности для эффекта мерцания
            this.opacity += (Math.sin(Date.now() * 0.001 + this.wobbleOffset) * 0.01);
            this.opacity = Math.max(fogSettings.opacity * 0.5, Math.min(fogSettings.opacity * 1.5, this.opacity));
            
            // Легкое изменение размера
            this.size += Math.sin(Date.now() * 0.002 + this.wobbleOffset) * 0.1;
            
            // Если частица вышла за верхнюю границу, сбрасываем ее
            if (this.y < -this.size || 
                this.x < -this.size || 
                this.x > canvas.width + this.size) {
                this.reset();
                this.y = canvas.height + this.size;
                this.x = Math.random() * canvas.width;
            }
        }
        
        draw() {
            ctx.beginPath();
            
            // Создаем размытый кружок для эффекта тумана
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.size
            );
            
            gradient.addColorStop(0, `rgba(232, 244, 255, ${this.opacity})`);
            gradient.addColorStop(0.3, `rgba(232, 244, 255, ${this.opacity * 0.7})`);
            gradient.addColorStop(1, `rgba(232, 244, 255, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Добавляем легкое внутреннее свечение для объема
            const innerGradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.size * 0.7
            );
            
            innerGradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity * 1.2})`);
            innerGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
            
            ctx.fillStyle = innerGradient;
            ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Инициализация частиц тумана
    function initParticles() {
        particles = [];
        
        // Создаем несколько слоев тумана
        for (let layer = 0; layer < fogSettings.layers; layer++) {
            const particlesPerLayer = Math.floor(fogSettings.particleCount / fogSettings.layers);
            
            for (let i = 0; i < particlesPerLayer; i++) {
                particles.push(new FogParticle(layer));
            }
        }
    }
    
    // Анимация
    function animate() {
        // Полупрозрачный фон для эффекта накопления
        ctx.fillStyle = `rgba(248, 250, 252, 0.02)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Обновляем и рисуем все частицы
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Добавляем легкий градиент сверху для глубины
        const topGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.3);
        topGradient.addColorStop(0, 'rgba(248, 250, 252, 0.15)');
        topGradient.addColorStop(1, 'rgba(248, 250, 252, 0)');
        ctx.fillStyle = topGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height * 0.3);
        
        animationId = requestAnimationFrame(animate);
    }
    
    // Управление плотностью тумана
    function updateFogDensity(factor) {
        fogSettings.particleCount = Math.floor(fogSettings.maxParticles * factor);
        initParticles();
    }
    
    // Публичный API для управления туманом
    window.fogController = {
        setDensity: (density) => {
            fogSettings.density = Math.max(0.1, Math.min(1, density));
            updateFogDensity(fogSettings.density);
        },
        setSpeed: (speed) => {
            fogSettings.speed = Math.max(0.1, Math.min(2, speed));
        },
        setOpacity: (opacity) => {
            fogSettings.opacity = Math.max(0.01, Math.min(0.2, opacity));
        },
        setColor: (color) => {
            fogSettings.color = color;
        },
        start: () => {
            if (!animationId) {
                initCanvas();
                animate();
            }
        },
        stop: () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
                if (canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas);
                }
            }
        },
        getSettings: () => ({ ...fogSettings })
    };
    
    // Автоматический старт
    window.fogController.start();
    
    // Адаптация к системным предпочтениям
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
        fogSettings.speed *= 0.3;
        fogSettings.particleCount = Math.floor(fogSettings.particleCount * 0.5);
    }
    
    prefersReducedMotion.addEventListener('change', (e) => {
        if (e.matches) {
            fogSettings.speed *= 0.3;
            fogSettings.particleCount = Math.floor(fogSettings.particleCount * 0.5);
        } else {
            fogSettings.speed /= 0.3;
            fogSettings.particleCount = Math.floor(fogSettings.particleCount / 0.5);
        }
        initParticles();
    });
});
