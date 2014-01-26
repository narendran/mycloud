var express = require('express');
var MongoStore = require('connect-mongo')(express);
var everyauth = require('everyauth');

var config = require('./config');
var User = config.mongoose.model('User', require('./User'));
var API_ROOT = '/api/v1';


var AuthDropbox = {};

AuthDropbox.ApiBaseUrl = 'https://api.dropbox.com/1/'

AuthDropbox.findOrCreateUserByDropboxData = function(dbox_user, promise, session) {
  console.log(dbox_user);
  User.find({'dropbox.id': dbox_user.id}, function(err, users) {
    if(err) throw err;
    var user;
    if(users.length > 0) {
       // We're overwriting user object here to get reflect new auth tokens.
       user = users[0];
       AuthDropbox.fillDboxData(user, dbox_user, promise);
     } else {
       if (session && session.auth && session.auth.userId) {
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
           AuthDropbox.fillDboxData(user2, dbox_user, promise);
         });
       } else {
         user = new User();
         AuthDropbox.fillDboxData(user, dbox_user, promise);
       }
     }
  });
};

AuthDropbox.fillDboxData = function(user, dbox_user, promise) {
     user.display_name = dbox_user.display_name;
     user.dropbox.id = dbox_user.id;
     user.dropbox.access_token = dbox_user.access_token;
     user.dropbox.access_secret = dbox_user.access_secret;

     user.save(function(err) {
       if(err) throw err;
       promise.fulfill(user);
     });

};


everyauth.dropbox
  .entryPath('/auth/dropbox')
  .callbackPath('/auth/dropbox/callback')
  .consumerKey(config.dropbox.key)
  .consumerSecret(config.dropbox.secret)
  .findOrCreateUser( function (sess, accessToken, accessSecret, user) {
    console.log('Session:', sess);
    console.log('Access Token:', accessToken);
    console.log('Access Secret:', accessSecret);
    console.log('User:', user);/**/

    user.access_token = accessToken;
    user.access_secret = accessSecret;
    var promise = this.Promise();
    AuthDropbox.findOrCreateUserByDropboxData(user, promise, sess);
    return promise;
    })
  .myHostname(config.hostName)
  .redirectPath('/');



AuthDropbox.listfiles = function(request, consolidated, callback) {
  if (request && request.user && request.user.dropbox && request.user.dropbox.access_token) {
    everyauth.dropbox.oauth.get(
      AuthDropbox.ApiBaseUrl + 'metadata/dropbox',
      request.user.dropbox.access_token,
      request.user.dropbox.access_secret,
      function (err, op) {
        if (err) {
          console.log('Error while fetching file list: ', err, 'with result', op);
        } else {
          var data = JSON.parse(op);
          // consolidated.fileList.push(AuthDropbox.convertFromDropboxFile(data)); // Skip the root (and parent) directory.
          //console.log(data);
          for (var i=0; i<data.contents.length; i++) {
            consolidated.fileList.push(AuthDropbox.convertFromDropboxFile(data.contents[i]));
          }
        }
        console.log("After call completes");
        console.log(new Date());
        consolidated.counter --;
        callback(consolidated);
    });
    console.log("After making call");
    console.log(new Date());
  } else {
    consolidated.counter --;
    callback(consolidated);
  }
};

AuthDropbox.convertFromDropboxFile = function(file) {
  var path_broken = file['path'].split('/');
  var op_file = {
    'filename': path_broken[path_broken.length-1],
    'size': file.bytes,
    'lastmodified': file.modified,
    'id' : file.path,                      // Dropbox files don't have ids. But path is the only unique identifier for these files. 
    'path': file.path,
    'url': 'https://www.dropbox.com/home' + file.path,
    'service': 'Dropbox'
  }
  console.log(op_file);
  return op_file;
}


module.exports = AuthDropbox;

