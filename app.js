//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


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
	password: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req, res){
	res.render("home");
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
		res.redirect("/login")
	}
});

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
