var fs = require('fs')
var argv = require('optimist').argv

var infile = fs.readFileSync(argv.file)

console.log(infile.toString("base64"))
