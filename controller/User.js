var config = require('./config');

var User = new config.mongoose.Schema({
  id: {type: String, required: true},
  given_name: {type: String, required: true},
  family_name: {type: String, required: true},
  picture: {type: String},
  gdrive_access_token: {type: String},
  gdrive_refresh_token: {type: String},
  gdrive_access_token_expiry: {type: Date}
});

module.exports = User;
