//Тест2
console.clear();

// Сохраняем оригинальные параметры
canvasWidth = 1600;
canvasHeight = 200;

pCount = 0;
pCollection = new Array();

var puffs = 1;
var particlesPerPuff = 2000;
var img = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/85280/smoke2.png';

var smokeImage = new Image();
smokeImage.src = img;
smokeImage.crossOrigin = "Anonymous";

// Создаем backup текстуру на случай если proxy не сработает
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
    
    return canvas.toDataURL();
}

// Создаем canvas для эффектов
var c = document.createElement('canvas');
c.id = 'lampaSmoke';
c.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999999;
    opacity: 0.7;
`;

// Вставляем в самый верх body
document.body.appendChild(c);

var ctx = c.getContext('2d');
// Используем оригинальные размеры для внутренних расчетов
var renderWidth = 1600;
var renderHeight = 200;

// Ждем загрузки изображения
smokeImage.onload = function() {
    console.log('Изображение дыма загружено');
    
    // Создаем частицы с оригинальной логикой
    for (var i1 = 0 ; i1 < puffs; i1++) {
        var puffDelay = i1 * 1500; // 300 ms between puffs

        for (var i2 = 0 ; i2 < particlesPerPuff; i2++) {
            addNewParticle((i2*50) + puffDelay);    
        }
    }

    // Запускаем отрисовку
    draw(new Date().getTime(), 3000);
};

function addNewParticle(delay) {
    // Оригинальная логика без изменений
    var p = {};
    p.top = canvasHeight;
    p.left = randBetween(-200,800);

    p.start = new Date().getTime() + delay;
    p.life = 16000; // Оригинальное значение 16000
    p.speedUp = 30;

    p.speedRight = randBetween(0,20);

    p.rot = randBetween(-1,1);
    p.red = Math.floor(randBetween(0,255));
    p.blue = Math.floor(randBetween(0,255));
    p.green = Math.floor(randBetween(0,255));

    p.startOpacity = .3;
    p.newTop = p.top;
    p.newLeft = p.left;
    p.size = 200;
    p.growth = 10;

    pCollection[pCount] = p;
    pCount++;
}

function draw(startT, totalT) {
    // Оригинальная логика тайминга
    var timeDelta = new Date().getTime() - startT;
    var stillAlive = false;

    // Настраиваем canvas для Lampa
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    ctx.clearRect(0, 0, c.width, c.height);

    // Коэффициент масштабирования для адаптации к размеру окна
    var scaleX = c.width / renderWidth;
    var scaleY = c.height / renderHeight;
    var scale = Math.min(scaleX, scaleY) * 1.5; // Немного увеличиваем для покрытия экрана

    // Loop through particles
    for (var i = 0; i < pCount; i++) {    
        // Grab the particle
        var p = pCollection[i];

        // Timing
        var td = new Date().getTime() - p.start;
        var frac = td / p.life;

        if (td > 0) {
            if (td <= p.life) { 
                stillAlive = true; 
            }

            // Оригинальные расчеты
            var newTop = p.top - (p.speedUp * (td/1000));
            var newLeft = p.left + (p.speedRight * (td/1000));
            var newOpacity = Math.max(p.startOpacity * (1-frac), 0);
            var newSize = p.size + (p.growth * (td/1000));
            
            p.newTop = newTop;
            p.newLeft = newLeft;

            // Масштабируем координаты и размер для Lampa
            var scaledLeft = newLeft * scaleX;
            var scaledTop = (newTop - 100) * scaleY + c.height * 0.7; // Смещаем вниз экрана
            var scaledSize = newSize * scale;

            // Draw с оригинальными параметрами
            ctx.save();
            ctx.globalAlpha = newOpacity;
            
            // Применяем цвет
            ctx.fillStyle = 'rgba(' + p.red + ',' + p.green + ',' + p.blue + ',' + newOpacity + ')';
            
            // Применяем вращение если нужно
            if (p.rot !== 0) {
                ctx.translate(scaledLeft + scaledSize/2, scaledTop + scaledSize/2);
                ctx.rotate(p.rot * (td/10000));
                ctx.drawImage(smokeImage, -scaledSize/2, -scaledSize/2, scaledSize, scaledSize);
                ctx.restore();
            } else {
                ctx.drawImage(smokeImage, scaledLeft, scaledTop, scaledSize, scaledSize);
                ctx.restore();
            }
        }
    }

    // Repeat if there's still a living particle
    if (stillAlive) {
        requestAnimationFrame(function(){ draw(startT, totalT); }); 
    } else {
        console.log(timeDelta + ": stopped - restarting");
        // Перезапускаем при завершении
        pCount = 0;
        pCollection = new Array();
        
        for (var i1 = 0 ; i1 < puffs; i1++) {
            var puffDelay = i1 * 1500;
            for (var i2 = 0 ; i2 < particlesPerPuff; i2++) {
                addNewParticle((i2*50) + puffDelay);    
            }
        }
        
        draw(new Date().getTime(), 3000);
    }
}

function randBetween(n1, n2) {
    var r = (Math.random() * (n2 - n1)) + n1;
    return r;
}

// Добавляем обработчик изменения размера окна
window.addEventListener('resize', function() {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
});

console.log('Дым для Lampa загружается...');
