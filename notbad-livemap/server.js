// FiveM LiveMap server.js - map.html gömülü versiyon

const http = require('http');

console.log('[LiveMap] =================================');
console.log('[LiveMap] FiveM LiveMap başlatılıyor...');
console.log('[LiveMap] =================================');

// map.html içeriğini direkt buraya gömüyoruz (dosya okuma sorunu yaşamayalım)
const mapHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FiveM LiveMap</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #1a1a1a; color: white; overflow: hidden; }
        #map { cursor: grab; background: #2d3748; }
        #map:active { cursor: grabbing; }
        
        #player-count {
            position: absolute; top: 10px; right: 10px;
            background: rgba(0, 0, 0, 0.8); padding: 10px 15px;
            border-radius: 6px; border: 1px solid #3182ce;
            z-index: 10000; font-size: 14px; font-weight: bold;
        }
        
        #loading {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%); z-index: 10000;
            font-size: 18px; font-weight: bold;
            background: rgba(0, 0, 0, 0.8); padding: 20px;
            border-radius: 8px; border: 1px solid #3182ce;
        }
        
        #debug-info {
            position: absolute; bottom: 10px; left: 10px;
            background: rgba(0, 0, 0, 0.8); padding: 10px;
            border-radius: 6px; border: 1px solid #3182ce;
            z-index: 10000; font-size: 12px; max-width: 300px;
        }
        
        #controls {
            position: absolute; top: 10px; left: 10px;
            background: rgba(0, 0, 0, 0.8); padding: 10px;
            border-radius: 6px; border: 1px solid #3182ce;
            z-index: 10000;
        }
        
        #controls button {
            background: #3182ce; color: white; border: none;
            padding: 5px 10px; margin: 2px; border-radius: 4px;
            cursor: pointer; font-size: 12px;
        }
        
        #controls button:hover { background: #2563eb; }
    </style>
</head>
<body>
    <div id="loading">🗺️ FiveM Haritası Yükleniyor...</div>
    <div id="player-count">👥 Oyuncu: <span id="count">0</span></div>
    <div id="controls">
        <button onclick="resetZoom()">🏠 Reset</button>
        <button onclick="toggleNames()">🏷️ İsimler</button>
        <button onclick="centerPlayers()">📍 Merkez</button>
    </div>
    <div id="debug-info">
        <div>🔗 Bağlantı: <span id="connection-status">Bağlanıyor...</span></div>
        <div>🕐 Son Güncelleme: <span id="last-update">--:--</span></div>
        <div>📡 Mod: <span style="color: #10b981;">Gömülü HTML</span></div>
    </div>
    
    <canvas height='4096' width='4096' id='map' style='height: 4096px; width: 4096px; position: absolute; z-index: 9999'>
    </canvas>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        console.log('[LiveMap] Gömülü HTML versiyonu başlatılıyor...');
        
        var canvas = document.getElementsByTagName('canvas')[0];
        canvas.width = 4096;
        canvas.height = 4096;
        
        var connectionStatus = document.getElementById('connection-status');
        var lastUpdateElement = document.getElementById('last-update');
        var gkhead = new Image();
        var showPlayerNames = true;
        
        function updateConnectionStatus(status) {
            connectionStatus.textContent = status;
            connectionStatus.style.color = status === 'Bağlı' ? '#10b981' : '#ef4444';
        }
        
        function updateLastUpdateTime() {
            const now = new Date();
            const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                             now.getMinutes().toString().padStart(2, '0') + ':' + 
                             now.getSeconds().toString().padStart(2, '0');
            lastUpdateElement.textContent = timeString;
        }

        window.onload = function(){		
            document.getElementById('loading').style.display = 'none';
            console.log('[LiveMap] Canvas harita hazır!');

            const ZeroX = 1877.25;
            const ZeroY = 2765;
            const Scale = 3.037861303705727;
            
            function getPictureCoords(x, y) {
                x = x / Scale;
                y = y / Scale;
                return {x: ZeroX + x, y: ZeroY - y};
            }

            var playersData = [];
            var socket = io(window.location.href);

            socket.on('connect', () => {
                console.log('[LiveMap] Socket.IO bağlandı ✅');
                updateConnectionStatus('Bağlı');
            });
            
            socket.on('disconnect', () => {
                console.log('[LiveMap] Socket.IO bağlantısı koptu ❌');
                updateConnectionStatus('Bağlantı Koptu');
            });
            
            socket.on('connect_error', (error) => {
                console.error('[LiveMap] Bağlantı hatası:', error);
                updateConnectionStatus('Bağlantı Hatası');
            });

            socket.on('playersData', (data) => {
                console.log(\`[LiveMap] \${data.length} oyuncu verisi alındı\`);
                playersData = data;
                document.getElementById('count').textContent = data.length;
                updateLastUpdateTime();
                redraw();
                
                // Admin paneline bilgi gönder
                if (window.parent !== window) {
                    window.parent.postMessage({
                        type: 'playerCount',
                        count: data.length
                    }, '*');
                }
            });
            
            function drawPlayerMarker(x, y, name, state, player) {
                var newCoords = getPictureCoords(x, y);
                x = newCoords.x;
                y = newCoords.y;
                
                // Job rengini belirle
                var color = '#3182ce';
                if (player && player.job) {
                    switch(player.job.toLowerCase()) {
                        case 'police': color = '#2563eb'; break;
                        case 'ambulance': color = '#dc2626'; break;
                        case 'mechanic': color = '#f59e0b'; break;
                        case 'taxi': color = '#eab308'; break;
                        case 'unemployed': color = '#6b7280'; break;
                        default: color = '#10b981'; break;
                    }
                }
                
                // Marker çiz
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, 2 * Math.PI);
                ctx.fill();
                
                // Border
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // İsim
                if (showPlayerNames && name) {
                    ctx.fillStyle = 'white';
                    ctx.font = "bold 12px Arial";
                    ctx.textAlign = 'center';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 3;
                    ctx.strokeText(name, x, y - 15);
                    ctx.fillText(name, x, y - 15);
                }
            }
            
            var ctx = canvas.getContext('2d');
            trackTransforms(ctx);
                  
            function redraw(){
                var p1 = ctx.transformedPoint(0,0);
                var p2 = ctx.transformedPoint(canvas.width,canvas.height);
                ctx.clearRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);
        
                ctx.save();
                ctx.setTransform(1,0,0,1,0,0);
                ctx.clearRect(0,0,canvas.width,canvas.height);
                ctx.restore();
        
                // Harita resmi
                ctx.drawImage(gkhead,0,0);
        
                // Oyuncular
                playersData.forEach((player) => {
                    if (player.x !== undefined && player.y !== undefined) {
                        drawPlayerMarker(player.x, player.y, player.name, player.state, player);
                    }
                });
            }
            
            redraw();

            var lastX = canvas.width/2, lastY = canvas.height/2;
            var dragStart, dragged;

            canvas.addEventListener('mousedown', function(evt){
                document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
                lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
                lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
                dragStart = ctx.transformedPoint(lastX,lastY);
                dragged = false;
            }, false);

            canvas.addEventListener('mousemove', function(evt){
                lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
                lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
                dragged = true;
                if (dragStart){
                    var pt = ctx.transformedPoint(lastX,lastY);
                    ctx.translate(pt.x-dragStart.x,pt.y-dragStart.y);
                    redraw();
                }
            }, false);

            canvas.addEventListener('mouseup', function(evt){
                dragStart = null;
                if (!dragged) {
                    var pt = ctx.transformedPoint(lastX, lastY);
                    checkPlayerClick(pt.x, pt.y);
                }
            }, false);
            
            function checkPlayerClick(clickX, clickY) {
                playersData.forEach((player) => {
                    if (player.x !== undefined && player.y !== undefined) {
                        var coords = getPictureCoords(player.x, player.y);
                        var distance = Math.sqrt(Math.pow(clickX - coords.x, 2) + Math.pow(clickY - coords.y, 2));
                        
                        if (distance <= 20) {
                            console.log('[LiveMap] Oyuncu tıklandı:', player.name);
                            
                            if (window.parent !== window) {
                                window.parent.postMessage({
                                    type: 'playerClick',
                                    player: {
                                        id: player.id,
                                        name: player.name,
                                        citizenid: player.citizenid,
                                        job: player.job || 'Unemployed',
                                        x: player.x,
                                        y: player.y,
                                        z: player.z || 0
                                    }
                                }, '*');
                            }
                            
                            alert(\`Oyuncu: \${player.name}\\nID: \${player.id}\\nKoordinat: \${Math.round(player.x)}, \${Math.round(player.y)}\`);
                        }
                    }
                });
            }

            var scaleFactor = 1.1;

            var zoom = function(clicks){
                var pt = ctx.transformedPoint(lastX,lastY);
                ctx.translate(pt.x,pt.y);
                var factor = Math.pow(scaleFactor,clicks);
                ctx.scale(factor,factor);
                ctx.translate(-pt.x,-pt.y);
                redraw();
            };

            var handleScroll = function(evt){
                var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
                if (delta) zoom(delta);
                return evt.preventDefault() && false;
            };
          
            canvas.addEventListener('DOMMouseScroll', handleScroll, false);
            canvas.addEventListener('mousewheel', handleScroll, false);
            
            // Global fonksiyonlar
            window.resetZoom = function() {
                ctx.setTransform(1,0,0,1,0,0);
                redraw();
            };
            
            window.toggleNames = function() {
                showPlayerNames = !showPlayerNames;
                redraw();
            };
            
            window.centerPlayers = function() {
                if (playersData.length > 0) {
                    var avgX = 0, avgY = 0;
                    playersData.forEach(p => { avgX += p.x; avgY += p.y; });
                    avgX /= playersData.length;
                    avgY /= playersData.length;
                    
                    var coords = getPictureCoords(avgX, avgY);
                    ctx.setTransform(1,0,0,1,0,0);
                    ctx.translate(canvas.width/2 - coords.x, canvas.height/2 - coords.y);
                    redraw();
                }
            };
        };

        // GTA 5 harita resmi
        gkhead.src = 'https://i.imgur.com/kTRQ3mF.png';
        
        gkhead.onload = function() {
            console.log('[LiveMap] Harita resmi yüklendi ✅');
        };
        
        gkhead.onerror = function() {
            console.error('[LiveMap] Harita resmi yüklenemedi, alternatif deneniyor...');
            gkhead.src = 'https://imgur.com/kTRQ3mF.png';
        };
        
        window.addEventListener('message', function(event) {
            if (event.data.type === 'refresh') {
                location.reload();
            }
        });
        
        // Transform tracking
        function trackTransforms(ctx){
            var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
            var xform = svg.createSVGMatrix();
            ctx.getTransform = function(){ return xform; };

            var savedTransforms = [];
            var save = ctx.save;
            ctx.save = function(){
                savedTransforms.push(xform.translate(0,0));
                return save.call(ctx);
            };
          
            var restore = ctx.restore;
            ctx.restore = function(){
                xform = savedTransforms.pop();
                return restore.call(ctx);
            };

            var scale = ctx.scale;
            ctx.scale = function(sx,sy){
                xform = xform.scaleNonUniform(sx,sy);
                return scale.call(ctx,sx,sy);
            };
          
            var rotate = ctx.rotate;
            ctx.rotate = function(radians){
                xform = xform.rotate(radians*180/Math.PI);
                return rotate.call(ctx,radians);
            };
          
            var translate = ctx.translate;
            ctx.translate = function(dx,dy){
                xform = xform.translate(dx,dy);
                return translate.call(ctx,dx,dy);
            };
          
            var transform = ctx.transform;
            ctx.transform = function(a,b,c,d,e,f){
                var m2 = svg.createSVGMatrix();
                m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
                xform = xform.multiply(m2);
                return transform.call(ctx,a,b,c,d,e,f);
            };
          
            var setTransform = ctx.setTransform;
            ctx.setTransform = function(a,b,c,d,e,f){
                xform.a = a;
                xform.b = b;
                xform.c = c;
                xform.d = d;
                xform.e = e;
                xform.f = f;
                return setTransform.call(ctx,a,b,c,d,e,f);
            };
          
            var pt = svg.createSVGPoint();
            ctx.transformedPoint = function(x,y){
                pt.x=x; pt.y=y;
                return pt.matrixTransform(xform.inverse());
            };
        }
    </script>
</body>
</html>`;

console.log('[LiveMap] ✅ Gömülü HTML hazırlandı');

// Socket.IO
let io;
try {
    const socketIo = require('socket.io');
    io = socketIo(server, {
        cors: { origin: "*", methods: ["GET", "POST"] }
    });
    console.log('[LiveMap] ✅ Socket.IO hazır');
} catch (socketError) {
    console.log('[LiveMap] ❌ Socket.IO hatası:', socketError.message);
}

// HTTP Server
const server = http.createServer((req, res) => {
    console.log(`[LiveMap] 📡 ${req.method} ${req.url}`);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    if (req.url === '/' || req.url === '/map') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(mapHtml);
    } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'OK',
            mode: 'embedded',
            timestamp: Date.now()
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404');
    }
});

// Oyuncu verisi
let playersData = [];

if (io) {
    io.on('connection', (socket) => {
        console.log('[LiveMap] 🔗 Yeni bağlantı');
        socket.emit('playersData', playersData);
        
        socket.on('disconnect', () => {
            console.log('[LiveMap] 🔌 Bağlantı kapandı');
        });
    });
}

// QBCore
let QBCore = null;
try {
    QBCore = global.exports['qb-core'].GetCoreObject();
    console.log('[LiveMap] ✅ QBCore bağlandı');
} catch (qbError) {
    console.log('[LiveMap] ⚠️ QBCore yok - Test modunda');
}

function updatePlayers() {
    const newPlayers = [];
    
    try {
        if (QBCore) {
            const players = QBCore.Functions.GetPlayers();
            
            for (const playerId of players) {
                const player = QBCore.Functions.GetPlayer(playerId);
                if (player && player.PlayerData) {
                    const ped = GetPlayerPed(playerId);
                    const coords = GetEntityCoords(ped);
                    
                    newPlayers.push({
                        id: parseInt(playerId),
                        name: player.PlayerData.name || `Player ${playerId}`,
                        citizenid: player.PlayerData.citizenid,
                        x: Math.round(coords[0]),
                        y: Math.round(coords[1]),
                        z: Math.round(coords[2]),
                        job: player.PlayerData.job ? player.PlayerData.job.name : 'unemployed'
                    });
                }
            }
        } else {
            // Test oyuncusu
            for (let i = 1; i <= 3; i++) {
                newPlayers.push({
                    id: i,
                    name: `Test Player ${i}`,
                    x: Math.round(Math.random() * 1000 - 500),
                    y: Math.round(Math.random() * 1000 - 500),
                    z: 30,
                    job: ['police', 'ambulance', 'unemployed'][Math.floor(Math.random() * 3)]
                });
            }
        }
        
        playersData = newPlayers;
        
        if (io) {
            io.emit('playersData', playersData);
        }
        
        console.log(`[LiveMap] 📊 ${playersData.length} oyuncu güncellendi`);
        
    } catch (error) {
        console.log('[LiveMap] ⚠️ Güncelleme hatası:', error.message);
    }
}

// Sunucuyu başlat
const PORT = 8000;
server.listen(PORT, (error) => {
    if (error) {
        console.log('[LiveMap] ❌ Başlatma hatası:', error.message);
    } else {
        console.log('[LiveMap] =================================');
        console.log('[LiveMap] 🚀 GÖMÜLÜ HTML SUNUCU HAZIR!');
        console.log('[LiveMap] 🌐 Adres: http://localhost:' + PORT);
        console.log('[LiveMap] 📄 Mod: Gömülü HTML (dosya okuma yok)');
        console.log('[LiveMap] =================================');
        
        setTimeout(updatePlayers, 3000);
        setInterval(updatePlayers, 5000);
    }
});

console.log('[LiveMap] ✅ Gömülü versiyon yüklendi!');