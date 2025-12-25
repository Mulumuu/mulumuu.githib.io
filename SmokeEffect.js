console.clear();

// Параметры для Lampa
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

let pCount = 0;
let pCollection = [];
let particlesToAdd = [];

let puffs = 1; // Количество одновременных волн
let particlesPerPuff = 400; // Частиц в одной волне
let img = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/85280/smoke2.png';

let smokeImage = new Image();
smokeImage.crossOrigin = "anonymous";
smokeImage.src = img;

// Создаем canvas для эффектов
let c = document.createElement('canvas');
c.id = 'lampaSmoke';
c.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 999999;
    opacity: 0.7;
`;

// Вставляем в самый верх body
document.body.appendChild(c);

let ctx = c.getContext('2d');
let lastPuffTime = 0;
let puffInterval = 2000; // Интервал между запусками новых волн (2 секунды)
let particlesPerSecond = 30; // Количество новых частиц в секунду
let particleAccumulator = 0;

// Адаптивные размеры
function updateCanvasSize() {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    canvasWidth = c.width;
    canvasHeight = c.height;
}

updateCanvasSize();

// Создаем backup текстуру
function createBackupTexture() {
    let size = 512;
    let canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    let ctx = canvas.getContext('2d');
    
    let gradient = ctx.createRadialGradient(
        size/2, size/2, size * 0.1,
        size/2, size/2, size/2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.2, 'rgba(240, 240, 240, 0.7)');
    gradient.addColorStop(0.4, 'rgba(220, 220, 220, 0.4)');
    gradient.addColorStop(0.7, 'rgba(200, 200, 200, 0.2)');
    gradient.addColorStop(1, 'rgba(180, 180, 180, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Добавляем турбулентность
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 8; i++) {
        let x = size/2 + Math.random() * size * 0.4 - size * 0.2;
        let y = size/2 + Math.random() * size * 0.4 - size * 0.2;
        let r = size * (0.15 + Math.random() * 0.25);
        
        let gradient2 = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient2.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient2.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
        gradient2.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return canvas;
}

let backupTexture = createBackupTexture();

// Ждем загрузки изображения
smokeImage.onload = function() {
    console.log('Изображение дыма загружено, запускаем бесконечный эффект...');
    initializeContinuousEffect();
};

smokeImage.onerror = function() {
    console.log('Используем backup текстуру для эффекта дыма');
    initializeContinuousEffect();
};

function initializeContinuousEffect() {
    pCount = 0;
    pCollection = [];
    particlesToAdd = [];
    
    // Создаем начальную порцию частиц
    for (let i = 0; i < puffs; i++) {
        createPuff(i * 500); // Смещаем начальные волны
    }
    
    // Запускаем бесконечную отрисовку
    draw();
}

function createPuff(delay = 0) {
    for (let i = 0; i < particlesPerPuff; i++) {
        // Равномерно распределяем частицы во времени
        let particleDelay = delay + (i * 1500 / particlesPerPuff);
        addNewParticle(particleDelay);
    }
}

function addNewParticle(delay = 0) {
    let p = {};
    
    // Начальная позиция - ниже экрана для эффекта появления снизу
    p.top = canvasHeight + 50 + Math.random() * 150;
    p.left = Math.random() * canvasWidth;
    
    p.start = new Date().getTime() + delay;
    
    // ОЧЕНЬ долгое время жизни для непрерывного эффекта
    p.life = 45000 + Math.random() * 30000; // 45-75 секунд
    
    // Медленное движение вверх
    p.speedUp = 5 + Math.random() * 10; // 5-15 пикселей в секунду
    
    // Легкое движение в стороны
    p.speedRight = -2 + Math.random() * 4; // -2 до +2 пикселей в секунду
    
    // Очень медленное вращение
    p.rot = (Math.random() - 0.5) * 0.005; // -0.0025 до +0.0025 радиан в секунду
    
    // Цвета для дыма
    p.red = Math.floor(225 + Math.random() * 30);
    p.blue = Math.floor(225 + Math.random() * 30);
    p.green = Math.floor(225 + Math.random() * 30);
    
    // Начальная прозрачность
    p.startOpacity = 0.1 + Math.random() * 0.2;
    
    p.newTop = p.top;
    p.newLeft = p.left;
    
    // Размер частиц
    p.size = 100 + Math.random() * 200; // 100-300 пикселей
    
    // Медленный рост
    p.growth = 2 + Math.random() * 5; // 2-7 пикселей в секунду
    
    // Время для плавных переходов
    p.fadeInTime = 3000; // 3 секунды на появление
    p.fadeOutTime = 10000; // 10 секунд на исчезновение
    
    // ID частицы для управления
    p.id = Date.now() + Math.random();
    
    pCollection.push(p);
    pCount++;
}

// Функция для добавления новых частиц в реальном времени
function spawnNewParticles(deltaTime) {
    let currentTime = new Date().getTime();
    
    // Добавляем новые частицы с постоянной скоростью
    particleAccumulator += particlesPerSecond * (deltaTime / 1000);
    
    while (particleAccumulator >= 1) {
        addNewParticle();
        particleAccumulator--;
    }
    
    // Также создаем периодические волны
    if (currentTime - lastPuffTime > puffInterval) {
        createPuff();
        lastPuffTime = currentTime;
    }
}

// Функция для удаления старых частиц
function cleanupOldParticles() {
    let currentTime = new Date().getTime();
    let newCollection = [];
    
    for (let i = 0; i < pCollection.length; i++) {
        let p = pCollection[i];
        let td = currentTime - p.start;
        
        // Оставляем только живые частицы
        if (td < p.life) {
            newCollection.push(p);
        }
    }
    
    pCollection = newCollection;
    pCount = pCollection.length;
}

let lastFrameTime = 0;
let animationId = null;

function draw(timestamp) {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    animationId = requestAnimationFrame(function(currentTime) {
        drawFrame(currentTime);
    });
}

function drawFrame(currentTime) {
    updateCanvasSize();
    
    // Вычисляем deltaTime
    let deltaTime = lastFrameTime ? currentTime - lastFrameTime : 16;
    lastFrameTime = currentTime;
    
    // Очищаем canvas с эффектом накопления
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, 0, c.width, c.height);
    
    // Спавним новые частицы
    spawnNewParticles(deltaTime);
    
    // Удаляем старые частицы
    cleanupOldParticles();
    
    // Отрисовываем все частицы
    for (let i = 0; i < pCount; i++) {    
        let p = pCollection[i];
        let td = currentTime - p.start;
        
        if (td > 0 && td < p.life) {
            // Расчет прогресса жизни
            let lifeProgress = td / p.life;
            
            // Движение вверх
            let newTop = p.top - (p.speedUp * (td/1000));
            
            // Движение в стороны
            let newLeft = p.left + (p.speedRight * (td/1000));
            
            // Рост размера
            let newSize = p.size + (p.growth * (td/1000));
            
            // Сложная кривая прозрачности
            let newOpacity;
            
            if (td < p.fadeInTime) {
                // Фаза появления
                newOpacity = p.startOpacity * (td / p.fadeInTime);
            } else if (td > p.life - p.fadeOutTime) {
                // Фаза исчезновения
                let fadeProgress = (td - (p.life - p.fadeOutTime)) / p.fadeOutTime;
                newOpacity = p.startOpacity * (1 - fadeProgress);
            } else {
                // Основная фаза с легким осцилляцией
                let oscillation = Math.sin(td / 5000) * 0.1 + 0.9;
                newOpacity = p.startOpacity * oscillation;
            }
            
            // Дополнительное плавное затухание
            newOpacity *= (1 - lifeProgress * 0.5);
            
            // Проверяем видимость
            if (newOpacity <= 0.01 || newTop < -newSize * 3) {
                continue;
            }
            
            // Выбираем текстуру
            let texture = smokeImage.complete ? smokeImage : backupTexture;
            
            // Рисуем частицу
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, newOpacity));
            
            // Применяем цветовой фильтр
            if (smokeImage.complete) {
                ctx.filter = `sepia(0.15) brightness(1.4) saturate(0.7)`;
            }
            
            // Позиционирование и вращение
            ctx.translate(newLeft, newTop);
            
            // Вращение с возможным изменением направления
            let rotation = p.rot * (td/1000);
            if (p.id % 2 === 0) rotation *= -1; // Некоторые частицы вращаются в другую сторону
            ctx.rotate(rotation);
            
            // Рисуем текстуру
            if (texture instanceof Image) {
                ctx.drawImage(texture, -newSize/2, -newSize/2, newSize, newSize);
            } else {
                ctx.drawImage(texture, -newSize/2, -newSize/2, newSize, newSize);
            }
            
            ctx.restore();
        }
    }
    
    // Продолжаем бесконечную анимацию
    animationId = requestAnimationFrame(drawFrame);
}

// Обработчики изменения размера окна
window.addEventListener('resize', function() {
    updateCanvasSize();
    // Можно также масштабировать существующие частицы
    for (let i = 0; i < pCollection.length; i++) {
        let p = pCollection[i];
        // Корректируем позицию при изменении размера окна
        p.left = (p.left / canvasWidth) * window.innerWidth;
        p.top = (p.top / canvasHeight) * window.innerHeight;
    }
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
});

// Функция для настройки параметров эффекта
function updateEffectParameters(params) {
    if (params.particlesPerSecond !== undefined) {
        particlesPerSecond = params.particlesPerSecond;
    }
    if (params.puffInterval !== undefined) {
        puffInterval = params.puffInterval;
    }
    if (params.opacity !== undefined) {
        c.style.opacity = Math.max(0.1, Math.min(1, params.opacity));
    }
    if (params.puffs !== undefined) {
        puffs = params.puffs;
    }
}

// Очистка
function cleanup() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (c && c.parentNode) {
        c.parentNode.removeChild(c);
    }
    pCollection = [];
    pCount = 0;
}

// Запуск эффекта сразу
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initializeContinuousEffect, 1000);
    });
} else {
    setTimeout(initializeContinuousEffect, 1000);
}

console.log('Бесконечный эффект дыма для Lampa инициализирован...');

// Экспортируем API
if (typeof window.Lampa !== 'undefined') {
    window.Lampa.SmokeEffect = {
        init: initializeContinuousEffect,
        cleanup: cleanup,
        update: updateEffectParameters,
        setIntensity: function(intensity) {
            updateEffectParameters({
                particlesPerSecond: Math.floor(20 * intensity),
                puffInterval: 2000 / intensity,
                puffs: Math.max(1, Math.floor(3 * intensity))
            });
        },
        setOpacity: function(opacity) {
            c.style.opacity = Math.max(0.1, Math.min(1, opacity));
        },
        getStats: function() {
            return {
                activeParticles: pCount,
                totalCreated: pCount + particlesToAdd.length,
                canvasSize: { width: canvasWidth, height: canvasHeight }
            };
        }
    };
}
