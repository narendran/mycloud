var express = require('express');
var googleapis = require('googleapis')
var app = express();
var MongoStore = require('connect-mongo')(express);

var everyauth = require('everyauth');
var config = require('./config');
var AuthGoogle = require('./AuthGoogle');

var UserModel = config.mongoose.model('User', require('./User'));

var API_ROOT = '/api/v1';

everyauth.everymodule.findUserById(function(userId, callback) {
  UserModel.find({'id': userId}, function(err, users) {
    if(err) throw err;
    callback(null, users[0]);
  });
});

var app = express();

app.use(express.bodyParser())
.use(express.logger())
.use(express.cookieParser('miketesting'))
.use(express.session({
  secret: 'FxT10477A93d54HJx5',
  store: new MongoStore({mongoose_connection: config.mongoose.connections[0]})
}))
.use(everyauth.middleware());

app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/webui');
app.get("/", function handler (req, res) {
  res.render('home.html');
});

app.configure(function(){
  app.use(express.static(__dirname + '/webui'));
  app.use(express.errorHandler({
    dumpExceptions: true, 
    showStack: true
  }));
});


app.get(API_ROOT + '/list/:mimeType', function (request, response) {
  console.log('User', request.user);
  response.writeHead(200, {'Content-Type' : 'application/json'});

  console.log('User', request.user);
  if (! request.user) {
    response.end(JSON.stringify({'error': 'Not logged in'}));
    return;
  }

  var consolidatedList = {
    fileList: [],
    // 1 => Number of callbacks to wait for before publishing responses.
    // Right now, we only wait for a Google drive response.
    counter: 1
  };

  var callback = function() {
    console.log('Waiting for', consolidatedList.counter, 'more responses from backends.');
    if (consolidatedList.counter <= 0) {
      response.end(JSON.stringify(consolidatedList.fileList));
    }
  };

  switch(request.params.mimeType){
    case 'image' : {
      consolidatedList.counter++;
      request.params.mimeType = 'image/jpeg';
      AuthGoogle.listfiles(request, consolidatedList, callback);
      request.params.mimeType = 'image/png';
      AuthGoogle.listfiles(request, consolidatedList, callback);
      break;
    }
    case 'audio' : {
      request.params.mimeType = 'audio/mpeg';
      AuthGoogle.listfiles(request, consolidatedList, callback);
      break;
    }
    case 'video' : {
      request.params.mimeType = 'video/webm';
      AuthGoogle.listfiles(request, consolidatedList, callback);
      break;
    }
    default :{
      AuthGoogle.listfiles(request, consolidatedList, callback);  
    }
  }
  

});

app.get(API_ROOT + '/read', function (request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});
  response.end(JSON.stringify({'status': 'TODO: Read'}));
});

app.get(API_ROOT + '/add', function (request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});
  response.end(JSON.stringify({'status': 'TODO: Add'}));
});

app.get(API_ROOT + '/move', function (request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});
  response.end(JSON.stringify({'status': 'TODO: Move'}));
});

app.get(API_ROOT + '/search', function (request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});
  response.end(JSON.stringify({'status': 'TODO: Search'}));
});

app.get(API_ROOT + '/delete/:fileid', function (request, response) {
  console.log("FILE ID : "+request.params.fileid);
  var auth = AuthGoogle.getGoogleAuth(request);
  googleapis.discover('drive', 'v2').execute(function(err, client) {
    client
    .drive.files.delete({'fileId':request.params.fileid.toString()})
    .withAuthClient(auth)
    .execute(function(err, result) {
      if(err) {console.log(err)}
        if(result) {
          console.log(result);
          response.writeHead(200, {'Content-Type' : 'application/json'});
          response.end(JSON.stringify({'status': 'TODO: Delete'}));
        }
      });
  });
  
});

app.get(API_ROOT + '/update', function (request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});
  response.end(JSON.stringify({'status': 'TODO: Update'}));
});

app.get("/media.html", function (req, res) {
  var file = req.user!=undefined ? '/webui/media.html' : '/webui/index.html';
  var fs = require('fs');
  fs.readFile(__dirname + file, function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end(err.toString());
    }
    res.writeHead(200);
    res.end(data);
  });
});

app.get("/", function (req, res) {
  console.log(req.toString(),'color: green;');
  var file = req.user!=undefined ? '/webui/home.html' : '/webui/index.html';
  var fs = require('fs');
  fs.readFile(__dirname + file, function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end(err.toString());
    }
    res.writeHead(200);
    res.end(data);
  });
});

app.listen(config.port, function() {
  console.log('Listening on port ', config.port);
});
