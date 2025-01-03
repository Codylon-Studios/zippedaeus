const express = require('express');
const { createServer } = require('http');
const auth = require('./routes/auth');
const session = require('express-session');
const initializeSocket = require('./socket');

const app = express();
const server = createServer(app);

// Initialize Socket.IO
initializeSocket(server);

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure session
app.use(session({
  secret: "notsecret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, //10 days
  name: 'UserLogin',
}));

app.use('/account', auth);

// Serve index.html when root URL is accessed
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/main/main.html');
});
// Serve allhomework.html when URL ../allhomework is accessed
app.get('/allhomework', function (req, res) {
  res.sendFile(__dirname + '/public/allhomework/allhomework.html');
});
