var Config = {
  google: {
    // TODO: Remove hardcoded keys, revoke them and send them from process env.
    appId: process.env.GOOGLE_CLIENT_ID || process.argv[4] || '690836899812-e5443de0msu371k6a7mhfl3hgdlr5fj1.apps.googleusercontent.com',
    appSecret: process.env.GOOGLE_APP_SECRET || process.argv[5] || '7BFDEW_CK-NtILzdjiAemkzd'
  },
  dropbox: {
    key: 'wluts4opx9mq97g',
    secret: 'a8m7q3hcrbxfxz5'
  },
  hostName: process.env.HOST_NAME || process.argv[3] || '',
  port: process.env.PORT || 5000,
  mongo_url: "mongodb://localhost/mycloud",
  mongoose: require('mongoose')
};

console.log("Connecting to MongoDB instance: " + Config.mongo_url);
Config.mongoose.connect(Config.mongo_url);

module.exports = Config;
