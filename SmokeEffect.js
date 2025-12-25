// Плагин SmokeEffect для создания анимации стелящегося дыма
(function() {
    'use strict';
    
    class SmokeEffect {
        constructor(options = {}) {
            this.options = {
                container: document.body,
                color: 'rgba(255, 255, 255, 0.3)',
                density: 20, // количество частиц дыма
                speed: 1,
                windDirection: 1, // 1 для движения вправо, -1 для влево
                minSize: 50,
                maxSize: 200,
                zIndex: -1,
                blur: 20,
                ...options
            };
            
            this.particles = [];
            this.canvas = null;
            this.ctx = null;
            this.animationId = null;
            
            this.init();
        }
        
        init() {
            // Создаем canvas элемент
            this.canvas = document.createElement('canvas');
            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: ${this.options.zIndex};
            `;
            
            this.ctx = this.canvas.getContext('2d');
            this.options.container.appendChild(this.canvas);
            
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            
            this.createParticles();
            this.animate();
        }
        
        resizeCanvas() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
        
        createParticles() {
            this.particles = [];
            
            for (let i = 0; i < this.options.density; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: this.canvas.height + Math.random() * 100, // начинаем снизу
                    size: this.options.minSize + Math.random() * (this.options.maxSize - this.options.minSize),
                    speed: 0.5 + Math.random() * this.options.speed,
                    opacity: 0.1 + Math.random() * 0.4,
                    drift: (Math.random() - 0.5) * 2, // боковое смещение
                    wind: this.options.windDirection * (0.2 + Math.random() * 0.5)
                });
            }
        }
        
        drawSmokeParticle(particle) {
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );
            
            gradient.addColorStop(0, this.options.color.replace('0.3', particle.opacity.toString()));
            gradient.addColorStop(1, this.options.color.replace('0.3', '0'));
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            
            // Применяем размытие через фильтры
            this.ctx.filter = `blur(${this.options.blur}px)`;
            this.ctx.fill();
            this.ctx.filter = 'none';
        }
        
        updateParticles() {
            for (let particle of this.particles) {
                // Движение вверх с небольшим смещением
                particle.y -= particle.speed;
                particle.x += particle.wind + particle.drift * 0.1;
                
                // Медленное изменение дрейфа для естественного движения
                particle.drift += (Math.random() - 0.5) * 0.2;
                
                // Плавное изменение размера
                particle.size += (Math.random() - 0.5) * 0.5;
                particle.size = Math.max(this.options.minSize, 
                    Math.min(this.options.maxSize, particle.size));
                
                // Плавное изменение прозрачности
                particle.opacity += (Math.random() - 0.5) * 0.02;
                particle.opacity = Math.max(0.05, Math.min(0.4, particle.opacity));
                
                // Если частица ушла за верхний край, перемещаем ее вниз
                if (particle.y < -particle.size) {
                    particle.y = this.canvas.height + particle.size;
                    particle.x = Math.random() * this.canvas.width;
                }
                
                // Если частица ушла за боковые края, перемещаем ее на другую сторону
                if (particle.x < -particle.size) {
                    particle.x = this.canvas.width + particle.size;
                }
                if (particle.x > this.canvas.width + particle.size) {
                    particle.x = -particle.size;
                }
            }
        }
        
        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.updateParticles();
            
            // Рисуем частицы от дальних к ближним для правильного наложения
            const sortedParticles = [...this.particles].sort((a, b) => a.y - b.y);
            
            for (let particle of sortedParticles) {
                this.drawSmokeParticle(particle);
            }
            
            this.animationId = requestAnimationFrame(() => this.animate());
        }
        
        destroy() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            if (this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }
        }
        
        updateOptions(newOptions) {
            this.options = { ...this.options, ...newOptions };
            if (newOptions.density && newOptions.density !== this.particles.length) {
                this.createParticles();
            }
        }
    }
    
    // Экспорт в глобальную область видимости
    window.SmokeEffect = SmokeEffect;
    
    // Автоматическая инициализация при загрузке страницы
    document.addEventListener('DOMContentLoaded', function() {
        // Автоматически создаем эффект дыма на body
        window.smokeEffect = new SmokeEffect();
    });
    
})();
