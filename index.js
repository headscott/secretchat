let express = require("express");

let app = express();

app.use(express.static('public'));

app.listen(8080, function() {
   console.log("Webserver läuft auf Port 8080");
})
