var tls = require('tls')
var fs = require('fs')
var READY = 0;
var CONNECTED = 1;

SessionManager  = function(){
    this.sessions = {};
}

SessionManager.prototype.bindToIo = function(io){
    var self = this;
    io.sockets.on('connection', function(socket){

        socket.on("connect", function(d){
            console.log("new incoming connection.");
            var session = self.sessions[d.sid];
            if(!session) return;
            socket.endpoint = session.host;
            session.host.webclient.push(socket);
        });

        socket.on("message", function(d){
            console.log("received from client", JSON.stringify(d));
            if(!socket.sid){
                console.log("finding sid");
                var msg = JSON.parse(d);
                socket.sid = msg.sid;
                var session = self.sessions[msg.sid];
                if(!session){
                    console.log("no session found for", msg.sid);
                    return;
                }
                socket.endpoint = session.host;
                session.host.webclient.push(socket);
            }else if(socket.endpoint){
                socket.endpoint.write(d);
            }
        });

    });
}

SessionManager.prototype.serveTcp = function(){
    var self = this;
    tls.createServer(options, function(c){
        c.state = 0;
        c.on("data", function(data){
            console.log("got", data.length, "bytes")
            if(c.endpoint){
                c.endpoint.write(data);
            }else if(c.webclient){
                // TODO base 64 encode this stuff?
                for(var i=0;i<c.webclient.length;i++){
                    c.webclient[i].send(data.toString("base64"));//.toString("utf-8"));
                }
            }else{
                if(data.toString("utf-8") == 'createsession'){
                    c.session =  "abcd"//randomString(SESSION_ID_SIZE);
                    c.webclient = []
                    self.sessions[c.session] = {host:c, state:READY}
                    c.write(c.session);
                }else{
                    var datastr = data.toString("utf-8");
                    if(datastr.substring(0,5) == "join " && datastr.length == (5 + SESSION_ID_SIZE)){
                        var sessionId = datastr.substring(5)
                        session = self.sessions[sessionId]
                        console.log("found session with id", sessionId, "in state", session.state);
                        session.client = c;
                        session.host.endpoint = c;
                        c.endpoint = session.host
                    }
                }
            }
        });
        c.on("end", function(s){
            console.log("disconnected.");
        });
    }).listen(8000);
}
exports.SessionManager = SessionManager;

var options = { key: fs.readFileSync('keys/mikeskey.pem'), cert: fs.readFileSync('keys/mikes-cert.pem') }

