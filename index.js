// libs
var express = require('express');
var app = express();
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');

// global vars
var port = 3000;
var rootFolder = '/home/marcus/hacktech2018/';

// endpoints
app.get('/', function (req, res) {
    res.send('Hello World');
});

app.get('/test', function (req, res) {
    res.sendFile(rootFolder + 'video_analysis.html');
});

app.get('/testmp4', function (req, res) {
    res.sendFile(rootFolder + 'test2.mp4');
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

var processImage = function (payload, contentType, cb) {
    var subscriptionKey = "020c209c97f14c9b955ced23a280e566";
    var options = {
        uri: createUrl(),
        headers: {
            'Content-Type': contentType,
            'Ocp-Apim-Subscription-Key':subscriptionKey
        },
        body: payload
    }

    request.post(options, function(err, res, body) {
        var extractedEmotions = JSON.parse(body).map(obj => obj.faceAttributes.emotion);
        cb(extractedEmotions);
    });
};

var generateScreenshots = function(filePath, count, cb) {
    var command =
        ffmpeg(filePath)
          .on('filenames', function(filenames) {
            console.log('Will generate ' + filenames.join(', '))
          })
          .on('end', function() {
            console.log('Screenshots taken');
            cb();
          })
          .screenshots({
            count: count,
            folder: rootFolder + 'frames'
          });
};

var processVideo = function(filePath, cb) {
    var count = 5;
    var prefix = 'tn_';
    var extension = '.png';
    var files = [];
    for (var i = 0; i < count; i++) {
        files.push(prefix + (i+1) + extension)
    }

    generateScreenshots(filePath, count, function() {
        var itemsProcessed = 0;
        var frames = [];

        files.forEach(function (file, i, arr) {
            fs.readFile(rootFolder + 'frames/' + file, function(err, data) {
                if (err) throw err;
                processImage(data, 'application/octet-stream', function (body) {
                    if (!frames.length) {
                        frames = body;
                    } else {
                        frames = frames.concat(body);
                    }
                    itemsProcessed++;
                    if(itemsProcessed === arr.length) {
                      cb(frames);
                    }
                });
            });
        });

    });
};

// returns a post object
// {
//     'is_video': true,
//     'frame_data': [
//       {
//         'anger': 0.037,
//         'contempt': 0.001,
//         'disgust': 0.015,
//         'fear': 0.001,
//         'happiness': 0.939,
//         'neutral': 0.001,
//         'sadness': 0.0,
//         'surprise': 0.007
//       },
//       ...
//     ],
//     'text_data': [
//       {
//         'score': 0.647322,
//         'tone_id': 'anger',
//         'tone_name': 'Anger'
//       },
//       ...
//     ],
//     'voice_data': [
//       {
//         'score': 0.647322,
//         'tone_id': 'anger',
//         'tone_name': 'Anger'
//       },
//       ...
//     ]
// }
var processMedia = function(post, cb) {
    if (post.is_video) {
        processVideo(post.video_url, function(body) {
            console.log('done processing video: ' + JSON.stringify(body));
            cb(body);
        });
    } else {
        var payload = '{"url": ' + '"' + post.display_url + '"}'
        processImage(payload, 'application/json', function(body) {
            console.log('done processing image' + body);
            cb(body);
        });
    }
}

// takes an array of instagram post objects [ {}, {}, ... ]
var processAllPosts = function(posts, allDone) {

    var itemsProcessed = 0;
    var allPosts = [];

    posts.forEach(function (post, i, arr) {
        processMedia(post, function(body) {
            allPosts.push(body);
            itemsProcessed++;
            if(itemsProcessed === arr.length) {
              allDone(allPosts);
            };
        });
    });


};

// scrape relevant info from instagram
var extractAllPosts = function (data) {
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

var extractSinglePost = function(shortcode, cb) {
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
            console.log(processed)
            cb(processed);

        } else {
            cb({
                shortcode: shortcode,
                error: 'true'
            });
        }
    });    
}

var doAll = function() {
    // scrape instagram
    var searchUrl = 'https://www.instagram.com/explore/tags/soylent/';
    request(searchUrl, function (err, res, data) {
        if (!err && res.statusCode === 200) {

            // extract useful info from raw scrape
            var posts = extractAllPosts(data);

            // populating video urls
            addVideoUrls(posts, function(err) {
                if (err) throw err;
                // console.log('///////////')
                // console.log(posts);
                // fs.writeFile('test.json', JSON.stringify(posts, null, 4), 'utf8');
            });

            console.log('finished extracting');

            // process each post
            processAllPosts(posts);
        }
    });
};

var doOne = function(shortcode) {
    extractSinglePost(shortcode, function(post) {
        processAllPosts([post], function(posts){
            console.log('DONE');
            console.log(posts);
        }); 
    });
}

var main = function () {
    // doOne('BdAuTvHhcVe');
    doOne('BfjLmGPHSh-');
}

main();


app.listen(port, function () {
    console.log('listening on ' + port);
});