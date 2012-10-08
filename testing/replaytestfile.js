var fs = require('fs')
var argv = require('optimist')
           .boolean('r')
           .boolean('s')
           .argv;

var BasicStream = require('../termstream').BasicStream
var BasicScreen = require('../screen').BasicScreen
var strm = new BasicStream(); 
var scrn = new BasicScreen(40, 80)
strm.setDebugMode(true, true)
strm.attach(scrn)

var filename = process.argv[2]
var filedata = fs.readFileSync(argv.file, 'utf-8')

if(argv.r){
    for(var i=0;i<filedata.length;i++){
        strm.feed(filedata[i])
    }
}else{
    var lines = filedata.split("\n");
    console.log("writing", lines.length, "lines", filedata.length, "bytes")
    for(var i=0;i<lines.length;i++){
        var line = lines[i]
        if(line){
            var linestr = JSON.parse(line)
            console.log("feeding", line);
            for(var j=0;j<linestr.length;j++){
                strm.feed(linestr[j])
            }
        }
    }
}
console.log("done doin it.");

scrn.display()


//inputdata = "\u001b]2;mike@new-host: ~\u0007"
//inputdata += "\u001b]1;~\u0007" 
