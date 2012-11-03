inherits = require('util').inherits
var STATES = {NORMAL:0, ESC:1, CSI:2, OSC:3, CHARSET:4, OSCIN :5, SKIP:6 }
var debugMode = false;
var SPECIAL_CHARS = 
    {
        NIL  : 0,
        BELL : 7,
        BACKSPACE: 8,
        TAB: 9,
        LF   : 10,
        VT   : 11,
        FF   : 12,
        CR   : 13,
        ESC  : 27,
    }

function BasicStream(){
    this.skipCounter = 0;
    this.state = STATES.NORMAL;
    this.currentParam = 0;
    this.numchars = 0;
}
BasicStream.prototype.attach = function(screen){
    this.screen = screen;
}

BasicStream.prototype.dispatch = function(eventName, params){
    if(this.screen){
        this.screen[eventName](params)
    }
}

function debug(args){
    if(debugMode){
        console.log.apply(console, arguments);
    }
}

BasicStream.prototype.setDebugMode = function(mode, verbose){
    debugMode = mode
    this.verboseMode = verbose
    if(mode==true){
        //this.onAny(function(){
            //console.log("[DEBUG]",arguments);
        //});
    }
}

CSI_FUNCS = {
    65 : "cursorup",                //up down fwd back
    66 : "cursordown",
    67 : "cursorfwd",
    68 : "cursorback",
    72 : "cursorpos",
    74 : "eraseindisplay",
    75 : "eraseinline",
    109 : "charattrs",
    110 : "devicestatus",
    64 : "insertchars",
    69 : "cursornextline",
    70 : "cursorprevline",
    71 : "cursorcharabs",
    76 : "insertlines",
    77 : "deletelines",
    80 : "deletechars",
    88 : "erasechars",
    96 : "charsposabs",
    97 : "hposrel",
    99 : "senddevattrs",
    100 : "lineposabs",
    101 : "vposrel",
    102 : "hvpos",
    104 : "setmode",
    108 : "resetmode",
    114 : "setscrollreg",
    115 : "savecursor",
    117 : "restorecursor",
    73 : "cursorfwdtab",
    83 : "scrollup",
    84 : "scrolldown",
    90 : "cursorbacktab",
    98 : "repeatprecchar",
}


//Expects a single byte as an integer
BasicStream.prototype.feed = function(ch){
    //var str = String.fromCharCode(ch);
    if(ch>=32 && ch <=126){
        strtest = String.fromCharCode(ch)
    }else{
        strtest = ''
    }
    debug("[STREAM]", "[", this.state, "]", "processing char:", ++this.numchars, ch, strtest ); // @debug
    switch(this.state){
        case STATES.SKIP:
            this.skipCounter--;
            if(this.skipCounter==0){
                this.state = STATES.NORMAL;
            }
            break;
        case STATES.NORMAL:
            debug("normal mode " + ch) // @debug
            switch(ch){
                case SPECIAL_CHARS.NIL:
                    break;
                case SPECIAL_CHARS.BELL:
                    this
                case SPECIAL_CHARS.LF:
                case SPECIAL_CHARS.VT:
                case SPECIAL_CHARS.FF:
                    this.dispatch("linefeed");
                    break;
                case SPECIAL_CHARS.CR:
                    this.dispatch("carriagereturn");
                    break;
                case SPECIAL_CHARS.BACKSPACE:
                    this.dispatch("backspace");
                    break;
                case SPECIAL_CHARS.TAB:
                    this.dispatch("tab");
                    break;
                case SPECIAL_CHARS.ESC:
                    this.state = STATES.ESC;
                    break;
                default:
                    debug("Drawing ", ch); // @debug
                    this.dispatch("draw", ch)
                    break;
            }
            break;
        case STATES.ESC:
            switch(ch){
                // "["
                case 91:
                    this.state = STATES.CSI
                    this.params = []
                    break;
                case 93:
                    this.state = STATES.OSC
                    this.params = []
                    break

                // ESC P Device Control String ( DCS is 0x90).
                // "P"
                case 80:
                    this.state = STATES.OSC;
                    break;

                // ESC _ Application Program Command ( APC is 0x9f).
                // "_"
                case 95:
                    this.state = STATES.OSC;
                    break;

                    // ESC ^ Privacy Message ( PM is 0x9e).
                    // "^"
                case 94:
                    this.state = STATES.OSC;
                    break;

                    // ESC c Full Reset (RIS).
                    // "^"
                case 99:
                    this.dispatch("reset");
                    break;

                    // ESC E Next Line ( NEL is 0x85).
                    // ESC D Index ( IND is 0x84).
                case 69: //E
                    this.dispatch("nextline")
                        break;
                case 68: //D
                    this.dispatch("index")
                        break;

                    // ESC M Reverse Index ( RI is 0x8d).
                case 77: // M
                    this.dispatch("reverseindex");
                    break;

                    // ESC % Select default/utf-8 character set.
                    // @ = default, G = utf-8
                case 37: // %
                    this.dispatch("defaultcharset")
                        this.skipCounter = 1;
                    this.state = STATES.SKIP;
                    break;

                case 40: // ( <-- this seems to get all the attention
                case 41: // )
                case 42: // *
                case 43: // +
                case 45: // -
                case 46: // .
                    this.state = STATES.CHARSET;
                    break;

                    // Designate G3 Character Set (VT300).
                    // A = ISO Latin-1 Supplemental.
                    // Not implemented.
                case 47:
                    this.charset = null;
                    this.skipCounter = 1;
                    this.state = STATES.SKIP;
                break;
              case 55:
                this.dispatch("savecursor")
                this.state = STATES.NORMAL
                break;
              case 56:
                this.dispatch("restorecursor")
                this.state = STATES.NORMAL
                break;

              // ESC # 3 DEC line height/width
              case 35: // #
                this.skipCounter = 1
                this.state = STATES.SKIP;
                break;

              // ESC H Tab Set ( HTS is 0x88).
              case 72:
                // this.tabSet(this.x);
                this.state = STATES.NORMAL;
                break;

              // ESC = Application Keypad (DECPAM).
              case 61: //'='
                debug('Serial port requested application keypad.'); // @debug
                this.applicationKeypad = true;
                this.state = STATES.NORMAL;
                break;

              // ESC > Normal Keypad (DECPNM).
              case 62: //'>'
                debug('Switching back to normal keypad.'); // @debug
                this.applicationKeypad = false;
                this.state = STATES.NORMAL;
                break;

              default:
                this.state = STATES.NORMAL;
                debug('Unknown ESC control: ' + ch + '.'); // @debug
                break;
            }
            break;
        case STATES.CHARSET:
            switch(ch){
              // DEC Special Character and Line Drawing Set.
              case 48: //'0':
                this.dispatch("setcharset", "scld")
                break;
              // United States (USASCII).
              case 65: //'B':
              default:
                this.dispatch("defaultcharset")
                break;
            }
            break;
        case STATES.OSCIN:
            debug("OSCIN"); // @debug
            switch(ch){
                case 59:
                    this.state = STATES.NORMAL;
                    break;
                case 7:
                    this.screen.osc(this.oscprefix, this.oscdata)
                    this.state = STATES.NORMAL;
                    this.oscdata = []
                    break;
                default:
                    this.oscdata[this.oscdata.length] = strtest;
                    break;
            }
            break;
        case STATES.OSC:
            debug("OSC", ch) // @debug
            if(ch !== 27 && ch !== 7){
                //just ignore
                break;
            }else if(ch === 27){
                this.skipCounter = 1;
                this.state = STATES.SKIP;
                break;
            }
            /*
            if (ch >= 48 && ch <= 57) {
                this.oscprefix = ch-48;
                this.oscdata = []
                this.state = STATES.OSCIN; 
                debug("oscin state")
            }else if (ch !== 27 && ch !== 7){
                debug('Unknown OSC code.', ch);
                this.state = STATES.NORMAL;
            }else if (ch === 27){
                i++;
                // increment for the trailing slash in ST
            }
            break;*/
        case STATES.CSI:
            if (ch === 63 || ch === 62 || ch === 33) {
              this.prefix = ch;
              debug("prefix is ", ch); // @debug
              break;
            }

            // 0 - 9
            if (ch >= 48 && ch <= 57) {
              this.currentParam = this.currentParam * 10 + ch - 48;
              break;
            }

            // '$', '"', ' ', '\''
            if (ch === 36 || ch === 34 || ch === 32 || ch === 39) {
              this.postfix = ch;
              break;
            }

            this.params[this.params.length] = this.currentParam;
            this.currentParam = 0;

            // ';'
            if (ch === 59) break;

            this.state = STATES.NORMAL;
            var funcname = CSI_FUNCS[ch]
            debug(funcname) // @debug
            if(funcname){
                this.dispatch(funcname, this.params)
            }else{
                debug("unknown:", ch) // @debug
            }
    }
}
exports.BasicStream = BasicStream
