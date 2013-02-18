var fs = require('fs');
var express = require('express');
var app = express();
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;

var config = eval('(' + fs.readFileSync('../config/app.config', 'utf8') + ')');

passport.use(new GitHubStrategy({
    clientID: config.github.client_id,
    clientSecret: config.github.client_secret
  },
  function(accessToken, refreshToken, profile, done) {
    console.log("accessToken: "+accessToken);
    console.log("refreshToken: "+refreshToken);
    console.log(profile);
    done(null,profile);
  }
));

app.configure(function() {
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: config.session.secret }));
  app.use(passport.initialize());
  app.use(passport.session());
});

app.get("/github-login", passport.authenticate('github'));
app.get("/github-auth",function(req,res) {
  console.log("github callback");
  console.log(req.params);
  passport.authenticate('github', { failureRedirect: 'http://sdether.github.com/josh.js/githubconsole.html' });
  res.redirect("http://sdether.github.com/josh.js/githubconsole.html");
});
app.get("/@session", function(req,res) {
  res.send(req.session);
})
app.listen(80);