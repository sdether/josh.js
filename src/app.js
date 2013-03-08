var fs = require('fs');
var request = require('request');
var qs = require('querystring');
var express = require('express');
var app = express();
var config = eval('(' + fs.readFileSync('../config/app.config', 'utf8') + ')');
var authLog = fs.createWriteStream(config.authLog, {flags: 'a'});
app.configure(function() {
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session(config.session));
  app.use(accessControlHeaders);
});


app.get("/authenticate", function(req, res) {
  res.redirect("https://github.com/login/oauth/authorize?client_id=" + config.github.client_id);
});
app.get("/status", function(req, res) {
  if(req.session.access_token) {
    res.send({authenticated: true});
  } else {
    res.send({authenticated: false});
  }
});
app.get("/authenticated", function(req, res) {
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
    var auth = JSON.parse(body)
    request({
        method: 'get',
        uri: 'https://api.github.com/user',
        headers: {
          Accept: 'application/json',
          Authorization: 'token ' + auth.access_token
        }
      },
      function(error, response, body) {
        var user = JSON.parse(body);
        authLog.write(new Date().toJSON() + "\t" + user.login + "\n");
        req.session.access_token = auth.access_token;
        req.session.user = user.login;
        res.redirect("http://sdether.github.com/josh.js/githubconsole.html");
      });
  });
});
app.get('/hello', function(req, res) {
  res.send({hello: 'world'});
});
app.get(/^\/(user|users|repos)(\/.*|$)/, function(req, res) {
  authLog.write(new Date().toJSON()+'\t'+req.header('X-Real-IP') + "\t" + req.session.user + "\t" + req.path+ "\n");
  var headers = {
    Accept: 'application/json'
  };
  if(req.session.access_token) {
    headers.Authorization = 'token ' + req.session.access_token;
  }
  request({
      method: 'get',
      uri: 'https://api.github.com' + req.path,
      headers: headers
    },
    function(error, response, body) {
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.set('Authenticated', req.session.access_token ? 'true' : 'false')
      res.set('X-RateLimit-Limit', response.headers['x-ratelimit-limit']);
      res.set('X-RateLimit-Remaining', response.headers['x-ratelimit-remaining']);
      res.send(body);
    });
});
app.get('*', function(req, res) {
  console.log('redirecting: ' + req.path);
  res.redirect("http://sdether.github.com/josh.js/");
});

function accessControlHeaders(req, res, next) {
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Origin', 'http://sdether.github.com');
  res.set('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, Authenticated');
  next();
}

app.listen(config.port);
