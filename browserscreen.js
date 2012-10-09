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
    COL_WIDTH = 8;
    ROW_HEIGHT = 16;
    this.context.fillStyle = this.foregroundColor;
    for(var i=0;i<this.screen.rows;i++){
        for(var j=0;j<this.screen.cols;j++){
            var outchar = this.screen.data[i][j].d
            if(outchar){
                this.context.fillText(outchar, COL_WIDTH * j + 2, ROW_HEIGHT * (i+1))
            }
        }
    }
}
exports.BrowserScreen = BrowserScreen

