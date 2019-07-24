var WebSocketServer = require("ws").Server;
let express = require("express");
let mongoose = require("mongoose");

// JWT
let jwt = require('jsonwebtoken');

let bodyParser = require('body-parser');
let http = require('http');

// MongoDB
var configDB = require('./config/database.js');
mongoose.connect(process.env.MONGODB_URI || configDB.url, {
   useNewUrlParser: true,
   useCreateIndex: true
});

// Modelle
let User = require('./model/user');
let Message = require('./model/message');
let Secret = require('./model/secret');

let secret = "";
Secret.findOne({}, (err, data) => {
  secret = data.secret;
  console.log("JWT started");
})


// // User hinzufügen
// let newUser = new User({
//    username: "",
//    loginkey: "123456",
//    favcolor: "#FF9000",
//    timestamp: 1563878819230
// });

// newUser.save();

let app = express();

if(process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https')
      res.redirect(`https://${req.header('host')}${req.url}`)
    else
      next()
  })
}

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
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

let port = process.env.PORT || 8080;

app.get("/loaduser/:username", mustBeLoggedIn, (req, res) => {
   //console.log(req.params.username);

   User.find({username: req.params.username}, (err, data) => {
      res.json(data);
   })
});

app.get("/messages/:timestamp", mustBeLoggedIn, (req, res) => {
  let timestamp = Number(req.params.timestamp);

  Message.find({timestamp: {$gt: timestamp}}, (err, data) => {

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

   User.findOne({loginkey: loginkey}, (err, data) => {
      if(err || !data) {
         console.log("Error oder keine Daten: " + err)
         res.status(500).end("Server Error");
         return;
      }

      //console.dir(data);

      if(!data.username) {
         res.status(500).end("Server Error");
         return;
      }

      let token = jwt.sign({
         username: data.username
      }, secret, {
         algorithm: "HS256",
         expiresIn: "1d",
         issuer: "oursecretchat"
      });

      res.json({username: data.username, favcolor: data.favcolor, timestamp: data.timestamp, token: token});
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

   User.findOne({loginkey: loginkey}, (err, data) => {
      if(err || !data) {
         console.log("Error oder keine Daten")
         res.status(500).end("Server Error");
         return;
      }

      if(data.username) {
         res.status(500).end("Server Error");
         return;
      }

      User.update({loginkey: loginkey}, {$set: {username: username, favcolor: favcolor, timestamp: Date.now()}}, (err, data) => {
      });

      // Systemnachricht wegen Neu-Registrierung
      let systemnachricht = new Message({
        username: "",
        nachricht: `${username} hat den Chat betreten`,
        timestamp: Date.now(),
        color: ""
      });
      systemnachricht.save();
      sendWSToAll(systemnachricht);

      let token = jwt.sign({
         username: username
      }, secret, {
         algorithm: "HS256",
         expiresIn: "1d",
         issuer: "oursecretchat"
      });

      res.json({username: username, favcolor: favcolor, timestamp: data.timestamp, token: token});
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

        let newmessage = new Message(msg.payload);
        newmessage.save();

        sendWSToAll(msg.payload);
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

function sendWSToAll(payload) {
  for(let con of connections) {
    let userMsg = {
      command: "neuemessage",
      payload: payload
    }
    con.socket.send(JSON.stringify(userMsg));
  }
}

function mustBeLoggedIn(req, res, next) {
  // Authorization Header must contain valid token
  if(req.headers.authorization) {
    let token = req.headers.authorization.substring(7);

    if(!jwt.verify(token, secret, {algorithms: ["HS256"], issuer: "oursecretchat"}))
      res.status(401).json("Unauthorized");
    else
      next();

  } else {
    res.status(401).json("Unauthorized");
  }
}