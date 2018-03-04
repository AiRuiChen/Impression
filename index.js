// libs
var express = require('express');
var app = express();
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var fs = require('fs');

// global vars
var port = 3000;

// endpoints
app.get('/', function (req, res) {
    res.send('Hello World');
});

app.get('/test', function (req, res) {
    res.sendFile('/home/marcus/hacktech2018/test.html');
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

var processMedia = function(post, cb) {
    if (post.is_video) {
        processVideo(post.shortcode)
    } else {
        processImage(post.display_url, function (body) {
            cb(body);
        });
    }
}

// takes an array of instagram post objects [ {}, {}, ... ]
var processAllPosts = function(posts) {
    async.eachLimit(posts, 1,
        function(post, cb) {
            processMedia(post, function(body) {
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

    $('script').each(function(i, element){
        if (element.children.length && element.children[0].data.substring(0, strMatch.length) === strMatch) {
            var extracted = element.children[0].data;
            var results = JSON.parse(extracted.substring(strMatch.length, extracted.length-1));
            // console.log('////////////////////////////////');
            // console.log(results);

            tagPage = results.entry_data.TagPage;
            for (var i = 0; i < tagPage.length; i++) {
                var edges = tagPage[i].graphql.hashtag;

                var stack = [edges.edge_hashtag_to_top_posts.edges, edges.edge_hashtag_to_media.edges];
                for (var n = 0; n < stack.length; n++) {            
                    var nodes = stack[n];
                    for (var j = 0; j < nodes.length; j++) {
                        var node = nodes[j].node
                        // console.log(node);
                        var raw_caption = (node.edge_media_to_caption.edges.length > 0) ? 
                                         node.edge_media_to_caption.edges[0].node.text : '';
                        processed.push({
                            shortcode: node.shortcode,
                            display_url: node.display_url,
                            raw_caption: raw_caption,
                            is_video: node.is_video
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

var getVideoUrl = function(shortcode, cb) {
    var searchUrl = 'https://www.instagram.com/p/' + shortcode;
    var called = false;
    request(searchUrl, function (err, res, data) {
        if (!err && res.statusCode === 200) {
            var $ = cheerio.load(data);
            $('meta').each(function(i, element){
                if (element.attribs.property === 'og:video:secure_url') {
                    cb(element.attribs.content);
                    called = true;
                }
            });
        }
        if (!called) {
            cb('');
        }
    });
}

var addVideoUrls = function(posts, outerCb) {
    async.eachLimit(posts, 20,
        function(post, cb) {
            getVideoUrl(post.shortcode, function(video_url) {
                // console.log(video_url);
                post.video_url = video_url;
                cb();
            });
        }, function(err) {
            outerCb(err);
        });
}

var extractSinglePost = function(shortcode) {
    var searchUrl = 'https://www.instagram.com/p/' + shortcode;
    var called = false;

    request(searchUrl, function (err, res, data) {
        if (!err && res.statusCode === 200) {
            var $ = cheerio.load(data);
            var strMatch = 'window._sharedData = ';
            var processed;
            var video_url = '';
            
            $('meta').each(function(i, element){
                if (element.attribs.property === 'og:video:secure_url') {
                    video_url = element.attribs.content;
                    return false;
                }
            });
            
            $('script').each(function(i, element){
                if (element.children.length && element.children[0].data.substring(0, strMatch.length) === strMatch) {
                    var extracted = element.children[0].data;
                    var results = JSON.parse(extracted.substring(strMatch.length, extracted.length-1));

                    postPage = results.entry_data.PostPage;
                    for (var i = 0; i < postPage.length; i++) {
                        var node = postPage[i].graphql.shortcode_media;

                        var raw_caption = (node.edge_media_to_caption.edges.length > 0) ? 
                                         node.edge_media_to_caption.edges[0].node.text : '';
                        processed = {
                            shortcode: node.shortcode,
                            display_url: node.display_url,
                            raw_caption: raw_caption,
                            is_video: node.is_video,
                            video_url: video_url
                        };
                    }
                }
            });

            return processed;

        } else {
            return {
                shortcode: shortcode,
                error: 'true'
            }
        }
    });    
}

// extractSinglePost('BfjLmGPHSh-');
// extractSinglePost('BdAuTvHhcVe')

var main = function() {
    // scrape instagram
    var searchUrl = 'https://www.instagram.com/explore/tags/soylent/';
    request(searchUrl, function (err, res, data) {
        if (!err && res.statusCode === 200) {

            // extract useful info from raw scrape
            var posts = extractData(data);

            // populating video urls
            addVideoUrls(posts, function(err) {
                if (err) {
                    console.log('ERROR')
                    console.log(err)
                }
                // console.log('///////////')
                // console.log(posts);
                // fs.writeFile('test.json', JSON.stringify(posts, null, 4), 'utf8');
            });

            console.log('finished extracting');
            extractSinglePost('BfjLmGPHSh-');
            
            // process each post
            // processAllPosts(posts);
        }
    });
};

// main();


app.listen(port, function () {
    console.log('listening on ' + port);
});