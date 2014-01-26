var express = require('express');
var app = express();
var MongoStore = require('connect-mongo')(express);
var everyauth = require('everyauth');

var config = require('./config');
var User = config.mongoose.model('User', require('./User'));
var API_ROOT = '/api/v1';


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
     user.display_name = dbox_user.display_name;

     user.dropbox.id = dbox_user.id;
     user.dropbox.access_token = dbox_user.access_token;
     user.dropbox.access_secret = dbox_user.access_secret;

     user.save(function(err) {
       if(err) throw err;
       promise.fulfill(user);
     });
  });
};


everyauth.everymodule.findUserById(function(userId, callback) {         /// DUP REmove
  console.log("In Module finduserbyid:" ,userId)
  User.find({'_id': userId}, function(err, users) {
    if(err) throw err;
    callback(null, users[0]);
  });
});






app.use(express.bodyParser())
   .use(express.logger())
   .use(express.cookieParser('miketesting'))
   .use(express.session({
      secret: 'FxT10477A93d54HJx5',
      store: new MongoStore({mongoose_connection: config.mongoose.connections[0]})
    }))
   .use(everyauth.middleware());



var UserModel = config.mongoose.model('User', require('./User'));

var API_ROOT = '/api/v1';


app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/webui');
app.get("/", function handler(req, res) {
    res.render('home.html');
});

app.configure(function () {
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
  everyauth.dropbox.oauth.get('https://api.dropbox.com/1/account/info', request.user.dropbox.access_token,
                            request.user.dropbox.access_secret, function (error, data) {
                console.log(JSON.stringify(data), error)
                console.log(JSON.stringify(data), error)
                console.log(JSON.stringify(data), error)
    });
  response.end(JSON.stringify({'status': 'TODO: Read'}));
});







app.get(API_ROOT + '/read', function (request, response) {
    var auth = AuthDropbox.getDropboxAuth(request);
	var client = dropbox.client('8n3dkgkkwq8g50v');

    response.writeHead(200, {
        'Content-Type': 'application/json'
    });
    client.get(request.path, function(status, reply, metadata) {
		
	});
    response.end(JSON.stringify({
        'status': status,
	'text' : reply
    }));
});

app.get(API_ROOT + '/add', function (request, response) {
    response.writeHead(200, {
        'Content-Type': 'application/json'
    });
	client.put(request.path, request.text, function(status, reply){
	log.console('file written') } );
    response.end(JSON.stringify({
        'status': status
    }));
});

app.get(API_ROOT + '/move', function (request, response) {
    response.writeHead(200, {
        'Content-Type': 'application/json'
    });
   client.mv(request.fromPath, request.toPath, function(status, reply){
   console.log(reply)	});
    response.end(JSON.stringify({
        'status': status
    }));
});

app.get(API_ROOT + '/search', function (request, response) {
    response.writeHead(200, {
        'Content-Type': 'application/json'
    });
	var options = {
	  file_limit         : 10000,              // optional
	  include_deleted    : false,              // optional
	  locale             : "en"                // optional
	}

	client.search(request.path, request.queryFile, options, function(status, reply){
	console.log(reply);
	});
    response.end(JSON.stringify({
        'status': repply
    }));
});

app.get(API_ROOT + '/delete', function (request, response) {
    response.writeHead(200, {
        'Content-Type': 'application/json'
    });
	client.rm(request.path, function(status, reply){
	console.log(reply);
	});
    
    response.end(JSON.stringify({
        'status': status
    }));
});

app.get(API_ROOT + '/update', function (request, response) {
    response.writeHead(200, {
        'Content-Type': 'application/json'
    });
	client.put(request.path, request.text, function(status, reply){
	log.console('file updated') } );
    response.end(JSON.stringify({
        'status': status
    }));

});


app.get(API_ROOT + '/share', function (request, response) {
    response.writeHead(200, {
        'Content-Type': 'application/json'
    });
	client.put(request.path, request.text, function(status, reply){
	log.console('file shared') } );
    response.end(JSON.stringify({
        'status': status
    }));

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

app.listen(config.port, function () {
    console.log('Listening on port ', config.port);
});
