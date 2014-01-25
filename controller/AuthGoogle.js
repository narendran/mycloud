var config = require('./config');
var everyauth = require('everyauth');
var googleapis = require('googleapis')

var User = config.mongoose.model('User', require('./User'));

var AuthGoogle = {};

AuthGoogle.findOrCreateUserByGoogleData = function(googleMetadata, promise) {
  console.log(googleMetadata);
  User.find({'id': googleMetadata.id}, function(err, users) {
    if(err) throw err;
    var user;
    if(users.length > 0) {
       // We're overwriting user object here to get reflect new auth tokens.
       user = users[0];
     } else {
       user = new User();
     }

     user.id = googleMetadata.id;
     user.given_name = googleMetadata.given_name;
     user.family_name = googleMetadata.family_name;
     user.picture = googleMetadata.picture;
     if (! user.google) {
       user.google = {};
     }
     user.google.access_token = googleMetadata.id_token;
     user.google.refresh_token = googleMetadata.refresh_token;
     user.google.access_token_expiry = googleMetadata.access_token_expiry;

     user.save(function(err) {
       if(err) throw err;
       promise.fulfill(user);
     });
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
    googleUserMetadata.refresh_token = accessTokenExtra['refreshToken'];

    // Get current timestamp in millis - new Date().getTime()
    // Add expires_in seconds to it
    // Convert back to a Date object
    googleUserMetadata.access_token_expiry = new Date((new Date()).getTime() + 1000 * accessTokenExtra['expires_in']);
    console.log("User data returned from Google: ", googleUserMetadata);
    var promise = this.Promise();
    AuthGoogle.findOrCreateUserByGoogleData(googleUserMetadata, promise);
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
    'editable': file.editable
  }
}

AuthGoogle.getGoogleAuth = function(request) {
  if (! request.user) {
    return null;
  }

  var auth = new googleapis.OAuth2Client();
    auth.setCredentials({
      access_token: request.user.google.access_token  // This is fetched from user.
  });
  return auth;
};

module.exports = AuthGoogle;
