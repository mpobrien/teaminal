var express = require('express');
var app = express();
var server = require('http').createServer(app)
var io = require('socket.io').listen(server);
var sessions = require('./sessions')

server.listen(80);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.use("/static", express.static(__dirname + '/static'))

var sessionWrapper = new SessionManager();
sessionWrapper.bindToIo(io);
sessionWrapper.serveTcp();
