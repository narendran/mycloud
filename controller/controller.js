var express = require('express');
var googleapis = require('googleapis')
var app = express();

var API_ROOT = '/api/v1';
var PORT = 5000;

DRIVE_AUTH_TOKEN_RADHE = 'ya29.1.AADtN_WlzM707qSCU5dfKyXfvnmJ1sG4IoisGkYn733JFsqx6hjKo5EgSxGFyPmkMa2AOw'

function extractEssentialInfoForFile(file) {
  return {
    'filename': file.title,
    'size': file.fileSize,
    'lastmodified': file.modifiedDate
  }
}

function getGoogleAuth(request) {
  var auth=  new googleapis.OAuth2Client();
    auth.setCredentials({
      access_token: DRIVE_AUTH_TOKEN_RADHE  // Fetch from DB for the user.
    });
  return auth;
};

googleapis.discover('drive', 'v2').execute(function(err, client) {
    var auth = getGoogleAuth(null)
    client
        .drive.files.list({'maxResults': '1'})
        .withAuthClient(auth)
        .execute(function(err, result) {
            console.log('error:', err, 'inserted:', result)
        });
});



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

app.get(API_ROOT + '/list', function (request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});
  var json_response = new Array();
  // Should get auth token here.
  // Get authtoken from all services.
  var auth = getGoogleAuth(request);
  googleapis.discover('drive', 'v2').execute(function(err, client) {
    client
        .drive.files.list({'maxResults': '1'})
        .withAuthClient(auth)
        .execute(function(err, result) {
          for (var i=0; i<result.items.length; i++) {
            console.log('error:', err, 'inserted:', result.items[i]['title'])
            json_response.push(extractEssentialInfoForFile(result.items[i]))
          }
        });
  });
  //response.writeHead(200, json_response);
  response.end(JSON.stringify(json_response));
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

app.get(API_ROOT + '/delete', function (request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});
  response.end(JSON.stringify({'status': 'TODO: Delete'}));
});

app.get(API_ROOT + '/update', function (request, response) {
  response.writeHead(200, {'Content-Type' : 'application/json'});
  response.end(JSON.stringify({'status': 'TODO: Update'}));
});

app.get("/", function handler (req, res) {
  var fs = require('fs');
  fs.readFile(__dirname + '/webui/home.html', function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end(err.toString());
    }
    res.writeHead(200);
    res.end(data);
  });
});

app.listen(PORT);
