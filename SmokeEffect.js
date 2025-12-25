console.clear();

// Используем размеры окна для адаптации к Lampa
canvasWidth = window.innerWidth;
canvasHeight = window.innerHeight;

pCount = 0;
pCollection = new Array();

var puffs = 1; // Несколько пучков для непрерывного эффекта
var particlesPerPuff = 2000; // Много частиц для густого дыма
var img = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/85280/smoke2.png';

var smokeImage = new Image();
smokeImage.src = img;

// Ждем загрузки изображения
smokeImage.onload = function() {
    console.log('Изображение дыма загружено');
    initSmokeEffect();
};

function initSmokeEffect() {
    // Создаем canvas элемент для Lampa
    var c = document.createElement('canvas');
    c.id = 'lampaSmokeCanvas';
    c.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        opacity: 0.7;
    `;
    
    // Ищем контейнер фона Lampa
    var backgroundContainer = document.querySelector('.background');
    if (backgroundContainer) {
        // Вставляем canvas внутрь контейнера фона
        backgroundContainer.appendChild(c);
    } else {
        // Если не нашли, вставляем в body
        document.body.appendChild(c);
    }
    
    var ctx = c.getContext('2d');
    
    // Устанавливаем размеры canvas
    c.width = canvasWidth;
    c.height = canvasHeight;
    
    // Создаем частицы с задержками
    for (var i1 = 0 ; i1 < puffs; i1++) {
        var puffDelay = i1 * 1500; // 2 секунды между пучками
        
        for (var i2 = 0 ; i2 < particlesPerPuff; i2++) {
            addNewParticle((i2 * 50) + puffDelay); // Уменьшил задержку между частицами
        }
    }
    
    // Запускаем отрисовку
    draw(new Date().getTime(), 3000);
}

function addNewParticle(delay)
{

  var p = {};
  p.top = canvasHeight;
  p.left = randBetween(-200,800);

  p.start = new Date().getTime() + delay;
  p.life = 8000;
  p.speedUp = 30;


  p.speedRight = randBetween(0,20);

  p.rot = randBetween(-1,1);
  p.red = Math.floor(randBetween(0,255));
  p.blue = Math.floor(randBetween(0,255));
  p.green = Math.floor(randBetween(0,255));


  p.startOpacity = .3
  p.newTop = p.top;
  p.newLeft = p.left;
  p.size = 200;
  p.growth = 10;

  pCollection[pCount] = p;
  pCount++;


}

function draw(startT, totalT, canvas) {
    // Проверяем и обновляем размеры canvas если нужно
    if (canvasWidth !== window.innerWidth || canvasHeight !== window.innerHeight) {
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
    }
    
    // Timing
    var timeDelta = new Date().getTime() - startT;
    var stillAlive = false;
    
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
            
            
            // attributes that change over time
            var newTop = p.top - (p.speedUp * (td/1000));
            var newLeft = p.left + (p.speedRight * (td/1000));
            var newOpacity = Math.max(p.startOpacity * (1-frac),0);
            
            var newSize = p.size + (p.growth * (td / 1000));
            p.newTop = newTop;
            p.newLeft = newLeft;
            
            // Применяем цвет и прозрачность
            ctx.fillStyle = 'rgba(150,150,150,' + newOpacity + ')';      
            ctx.globalAlpha  = newOpacity;
            ctx.drawImage(smokeImage, newLeft, newTop, newSize, newSize);      
            
           
        }
    }
    
    // Repeat if there's still a living particle
    if (stillAlive)
  {
    requestAnimationFrame(function(){draw(startT,totalT);}); 
  }
  else
  {
    clog(timeDelta + ": stopped");
  }
}

function randBetween(n1, n2) {
    var r = (Math.random() * (n2 - n1)) + n1;
    return r;
}

function randOffset(n, variance) {
    //e.g. variance could be 0.1 to go between 0.9 and 1.1
    var max = 1 + variance;
    var min = 1 - variance;
    var r = Math.random() * (max - min) + min;
    return n * r;
}

function clog(s) {  
    console.log(s);
}

// Обработчик изменения размера окна
window.addEventListener('resize', function() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    
    // Обновляем все canvas на странице
    var smokeCanvas = document.getElementById('lampaSmokeCanvas');
    if (smokeCanvas) {
        smokeCanvas.width = canvasWidth;
        smokeCanvas.height = canvasHeight;
    }
});

console.log('Инициализация эффекта дыма для Lampa...');
