// libs
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
var math = require('mathjs');
var vindexer = require("video-indexer");
var Vindexer = new vindexer("cc55abab2c1b4bf4b3616591f76bf8ec");

// global vars
var rootFolder = '/home/marcus/hacktech2018/';

// SCORING
// take an array of post, output the scores for each sentiment
// if Posts only contain 1 post, then this is getting the score for that post
function get_score(Posts) {
    
    // emotion array [vido data, text data, voice data]
    var anger_arr = [];
    var contempt_arr = [];
    var disgust_arr = [];
    var fear_arr = [];
    var happiness_arr = [];
    var neutral_arr = [];
    var sadness_arr = [];
    var surprise_arr = [];

    // loop over all posts
    for (var i = 0; i < Posts.length; i++) {
        // get video data
        anger_arr.push(getVideoData(Posts[i], 'anger'));   
        contempt_arr.push(getVideoData(Posts[i], 'contempt')); 
        disgust_arr.push(getVideoData(Posts[i], 'disgust')); 
        fear_arr.push(getVideoData(Posts[i], 'fear')); 
        happiness_arr.push(getVideoData(Posts[i], 'happiness')); 
        neutral_arr.push(getVideoData(Posts[i], 'neutral'));  
        sadness_arr.push(getVideoData(Posts[i], 'sadness'));     
        surprise_arr.push(getVideoData(Posts[i], 'surprise')); 

        // for all text_data tones
        for (var j = 0; j < Posts[i]['text_data'].length; j++) {
            switch(Posts[i]['text_data'][j]['tone_name']) {
                case 'Anger': anger_arr.push(Posts[i]['text_data'][j]['score']);
                              break;
                case 'Analytical': neutral_arr.push(Posts[i]['text_data'][j]['score']);
                              break;
                case 'Confident': contempt_arr.push(Posts[i]['text_data'][j]['score']);
                              break;
                case 'Fear': fear_arr.push(Posts[i]['text_data'][j]['score']);
                              break;
                case 'Tentative': sadness_arr.push(Posts[i]['text_data'][j]['score']);
                              break;
                default: break;
            }
        }

        // for all audio_data tones
        for (var j = 0; j < Posts[i]['voice_data'].length; j++) {
            switch(Posts[i]['voice_data'][j]['tone_name']) {
                case 'Anger': anger_arr.push(Posts[i]['voice_data'][j]['score']);
                              break;
                case 'Analytical': neutral_arr.push(Posts[i]['voice_data'][j]['score']);
                              break;
                case 'Confident': contempt_arr.push(Posts[i]['voice_data'][j]['score']);
                              break;
                case 'Fear': fear_arr.push(Posts[i]['voice_data'][j]['score']);
                              break;
                case 'Tentative': sadness_arr.push(Posts[i]['voice_data'][j]['score']);
                              break;
                default: break;
            }
        }
    }

    // analyze the data
    var response = {
        'anger': eval(anger_arr),
        'contempt': eval(contempt_arr),
        'disgust': eval(disgust_arr),
        'fear': eval(fear_arr),
        'happiness': eval(happiness_arr),
        'neutral': eval(neutral_arr),
        'sadness': eval(sadness_arr),
        'surprise': eval(surprise_arr)
    }
    console.log(response);
    return response;
}

// give a overall sentiment score based on video, audio, and text
// weight given by consistency, measured via std
// if diverge a lot, use average; if quite close, use median - bette representation
function eval(arr) {
    // console.log(arr);
    var numUsedVars = arr.length;
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i]['std'] != null) {
            // looking at video output
            var std = arr[i]['std'];

            var confidence = 1 - std;
            if (arr[i]['median'] === -1 || arr[i]['mean'] === -1 || arr[i]['std'] === -1 ) {
                numUsedVars -= 1;
            } else {
                if (confidence < 0.5) {
                    // not a lot of divergence
                    sum += confidence * arr[i]['median']*100;
                } else {
                    // diverge a lot
                    sum += confidence * arr[i]['mean']*100;
                }
            }
        } else {
            sum += arr[i]*100;
        }
    }
    // console.log(numUsedVars);
    return sum/numUsedVars;
}

// return an array of {mean, median, std} for 'name' emotion for this post
function getVideoData(Post, name) {

    var arr = []; // the array of one emotion for a video

    // loop over each frame
    for (var j = 0; j < Post['frame_data'].length; j++) {
        var emotion = Post['frame_data'][j];
        // add emotion data to the array of this frame
        arr.push(emotion[name]);
    }

    // calculate the mean of this frame, put in big array for posts
    var data = {
        mean: (arr.length > 0) ? math.mean(arr): -1,
        median: (arr.length > 0) ? math.median(arr): -1,
        std: (arr.length > 0) ? math.std(arr): -1,
        };
    return data;
}

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

    var sendIt = function() {
        console.log('trying to send it');
        request.post(options, function(err, res, body) {
            if (err) throw err;
            var parsed = JSON.parse(body);
            // console.log(parsed);
            if (parsed.error && parsed.error.code === 'RateLimitExceeded') {
                console.log('rate limited rofl');
                setTimeout(function() {
                    sendIt();
                }, 3000);
            } else {
                var extractedEmotions = parsed.map(function(obj) {
                    return obj.faceAttributes.emotion;
                });
                cb(extractedEmotions);                    
            }
        });
    };
    
    sendIt();
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

        // files.forEach(function (file, i, arr) {
        //     fs.readFile(rootFolder + 'frames/' + file, function(err, data) {
        //         if (err) throw err;
        //         processImage(data, 'application/octet-stream', function (body) {
        //             if (!frames.length) {
        //                 frames = body;
        //             } else {
        //                 frames = frames.concat(body);
        //             }
        //             itemsProcessed++;
        //             if(itemsProcessed === arr.length) {
        //               cb(frames);
        //             }
        //         });
        //     });
        // });

        async.eachLimit(files, 2,
        function(file, cb) {
            fs.readFile(rootFolder + 'frames/' + file, function(err, data) {
                if (err) {
                    console.log(1)
                    console.log(err)
                }
                processImage(data, 'application/octet-stream', function (body) {
                    if (!frames.length) {
                        frames = body;
                    } else {
                        frames = frames.concat(body);
                    }
                    cb();
                });
            });
        }, function(err) {
            if (err) throw (err);
            cb(frames);
        });        

    });
};

// clean up the raw_caption to make it easier for watson
// remove @, _ from usernames + capitalize
// @intentional_kat --> Intentional Kat
// remove hashtags, _ from hashtags
// #not_recommended --> not recommended
var processCaption = function(s) {
    // console.log('DOING CAPTION');
    var arr = s.split(' ').map(function(str) {
        if (str[0] === '@' || str[0] === '#') {
            var res = str.substring(1, str.length)
                .replace(/\_/g,' ')
                .split(' ');
            if (str[0] === '@') {
                var res = res.map(function(nestedStr) {
                    return nestedStr.charAt(0).toUpperCase() + nestedStr.slice(1);
                });  
            }
            return res.join(' ');
        } else {
            return str;
        }
    });
    var processedString = arr.join(' ');
    return processedString;
}

// convert_speech_to_text();
var get_video_script = function (id, flag, cb) {
    if (flag) {
        var str = "Hey everyone I'm here with should have come on we're talking about the fact that today's a great day for "
        + "the Canadian film industry for the Indian film industry as we announcing coproductions lots of opportunities for "
        + "Canada and India to work together on many things but. and everyone there in kind of the video. It's to disappoint "
        + "this is in the world and they're talking about some food productions that have already started as you mentioned but "
        + "for me personally I will be the master of shooting from Canada. I think some kind of an I've been requesting him that "
        + "I would love to come there and participate in everything good that kind of extra will be bringing you know for sure I'll be there."
        cb(str);
    } else {
        Vindexer.getBreakdown(id)
            .then(function (result) {
                // Concatenate scattered scripts into one as an input for sentiment analysis
                var total_script = "";
                var output = JSON.parse(result.body);
                var transcriptBlocks = output['breakdowns'][0]['insights']['transcriptBlocks'];
                transcriptBlocks.forEach(function (block) {
                    var block_script = block['lines'][0]['text'];
                    total_script = total_script + ' ' + block_script;
                });
                console.log(total_script);
                cb(total_script);
            });        
        }
};

var processVoice = function(post, cb) {
    if (post.shortcode === 'BfcSFaiBzAq') {
        var videoId = 'c098201a0a';
        get_video_script(videoId, 1, function(script) {
            console.log(script)
            processText(post, script, function(body) {
                cb(body);
            });
        });
    } else {
        cb([]);
    }
};

var processText = function(post, text, cb) {
    // console.log('DOING TEXT')
    console.log(text);

    var tone_analyzer = new ToneAnalyzerV3({
      username: '50a9be9c-b43b-4ba8-8893-f4fc971fd2b7',
      password: 'JR3uHXNzE0jb',
      version_date: '2017-09-21'
    });

    var params = {
        'text': text,
        'content_type': 'text/plain'
    };

    tone_analyzer.tone(params, function(err, res) {
        if (err) {
            console.log(2)
            console.log(err)
        }
        if (res && res.document_tone && res.document_tone.tones.length) {
            // console.log('DOCUMENT TONE')
            // console.log(documentTones);
            var documentTones = res.document_tone.tones;
            cb(documentTones);
        } else {
            cb([]);
        }
    });
};

// returns a post object
// {
//     'metadata': {
//     },
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
    var responsePayload = {

        // shortcode: node.shortcode,
        // display_url: node.display_url,
        // raw_caption: raw_caption,
        // is_video: node.is_video,
        // video_url: video_url

        metadata: {
            'shortcode': post.shortcode,
            'display_url': post.display_url,
            'is_video': post.is_video,
            'video_url': post.video_url,
            'raw_caption': post.raw_caption
        }
        
    }

    var finishedText = function() {
        processVoice(post, function(body) {
            console.log('done adding voice');
            responsePayload.voice_data = body;
            cb(responsePayload);
        });
    };

    var finishedImages = function() {
        var text = processCaption(post.raw_caption);
        processText(post, text, function(body) {
            console.log('done adding text');
            responsePayload.text_data = body;
            finishedText();
        });
    };


    if (post.is_video) {
        console.log(post.video_url);
        processVideo(post.video_url, function(body) {
            console.log('done processing video: ' + JSON.stringify(body));
            responsePayload.frame_data = body;
            finishedImages();
        });
    } else {
        var payload = '{"url": ' + '"' + post.display_url + '"}'
        processImage(payload, 'application/json', function(body) {
            console.log('done processing image' + body);
            responsePayload.frame_data = body;
            finishedImages();
        });
    }
}

// takes an array of instagram post objects [ {}, {}, ... ]
var processAllPosts = function(posts, allDone) {

    var itemsProcessed = 0;
    var allPosts = [];

    // posts.forEach(function (post, i, arr) {
    //     processMedia(post, function(body) {
    //         allPosts.push(body);
    //         itemsProcessed++;
    //         if(itemsProcessed === arr.length) {
    //           allDone(allPosts);
    //         };
    //     });
    // });

    posts = posts.slice(0, 5);
    async.eachLimit(posts, 1,
    function(post, cb) {
        processMedia(post, function(body) {
            console.log('here');
            allPosts.push(body);
            cb();
        });
    }, function(err) {
        if (err) throw (err);
        var results = {
            posts: allPosts,
            score: get_score(allPosts)
        };
        allDone(results);
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
    console.log(processed);
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

var doAll = function(tag, cb) {
    // scrape instagram
    var searchUrl = 'https://www.instagram.com/explore/tags/' + tag;
    request(searchUrl, function (err, res, data) {
        if (!err && res.statusCode === 200) {

            // extract useful info from raw scrape
            var posts = extractAllPosts(data);

            // populating video urls
            addVideoUrls(posts, function(err) {
                if (err) {
                    console.log(3)
                    console.log(err)
                }
                // console.log('///////////')
                // console.log(posts);
                // fs.writeFile('test.json', JSON.stringify(posts, null, 4), 'utf8');
            
                console.log('finished extracting');

                // process each post
                processAllPosts(posts, function(results) {
                    console.log('DONE')
                    cb(results);
                });
            });
        }
    });
};

var doOne = function(shortcode, cb) {
    extractSinglePost(shortcode, function(post) {
        processAllPosts([post], function(results){
            console.log('DONE');
            cb(results);
        }); 
    });
}

var getSingle = function(shortcode, cb) {
    doOne(shortcode, function(posts) {
        cb(posts);
    });
}

var getAll = function(tag, cb) {
    doAll(tag, function(posts) {
        cb(posts);
    });
}

module.exports = {
    getSingle: getSingle,
    getAll: getAll
}

var testing = function () {
    // doOne('BdAuTvHhcVe');
    // doOne('BfjLmGPHSh-');
    // doAll('soylent', function(posts) {
    //     fs.writeFile('all_results.json', JSON.stringify(posts, null, 4), 'utf8');
    // });


    var stuff = [
    {
        "shortcode": "BftMZ9eh8Dv",
        "display_url": "https://scontent-lax3-1.cdninstagram.com/vp/c3d8c8d27bd1f3837cc3b3faedf7de66/5A9E48C2/t51.2885-15/e35/28152181_193595964562266_3620425394919833600_n.jpg",
        "raw_caption": "All these yummy goodies..but none for my breakfast 😭\n#soylent",
        "is_video": true,
        "video_url": "https://scontent-lax3-1.cdninstagram.com/vp/70a6bd802db0af2386b17766e4dd4b61/5A9E3559/t50.2886-16/28547272_1087297214743271_7298174336988786296_n.mp4"
    },
    {
        "shortcode": "Bf5eEYsn1-3",
        "display_url": "https://scontent-lax3-1.cdninstagram.com/vp/0d41d61ee8ee81e1a130ffed02a36210/5B2E2833/t51.2885-15/e35/28156681_434381090327039_2913384700376514560_n.jpg",
        "raw_caption": "COMBO x3 was amazing! Guys and gals, thank you for making it a blast! See you next time 👉🏻 #tespa #soylent #redraiders #texastech #gamers",
        "is_video": false,
        "video_url": ""
    },
    {
        "shortcode": "BfHDkTWge_P",
        "display_url": "https://scontent-lax3-1.cdninstagram.com/vp/4e6ec600dd4a70d4a7a662ad0f7b90f9/5A9E7BFE/t51.2885-15/e35/27573613_1550893031630651_7124233180688678912_n.jpg",
        "raw_caption": "Told the team lunch is on me\n#soylent",
        "is_video": true,
        "video_url": "https://scontent-lax3-1.cdninstagram.com/vp/85c957af0e92c8738166511fe89bccd7/5A9DFB71/t50.2886-16/27987878_189865861600455_8534258663545951432_n.mp4"
    },
    {
        "shortcode": "BfjLmGPHSh-",
        "display_url": "https://scontent-lax3-1.cdninstagram.com/vp/4bd981fc57f6e361c4c512dbd0827c0b/5A9E7487/t51.2885-15/e15/28427466_1960574714205856_8316104562586943488_n.jpg",
        "raw_caption": "Team @soylent SF at @bold_studios with @intentionally_kat giving all class attendees some RTD goodness. #fueledbysoylent #soylentpioneer #soylent",
        "is_video": true,
        "video_url": "https://scontent-lax3-1.cdninstagram.com/vp/b42ab25fc65efff4d3ad0c712f0e6942/5A9E0E77/t50.2886-16/28122560_364065397405448_1737519885251374652_n.mp4"
    }
    ];
    processAllPosts(stuff, function(results) {
        console.log(results);
        console.log('DONE')
        // fs.writeFile('test2.json', JSON.stringify(posts, null, 4), 'utf8');
    });

}

// testing();

