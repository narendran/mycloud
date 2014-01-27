var express = require('express');
var googleapis = require('googleapis')
var app = express();
var MongoStore = require('connect-mongo')(express);

var everyauth = require('everyauth');
var config = require('./config');
var AuthGoogle = require('./AuthGoogle');
var AuthDropbox = require('./AuthDropbox');

var UserModel = config.mongoose.model('User', require('./User'));

var API_ROOT = '/api/v1';

everyauth.everymodule.findUserById(function(userId, callback) {
  console.log('FindUserByID :: ', arguments);
  UserModel.find({'_id': userId}, function(err, users) {
    if(err) throw err;
    callback(null, users[0]);
  });
});

var app = express();

var myfilter = function (req, res, next) {
  console.log('Filtering..');
  console.log(req.session);
  if (req.user) {
    return next();
  }

  if (! req.query.user) {
    return next();
  }

  UserModel.find({'google.id': req.query.user},
    function(err, users) {
      if (err || !users || users.length <= 0) {
        return next();
      }
      req.session.auth = req.user = users[0];
      req.session.auth.loggedIn = true;
      req.session.auth.userId = users[0]._id;
      req.session.auth['google'].user = users[0];
      req.user = users[0];
      req.session.save(function () {
        console.log('Session after lot of work!', req.session);
        next();
      });
    }
    );
}

app.use(express.bodyParser())
.use(express.logger())
.use(express.cookieParser('miketesting'))
.use(express.session({
  secret: 'FxT10477A93d54HJx5',
  store: new MongoStore({mongoose_connection: config.mongoose.connections[0]})
}))
.use(myfilter)
.use(everyauth.middleware());

app.get("/", function (req, res) {
  console.log(req.toString());
  console.log("Check");
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

app.get(API_ROOT + '/authme', function (request, response) {

  console.log('User', request.user);
  console.log(request.query);
  if (request.user) {
    // TODO: Might need to re-login
    response.writeHead(200, {'Content-Type' : 'application/json'});
    response.end(JSON.stringify({'error': 'Already logged in'}));
    return;
  } else {
    AuthGoogle.getUserInfo(request, response);
  }
});

app.get(API_ROOT + '/list/:mimeType', function (request, response) {
  console.log('User');
  console.log('User', request.user);
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
      consolidatedList.counter++;
      AuthGoogle.listfiles(request, consolidatedList, callback);
      AuthDropbox.listfiles(request, consolidatedList, callback); 
    }
  }

});

app.get(API_ROOT + '/search', function (request, response) {
  console.log('User', request.user);
  response.writeHead(200, {'Content-Type' : 'application/json'});
  var json_response = new Array();
  // Should get auth token here.
  // Get authtoken from all services.
  var auth = AuthGoogle.getGoogleAuth(request);
  var search_key = request.query.q  // Should be obtained from request. Should be enclosed within quotes
  console.log("SearchKey: " + search_key)

  // TODO: This auth check should likely happen earlier.
  if (! auth) {
    response.end(JSON.stringify({'error': 'Not logged in'}));
    return;
  }

  console.log("Before making call");
  console.log(new Date());
  googleapis.discover('drive', 'v2').execute(function(err, client) {
    var search_query = 'fullText contains \'' +search_key+'\'';
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



//Parameters : file id, mime type
app.get(API_ROOT + '/read', function (request, response) {
  console.log('User', request.user);	
  var auth = AuthGoogle.getGoogleAuth(request);
  googleapis.discover('drive', 'v2').execute(function(err, client) {

   client.
   drive.files.insert({ 'title': request.params.fileid, 'mimeType': request.params.mimeType })
   .withMedia('text/plain', 'Read')
   .withAuthClient(auth)
   .execute(function(err, result) {
     if(err) {console.log(err)}
       if(result) {
         console.log(result); 
       }
       response.writeHead(200, {'Content-Type' : 'application/json'});
       response.end(JSON.stringify({'status': err}));
     });
 });
});


//Parameters : file id, mime type, filetext
app.get(API_ROOT + '/add', function (request, response) {

  //console.log('User', request.user);	
  console.log('request: ' , request);
  var auth = AuthGoogle.getGoogleAuth(request);
  googleapis.discover('drive', 'v2').execute(function(err, client) {
    client
    .drive.files.insert({ 'title': request.params.fileid, 'mimeType': request.params.mimeType })
    .withMedia('text/plain', request.params.filetext)
    .withAuthClient(auth)
    .execute(function(err, result) {
      console.log('error:', err, 'inserted:', result.id)
    });
    response.writeHead(200, {'Content-Type' : 'application/json'});
    response.end(JSON.stringify({'status': err}));
  });
});


app.get(API_ROOT + '/move', function (request, response) {
  console.log('User', request.user);	
  var auth = AuthGoogle.getGoogleAuth(request);
  googleapis.discover('drive', 'v2').execute(function(err, client) {
    client
    .drive.files.insert({ 'title': request.params.fileid, 'mimeType': request.params.mimeType })
    .withMedia('text/plain', 'File moved')
    .withAuthClient(auth)
    .execute(function(err, result) {
      console.log('error:', err, 'inserted:', result.id)
    });
    function insertFileIntoFolder(folderId, fileId) {
      var body = {'id': fileId};
      var request = gapi.client.drive.children.insert({
        'folderId': folderId,
        'resource': body
      });
      request.execute(function(resp) { });
    }
    response.writeHead(200, {'Content-Type' : 'application/json'});
    response.end(JSON.stringify({'status': err}));
  });
});


//Parameters : file id, mime type
app.get(API_ROOT + '/update', function (request, response) {
  console.log('User', request.user);	
  var auth = AuthGoogle.getGoogleAuth(request);
  googleapis.discover('drive', 'v2').execute(function(err, client) {
   client
   .drive.files.update({ 'fileId': request.params.fileid})
   .withMedia('text/plain', 'File updated with no metadata')
   .withAuthClient(auth)
   .execute(function(err, result) {
    console.log('error:', err, 'updated:', result.id)
  });
   response.writeHead(200, {'Content-Type' : 'application/json'});
   response.end(JSON.stringify({'status': err}));
 });
});


app.get(API_ROOT + '/share', function (request, response) {

  console.log('User request public sharing :'+request.user);
  var url = require('url');
  var url_parts = url.parse(request.url, true);
  var query = url_parts.query;
  console.log("Query params "+query.url);

  // Mongo mapping entry and return the resulting shortURL for the end user to share
  var newshortURL = "clo.ud/"+Math.random().toString(36).substr(2,7);
  var ShortURL = config.mongoose.model('ShortURL', require('./ShortURL'));
  var success = false;
  console.log(newshortURL+" "+ShortURL+" "+success);
  var shortSearch = ShortURL.find({'short': newshortURL}, function(err, urls) {
      console.log(err);
      console.log(urls.length + " entries were found in shortURL DB");
      if(urls.length != 0) { // Existing URL
       newshortURL = Math.random().toString(36).substr(2,7);
       shortSearch(newshortURL);
     } else {
      console.log("Success in finding unique shortURL");
       var s1 = new ShortURL();
       s1.short = newshortURL;
       s1.long = url_parts.query.url;
       s1.save(function(err){
        if(err){
          console.log(err); 
          success = "ShortURL generation failed due to : "+err;
          response.writeHead(200,{'Content-Type' : 'application/json'});
           response.end("{\"status\" : \""+success+"\"}");
        } else {
          console.log("ShortURL generation succeeded");
          success = newshortURL;
          response.writeHead(200,{'Content-Type' : 'application/json'});
          response.end("{\"status\" : \""+success+"\"}");
        }
        
      });
     } 
   });
  
});



app.get(API_ROOT + '/delete', function (request, response) {
  // Currently, a very hacky method. If it starts with '/'
  // then it must be a path and hence a dropbox request
  var path = request.param("path")
  if (typeof path == "string" && path.substring(0,1) == "/") { 
    console.log("path : "+path);
    everyauth.dropbox.oauth.get(
      AuthDropbox.ApiBaseUrl + 'fileops/delete?root=dropbox&path=' + path,
      request.user.dropbox.access_token,
      request.user.dropbox.access_secret,
      function (err, res) {
        console.log(" ID : "+path);
        if (err) {
          console.log('Error while deleting file: ', path, 'with result', res, 'and error', err);
          console.log(res);
          failureResponse(res, response);
        } else {
          console.log(res);
          successResponse(res, response);
        }
      });
  } else {
    var auth = AuthGoogle.getGoogleAuth(request);
  
    googleapis.discover('drive', 'v2').execute(function(err, client) {
    client
    .drive.files.delete({'fileId':path.toString()})
    .withAuthClient(auth)
    .execute(function(err, result) {
      if(err) {console.log(err)
        response.writeHead(200, {'Content-Type' : 'application/json'});
        response.end(JSON.stringify({'status': 'Failed'}));
        return;
      }

      if(result) {
        console.log(result);
        response.writeHead(200, {'Content-Type' : 'application/json'});
        response.end(JSON.stringify({'status': 'Success'}));

      }
    });
  });
  
  }
  
});


function successResponse(result, response) {
    console.log(result);
    response.writeHead(200, {'Content-Type' : 'application/json'});
    response.end(JSON.stringify({'status': 'Success'}));
}

function failureResponse(result, response) {
    console.log(result);
    response.writeHead(200, {'Content-Type' : 'application/json'});
    response.end(JSON.stringify({'status': 'Failed'}));
}


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


app.listen(config.port, function() {
  console.log('Listening on port ', config.port);
});
