var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
var logger = require('morgan');

const session = require('express-session');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var roomlistRouter = require('./routes/roomlist');
var reportRouter = require('./routes/report');
var chatRouter = require('./routes/chat');
const { join } = require('path');
var chatActivity = require('./routes/socket').chatActivity;

var IsLogined = require('./auth/IsLogined');
var SSOredirect = require('./auth/SSOredirect');

var app = express();

app.io = require('socket.io')();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({limit : '128kb'}));


// 간단한 기능이기 때문에 대충 설정했음
app.use(session({
  secret: "noh02NOI1",
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 3600000, httpOnly: true },
}));

app.get("/auth/login_process",SSOredirect());
app.get("/auth/login", IsLogined);


app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/roomlist', roomlistRouter);
app.use('/report', reportRouter);
app.use('/chat', chatRouter);
app.io.on('connection', (socket)=>{
  chatActivity(socket,app.io);
});

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
  res.render('error');
});

module.exports = app;
// node ./bin/www를 하면 실행됨.


