#!/usr/bin/env node
var pty = require('pty.js');
var fs = require('fs');
var stdin = process.openStdin(); 
require('tty').setRawMode(true);    
process.stdin.resume()

outstream = fs.createWriteStream('outfile.txt', {flags:'w'})
outstream.on("open", function(){
    var term = pty.spawn('bash', [], {
          name: 'xterm-256color',
          cols: 80,
          rows: 30,
          cwd: process.env.HOME,
          env: process.env
    });
    term.on('data', function(data) {
        process.stdout.write(data);
        outstream.write(data);
    });
    term.on('exit', function(data) {
        outstream.end()
        process.exit(0)
    });
    process.stdin.on('data', function (chunk) {
        term.write(chunk)
    });
});
/*

var outfile = fs.open('outfile.txt', 'w', function(err, fd){
    if(err){
        console.log(err);
        return;
    }
    var term = pty.spawn('bash', [], {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: process.env.HOME,
          env: process.env
    });

    term.on('data', function(data) {
        process.stdout.write(data);
        fs.writeSync(fd, data, 0, data.length, null)
    });
    term.on('exit', function(data) {
        fs.closeSync(fd)
        process.exit(0)
    });


})



*/



