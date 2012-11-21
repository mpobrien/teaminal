var express = require('express');
var app = express();
var server = require('http').createServer(app)
var io = require('socket.io').listen(server);
var sessions = require('./sessions')

server.listen(80);

var sessionWrapper = new SessionManager();
sessionWrapper.bindToIo(io);
sessionWrapper.serveTcp();
