'use strict';

var proxy = require('./proxy')
  , packages = require('../lib/package')
  ;

var isScoped = function(name) {
  return /^@[^\/]+\//.test(name);
};

exports.setup = function (app) {

  app.get('/:pkg', function (req, res, next) {
    packages.one(req.params.pkg, function (err, pkg) {
      if (err) {
        next();
      } else if (pkg) {
        res.json(pkg);
      } else if (isScoped(req.params.pkg)) {
        res.status(404).json({
          error:'not_found', 
          reason:'document not found'
        });
      }
    });
  }, proxy.metadata);

  app.get('/-/all', function (req, res) {
    packages.all(function (err, pkgs) {
      if (err) {
        throw err;
      } else {
        pkgs._updates = Date.now();
        res.json(pkgs);
      }
    });
  });

  app.get('/-/all/since', function (req, res) {
    packages.all(function (err, docs) {
      if (err) {
        throw err;
      } else {
        res.json(docs);
      }
    });
  });

  app.get('/:pkg/-/:tar', function (req, res, next) {
    packages.tar(req.params.pkg, req.params.tar, function (err, tar) {
      if (err) {
        next();
      } else if (tar) {
        res.send(tar).end();
      } else if (isScoped(req.params.pkg)) {
        res.status(404).json({
          error:'not_found', 
          reason:'document not found'
        });
      }
    });
  }, proxy.tarball);

  app.param('rev', /^[0-9]+-[0-9a-fA-F]{32}$/);

  app.put('/:pkg/:rev?/:revision?', function (req, res) {
    packages.put(req, function (err) {
      if (err) {
        err.error = err.forbidden;
        res.status(400).json(err);
      } else {
        res.status(201).end();
      }
    });
  });

};
