var config = require('./config');
var everyauth = require('everyauth');
var googleapis = require('googleapis')

var UserModel = config.mongoose.model('User', require('./User'));

var AuthGoogle = {};

AuthGoogle.findOrCreateUserByGoogleData = function(googleMetadata, promise) {
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
       user.gdrive_access_token_expiry = googleMetadata.access_token_expiry;
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
    googleUserMetadata.refresh_token = accessTokenExtra['refreshToken'];
    googleUserMetadata.access_token_expiry = new Date() + accessTokenExtra['expires_in'];
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
      access_token: request.user.gdrive_access_token  // This is fetched from user.
  });
  return auth;
};

module.exports = AuthGoogle;
