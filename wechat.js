'use strict';
var chat = {};
var nodeXml = require('node-xml');
var cryptohash = require('crypto');

/*
 *sha1 encryption str
 */
function sha1(str) {
    var md5sum = cryptohash.createHash('sha1');
    md5sum.update(str);
    str = md5sum.digest('hex');
    return str;
}

/*
 *token validate
 * request flow: http://img0.tuicool.com/EnY7Vfn.png!web
 *               https://raw.github.com/node-webot/wechat/master/figures/wechat.png
 */
chat.validateToken = function(req, res) {
    var query = req.query;
    var signature = query.signature;
    var echostr = query.echostr;
    var timestamp = query['timestamp'];
    var nonce = query.nonce;
    var oriArray = new Array();
    oriArray[0] = nonce;
    oriArray[1] = timestamp;
    oriArray[2] = "weixin"; //这里填写你的token
    oriArray.sort();
    var original = oriArray[0] + oriArray[1] + oriArray[2];
    var scyptoString = sha1(original);
    console.log('req.query:', req.query, signature == scyptoString);
    if (signature == scyptoString) {
        console.log('*******status:', echostr);
        res.send(echostr);
    } else {
        res.send("Bad Token!");
    }
};

/*
 * parse xml and return object
 */
chat.parseXml = function(xmlStr) {
    // define temporary var
    var temp = {
        // ToUserName : "",
        // FromUserName : "",
        // CreateTime : "",
        // MsgType : "",
        // Content : "",
        // MsgId : "",
        tempName: ""
            // PicUrl: "",
            // MediaId:'',
            // Format:'',
            // ThumbMediaId:'',Event:'',Ticket:'',Latitude:''
    };
    var metas = ['ToUserName', 'FromUserName', 'MsgType', 'Content', 'MsgId', 'PicUrl', 'MediaId', 'ThumbMediaId', 'Event', 'EventKey', 'Ticket', 'Latitude', 'Longitude', 'Precision']
    var parse = new nodeXml.SaxParser(function(cb) {

        cb.onStartElementNS(function(elem, attra, prefix, uri, namespaces) {
            temp.tempName = elem; //set tempname
        });
        cb.onCharacters(function(chars) {
            chars = chars.replace(/(^\s*)|(\s*$)/g, "");
            if (temp.tempName == "CreateTime") {
                temp.CreateTime = chars;
            }
        });
        cb.onCdata(function(cdata) {
            /*
           else if (tempName == "Format") {  //vioce format :amr、speex
                 Format = cdata;
            }else if (tempName == "ThumbMediaId") {  //video
                 ThumbMediaId = cdata;
            }
            */
            if (metas.indexOf(temp.tempName) !== -1) {
                temp[temp.tempName] = cdata
            }



        });
        cb.onEndElementNS(function(elem, prefix, uri) {
            temp.tempName = ""; //empty tempName
        });
        cb.onEndDocument(function() {
            //按收到的消息格式回复消息
            //console.log('onEndDocument^^^^^^');
        });
    });
    parse.parseString(xmlStr); //invoke

    // return {
    //     from :temp.FromUserName,
    //     to :temp.ToUserName,
    //     type :temp.MsgType,
    //     content :temp.Content,
    //     msgid:temp.MsgId,
    //     createtime :temp.CreateTime,
    //     mediaid:temp.MediaId,
    //     picurl:temp.PicUrl,
    //     event:temp.Event
    // };
    return temp;
};
chat.msgType = ['text', 'voice', 'video', 'image', 'location', 'link', 'event'];
chat.templates = {
    standard: function(options) {
        options.MsgId = parseInt(new Date().getTime() * 1000);
        let t = `
               <xml>
              <ToUserName><![CDATA[${options.FromUserName}]]></ToUserName>
              <FromUserName><![CDATA[${options.ToUserName}]]></FromUserName>
              <CreateTime>${options.CreateTime}</CreateTime>
              <MsgType><![CDATA[${options.MsgType}]]></MsgType>
              &others&
              </xml>`;
        return t;
    },
    text: `<Content><![CDATA[&text&]]></Content>`,
    video: `<Video>
           <MediaId><![CDATA[media_id]]></MediaId>
           <Title><![CDATA[title]]></Title>
           <Description><![CDATA[description]]></Description>
            </Video> `,
    voice: `<Voice>
           <MediaId><![CDATA[&MediaId&]]></MediaId>
           </Voice>`,
    image: `<Image><MediaId><![CDATA[&MediaId&]]></MediaId></Image>`,
    link: ``
};
chat.getMessage = function(options) {
    options = options || {};
    let _this = this;
    options.CreateTime = parseInt(new Date().getTime() / 1000); //update time

    var template = _this.templates.standard(options),
        text = ``,
        message = '';
    if (options.MsgType == 'text') {
        options.Content = '谢谢关注,你说的是:' + options.Content; //update content
        text = this.templates.text.replace('&text&', options.Content);

    } else if (options.MsgType == 'image' || options.MsgType == 'voice') {
        text = this.templates[options.MsgType].replace('&MediaId&', options.MediaId);
    } else if (options.MsgType == 'link') {
        options.Content = 'link received';
        text = this.templates[options.MsgType].replace('&link&', options.MediaId);

    } else if (options.MsgType == 'event') {
        if (options.Event == 'unsubscribe') {
            text = "<ul><li><a href='http://www.baidu.com'>订阅</a></li><li><a href='http://www.baidu.com'>最新</a></li><li><a href='http://www.baidu.com'>测试</a></li></ul>";

        } else if (options.Event == 'subscribe') {
            text = this.templates.text.replace('&text&', "<div><h3>谢谢订阅</h3></div>");
        }

    } else {
        text = this.templates.text.replace('&text&', 'sorry we can not parse your message:' + options.Content);
    }
    message = template.replace('&others&', text);
    console.log('****sendmessage***', message);
    return message;
};

//timer
chat.timer = null;
chat.generalMessage = function(params) {
    params = params || {};
    var options = {
        FromUserName: 'gh_3bb0e8b236ba',
        ToUserName: 'ojQu6wPhtwIA1VZ24rmHwWXEwJBk',
        CreateTime: parseInt(new Date() / 1000),
        Content: 'test' || params.Content
    };
    return options;
}
chat.publish = function(timer, messageObj, res) {

    let _this = this,
        i = 0;
    if (!timer) {
        let messageXmlStr = _this.getMessage(messageObj);
        _this.timer = setInterval(() => {
            i++;
            if (i > 3) {
                console.log('unsubscribe timer*********');
                return _this.unsubscribe(_this.timer, messageObj, res);
            }

            res.send(messageXmlStr);
        }, 1000 * 1); //send message each 5s
    }
};

chat.unsubscribe = function(timer, messageObj, res) {
    clearInterval(timer);
    chat.timer = null;
    messageObj.Content = 'publish finished';
    let messageXmlStr = chat.getMessage(messageObj);
    res.end(messageXmlStr);
}



module.exports = chat;