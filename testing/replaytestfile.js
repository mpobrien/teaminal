var fs = require('fs')
var argv = require('optimist')
           .boolean('r')
           .boolean('s')
           .boolean('d')
           .argv;

var BasicStream = require('../lib/termstream').BasicStream
var BasicScreen = require('../lib/screen').BasicScreen
var strm = new BasicStream(); 
var scrn = new BasicScreen(40, 80)
if(argv.d){
    scrn.debugMode = true
    strm.setDebugMode(true, true)
}
strm.attach(scrn)

var filename = process.argv[2]
var filedata = fs.readFileSync(argv.file, 'utf-8')

var benchRuns = argv.b || 1;

if(argv.r){
    var start = +new Date()
    for(var j=0;j<benchRuns;j++){
        for(var i=0;i<filedata.length;i++){
            strm.feed(filedata[i].charCodeAt(0))
        }
    }
    var end = +new Date()
    if(benchRuns>1){
        console.log(benchRuns, "runs");
        var timeElapsed = end - start;
        console.log(timeElapsed, "total time");
        console.log(timeElapsed / benchRuns, "avg time per run");
    }
}else{
    var lines = filedata.split("\n");
    //console.log("writing", lines.length, "lines", filedata.length, "bytes")
    for(var i=0;i<lines.length;i++){
        var line = lines[i]
        if(line){
            var linestr = JSON.parse(line)
            for(var j=0;j<linestr.length;j++){
                strm.feed(linestr[j])
            }
        }
    }
}
console.log("done doin it.");

scrn.display()
//console.log(scrn.data)


//inputdata = "\u001b]2;mike@new-host: ~\u0007"
//inputdata += "\u001b]1;~\u0007" 
