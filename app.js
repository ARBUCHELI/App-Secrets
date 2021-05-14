//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(session({
	secret: "Our little secret.",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
	email: String,
	password: String,
	googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
  	console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
	res.render("home");
});

app.get("/auth/google", passport.authenticate('google', { 
	scope: ["profile"] 
}));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to the secrets page.
    res.redirect('/secrets');
  });

app.get("/auth/facebook", passport.authenticate("facebook") 
  );

app.get("/auth/facebook/secrets",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    function(req, res) {
		res.redirect("/secrets");
    });

app.get("/login", function(req, res){
	res.render("login");
});

app.get("/register", function(req, res){
	res.render("register");
})
/*Here is when we create the secrets route*/
app.get("/secrets", function(req, res) {
	/*Inside this callback is where we are going to check to see if the user is authenticated and this is where we're relying on 
	passport, and session and passport-local and passport-local-mongoose, to make sure that if a user is already logged in, then 
	we should simply render the secrets page, but if they're not logged in, then we're going to redirect them to the login page.*/
	if (req.isAuthenticated()) {
		res.render("secrets");
	} else {
		res.redirect("/login");
	}
});

app.get("/submit", function(req, res) {
	if (req.isAuthenticated()) {
		res.render("submit");
	} else {
		res.redirect("/login");
	}
});

app.post("/submit", function(req, res) {
	const submittedSecret = req.body.secret;

	console.log(req.user);
});

app.get("/logout", function(req, res) {

	req.logout();
	res.redirect("/");
})

app.post("/register", function(req, res){

	User.register({username: req.body.username}, req.body.password, function(err, user) {
		if (err) {
			console.log(err);
			res.redirect("/register"); //This will allow the user to try again.
		} else {
			passport.authenticate("local")(req, res, function() {
				res.redirect("/secrets"); //Notice here that before we never had a secrets route
			});
		}
	});
});
    
app.post("/login", function(req, res){

	const user = new User({
		username: req.body.username,
		password: req.body.password
	});

	req.login(user, function(err){
		if (err) {
			console.log(err);
		} else {
			passport.authenticate("local")(req, res, function() {
				res.redirect("/secrets");
			});
		}
	});	
});

app.listen(3000, function() {
	console.log("Server started on port 3000.");
});
