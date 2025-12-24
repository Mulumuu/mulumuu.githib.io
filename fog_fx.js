(function () {
    'use strict';
    if (window.__fogfx_loaded__) return;
    window.__fogfx_loaded__ = true;

    // Проверка, что Lampa загружена
    if (!window.Lampa || !Lampa.Storage) {
        console.error('FogFX: Lampa не загружена');
        return;
    }

    // Простой эффект тумана
    var FogFX = function () {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = 0;
        this.running = false;
        this.enabled = Lampa.Storage.get('fogfx_enabled', 1);
    };

    FogFX.prototype.init = function () {
        if (this.canvas) return;
        
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fog-fx-canvas';
        this.canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9998; opacity:0.7;';
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', this.resize.bind(this));
        
        // Создаем частицы тумана
        this.createParticles(50);
    };

    FogFX.prototype.resize = function () {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.createParticles(50);
    };

    FogFX.prototype.createParticles = function (count) {
        this.particles = [];
        for (var i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 50 + 20,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.2 + 0.05
            });
        }
    };

    FogFX.prototype.animate = function () {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            
            // Обновляем позицию
            p.x += p.speedX;
            p.y += p.speedY;
            
            // Границы
            if (p.x < -p.size) p.x = this.canvas.width + p.size;
            if (p.x > this.canvas.width + p.size) p.x = -p.size;
            if (p.y < -p.size) p.y = this.canvas.height + p.size;
            if (p.y > this.canvas.height + p.size) p.y = -p.size;
            
            // Рисуем частицу
            var gradient = this.ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, p.size
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, ' + p.opacity + ')');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.beginPath();
            this.ctx.fillStyle = gradient;
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        if (this.running) {
            this.animationId = requestAnimationFrame(this.animate.bind(this));
        }
    };

    FogFX.prototype.start = function () {
        if (this.running || !this.enabled) return;
        this.init();
        this.running = true;
        this.animate();
        console.log('FogFX: Запущен');
    };

    FogFX.prototype.stop = function () {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = 0;
        }
        console.log('FogFX: Остановлен');
    };

    FogFX.prototype.toggle = function () {
        this.enabled = !this.enabled;
        Lampa.Storage.set('fogfx_enabled', this.enabled ? 1 : 0);
        
        if (this.enabled) {
            this.start();
        } else {
            this.stop();
        }
        
        return this.enabled;
    };

    // Создаем и запускаем эффект
    var fog = new FogFX();
    
    // Запускаем через 2 секунды после загрузки
    setTimeout(function() {
        if (fog.enabled) {
            fog.start();
        }
    }, 2000);

    // Добавляем в глобальную область видимости для ручного управления
    window.FogFX = fog;

    console.log('FogFX: Плагин загружен');
})();
