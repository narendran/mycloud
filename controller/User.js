var config = require('./config');

var User = new config.mongoose.Schema({
  given_name: {type: String, required: true},
  family_name: {type: String, required: true},
  picture: {type: String},
  google: {
    id: {type: String},
    access_token: {type: String},
    refresh_token: {type: String},
    access_token_expiry: {type: Date}
  },
  dropbox: {
    id: {type: String},
    access_token: {type: String},
    refresh_token: {type: String},
    access_token_expiry: {type: Date}
  }
});

module.exports = User;
