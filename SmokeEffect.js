console.clear();

// Параметры для Lampa
canvasWidth = window.innerWidth;
canvasHeight = window.innerHeight;

pCount = 0;
pCollection = [];

var puffs = 2; // Увеличено количество волн
var particlesPerPuff = 600; // Оптимальное количество для производительности
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
    opacity: 0.7;
`;

// Вставляем в самый верх body
document.body.appendChild(c);

var ctx = c.getContext('2d');

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
    var size = 512; // Увеличено для лучшего качества
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    
    // Создаем более плавный градиент для дыма
    var gradient = ctx.createRadialGradient(
        size/2, size/2, size * 0.1,
        size/2, size/2, size/2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.1, 'rgba(240, 240, 240, 0.7)');
    gradient.addColorStop(0.3, 'rgba(220, 220, 220, 0.4)');
    gradient.addColorStop(0.6, 'rgba(200, 200, 200, 0.2)');
    gradient.addColorStop(0.8, 'rgba(180, 180, 180, 0.1)');
    gradient.addColorStop(1, 'rgba(160, 160, 160, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Добавляем легкую турбулентность
    ctx.globalCompositeOperation = 'overlay';
    for (var i = 0; i < 5; i++) {
        var x = size/2 + Math.random() * size * 0.4 - size * 0.2;
        var y = size/2 + Math.random() * size * 0.4 - size * 0.2;
        var r = size * (0.1 + Math.random() * 0.2);
        
        var gradient2 = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient2.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient2.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    
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
    
    // Создаем частицы с увеличенным временем жизни
    for (var i1 = 0; i1 < puffs; i1++) {
        // Увеличенная задержка между волнами
        var puffDelay = i1 * 3000; // 3 секунды между волнами

        for (var i2 = 0; i2 < particlesPerPuff; i2++) {
            // Увеличиваем задержку между частицами в волне
            addNewParticle((i2 * 80) + puffDelay);    
        }
    }

    // Запускаем отрисовку
    draw(new Date().getTime());
}

function addNewParticle(delay) {
    var p = {};
    
    // НАСТРОЙКА ПОЯВЛЕНИЯ ИЗ-ЗА НИЖНЕЙ ГРАНИЦЫ ЭКРАНА:
    // Частицы начинают появляться ниже видимой области
    p.top = canvasHeight + Math.random() * 200; // Ниже экрана на 0-200px
    p.left = Math.random() * canvasWidth; // По всей ширине
    
    p.start = new Date().getTime() + delay;
    
    // УВЕЛИЧЕННОЕ ВРЕМЯ ЖИЗНИ:
    // Базовое время жизни увеличено + случайное отклонение
    p.life = 20000 + Math.random() * 15000; // 20-35 секунд
    
    // Более плавное движение вверх
    p.speedUp = 8 + Math.random() * 12; // 8-20 пикселей в секунду
    
    // Легкое движение в стороны
    p.speedRight = -3 + Math.random() * 6; // -3 до +3 пикселей в секунду
    
    // Медленное вращение
    p.rot = (Math.random() - 0.5) * 0.01; // -0.005 до +0.005 радиан в секунду
    
    // Цвета для дыма (бело-серые оттенки)
    p.red = Math.floor(220 + Math.random() * 35); // 220-255
    p.blue = Math.floor(220 + Math.random() * 35); // 220-255
    p.green = Math.floor(220 + Math.random() * 35); // 220-255
    
    // Начальная прозрачность
    p.startOpacity = 0.15 + Math.random() * 0.25; // 0.15-0.4
    
    p.newTop = p.top;
    p.newLeft = p.left;
    
    // Размер частиц - увеличиваем для более заметного эффекта
    p.size = 120 + Math.random() * 180; // 120-300 пикселей
    
    // Рост частиц со временем - замедляем
    p.growth = 3 + Math.random() * 7; // 3-10 пикселей в секунду
    
    // Добавляем параметр для плавного появления
    p.fadeInTime = 2000; // 2 секунды на появление
    p.fadeOutTime = 5000; // 5 секунд на исчезновение
    
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
    
    var currentTime = new Date().getTime();
    var stillAlive = false;
    
    // Полупрозрачный фон для плавного исчезновения (слегка затемняем)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.fillRect(0, 0, c.width, c.height);
    
    // Loop through particles
    for (var i = 0; i < pCount; i++) {    
        var p = pCollection[i];
        var td = currentTime - p.start;
        
        if (td > 0) {
            if (td <= p.life) { 
                stillAlive = true; 
            } else {
                continue; // Пропускаем умершие частицы
            }
            
            // Расчет новых параметров с учетом времени жизни
            var lifeProgress = td / p.life;
            
            // Движение вверх с замедлением
            var newTop = p.top - (p.speedUp * (td/1000));
            // Движение в стороны
            var newLeft = p.left + (p.speedRight * (td/1000));
            // Рост размера
            var newSize = p.size + (p.growth * (td/1000));
            
            // Сложная кривая прозрачности для плавного появления и исчезновения
            var newOpacity;
            
            if (td < p.fadeInTime) {
                // Фаза появления: от 0 до startOpacity
                newOpacity = p.startOpacity * (td / p.fadeInTime);
            } else if (td > p.life - p.fadeOutTime) {
                // Фаза исчезновения: плавное затухание
                var fadeProgress = (td - (p.life - p.fadeOutTime)) / p.fadeOutTime;
                newOpacity = p.startOpacity * (1 - fadeProgress);
            } else {
                // Основная фаза: постоянная прозрачность
                newOpacity = p.startOpacity;
            }
            
            // Дополнительное затухание на основе общего прогресса жизни
            newOpacity *= (1 - lifeProgress * 0.3);
            
            // Проверяем, видна ли частица на экране
            if (newOpacity <= 0.01 || 
                newTop < -newSize * 2 || // Даем запас для больших частиц
                newLeft < -newSize * 2 || 
                newLeft > c.width + newSize * 2) {
                continue;
            }
            
            // Используем правильное изображение
            var texture = smokeImage.complete ? smokeImage : backupTexture;
            
            // Рисуем частицу
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, newOpacity));
            
            // Применяем цвет
            if (smokeImage.complete) {
                // Для реального изображения используем фильтр
                ctx.filter = `sepia(0.2) brightness(1.3) saturate(0.8)`;
            } else {
                // Для backup текстуры - белый дым
                ctx.fillStyle = `rgba(${p.red}, ${p.green}, ${p.blue}, 0.8)`;
            }
            
            // Позиционирование и вращение
            ctx.translate(newLeft, newTop);
            
            // Медленное вращение с ускорением
            var rotation = p.rot * (td/1000) * (1 + lifeProgress * 0.5);
            ctx.rotate(rotation);
            
            // Рисуем текстуру дыма
            if (texture instanceof Image) {
                ctx.drawImage(texture, -newSize/2, -newSize/2, newSize, newSize);
            } else {
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
        console.log('Эффект завершен, перезапускаем...');
        // Небольшая пауза перед перезапуском
        setTimeout(initializeParticles, 2000);
    }
}

// Обработчики изменения размера окна
window.addEventListener('resize', function() {
    updateCanvasSize();
    // Пересоздаем частицы при изменении размера с задержкой
    setTimeout(initializeParticles, 300);
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
console.log('Эффект длительного дыма для Lampa инициализирован...');

// Экспортируем функции для Lampa
if (typeof window.Lampa !== 'undefined') {
    window.Lampa.SmokeEffect = {
        init: initializeParticles,
        cleanup: cleanup,
        setIntensity: function(intensity) {
            particlesPerPuff = Math.floor(400 * intensity);
            puffs = Math.max(1, Math.floor(2 * intensity));
            initializeParticles();
        },
        setOpacity: function(opacity) {
            c.style.opacity = Math.max(0.3, Math.min(1, opacity));
        }
    };
}

// Запуск эффекта
initializeParticles();
