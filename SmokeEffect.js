console.clear();

// Параметры для Lampa
canvasWidth = window.innerWidth;
canvasHeight = window.innerHeight;

pCount = 0;
pCollection = [];

var puffs = 2;
var particlesPerPuff = 800; // Уменьшено для производительности
var img = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/85280/smoke2.png';

var smokeImage = new Image();
smokeImage.src = img;

// Создаем canvas для эффектов
var c = document.createElement('canvas');
c.id = 'lampaSmoke';
c.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 999999;
    opacity: 0.6;
`;

// Вставляем в самый верх body
document.body.appendChild(c);

var ctx = c.getContext('2d');

// Адаптивные размеры
function updateCanvasSize() {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
}

updateCanvasSize();

// Создаем backup текстуру
function createBackupTexture() {
    var size = 256;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    
    var gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(220, 220, 220, 0.5)');
    gradient.addColorStop(0.6, 'rgba(180, 180, 180, 0.2)');
    gradient.addColorStop(1, 'rgba(140, 140, 140, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas;
}

var backupTexture = createBackupTexture();

// Ждем загрузки изображения
smokeImage.onload = function() {
    console.log('Изображение дыма загружено, создаем эффект...');
    initializeParticles();
};

smokeImage.onerror = function() {
    console.log('Не удалось загрузить изображение, используем backup текстуру');
    initializeParticles();
};

function initializeParticles() {
    pCount = 0;
    pCollection = [];
    
    // Создаем частицы с адаптивной логикой для Lampa
    for (var i1 = 0; i1 < puffs; i1++) {
        var puffDelay = i1 * 1500;

        for (var i2 = 0; i2 < particlesPerPuff; i2++) {
            addNewParticle((i2 * 50) + puffDelay);    
        }
    }

    // Запускаем отрисовку
    draw(new Date().getTime());
}

function addNewParticle(delay) {
    var p = {};
    
    // Позиционирование для Lampa (нижняя часть экрана)
    p.top = canvasHeight * 0.8 + Math.random() * canvasHeight * 0.2;
    p.left = Math.random() * canvasWidth;
    
    p.start = new Date().getTime() + delay;
    p.life = 12000 + Math.random() * 8000; // Разная продолжительность жизни
    
    p.speedUp = 15 + Math.random() * 15; // Меньшая скорость для Lampa
    p.speedRight = -5 + Math.random() * 10; // Случайное движение в стороны
    
    p.rot = (Math.random() - 0.5) * 0.02; // Медленное вращение
    p.red = Math.floor(200 + Math.random() * 55);
    p.blue = Math.floor(200 + Math.random() * 55);
    p.green = Math.floor(200 + Math.random() * 55);
    
    p.startOpacity = 0.2 + Math.random() * 0.3;
    p.newTop = p.top;
    p.newLeft = p.left;
    p.size = 100 + Math.random() * 150; // Разный начальный размер
    p.growth = 5 + Math.random() * 10; // Разная скорость роста
    
    pCollection[pCount] = p;
    pCount++;
}

var animationId = null;

function draw(startT) {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    animationId = requestAnimationFrame(function() {
        drawFrame(startT);
    });
}

function drawFrame(startT) {
    updateCanvasSize();
    
    var timeDelta = new Date().getTime() - startT;
    var stillAlive = false;
    
    // Полупрозрачный фон для плавного исчезновения
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, c.width, c.height);
    
    // Loop through particles
    for (var i = 0; i < pCount; i++) {    
        var p = pCollection[i];
        var td = new Date().getTime() - p.start;
        var frac = td / p.life;
        
        if (td > 0) {
            if (td <= p.life) { 
                stillAlive = true; 
            } else {
                continue; // Пропускаем умершие частицы
            }
            
            // Расчет новых параметров
            var newTop = p.top - (p.speedUp * (td/1000));
            var newLeft = p.left + (p.speedRight * (td/1000));
            var newOpacity = p.startOpacity * (1 - frac * 1.5); // Быстрее исчезают
            var newSize = p.size + (p.growth * (td/1000));
            
            // Проверяем, видна ли частица на экране
            if (newOpacity <= 0.01 || newTop < -newSize || newLeft < -newSize || 
                newLeft > c.width + newSize) {
                continue;
            }
            
            // Используем правильное изображение
            var texture = smokeImage.complete ? smokeImage : backupTexture;
            
            // Рисуем частицу
            ctx.save();
            ctx.globalAlpha = newOpacity;
            
            // Применяем цвет
            if (smokeImage.complete) {
                // Для реального изображения используем фильтр
                ctx.filter = `sepia(0.3) brightness(1.5)`;
            }
            
            // Применяем вращение
            ctx.translate(newLeft, newTop);
            ctx.rotate(p.rot * (td/1000));
            
            if (texture instanceof Image) {
                ctx.drawImage(texture, -newSize/2, -newSize/2, newSize, newSize);
            } else {
                // Для canvas backup
                ctx.drawImage(texture, -newSize/2, -newSize/2, newSize, newSize);
            }
            
            ctx.restore();
        }
    }
    
    // Продолжаем анимацию
    if (stillAlive) {
        animationId = requestAnimationFrame(function() {
            drawFrame(startT);
        });
    } else {
        console.log('Перезапускаем эффект дыма...');
        initializeParticles();
    }
}

function randBetween(n1, n2) {
    return (Math.random() * (n2 - n1)) + n1;
}

// Обработчики изменения размера окна
window.addEventListener('resize', function() {
    updateCanvasSize();
    // Пересоздаем частицы при изменении размера
    setTimeout(initializeParticles, 100);
});

// Очистка при размонтировании
function cleanup() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (c && c.parentNode) {
        c.parentNode.removeChild(c);
    }
}

// Автоматический запуск
console.log('Эффект дыма для Lampa инициализирован...');

// Экспортируем функции для Lampa
if (typeof window.Lampa !== 'undefined') {
    window.Lampa.SmokeEffect = {
        init: initializeParticles,
        cleanup: cleanup,
        setOpacity: function(opacity) {
            c.style.opacity = opacity;
        }
    };
}
