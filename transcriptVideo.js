const vindexer = require("video-indexer");
const Vindexer = new vindexer("4f2a87db6cd642cf875f315c77f69f40");
var videoUrl = "https://scontent-lax3-1.cdninstagram.com/vp/1fb75898c31be383eda750535dc88999/5A9D65B7/t50.2886-16/28122560_364065397405448_1737519885251374652_n.mp4"
// var videoUrl: "http://techslides.com/demos/sample-videos/small.mp4",

// Upload video via a URL and generate intelligent insights. If no URL is specified, the file should be passed as a multipart/form body content.
var convert_speech_to_text = function() {
	Vindexer.uploadVideo({
		// Optional
		videoUrl: videoUrl,
		name: 'sample-video',
		privacy: 'Private',
		language: 'English',
		externalId: 'customvideoid',
		description: 'Check out this great demo video!',
		partition: 'demos',
	})
		.then(function (result) {
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
var get_video_script = function (id) {
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
			return total_script;
		});
};

get_video_script('d094b5d00f');