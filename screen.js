MODES = { LNM : 20,
          IRM : 4,
          DECTCEM : 25 << 5,
          DECSCNM : 5 << 5,
          DECOM : 6 << 5,
          DECAWM : 7 << 5,
          DECCOLM : 3 << 5
        }
exports.MODES = MODES

/*
linefeed
carriagereturn
backspace
tab
draw
reset
nextline
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
    this.reset()
}

BasicScreen.prototype.ensureBounds = function(){//{{{
    if(this.cursor.y >= this.rows) this.cursor.y = this.rows-1;
    if(this.cursor.y < 0) this.cursor.y = 0;

    if(this.cursor.x >= this.cols) this.cursor.x = this.cols - 1;
    if(this.cursor.x < 0) this.cursor.x = 0;
}//}}}

BasicScreen.prototype.cursorup = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.y -= n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursordown = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.y += n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorleft = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.x -= n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorright = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.x += n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorfwd = function(n){//{{{
    if(!n || n == 0) n = 1
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
            var outchar = this.data[i][j].d || " "
            process.stderr.write(outchar)
        }
        process.stderr.write("\n")
    }
}//}}}


BasicScreen.prototype.defaultcharset = function(){
    console.log("defaultcharset!", arguments);
}

BasicScreen.prototype.setcharset = function(){
    console.log("setcharset!", arguments);
}

BasicScreen.prototype.eraseinline = function(){
    console.log("eraseinline!", arguments);
}
 
BasicScreen.prototype.hvpos = function(){
    console.log("hvpos!", arguments);
}

BasicScreen.prototype.resetmode = function(){
    console.log("reset mode!", arguments);
}

BasicScreen.prototype.savecursor = function(){
    console.log("savecursor!", arguments);
}

BasicScreen.prototype.restorecursor = function(){
    console.log("restorecursor!", arguments);
}
 

BasicScreen.prototype.senddevattrs = function(){
    console.log("senddevattrs!", arguments);
}
 

BasicScreen.prototype.setmode = function(){
    console.log("set mode!", arguments);
}

BasicScreen.prototype.setscrollreg = function(){
    console.log("set scroll reg!", arguments);
}

BasicScreen.prototype.charattrs = function(){
    console.log("select graphic rendition!", arguments);

}

BasicScreen.prototype.eraseindisplay = function(){
    console.log("erase in display!", arguments);
}

BasicScreen.prototype.cursorpos = function(params){
    console.log("cursor pos!", arguments);
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

    this.data[this.cursor.y][this.cursor.x] = {d:ch} //MOB TODO: set the cursor attrs here as well
    this.cursor.x += 1
}

BasicScreen.prototype.backspace = function(){
    this.cursorback();
}

BasicScreen.prototype.index = function(){
    //MOB TODO this needs to handle creating new lines, margins, etc.
    this.cursordown()
}

BasicScreen.prototype.linefeed = function(){
    //MOB TODO this needs to handle creating new lines, margins, etc.
    this.index()
    if(this.modes[MODES.LNM] > 0){
        this.carriagereturn()
    }
}

exports.BasicScreen = BasicScreen
