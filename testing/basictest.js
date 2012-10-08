var fs = require('fs')
var BasicScreen = require('./screen').BasicScreen
var screen = new BasicScreen(3, 10); 
screen.modes[require('./screen').MODES.DECAWM] = 1
console.log(screen.modes)

function drawAll(scrn, str){
    for(var i=0;i<str.length;i++){
        scrn.draw(str[i])
    }
}

drawAll(screen, "abcdefghijklmnop")
console.log(screen.data)
screen.display()
