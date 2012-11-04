//var COLORS = require('./screen').COLORS
var COLORS = [
    '#000000', //BLACK
    '#98565E',//RED 
    '#66825D',//GREEN 
    '#969176',//YELLOW 
    '#4D6585',//BLUE 
    '#967395',//MAGENTA 
    '#5F7F7B',//CYAN 
    '#BFBFBF']//WHITE 
var BOLDCOLORS = [
    '#000000', //BLACK
    '#CFA3A9',//RED 
    '#CAF7BB',//GREEN 
    '#FFF8BC',//YELLOW 
    '#83A3BE',//BLUE 
    '#BBA9CF',//MAGENTA 
    '#96CCCC',//CYAN 
    '#FFFFFF',//WHITE 
]

exports.COLORS = ["black","red","green","yellow","blue","magenta","cyan","white","",""]



BrowserScreen = function(screen, context){
    this.screen = screen
    this.context = context;
    this.backgroundColor = '#000'
    this.foregroundColor = '#fff'
}


BrowserScreen.prototype.clear = function(){
    this.context.fillStyle = this.backgroundColor;
    this.context.fillRect(0,0,1000,1000);
}

BrowserScreen.prototype.canvasDisplay = function(){
    //this.context.font = '12px monospace';
    COL_WIDTH = 7;
    ROW_HEIGHT = 14;
    this.context.fillStyle = this.foregroundColor;
    var curColor = undefined;
    for(var i=0;i<this.screen.rows;i++){
        for(var j=0;j<this.screen.cols;j++){
            var ch = this.screen.data[i][j]
            var outchar = String.fromCharCode(ch.d)
            if(outchar){
                if(ch.c == undefined){
                    this.foregroundColor = 'white'
                    this.context.fillStyle = this.foregroundColor;
                    this.context.font = '12px monospace';
                }else if(ch.c != undefined && ch.c != curColor){
                    curColor = ch.c
                    this.foregroundColor = ch.bold ? BOLDCOLORS[ch.c] : COLORS[ch.c]
                    if(ch.bold){
                        this.context.font = 'bold 12px monospace';
                    }else{
                        this.context.font = '12px monospace';
                    }
                    this.context.fillStyle = this.foregroundColor;
                    //console.log("color",this.foregroundColor, ch.bold)
                }
                this.context.fillText(outchar, COL_WIDTH * j + 2, ROW_HEIGHT * (i+1))
            }
        }
    }
}
exports.BrowserScreen = BrowserScreen

