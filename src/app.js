var fs = require('fs');
var request = require('request');
var qs = require('querystring');
var express = require('express');
var app = express();
var config = eval('(' + fs.readFileSync('../config/app.config', 'utf8') + ')');

app.configure(function() {
  app.use(express.cookieParser());
  app.use(express.bodyParser());
});

app.get("/github", function(req, res) {
  res.redirect("https://github.com/login/oauth/authorize?client_id=" + config.github.client_id);
});
app.get("/github-token", function(req, res) {
  var token = req.cookies.access_token;
  console.log("token: " + token);
  res.set('Access-Control-Allow-Origin', 'http://sdether.github.com');
  res.send({access_token: token});
});

app.get("/github-auth", function(req, res) {
  console.log("code: " + req.query.code);
  request({
    method: 'post',
    uri: 'https://github.com/login/oauth/access_token',
    qs: {
      client_id: config.github.client_id,
      client_secret: config.github.client_secret,
      code: req.query.code
    },
    headers: {
      Accept: 'application/json'
    }
  }, function(error, response, body) {
    console.log(body);
    body = JSON.parse(body);
    res.cookie('access_token', body.access_token);
    res.redirect("http://sdether.github.com/josh.js/githubconsole.html");
  });
});
app.listen(80);