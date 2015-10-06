'use strict';

var request = require('request')
  , config = require('../config')
  , url = require('url')
  , cache = require('../lib/cache')
  , proxy = config('proxy')
  , REGISTRY = config('registry')
  ;

// set default proxy, if supplied
if (proxy) {
  console.log('> using proxy: "' + proxy + '"\n');
  request = request.defaults({ proxy: proxy });
}

var replaceTarballUrls = function (obj) {
  Object.keys(obj.versions).forEach(function (v) {
    var parsed = url.parse(obj.versions[v].dist.tarball);
    obj.versions[v].dist.tarball = url.resolve(process.env.DOMAIN || config('host'), parsed.path);
  });
};

exports.metadata = function (req, res) {
  cache.get(req.params.pkg, function (err, doc) {
    if (err) {
      request(REGISTRY + req.path, function (err, proxy, b) {
        if (err) {
          res.status(500).json(err);
        } else {
          try {
            var body = JSON.parse(b);
            // forward npmjs errors
            if (!body.error) {
              replaceTarballUrls(body);
              cache.put(body._id, body);
            }
            res.status(proxy.statusCode).set(proxy.headers).json(body);
          } catch (e) {
            res.status(500).json({
              error: e.message,
              body: b
            });
          }
        }
      });
    } else {
      req.log('getting ' + req.params.pkg + ' from cache...');
      res.status(200).json(doc);
    }
  });
};

exports.tarball = function (req, res) {
  cache.get(req.params.tar, function (err, body) {
    if (err) {
      request(REGISTRY + req.path, { encoding: null }, function (err, resp, body) {
        if (resp.statusCode === 200) {
          cache.put(req.params.tar, body);
        }
      }).pipe(res);
    } else {
      req.log('getting ' + req.params.tar + ' from cache...');
      res.send(new Buffer(body, 'binary'));
    }
  });
};
