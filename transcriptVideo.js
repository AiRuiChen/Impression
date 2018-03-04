const vindexer = require("video-indexer");
const Vindexer = new vindexer("4f2a87db6cd642cf875f315c77f69f40");
var videoUrl = "https://scontent-lax3-1.cdninstagram.com/vp/1fb75898c31be383eda750535dc88999/5A9D65B7/t50.2886-16/28122560_364065397405448_1737519885251374652_n.mp4"

// Upload video via a URL and generate intelligent insights. If no URL is specified, the file should be passed as a multipart/form body content.
Vindexer.uploadVideo({
	// Optional
	videoUrl: videoUrl,
	// videoUrl: "http://techslides.com/demos/sample-videos/small.mp4",
	name: 'sample-video',
	privacy: 'Private',
	language: 'English',
	externalId: 'customvideoid',
	description: 'Check out this great demo video!',
	partition: 'demos'
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
