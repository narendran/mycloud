var express = require('express');
var app = express();
var MongoStore = require('connect-mongo')(express);

var everyauth = require('everyauth');
var config = require('./config');

var Dropbox = require("dropbox");

var UserModel = config.mongoose.model('User', require('./User'));

var API_ROOT = '/api/v1';

var client = new Dropbox.Client({
    key: "n7ick3jdpi3o9dd",
    secret: "8n3dkgkkwq8g50v"
});



var AuthDropbox = {};

AuthDropbox.findOrCreateUserByDropboxData = function(dbox_user, promise) {
  console.log(dbox_user);
  User.find({'dropbox.id': dbox_user.id}, function(err, users) {
    if(err) throw err;
    var user;
    if(users.length > 0) {
       // We're overwriting user object here to get reflect new auth tokens.
       user = users[0];
     } else {
       user = new User();
     }

     user.dropbox.id = dbox_user.id;
     user.dropbox.display_name = dbox_user.display_name;
     user.dropbox.access_token = dbox_user.access_token;
     user.dropbox.access_secret = dbox_user.access_secret;
     user.dropbox.access_token_expiry = db_data.access_token_expiry;

     user.save(function(err) {
       if(err) throw err;
       promise.fulfill(user);
     });
  });
};




everyauth.everymodule.findUserById(function(userId, callback) {
    UserModel.find({'dropbox.id': userId}, function(err, users) {
      if(err) throw err;
      callback(null, users[0]);
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



function requestToken(res) {
    app.requesttoken(function(status, req_token) {
        res.writeHead(200, {
            "Set-Cookie" : ["oat=" + req_token.oauth_token,
                            "oats=" + req_token.oauth_token_secret]
        });
        res.write("<script>window.location='https://www.dropbox.com/1/oauth/authorize" +
                  "?oauth_token=" + req_token.oauth_token +
                  "&oauth_callback=" + callbackServiceX + "/authorized" + "';</script>");
        res.end();
    });
}
/*
//user visits url to grant authorization to client
app.get(/\/authorized/, function(req, res) {
    // callback from dropbox authorization
    accessToken(req, res);
});/**/

//now generate access tokens from the request token
function accessToken(req, res) {
    var req_token = {oauth_token : req.cookies.oat, oauth_token_secret : req.cookies.oats};
    dbox.accesstoken(req_token, function(status, access_token) {
        if (status == 401) {
            res.write("Sorry, Dropbox reported an error: " + JSON.stringify(access_token));
        }
        else {
            var expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
            res.writeHead(302, {
                "Set-Cookie" : "uid=" + access_token.uid + "; Expires=" + expiry.toUTCString(),
                "Location" : "/"
            });
            db.collection("user", function(err, collection) {
                var entry = {};
                entry.uid = access_token.uid;
                entry.oauth_token = access_token.oauth_token;
                entry.oauth_token_secret = access_token.oauth_token_secret;
                collection.update({"uid": access_token.uid}, {$set: entry}, {upsert:true});
            });
        }
        res.end();
    });
}


everyauth.dropbox
  .entryPath('/auth/dropbox')
  .callbackPath('/auth/dropbox/callback')
  .consumerKey(config.dropbox.key)
  .consumerSecret(config.dropbox.secret)
  .findOrCreateUser( function (sess, accessToken, accessSecret, user) {
    console.log("HFSH");
    console.log('Session:', sess);
    console.log('Access Token:', accessToken);
    console.log('Access Secret:', accessSecret);
    console.log('User:', user);

    user.access_token = accessToken;
    user.access_secret = accessSecret;
    var promise = this.Promise();
    AuthDropbox.findOrCreateUserByDropboxData(user, promise);
    return promise;
    })
  .myHostname(config.hostName)
  .redirectPath('/');





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
        var client = dropbox.client('8n3dkgkkwq8g50v');
        client.metadata(dir, {hash : hash}, function(status, reply) {
            if (status != 304) {
                metadata = reply;
                cacheMetadata(uid, dir, metadata);
            }
            response.write(metadata);
            response.end();
        });
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


function listFiles(uid, dir, response) {
    cachedMetadata(uid, dir, function(metadata) {
        var hash = metadata ?	 metadata.hash : null;
	// auth token for dropbox
        var client = dropbox.client('8n3dkgkkwq8g50v');
        client.metadata(dir, {hash : hash}, function(status, reply) {
            if (status != 304) {
                metadata = reply;
                cacheMetadata(uid, dir, metadata);
            }
            response.write(metadata);
            response.end();
        });
    });
}

function cachedMetadata(uid, dir, callback) {
    db.collection("user", function(err, collection) {
        var query = {}, fields = {};
        query.uid = uid;
        query["metadata." + dir] = {$exists : true};
        fields["metadata." + dir] = 1;
        collection.findOne(query, {fields: fields}, function(err, result) {
            callback(result ? result.metadata[dir] : null);
        });
    });
}


