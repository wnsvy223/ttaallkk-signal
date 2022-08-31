var createError = require('http-errors');
var express = require('express');
var app = express();
app.io = require('socket.io')();
var admin = require("firebase-admin");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var favicon = require('serve-favicon');
var helmet = require('helmet')

var indexRouter = require('./routes/index')(app.io);
var usersRouter = require('./routes/users');

var serviceAccount = require('./serviceAccount.json');
var config = {
    credential: admin.credential.cert(serviceAccount),
    apikey : "AIzaSyAO2EsLBIg6XRvgSCpOzFYg6cVzI0JvjEY",
    databaseURL : "https://webvoice-d99c6.firebaseio.com/",
    storageBucket : "gs://webvoice-d99c6.appspot.com",
}
admin.initializeApp(config);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(helmet());
app.use(helmet.expectCt());
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.disable("x-powered-by");
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static('node_modules'));
app.use(favicon(path.join(__dirname,'public','images','favicon.ico')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error404');
});

module.exports = app;
