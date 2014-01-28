var config = require('./config');
var everyauth = require('everyauth');
var googleapis = require('googleapis')
var express = require('express');
var MongoStore = require('connect-mongo')(express);

var cookiestore = new MongoStore({mongoose_connection: config.mongoose.connections[0]});

var User = config.mongoose.model('User', require('./User'));

var AuthGoogle = {};

AuthGoogle.findOrCreateUserByGoogleData = function(googleMetadata, promise, session) {
  console.log(googleMetadata);
  User.find({'google.id': googleMetadata.id}, function(err, users) {
    if(err) throw err;
    var user;
    
    if(users.length > 0) {
       // We're overwriting user object here to get reflect new auth tokens.
       user = users[0];
       AuthGoogle.fillGoogleDataForUser(user, googleMetadata, promise);
     } else {
       if (session && session.auth && session.auth.userId) {
         // There must be a dropbox entry for this user. Create a google entry for this user.
         User.find({'_id': session.auth.userId}, function(err, users2) {
           if(err) throw err;
           var user2;
           if(users2.length > 0) {
             // We're overwriting user object here to get reflect new auth tokens.
             user2 = users2[0];
           } else {
             // Session data was bad.
             user2 = new User();
           }
         AuthGoogle.fillGoogleDataForUser(user2, googleMetadata, promise);
         });
       } else {
         user = new User();
         AuthGoogle.fillGoogleDataForUser(user, googleMetadata, promise);
       }
     }
  });
};


AuthGoogle.fillGoogleDataForUser = function(user, googleMetadata, promise) {
     console.log("okay,", user);
     user.display_name = googleMetadata.name;
     user.picture = googleMetadata.picture;
     if (! user.google) {
       user.google = {};
     }
     user.google.id = googleMetadata.id;
     user.google.access_token = googleMetadata.id_token;
     user.google.refresh_token = googleMetadata.refresh_token;
     user.google.access_token_expiry = googleMetadata.access_token_expiry;

     user.save(function(err) {
       if(err) throw err;
       promise.fulfill(user);
     });
 }


everyauth.google
  .entryPath('/auth/google')
  .callbackPath('/auth/google/callback')
  .appId(config.google.appId)
  .appSecret(config.google.appSecret)
  .scope('https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile')
  .authQueryParam({access_type:'offline', approval_prompt:'auto'})
  .findOrCreateUser(function (session, accessToken, accessTokenExtra, googleUserMetadata) {
    //console.log('Session:', session);
    //console.log('Access Token:', accessToken);
    //console.log('Access Token Extra:', accessTokenExtra);
    //console.log('User Metadata:', googleUserMetadata);
    googleUserMetadata.id_token = accessToken;
    googleUserMetadata.refresh_token = accessTokenExtra['refreshToken'];

    // Get current timestamp in millis - new Date().getTime()
    // Add expires_in seconds to it
    // Convert back to a Date object
    googleUserMetadata.access_token_expiry = new Date((new Date()).getTime() + 1000 * accessTokenExtra['expires_in']);
    //console.log("User data returned from Google: ", googleUserMetadata);
    var promise = this.Promise();
    AuthGoogle.findOrCreateUserByGoogleData(googleUserMetadata, promise, session);
    return promise;
  })
  .myHostname(config.hostName)
  .redirectPath('/');

AuthGoogle.convertFromGoogleFile = function(file) {
  return {
    'filename': file.title,
    'size': file.fileSize,
    'lastmodified': file.modifiedDate,
    'url': file.alternateLink,
    'editable': file.editable,
    'thumbnail': file.thumbnailLink,
    'embed' : file.embedLink,
    'id' : file.id,
    'parentId': file.parents.length > 0 ? file.parents[0].id : null,
    'isTopLevelChild': file.parents.length > 0 ? file.parents[0].isRoot : false,
    'isDirectory': file.mimeType == 'application/vnd.google-apps.folder' ? true : false,
    'service': 'Gdrive'
  }
}

AuthGoogle.getGoogleAuth = function(request, callback) {
  var auth = new googleapis.OAuth2Client();
  auth.setCredentials({
    access_token: request.user.google.access_token  // This is fetched from user.
  });
  return auth;
};

AuthGoogle.getUserInfo = function(request, response) {
  AuthGoogle.getInfo();
  return;
  var key = request.query.access_token;
  var session = request.session;
  console.log(session);
  googleapis.discover('oauth2', 'v1').execute(
    function(err, client) {
      client.oauth2.tokeninfo({
        access_token: key
      })
      .execute(function(err, result) {
        console.log('Token info', result);
        if (err || !result || result['expires_in'] <= 0) {
          response.writeHead(200, {'Content-Type' : 'application/json'});
          response.end(JSON.stringify({'error': 'Not logged in'}));
          return;
        }

        // Ok, this guy has a valid key. See if he has an "account" with us.
        User.find({'google.id': result['user_id']},
          function(err, users) {
            if (err || !users || users.length <= 0) {
              response.writeHead(200, {'Content-Type' : 'application/json'});
              response.end(JSON.stringify({'error': 'Not registered'}));
              return;
            }
            console.log('Users', users[0]);
            // session.auth = users[0];

            console.log('Current User', request.user);
            console.log('Response', response.locals.everyauth);
            response.locals.everyauth.loggedIn = true;
            response.locals.everyauth.user = users[0];
            session.auth = users[0];
            // response.loggedIn = true;

            console.log('Current User updated', session);
            response.writeHead(200, {'Content-Type' : 'application/json'});
            response.end(JSON.stringify({'success': 'Logged in'}));
          }
        );
      });
    }
  );
}

AuthGoogle.getinfo = function(request, consolidated, callback) {
  var auth = AuthGoogle.getGoogleAuth(request);

  googleapis.discover('drive', 'v2').execute(
    function(err, client) {
      client
        .drive.about.get()
        .withAuthClient(auth)
        .execute(function(err, result) {
          console.log('Error:', err);
          console.log('Result:', result);
          var driveUsedBytes = parseInt(result['quotaBytesUsed']);
          var totalBytes = parseInt(result['quotaBytesTotal']);

          // Include Drive/Gmail/Plus etc
          var totalUsedBytes = parseInt(result['quotaBytesUsedAggregate']);
          var freeBytes = totalBytes - totalUsedBytes;
          var totalAvailableBytes = freeBytes + driveUsedBytes;

          consolidated.info.free_bytes += freeBytes;
          consolidated.info.used_bytes += driveUsedBytes;
          consolidated.info.total_bytes += totalAvailableBytes;

          consolidated.counter --;
          callback(consolidated);
        })
    });
}

AuthGoogle.listfiles = function(request, consolidated, callback) {
  if (request && request.user && request.user.google && request.user.google.access_token) {
    var auth = AuthGoogle.getGoogleAuth(request);
    var mimeTypeReq = request.params.mimeType.replace("\.","/");
    console.log("Before making call");
    console.log(new Date());
    console.log('MIMETYPE requested is '+mimeTypeReq);
    var filter;
    if(mimeTypeReq=='all'){
      filter = {'maxResults': '5000'};
    } else {
      filter = {'maxResults': '5000', 'q':'mimeType = \''+mimeTypeReq+'\''}
    }
    googleapis.discover('drive', 'v2').execute(function(err, client) {
      client
          .drive.files.list(filter)
          .withAuthClient(auth)
          .execute(function(err, result) {
            if (err) {
              console.error('Error while fetching file list: ', err, 'with result', result);
            } else {
              for (var i=0; i<result.items.length; i++) {
                console.log('error:', err, 'inserted:', result.items[i]['title']);
                consolidated.fileList.push(AuthGoogle.convertFromGoogleFile(result.items[i]))
              }
            }
            console.log("After finishing call");
            console.log(new Date());
            consolidated.counter --;
            callback(consolidated);
          });
    console.log("After making call");
    console.log(new Date());
    });
  } else {
    consolidated.counter --;
    callback(consolidated);
  }
}

module.exports = AuthGoogle;
