var mongoose = require('mongoose');

var messageSchema = new mongoose.Schema({
   username: {type: String},
   nachricht: {type: String, required: true},
   timestamp: {type: Number, default: 0, unique: true},
   color: {type: String, default: '#FF0000'}
}, {collection: 'messages'});

module.exports = mongoose.model('Message', messageSchema);