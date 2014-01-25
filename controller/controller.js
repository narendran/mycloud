var express = require('express');
var googleapis = require('googleapis')
var app = express();

var API_ROOT = '/api/v1';
var PORT = 5000;

<<<<<<< HEAD
DRIVE_AUTH_TOKEN_RADHE = 'ya29.1.AADtN_VHxYiorzy8NhToWQ0wIJsSL-oCkARdiotlfJShbzDA7pgb6tkf6cklYPVaBQwymg'



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



=======
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/webui');
app.get("/", function handler (req, res) {
  res.render('home.html');
});

>>>>>>> 8ba1d32dd5aaf74ab872a0bcbc8ff2e8b56615d7
app.configure(function(){
  app.use(express.static(__dirname + '/webui'));
  app.use(express.errorHandler({
    dumpExceptions: true, 
    showStack: true
  }));
});

app.get(API_ROOT + '/list', function (request, response) {
<<<<<<< HEAD
  response.writeHead(200, {});
  var json_response = {
    'Content-Type' : 'application/json',
    'items':[]
  };
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
            json_repsonse.items.append({'title':result.items[i]['title']})
          }
        });
  });
  response.writeHead(200, json_response);
  response.end(JSON.stringify({'status': 'TODO: List'}));
=======
  response.writeHead(200, {'Content-Type' : 'application/json'});
  response.end(JSON.stringify(
    [{'filename': 'cat.jpg', 'size': '2000','lastmodified':'somedate','url':'http://drive.google.com/sdfsdf','shared':'True','editable':'False'}
    , {'filename': 'dog.jpg', 'size': '1000','lastmodified':'someotherdate','url':'http://dropbox.com/ef44','shared':'False','editable':'False'}]));
>>>>>>> 8ba1d32dd5aaf74ab872a0bcbc8ff2e8b56615d7
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
