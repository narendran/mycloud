var config = require('./config');

var ShortURL = new config.mongoose.Schema({
  short: {type: String, required: true},
  long: {type: String, required: true}
});

module.exports = ShortURL;
