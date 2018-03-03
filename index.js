// libs
var express = require('express');
var app = express();
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');

// global vars
var port = 3000;

// endpoints
app.get('/', function (req, res) {
    res.send('Hello World');
});

app.get('/test', function (req, res) {
    res.sendFile('/home/marcus/sentiment/detectFaces.html');
});

var createUrl = function () {
    var uriBase = "https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect";

    // Request parameters.
    var params = {
        "returnFaceId": "true",
        "returnFaceLandmarks": "false",
        "returnFaceAttributes": "age,gender,headPose,smile,facialHair,glasses,emotion,hair,makeup,occlusion,accessories,blur,exposure,noise",
    };

    var url = uriBase + "?";
    var numParams = Object.keys(params).length;
    var count = 0;
    for (var k in params) {
        url += k + '=' + encodeURIComponent(params[k]);
        if (count < numParams-1) {
            url += '&';
        }
        count += 1;
    }
    // https://westcentralus.api.cognitive.microso1ft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age%2Cgender%2CheadPose%2Csmile%2CfacialHair%2Cglasses%2Cemotion%2Chair%2Cmakeup%2Cocclusion%2Caccessories%2Cblur%2Cexposure%2Cnoise
    return url;
}

var processImage = function (sourceImageUrl, cb) {
    var subscriptionKey = "020c209c97f14c9b955ced23a280e566";
    var options = {
        uri: createUrl(),
        headers: {
            'Content-Type':'application/json',
            'Ocp-Apim-Subscription-Key':subscriptionKey
        },
        body: '{"url": ' + '"' + sourceImageUrl + '"}'
    }

    request.post(options, function(err, res, body) {
        cb(body);
    });
};

// takes an array of instagram post objects [ {}, {}, ... ]
var processAllPosts = function(posts) {
            console.log('adsf')

    // for (var k in posts) {
    //     processImage(posts[k].display_url, function(body) {
    //         console.log(posts[k].display_url + ': ' + body);
    //     });
    // }
    // var test = 'https://scontent-lax3-1.cdninstagram.com/vp/a54f2f0075ee8d560b5ab9143b6d3e34/5B30074B/t51.2885-15/e35/28156423_402534350207448_5780298095128477696_n.jpg';
    
    async.eachLimit(posts, 20,
        function(post, cb) {
            processImage(post.display_url, function (body) {
                console.log("done");
                console.log(body);
                cb();
            });
        }, function(err) {
            if (err) return console.log(err);
        });
};

// scrape relevant info from instagram
var extractData = function (data) {
    var $ = cheerio.load(data);
    var strMatch = 'window._sharedData = ';
    var processed = [];

    $('script').each(function(i, element){
        if (element.children.length && element.children[0].data.substring(0, strMatch.length) === strMatch) {
            var extracted = element.children[0].data;
            var results = JSON.parse(extracted.substring(strMatch.length, extracted.length-1));
            // console.log('////////////////////////////////');
            // console.log(results);

            tagPage = results.entry_data.TagPage;
            for (var i = 0; i < tagPage.length; i++) {
                var edges = tagPage[i].graphql.hashtag;

                // { node: 
                //  { comments_disabled: false,
                //    id: '1727114807520537321',
                //    edge_media_to_caption: [Object],
                //    shortcode: 'Bf38cRMlCrp',
                //    edge_media_to_comment: [Object],
                //    taken_at_timestamp: 1520108150,
                //    dimensions: [Object],
                //    display_url: 'https://scontent-lax3-1.cdninstagram.com/vp/78b128fe8de601a75bb51ce1ce9332fe/5B2E1E7E/t51.2885-15/e35/28433283_434163273681080_1300260933221744640_n.jpg',
                //    edge_liked_by: [Object],
                //    edge_media_preview_like: [Object],
                //    owner: [Object],
                //    thumbnail_src: 'https://scontent-lax3-1.cdninstagram.com/vp/033295904bc1270b8574d2cb7541fe75/5B4097EC/t51.2885-15/s640x640/sh0.08/e35/c100.0.880.880/28433283_434163273681080_1300260933221744640_n.jpg',
                //    thumbnail_resources: [Object],
                //    is_video: false } },

                var stack = [edges.edge_hashtag_to_top_posts.edges, edges.edge_hashtag_to_media.edges];
                for (var n = 0; n < stack.length; n++) {            
                    var nodes = stack[n];
                    for (var j = 0; j < nodes.length; j++) {
                        var raw_caption = (nodes[j].node.edge_media_to_caption.edges.length > 0) ? 
                                         nodes[j].node.edge_media_to_caption.edges[0].node.text : '';
                        processed.push({
                            display_url: nodes[j].node.display_url,
                            raw_caption: raw_caption,
                            is_video: nodes[j].node.is_video
                        });
                    }
                }
            }
        }
    });
    // console.log('////////////////////////////////');
    // console.log(processed);
    return processed;
};

var main = function() {
    // scrape instagram
    var searchUrl = 'https://www.instagram.com/explore/tags/beach/';
    request(searchUrl, function (err, res, data) {
        if (!err && res.statusCode === 200) {

            // extract useful info from raw scrape
            var posts = extractData(data);

            console.log('finished extracting');
            // process each post
            processAllPosts(posts);
        }
    });
};

main();

app.listen(port, function () {
    console.log('listening on ' + port);
});