var WebSocketServer = require("ws").Server;
let express = require("express");
let Datastore = require("nedb");
let bodyParser = require('body-parser');
let http = require('http');

let userDatabase = new Datastore("user.db");
userDatabase.loadDatabase();

let messageDatabase = new Datastore("messages.db");
messageDatabase.loadDatabase();

let userobject = {
   username: "",
   loginkey: "345678",
   favcolor: '#00ff00'
}

//userDatabase.insert(userobject);

let app = express();

app.use(express.static('public'));

let server = http.createServer(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

let port = process.env.PORT || 8080;

app.get("/loaduser/:username", (req, res) => {
   //console.log(req.params.username);

   userDatabase.find({username: req.params.username}, (err, data) => {
      res.json(data);
   })
});

app.get("/messages/:timestamp", (req, res) => {
  let timestamp = Number(req.params.timestamp);

  messageDatabase.find({timestamp: {$gt: timestamp}}, (err, data) => {

    data.sort((a,b) => a.timestamp - b.timestamp);

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

   userDatabase.findOne({loginkey: loginkey}, (err, data) => {
      if(err || !data) {
         console.log("Error oder keine Daten")
         res.status(500).end("Server Error");
         return;
      }

      //console.dir(data);

      if(!data.username) {
         res.status(500).end("Server Error");
         return;
      }

      res.json({username: data.username, favcolor: data.favcolor, timestamp: data.timestamp});
   })
});

app.post("/register", (req, res) => {
   let loginkey = req.body.loginkey;
   let username = req.body.username;
   let favcolor = req.body.favcolor;

   if(!loginkey || !username) {
      console.log("Loginkey oder Username ist leer")
      res.status(500).end("Server Error");
      return;
   }

   userDatabase.findOne({loginkey: loginkey}, (err, data) => {
      if(err || !data) {
         console.log("Error oder keine Daten")
         res.status(500).end("Server Error");
         return;
      }

      if(data.username) {
         res.status(500).end("Server Error");
         return;
      }

      userDatabase.update({loginkey: loginkey}, {$set: {username: username, favcolor: favcolor}});

      res.json({username: username, favcolor: favcolor, timestamp: data.timestamp});
   })
});

server.listen(port);
console.log("Webserver läuft auf Port " + port);

var wss = new WebSocketServer({server: server})
console.log("Websocket Server erstellt");

let connections = [];

wss.on("connection", function(ws) {
  console.log("Ein Client versucht sich zu verbinden!");

  ws.on("message", (data) => {
    let msg = JSON.parse(data);

    switch(msg.command) {
      case "login":
        console.log("Client login: " + msg.payload);
        connections.push({
          username: msg.payload,
          socket: ws
        })
        break;
      case "message":
        msg.payload.timestamp = Date.now();
        messageDatabase.insert(msg.payload);

        for(let con of connections) {
          let userMsg = {
            command: "neuemessage",
            payload: msg.payload
          }
          con.socket.send(JSON.stringify(userMsg));
        }
        break;
    }
  });

  ws.on("close", () => {
    console.log("Client hat sich abgemeldet");
    for(let i=0; i<connections.length; i++) {
      let con = connections[i];
      if(con.socket == ws)
        connections.splice(i ,1);
    }
  });
})
