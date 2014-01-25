var express = require('express');
var googleapis = require('googleapis')
var app = express();
var MongoStore = require('connect-mongo')(express);

var everyauth = require('everyauth');
var config = require('./config');

var UserModel = config.mongoose.model('User', require('./User'));

var API_ROOT = '/api/v1';
var findOrCreateUserByGoogleData = function(googleMetadata, promise) {
  console.log(googleMetadata);
  UserModel.find({'id': googleMetadata.id}, function(err, users) {
    if(err) throw err;
    if(users.length > 0) {
       promise.fulfill(users[0]);
     } else {
       var user = new UserModel();
       user.id = googleMetadata.id;
       user.given_name = googleMetadata.given_name;
       user.family_name = googleMetadata.family_name;
       user.picture = googleMetadata.picture;
       user.gdrive_access_token = googleMetadata.id_token;
       user.gdrive_refresh_token = googleMetadata.refresh_token;
       user.gdrive_access_token_expiry = new Date();
       user.save(function(err) {
         if(err) throw err;
         promise.fulfill(user);
       });
     }
  });
};

everyauth.google
  .entryPath('/auth/google')
  .callbackPath('/auth/google/callback')
  .appId(config.google.appId)
  .appSecret(config.google.appSecret)
  .scope('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly.metadata https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile')
  .authQueryParam({access_type:'offline', approval_prompt:'auto'})
  .findOrCreateUser(function (session, accessToken, accessTokenExtra, googleUserMetadata) {
    console.log('Session:', session);
    console.log('Access Token:', accessToken);
    console.log('Access Token Extra:', accessTokenExtra);
    console.log('User Metadata:', googleUserMetadata);
    googleUserMetadata.id_token = accessToken;
    googleUserMetadata.refresh_token = session['cookie']['auth']['google']['refreshToken'];
    console.log("User data returned from Google: ", googleUserMetadata);
    var promise = this.Promise();
    findOrCreateUserByGoogleData(googleUserMetadata, promise);
    return promise;
  })
  .myHostname(config.hostName)
  .redirectPath('/');

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

function convertFromGoogleFile(file) {
  return {
    'filename': file.title,
    'size': file.fileSize,
    'lastmodified': file.modifiedDate,
    'url': file.alternateLink,
    'editable': file.editable
  }
}

function getGoogleAuth(request) {
  var auth=  new googleapis.OAuth2Client();
    auth.setCredentials({
      access_token: request.user.gdrive_access_token  // This is fetched from user.
    });
  return auth;
};

/*  // Used for debugging
googleapis.discover('drive', 'v2').execute(function(err, client) {
    var auth = getGoogleAuth(null)
    client
        .drive.files.list({'maxResults': '1'})
        .withAuthClient(auth)
        .execute(function(err, result) {
            console.log('error:', err, 'inserted:', result)
        });
});/**/




var everyauth = require('everyauth');
var config = require('./config');

var UserModel = config.mongoose.model('User', require('./User'));

var API_ROOT = '/api/v1';

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

var findOrCreateUserByGoogleData = function(googleMetadata, promise) {
  console.log(googleMetadata);
  UserModel.find({'id': googleMetadata.id}, function(err, users) {
    if(err) throw err;
    if(users.length > 0) {
       promise.fulfill(users[0]);
     } else {
       var user = new UserModel();
       user.id = googleMetadata.id;
       user.given_name = googleMetadata.given_name;
       user.family_name = googleMetadata.family_name;
       user.picture = googleMetadata.picture;
       user.access_token = googleMetadata.id_token;
       user.save(function(err) {
         if(err) throw err;
         promise.fulfill(user);
       });
     }
  });
};

everyauth.google
  .entryPath('/auth/google')
  .callbackPath('/auth/google/callback')
  .appId(config.google.appId)
  .appSecret(config.google.appSecret)
  .scope('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly.metadata https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile')
  .authQueryParam({access_type:'online', approval_prompt:'auto'})
  .findOrCreateUser(function (session, accessToken, accessTokenExtra, googleUserMetadata) {
    console.log('Session:', session);
    console.log('Access Token:', accessToken);
    console.log('Access Token Extra:', accessTokenExtra);
    console.log('User Metadata:', googleUserMetadata);
    googleUserMetadata.id_token = accessTokenExtra.id_token;
    googleUserMetadata.expires_in = accessTokenExtra.expires_in;
    console.log("User data returned from Google: ", googleUserMetadata);
    var promise = this.Promise();
    findOrCreateUserByGoogleData(googleUserMetadata, promise);
    return promise;
  })
  .myHostname(config.hostName)
  .redirectPath('/');

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


app.get(API_ROOT + '/list', function (request, response) {
  console.log('User', request.user);
  response.writeHead(200, {'Content-Type' : 'application/json'});
  var json_response = new Array();
  // Should get auth token here.
  // Get authtoken from all services.
  var auth = getGoogleAuth(request);
  console.log("Before making call");
  console.log(new Date());
  googleapis.discover('drive', 'v2').execute(function(err, client) {
    client
        .drive.files.list({'maxResults': '20'})
        .withAuthClient(auth)
        .execute(function(err, result) {
          if (err) {
            console.error('Error while fetching file list: ', err, 'with result', result);
          }
          for (var i=0; i<result.items.length; i++) {
            console.log('error:', err, 'inserted:', result.items[i]['title']);
            json_response.push(convertFromGoogleFile(result.items[i]))
          }
          console.log("After finishing call");
          console.log(new Date());
          response.end(JSON.stringify(json_response));
        });
  console.log("After making call");
  console.log(new Date());
  });
  
  //response.writeHead(200, json_response);
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

app.get("/", function (req, res) {
  var file = req.User ? '/webui/home.html' : '/webui/index.html';
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
