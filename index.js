let express = require("express");
let Datastore = require("nedb");
let bodyParser = require('body-parser');

let database = new Datastore("user.db");
database.loadDatabase();

let userobject = {
   username: "",
   loginkey: "135791",
   favcolor: '#00ff00'
}

//database.insert(userobject);

let app = express();

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

let port = process.env.PORT || 8080;

app.get("/loaduser/:username", (req, res) => {
   console.log(req.params.username);

   database.find({username: req.params.username}, (err, data) => {
      res.json(data);
   })
});

app.post("/login", (req, res) => {
   let loginkey = req.body.loginkey;

   if(!loginkey) {
      console.log("Loginkey ist leer")
      res.status(500).end("Server Error");
      return;
   }

   database.findOne({loginkey: loginkey}, (err, data) => {
      if(err || !data) {
         console.log("Error oder keine Daten")
         res.status(500).end("Server Error");
         return;
      }

      console.dir(data);

      if(!data.username) {
         res.status(500).end("Server Error");
         return;
      }

      res.json({username: data.username, favcolor: data.favcolor});
   })
});

app.post("/register", (req, res) => {
   let loginkey = req.body.loginkey;
   let username = req.body.username;

   if(!loginkey || !username) {
      console.log("Loginkey oder Username ist leer")
      res.status(500).end("Server Error");
      return;
   }

   database.findOne({loginkey: loginkey}, (err, data) => {
      if(err || !data) {
         console.log("Error oder keine Daten")
         res.status(500).end("Server Error");
         return;
      }

      if(data.username) {
         res.status(500).end("Server Error");
         return;
      }

      database.update({loginkey: loginkey}, {$set: {username: username}});

      res.json({username: username, favcolor: data.favcolor});
   })
});

app.listen(port, function() {
   console.log("Webserver läuft auf Port " + port);
})
