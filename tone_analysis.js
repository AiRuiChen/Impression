// analyzing tone
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');

var tone_analyzer = new ToneAnalyzerV3({
	username: '50a9be9c-b43b-4ba8-8893-f4fc971fd2b7',
	password: 'JR3uHXNzE0jb',
	version_date: '2017-09-21',
	url: 'https://gateway.watsonplatform.net/tone-analyzer/api/'
});

var params = {
	'text': 'A comma-separated list of tones for which the service is to return its analysis of the input. The indicated tones apply both to the full document and to individual sentences of the document. You can specify one or more of the following values',
	'content_type': 'text/plain'
};

tone_analyzer.tone(params,
	function (error, response) {
		if (error)
			console.log('error:', error);
		else
			console.log(JSON.stringify(response, null, 2));
	}
);