var express = require('express');
var MongoStore = require('connect-mongo')(express);
var everyauth = require('everyauth');

var config = require('./config');
var User = config.mongoose.model('User', require('./User'));
var API_ROOT = '/api/v1';

var AuthDropbox = {};

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



