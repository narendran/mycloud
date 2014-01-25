var config = require('./config');

var User = new config.mongoose.Schema({
  id: {type: String, required: true},
  given_name: {type: String, required: true},
  family_name: {type: String, required: true},
  picture: {type: String},
  access_token: {type: String, required: true}
});

module.exports = User;
