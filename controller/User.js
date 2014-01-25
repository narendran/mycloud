var config = require('./config');

var User = new config.mongoose.Schema({
  id: {type: String, required: true},
  given_name: {type: String, required: true},
  family_name: {type: String, required: true},
  picture: {type: String},
  google: {
    access_token: {type: String},
    refresh_token: {type: String},
    access_token_expiry: {type: Date}
  },
  dropbox: {
    access_token: {type: String},
    refresh_token: {type: String},
    access_token_expiry: {type: Date}
  }
});

module.exports = User;
