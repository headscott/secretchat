var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
   username: {type: String},
   loginkey: {type: String, required: true, unique: true},
   favcolor: {type: String, default: '#FF0000'},
   timestamp: {type: Number, default: 0}
}, {collection: 'user'});

module.exports = mongoose.model('User', userSchema);