var fs = require('fs');
var http = require('http');

var filedata = fs.readFileSync("homepage.html")

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(filedata);
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');

