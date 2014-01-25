var express = require("express"), app = express(), fs = require('fs'), http = require('http'), url = require('url')
var server = http.createServer(app), io = require('socket.io').listen(server);

server.listen(8080);

app.configure(function(){
  app.use(express.static(__dirname + '/'));
  app.use(express.errorHandler({
    dumpExceptions: true, 
    showStack: true
  }));
});

app.get("/", function handler (req, res) {
        fs.readFile(__dirname + '/index.html', function (err, data) {
                if (err) {
                        res.writeHead(500);
                        return res.end('Error loading index.html');
                }

                res.writeHead(200);
                res.end(data);
        });
});
