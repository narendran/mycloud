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
  UserModel.find({'_id': userId}, function(err, users) {
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

  AuthGoogle.listfiles(request, consolidatedList, callback);
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
  console.log('User', request.user);
  response.writeHead(200, {'Content-Type' : 'application/json'});
  var json_response = new Array();
  // Should get auth token here.
  // Get authtoken from all services.
  var auth = AuthGoogle.getGoogleAuth(request);
  var search_key = "\'Service\'"  // Should be obtained from request. Should be enclosed within quotes
  console.log("SearchKey: " + search_key)

  // TODO: This auth check should likely happen earlier.
  if (! auth) {
    response.end(JSON.stringify({'error': 'Not logged in'}));
    return;
  }

  console.log("Before making call");
  console.log(new Date());
  googleapis.discover('drive', 'v2').execute(function(err, client) {
    var search_query = 'fullText contains ' +search_key;
    var query_obj= {'maxResults':10, 'q':search_query}
    console.log("query: " + JSON.stringify(query_obj))
    client
        .drive.files.list(query_obj)
        .withAuthClient(auth)
        .execute(function(err, result) {
          if (err) {
            console.error('Error while fetching file list: ', err, 'with result', result);
          }
          for (var i=0; i<result.items.length; i++) {
            console.log('error:', err, 'inserted:', result.items[i]['title']);
            json_response.push(AuthGoogle.convertFromGoogleFile(result.items[i]))
          }
          response.end(JSON.stringify(json_response));
        });
  });
});

app.get(API_ROOT + '/delete', function (request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});
  response.end(JSON.stringify({'status': 'TODO: Delete'}));
});

app.get(API_ROOT + '/update', function (request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});
  response.end(JSON.stringify({'status': 'TODO: Update'}));
});

app.get(API_ROOT + '/info', function(request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});

  console.log('User', request.user);
  if (! request.user) {
    response.end(JSON.stringify({'error': 'Not logged in'}));
    return;
  }

  var consolidatedInfo = {
    info: {
      free_bytes: 0,
      used_bytes: 0,
      total_bytes: 0
    },
    // 1 => Number of callbacks to wait for before publishing responses.
    // Right now, we only wait for a Google drive response.
    counter: 1
  };

  var callback = function() {
    console.log('Waiting for', consolidatedInfo.counter, 'more responses from backends.');
    if (consolidatedInfo.counter <= 0) {
      response.end(JSON.stringify(consolidatedInfo.info));
    }
  };

  AuthGoogle.getinfo(request, consolidatedInfo, callback);
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
