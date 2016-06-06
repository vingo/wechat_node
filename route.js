var express = require('express');
var routers = express.Router();
var wechat = require('./wechat');

routers.get('/', function(req, res) {

    res.render('home', {});
});

//wechar route
routers.get('/weixin', wechat.validateToken);
routers.post('/weixin', function(req, res) {
    console.log('post interface request...');
    var post_data = "";
    req.on("data", function(data) {
        post_data += data;
    });
    req.on("end", function() {
        var xmlStr = post_data.toString('utf-8', 0, post_data.length);
        console.log('receive string****:', xmlStr);
        var optionsParsed = wechat.parseXml(xmlStr),
            message = wechat.getMessage(optionsParsed);

        if (optionsParsed.MsgType == 'text' && optionsParsed.Content.indexOf('timer') !== -1) {
            console.log('auto timer************');
            wechat.publish(wechat.timer, optionsParsed, res); //publish data to clients;
        } else {
            res.end(message);
        }


    });
});


module.exports = routers;