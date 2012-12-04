MODES = { LNM : 20,
          IRM : 4,
          DECTCEM : 25 << 5,
          DECSCNM : 5 << 5,
          DECOM : 6 << 5,
          DECAWM : 7 << 5,
          DECCOLM : 3 << 5
        }
exports.MODES = MODES

//exports.COLORS = ["black","red","green","yellow","blue","magenta","cyan","white","",""]
/*
index
reverseindex
defaultcharset
savecursor
restorecursor
setcharset
defaultcharset
funcname
cursorup
cursordown
cursorfwd
cursorback
cursorpos
eraseindisplay
eraseinline
charattrs
devicestatus
insertchars
cursornextline
cursorprevline
cursorcharabs
insertlines
deletelines
deletechars
erasechars
charsposabs
hposrel
senddevattrs
lineposabs
vposrel
hvpos
setmode
resetmode
setscrollreg
savecursor
restorecursor
cursorfwdtab
scrollup
scrolldown
cursorbacktab
repeatprecchar
*/

function BasicScreen(rows, columns){
    this.rows = rows;
    this.dirty = {};
    this.dirtyAll = false;
    this.cols = columns;
    this.cursor = {x:0, y:0}
    this.margins = {top:0, bottom: rows-1}
    this.defaultLine = function(n){
        var returnval = []
        for(var i=0;i<n;i++){
            returnval.push({d:null})
        }
        return returnval;
    }
    this.data = []
    for(var i=0;i<this.rows;i++){
        this.data.push(this.defaultLine(this.cols))
    }
    this.modes = {}
    this.color = undefined;
    this.scrollstart = 0
    this.scrollend = this.rows
    this.reset()
}

BasicScreen.prototype.debug = function(){
    if(this.debugMode){
        console.log.apply(console, arguments)
    }
}

BasicScreen.prototype.ensureBounds = function(){//{{{
    if(this.cursor.y >= this.rows) this.cursor.y = this.rows-1;
    if(this.cursor.y < 0) this.cursor.y = 0;

    if(this.cursor.x >= this.cols) this.cursor.x = this.cols - 1;
    if(this.cursor.x < 0) this.cursor.x = 0;
}//}}}

BasicScreen.prototype.cursorup = function(params){//{{{
    if(!params || params[0] == 0){
        n = 1
    }else{
        n = params[0]
    }
    this.cursor.y -= n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursordown = function(params){//{{{
    if(!params || params[0] == 0){
        n = 1
    }else{
        n = params[0]
    }
    this.cursor.y += n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorleft = function(params){//{{{
    if(!params || params[0] == 0){
        n = 1
    }else{
        n = params[0]
    }
    this.cursor.x -= n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorright = function(params){//{{{
    if(!params || params[0] == 0){
        n = 1
    }else{
        n = params[0]
    }
    if(!n || n == 0) n = 1
    this.cursor.x += n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorfwd = function(params){//{{{
    if(!params || params[0] == 0){
        n = 1
    }else{
        n = params[0]
    }
    this.cursor.x += n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorback = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.x -= n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.carriagereturn = function(){//{{{
    this.cursor.x = 0;
}//}}}

BasicScreen.prototype.display = function(){//{{{
    var rowStrLen = Number(this.rows).toString().length
    function padToLen(str, len){
        while(str.length < len) str = " " + str
        return str;
    }
    for(var i=0;i<this.rows;i++){
        process.stderr.write("[" + padToLen(Number(i).toString(), rowStrLen) + "]")
        for(var j=0;j<this.cols;j++){
            var outchar = String.fromCharCode(this.data[i][j].d) || " "
            process.stderr.write(outchar)
        }
        process.stderr.write("\n")
    }
}//}}}


BasicScreen.prototype.insertlines = function(params){
    if(!params || params[0] < 1) n = 1
    else n = params[0]

    this.dirtyAll = true
    var row = this.cursor.y
    for(var i=0;i<n;i++){
        this.data.splice(row, 0, this.defaultLine(this.cols))
        this.data.splice(this.scrollend, 1)
        //Oj = this.rows - 1 + this.ybase - j + 1;
        //this.data.splice(this.scrollend, 0, this.defaultLine(this.cols))
    }
}

BasicScreen.prototype.log = function(){//{{{
    var rowStrLen = Number(this.rows).toString().length
    function padToLen(str, len){
        while(str.length < len) str = " " + str
        return str;
    }
    for(var i=0;i<this.rows;i++){
        var rowtext = ""
        rowtext += "[" + padToLen(Number(i).toString(), rowStrLen) + "]"
        for(var j=0;j<this.cols;j++){
            var outchar = this.data[i][j].d || " "
            rowtext += outchar
        }
        this.debug(rowtext) // @debug
    }
}//}}}

BasicScreen.prototype.canvasDisplay = function(context){//{{{
    COL_WIDTH = 8;
    ROW_HEIGHT = 16;
    for(var i=0;i<this.rows;i++){
        for(var j=0;j<this.cols;j++){
            var outchar = this.data[i][j].d
            if(outchar){
                context.fillText(outchar, COL_WIDTH * j + 2, ROW_HEIGHT * (i+1))
            }
        }
    }
}//}}}

BasicScreen.prototype.defaultcharset = function(){
    this.debug("defaultcharset!", arguments); //@debug
}

BasicScreen.prototype.setcharset = function(){
    this.debug("setcharset!", arguments); //@debug
}

BasicScreen.prototype.eraseinline = function(params){
    if(!params || params[0] == 0){
        for(var i=this.cursor.x;i<this.cols;i++){
            this.data[this.cursor.y][i] = {}
        }
        this.dirty[this.cursor.y] = 1
        //erase from cursor to EOL
    }else if(params[0] == 1){
        for(var i=0;i<=this.cursor.x;i++){
            this.data[this.cursor.y][i] = {}
        }
        this.dirty[this.cursor.y] = 1
        //erase from beginning of line to cursor inclusive
    }else if(params[0] == 2){
        for(var i=0;i<this.cols;i++){
            this.data[this.cursor.y][i] = {}
        }
        this.dirty[this.cursor.y] = 1
        //erase entire line
    }
    this.debug("eraseinline!", arguments); //@debug
}
 
BasicScreen.prototype.hvpos = function(){
    this.debug("hvpos!", arguments); //@debug
}

BasicScreen.prototype.resetmode = function(){
    //this.debug("reset mode!", arguments); //@debug
}

BasicScreen.prototype.savecursor = function(){
    this.debug("savecursor!", arguments); //@debug
}

BasicScreen.prototype.restorecursor = function(){
    this.debug("restorecursor!", arguments); //@debug
}
 

BasicScreen.prototype.senddevattrs = function(){
    this.debug("senddevattrs!", arguments); //@debug
}
 

BasicScreen.prototype.setmode = function(){
    /*
            Ps = 2  -> Keyboard Action Mode (AM).  Ps = 4  -> Insert Mode (IRM).
            Ps = 1 2  -> Send/receive (SRM).
            Ps = 2 0  -> Automatic Newline (LNM).
    */
    //this.debug("set mode!", arguments); //@debug
}

BasicScreen.prototype.advanceScroll = function(){
    console.log("advancing scroll", this.scrollstart, this.scrollend);
    this.dirtyAll = true
    //console.log(this.scrollstart, this.scrollend)
    this.data.splice(this.scrollstart, 1)
    this.data.splice(this.scrollend, 0, this.defaultLine(this.cols))
}

BasicScreen.prototype.setscrollreg = function(params){
    //TODO check prefix, if its private mode reset then do nothing here
    if(!params[0]) params[0] = 1;
    if(!params[1]) params[1] = this.rows;
    this.scrollstart = params[0] - 1
    this.scrollend = params[1] - 1
    //this.debug("set scroll reg!", arguments); //@debug
}

BasicScreen.prototype.charattrs = function(){
    //console.log("SGR", arguments)
    //this.debug("select graphic rendition!", arguments[0], arguments[1]); //@debug
    params = arguments[0];
    if(!params) return
    while(params.length){
        var colorCode = params.shift()
        switch(colorCode){
            case 0:
                //console.log("resetting color!");
                this.color = undefined;
                this.bold = false;
                this.ul = false;
                this.blink = false;
                this.inverse = false;
                this.invisible = false;
                break;
            case 1:
                this.bold = true;
                break;
            case 4:
                this.ul = true;
                break;
            case 5:
                this.blink = true;
                break;
            case 7:
                this.inverse = true;
                break;
            case 8:
                this.invisible = true;
                break;
            default:
                if(colorCode >= 30 && colorCode < 38){
                    this.color = colorCode - 30;
                }else if(colorCode == 39){
                    this.debug("resetting fg color to default")
                    this.color = null;
                }else if(colorCode == 38){
                    var check256 = params.shift()
                    if(check256 == 5){
                        this.color = -params.shift()
                        this.debug("setting fg color to ", this.color)
                        continue;
                    }
                }

                if(colorCode >= 40 && colorCode < 48){
                    this.bg = colorCode - 40;
                }else if(colorCode == 49){
                    this.debug("reset bg color!")
                    this.bg = null;
                }else if(colorCode == 48){
                    var check256 = params.shift()
                    if(check256 == 5){
                        this.bg = -params.shift()
                        this.debug("setting bg color to ", this.bg)
                        continue;
                    }
                }
        }
    }
}

BasicScreen.prototype.eraseindisplay = function(params){
    //0 Erase from the active position to the end of the screen, inclusive (default)
    //1 Erase from start of the screen to the active position, inclusive
    //2 Erase all of the display – all lines are erased, changed to single-width, and the cursor does not move.
    if(!params || params[0] == 0){
        for(var i=this.cursor.y+1;i<this.rows;i++){
            this.data[i] = this.defaultLine(this.cols)
            this.dirty[i] = 1
        }
        this.eraseinline([0])
    }else if(params[0] == 1){
        for(var i=0;i<this.cursor.y;i++){
            this.data[i] = this.defaultLine(this.cols)
            this.dirty[i] = 1
        }
        this.eraseinline([1])
    }else if(params[0] == 2){
        for(var i=0;i<this.rows;i++){
            this.data[i] = this.defaultLine(this.cols)
        }
        this.dirtyAll = true;
    }
    this.debug("erase in display!", arguments); //@debug
}

BasicScreen.prototype.cursorpos = function(params){
    //this.debug("cursor pos!", arguments); //@debug
    var row = params[0] - 1;
    var col;
    if (params.length >= 2) { 
       col = params[1] - 1; 
    } else {
       col = 0; 
    }
   
    if (row < 0) { 
       row = 0; 
    } else if (row >= this.rows) {
       row = this.rows - 1; 
    }
   
    if (col < 0) { 
       col = 0; 
    } else if (col >= this.cols) {
       col = this.cols - 1; 
    }
    this.cursor = {x:col, y:row} 
}

BasicScreen.prototype.reset = function(){
    //set all the modes to defaults
    this.modes = {}
    this.modes[MODES.DECAWM] = 1
    this.modes[MODES.DECTCEM] = 1
    this.modes[MODES.LNM] = 1
    //this.margins = something
    //this.charset = 0
    //this.tabstops
    this.cursor = {x:0, y:0} // MOB TODO: this should check for DECOM
}

//need to implement:
//  insert_characters (insertCharacters)
BasicScreen.prototype.draw = function(ch){
    /*Display a character at the current cursor position and advance
      the cursor if ~pyte.modes.DECAWM is set.
        :param unicode char: a character to display.
        """
        */
        //# Translating a given character.
        //char = char.translate([self.g0_charset,
                               //self.g1_charset][self.charset])

        //# If this was the last column in a line and auto wrap mode is
        //# enabled, move the cursor to the next line. Otherwise replace
        //# characters already displayed with newly entered.
    if(this.cursor.x == this.cols){
        if(this.modes[MODES.DECAWM] > 0){
            this.linefeed()
        }else{
            this.cursor.x -= 1
        }
    }
    if(this.modes.IRM > 0){
        this.insertChars(1)
    }

    //this.debug("screen drawing",this.cursor.y, this.cursor.x, ch) //@debug
    //console.log("drawing char", ch, "at", this.cursor.y, this.cursor.x)
    var b = {d:ch, c:this.color}
    if(this.bold) b.bold = true
    if(this.bg) b.bg = this.bg
    this.data[this.cursor.y][this.cursor.x] = b
    this.cursor.x += 1
    this.dirty[this.cursor.y] = 1
}

BasicScreen.prototype.backspace = function(){
    this.cursorback();
}

BasicScreen.prototype.index = function(){
    //TODO handle scroll regions?
    if(this.cursor.y >= this.rows - 1){
        this.cursor.y = this.rows - 1;
        this.advanceScroll()
        //this.data.shift()
        //this.data.push(this.defaultLine(this.cols))
        this.dirtyAll = true;
    }else{
        this.cursordown()
    }
}

BasicScreen.prototype.linefeed = function(){
    //MOB TODO this needs to handle creating new lines, margins, etc.
    this.index()
    if(this.modes[MODES.LNM] > 0){
        this.carriagereturn()
    }
}

exports.BasicScreen = BasicScreen
