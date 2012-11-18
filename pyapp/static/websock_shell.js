var screen, strm, br_screen;

function setupTerminal(){
    var BasicStream = require('./termstream').BasicStream
    var BasicScreen = require('./screen').BasicScreen
    var BrowserScreen = require('./browserscreen').BrowserScreen
    strm = new BasicStream(); 
    screen = new BasicScreen(40, 80)
    var canvas = $('#mycanvas')[0]
    var context = canvas.getContext('2d');
    br_screen = new BrowserScreen(screen, context);
    strm.attach(screen)
    screen.dirtyAll = true;
    br_screen.clear();
}

function redraw(){
    br_screen.clear()
    br_screen.canvasDisplay()
}

$(document).ready(function(){
    setupTerminal();
});
