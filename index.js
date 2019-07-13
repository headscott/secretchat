let express = require("express");

let app = express();

app.use(express.static('public'));

let port = process.env.PORT || 8080;

app.listen(port, function() {
   console.log("Webserver läuft auf Port " + port);
})
