var pty = require('pty.js');
var BasicStream = require('./termstream').BasicStream
var BasicScreen = require('./screen').BasicScreen
var stdin = process.openStdin(); 

var strm = new BasicStream(); 
var scrn = new BasicScreen(30, 40)
strm.setDebugMode(true, true)
strm.attach(scrn)
require('tty').setRawMode(true);    
scrn.reset()


var term = pty.spawn('bash', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env
});

process.stdin.resume()

process.stdin.on('data', function (chunk) {
    term.write(chunk)
    //for(var i=0;i<chunk.length;i++){
        //strm.feed(String.fromCharCode(chunk[i]))
    //}

    //scrn.display()
    //process.stdout.write('data: ' + chunk);
});


term.on('data', function(data) {
    console.log("got ", data.length, "bytes")
    strm.feed(data)
    scrn.display()
    //process.stdout.write(data)
});
