var express = require('express');
var app = express();
var MongoStore = require('connect-mongo')(express);

var everyauth = require('everyauth');
var AuthDropbox = require('./AuthDropbox');

var config = require('./config');

var dbox = require("dbox");
var dropbox = dbox.app({
    "app_key": "n7ick3jdpi3o9dd",
    "app_secret": "8n3dkgkkwq8g50v"
})



var UserModel = config.mongoose.model('User', require('./User'));

var API_ROOT = '/api/v1';


app.use(express.bodyParser())
    .use(express.logger())
    .use(express.cookieParser('miketesting'))
    .use(express.session({
        secret: 'FxT10477A93d54HJx5',
        store: new MongoStore({
            mongoose_connection: config.mongoose.connections[0]
        })
    }))
    .use(everyauth.middleware());

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
    var auth = AuthDropbox.getDropboxAuth(request);
    console.log('User', request.user);
	var client = dropbox.client('8n3dkgkkwq8g50v');
    response.writeHead(200, {
        'Content-Type': 'application/json'
    });
    var json_response = new Array();
    //var dir = request.dir_name.toString();	
    //console.log(dir);
    //if (dir == null)
	dir = '/';
    // Should get auth token here.
    // Get authtoken from all services.

    console.log('i am here');
	var options = {
		file_limit         : 10000,              // optional
	  	list               : true,               // optional
	  	include_deleted    : false	           // optional
	}
	client.readdir('Resume', function (status, reply) {
	close.log(reply);
        if (status != 304) {
            metadata = reply;
            console.log(reply);
	}
                /*  for (var i=0; i<result.items.length; i++) {
            console.log('error:', err, 'inserted:', result.items[i]['title']);
            json_response.push(AuthGoogle.convertFromGoogleFile(result.items[i]))
          }
          console.log("After finishing call");
          console.log(new Date());
          response.end(JSON.stringify(json_response));

        response.end();*/
    });
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
