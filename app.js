'use strict';

// the purpose of this file to to configure the express application
// object, mount all of the API end points
var express = require('express')
  , bodyParser = require('body-parser')
  , morgan = require('morgan')
  , path = require('path')
  , fs = require('fs')
  ;

module.exports = function () {

  var app = express()
    , router = express.Router()
    ;

  app.disable('etag');

  // for rendering ejs templates
  app.set('views', __dirname + '/views');
  app.engine('.html', require('ejs').__express);
  app.set('view engine', 'html');

  // validate route params based on regex, straight from express docs
  router.param(function (name, fn) {
    if (fn instanceof RegExp) {
      return function (req, res, next, val) {
        var captures = fn.exec(String(val));
        if (captures) {
          req.params[name] = captures;
          next();
        } else {
          next('route');
        }
      };
    }
  });

  // all environments
  app.set('env', process.env.NODE_ENV || 'development');
  
  var fixPrivatePackages = function(req) {
    
  };
  
  // fix private package names
  app.use(function (req, res, next) {
    var match = /^\/(@[a-zA-Z0-9-\.]+)\/([a-zA-Z0-9-\.]+)$/.exec(req.url);
    if (match) {
      req.url = '/' + match[1] + '%2f' + match[2];
    }
    
    match = /^\/(@[a-zA-Z0-9-\.]+)\/([a-zA-Z0-9-\.]+)\/-\/(@[a-zA-Z0-9-\.]+)\/([a-zA-Z0-9-\.]+)-([0-9]+\.[0-9]+\.[0-9]+\.tgz)$/.exec(req.url);
    if (match) {
      req.url = '/' + match[1] + '%2f' + match[2] + '/-/' + match[3] + '%2f' + match[4] + '-' + match[5];
    }
    
    next();
  });
  
  // setup server logging with morgan.js
  app.use(function (req, res, next) {
    var logs = [];
    req.log = function (text) { logs.push(text); };
    req.getLogs = function () { return logs; };
    next();
  });

  morgan.token('logs', function (req) {
    return req.getLogs().map(function (text) {
      return '\n=> ' + text;
    }).join('');
  });

  app.use(morgan(':method :url :status :response-time ms - :res[content-length] :logs'));

  // enable express app to parse json body (for rest api)
  app.use(bodyParser.json());

  // setup static files serving in the app directoy
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/', router);

  // register router with express
  // synchronously load all api end points in api directory
  fs.readdirSync('./app').forEach(function (file) {
    // check file is javascript file
    if (file.match(/\.js$/)) {
      var api = require('./app/' + file);
      if (typeof api.setup === 'function') {
        console.log('> exports.setup() in app/' + file);
        api.setup(router);
      }
    }
  });

  return app;

};
