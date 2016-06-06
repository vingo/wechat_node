//
// # SimpleServer
//
// A simple wechat server
//
var http = require('http');
var path = require('path');
var express = require('express');
var router = express();

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

router.set('views', __dirname + '/client');
router.set('view engine', 'html');
router.engine('html', require('ejs').renderFile);
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(cookieParser());
var index = require("./route.js");
router.use('', index);

router.use(express.static(path.resolve(__dirname, 'client')));
var server = http.createServer(router);

server.listen(process.env.PORT || 3002, process.env.IP || "0.0.0.0", function() {
    var addr = server.address();
    console.log("weChat server listening at", addr.address + ":" + addr.port);
});