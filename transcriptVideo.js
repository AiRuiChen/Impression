const vindexer = require("video-indexer");
const Vindexer = new vindexer("cc55abab2c1b4bf4b3616591f76bf8ec");
// var videoUrl = "https://scontent-lax3-1.cdninstagram.com/vp/1fb75898c31be383eda750535dc88999/5A9D65B7/t50.2886-16/28122560_364065397405448_1737519885251374652_n.mp4"
// var videoUrl: "http://techslides.com/demos/sample-videos/small.mp4",

// Upload video via a URL and generate intelligent insights. If no URL is specified, the file should be passed as a multipart/form body content.
var convert_speech_to_text = function(videoUrl) {
	Vindexer.uploadVideo({
		// Optional
		videoUrl: videoUrl,
		name: 'sample-video',
		privacy: 'Private',
		language: 'English',
		externalId: 'customvideoid',
		description: 'instagram demo',
		partition: 'demos',
	}).then(function (result) {
		console.log(result.body);
		videoId = result.body;
		video_id = result.body.substr(1, 10); // without quotes
		Vindexer.waitForProcessing(video_id).then(function (result) {
			console.log(result.body);

			Vindexer.getProcessingState(video_id).then(function (result) {
				console.log(result.body);
				console.log('Completed! Now break down the result');
				Vindexer.getBreakdown(video_id)
					.then(function (result) {
						console.log(result.body);
						return result.body;
					});
			});
		});
	});
};

// convert_speech_to_text();
var get_video_script = function (id, cb) {
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
};

// var testUrl = 'https://scontent-lax3-1.cdninstagram.com/vp/0ee7cd66fa46af3d476920e61592bc8c/5A9E61D0/t50.2886-16/28267320_761863214014109_8867174722366865408_n.mp4';
// convert_speech_to_text(testUrl);

// analyzing tone
var analyzeTone = function() {
	var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');

	var tone_analyzer = new ToneAnalyzerV3({
	  username: '50a9be9c-b43b-4ba8-8893-f4fc971fd2b7',
	  password: 'JR3uHXNzE0jb',
	  version_date: '2017-09-21'
	});

	var videoId = '88287d577a';
	// var videoId = 'ee86da7f6e';
	get_video_script(videoId, function(script) {

		var params = {
		  'text': script,
		  'content_type': 'text/plain'
		};
		tone_analyzer.tone(params, function(error, response) {
		  if (error){ 
		    console.log('error:', error);
		  } else {
		    // console.log(JSON.stringify(response, null, 2));
		  }
		});

	});
};

analyzeTone();


