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

COL_WIDTH = 7;
ROW_HEIGHT = 14;
exports.COLORS = ["black","red","green","yellow","blue","magenta","cyan","white","",""]



BrowserScreen = function(screen, context){
    this.screen = screen
    this.context = context;
    this.backgroundColor = '#111'
    this.foregroundColor = '#fff'
    this.setFont("monospace")
}

BrowserScreen.prototype.setFont = function(font){
    this.font = '12px ' + font;
    this.boldFont = 'bold 12px ' + font;
    this.context.font = '12px ' + font;
}


BrowserScreen.prototype.clear = function(){
    this.context.fillStyle = this.backgroundColor;
    if(this.screen.dirtyAll){
        this.context.fillRect(0,0, COL_WIDTH * (this.screen.cols + 2) , ROW_HEIGHT * this.screen.rows) 
        return;
    }
    for(var i in this.screen.dirty){
        this.context.fillRect(0,ROW_HEIGHT * i,COL_WIDTH*(this.screen.cols+2),ROW_HEIGHT);
    }
}

BrowserScreen.prototype.canvasDisplay = function(){
    //this.context.font = '12px monospace';
    this.context.fillStyle = this.foregroundColor;
    this.context.textBaseline = 'bottom';
    var curColor = undefined;
    for(var i=0;i<this.screen.rows;i++){
        if( !this.screen.dirty[i] && !this.screen.dirtyAll){
            continue;
        }else{
        }
        //this.screen.dirty[i] = 0;
        for(var j=0;j<this.screen.cols;j++){
            var ch = this.screen.data[i][j]
            var outchar = String.fromCharCode(ch.d)
            if(outchar){
                if(ch.c == undefined){
                    this.foregroundColor = 'white'
                    this.context.fillStyle = this.foregroundColor;
                }else if(ch.c != undefined && ch.c != curColor){
                    curColor = ch.c
                    this.foregroundColor = ch.bold ? BOLDCOLORS[ch.c] : COLORS[ch.c]
                    if(ch.bold){
                        this.context.font = this.font;
                    }else{
                        this.context.font = this.boldFont
                    }
                    this.context.fillStyle = this.foregroundColor;
                    //console.log("color",this.foregroundColor, ch.bold)
                }
                this.context.fillText(outchar, COL_WIDTH * j + 2, ROW_HEIGHT * (i+1))
            }
        }
    }
    this.screen.dirty = {};
    this.screen.dirtyAll = false;
}
exports.BrowserScreen = BrowserScreen

