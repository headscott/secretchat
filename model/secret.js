var mongoose = require('mongoose');

var secretSchema = new mongoose.Schema({
   secret: {type: String, required: true, unique: true}
}, {collection: 'secret'});

module.exports = mongoose.model('Secret', secretSchema);