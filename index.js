// libs
var express = require('express');
var app = express();
var request = require('request');
var cheerio = require('cheerio');

// global vars
var port = 3000;

// endpoints
app.get('/', function (req, res) {
    res.send('Hello World');
});

app.get('/test', function (req, res) {
    res.sendFile('/home/marcus/sentiment/detectFaces.html');
});

function processImage() {

    var subscriptionKey = "020c209c97f14c9b955ced23a280e566";
    var uriBase = "https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect";

    // Request parameters.
    var params = {
        "returnFaceId": "true",
        "returnFaceLandmarks": "false",
        "returnFaceAttributes": "age,gender,headPose,smile,facialHair,glasses,emotion,hair,makeup,occlusion,accessories,blur,exposure,noise",
    };

    // Display the image.
    var sourceImageUrl = document.getElementById("inputImage").value;
    document.querySelector("#sourceImage").src = sourceImageUrl;

    // Perform the REST API call.
    $.ajax({
        url: uriBase + "?" + $.param(params),

        // Request headers.
        beforeSend: function(xhrObj){
            xhrObj.setRequestHeader("Content-Type","application/json");
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key", subscriptionKey);
        },

        type: "POST",

        // Request body.
        // sourceImageUrl is what you actually supply to the function as a query
        data: '{"url": ' + '"' + sourceImageUrl + '"}',
    })

    .done(function(data) {
        // Show formatted JSON on webpage.
        $("#responseTextArea").val(JSON.stringify(data, null, 2));
    })

    .fail(function(jqXHR, textStatus, errorThrown) {
        // Display error message.
        var errorString = (errorThrown === "") ? "Error. " : errorThrown + " (" + jqXHR.status + "): ";
        errorString += (jqXHR.responseText === "") ? "" : (jQuery.parseJSON(jqXHR.responseText).message) ?
            jQuery.parseJSON(jqXHR.responseText).message : jQuery.parseJSON(jqXHR.responseText).error.message;
        alert(errorString);
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
    console.log(processed);
    return processed;
};

var searchUrl = 'https://www.instagram.com/explore/tags/beach/';
request(searchUrl, function (err, res, data) {
    if (!err && res.statusCode === 200) {
        var processed = extractData(data);

    }
});

app.listen(port, function () {
    console.log('listening on ' + port);
});
