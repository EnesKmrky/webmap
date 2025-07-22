const express = require('express')
const fs = require('fs')
const app = express()
var http = require('http').Server(app);
var config = require('./config.json');
const port = config.port

var mapHTML = fs.readFileSync(config.mapHTMLPath, "utf8");
var socketIO = fs.readFileSync(config.socketIOPath, "utf8")

app.get('/', function (req, res) {
    res.send(mapHTML);
});

app.get('/socket.io.js', function (req, res) {
	res.send(socketIO);
})

const server = http.listen(port, () => console.log(`App listening at http://${config.IP}:${port}`))

const io = require('socket.io')(server);

function prepareAndSendPlayersData() {
	var toSend = []
	var count = 0
	var number = GetNumPlayerIndices();

	if (number > 0)
	{
		for (let i = 1; i < 1028; i++) {

			var ped = GetPlayerPed(i);
			if (ped != 0)
			{
				count = count + 1
				var [playerX, playerY, playerZ] = GetEntityCoords(ped);
				
				toSend.push({
					x: playerX,
					y: playerY,
					name: GetPlayerName(i)
				})

				if (count == number)
				{
					break;
				}
			}
		}
		
		sendPlayersData(toSend)
	}
}

function sendPlayersData(data) {
	io.sockets.emit('playersData', data);
}

setInterval(prepareAndSendPlayersData, 2000)
