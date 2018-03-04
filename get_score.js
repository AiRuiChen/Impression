var arr = [];
var obj = 
        {
            'is_video': true,
            'frame_data': [
              {
                'anger': 0.037,
                'contempt': 0.001,
                'disgust': 0.015,
                'fear': 0.001,
                'happiness': 0.939,
                'neutral': 0.001,
                'sadness': 0.0,
                'surprise': 0.007
              },
              {
                'anger': 0.037,
                'contempt': 0.001,
                'disgust': 0.015,
                'fear': 0.001,
                'happiness': 0.939,
                'neutral': 0.001,
                'sadness': 0.0,
                'surprise': 0.007
              }
            ],
            'text_data': [
              {
                'score': 0.647322,
                'tone_id': 'anger',
                'tone_name': 'Anger'
              },
              {
                'score': 0.647322,
                'tone_id': 'anger',
                'tone_name': 'Anger'
              }
            ],
            'voice_data': [
              {
                'score': 0.647322,
                'tone_id': 'anger',
                'tone_name': 'Anger'
              },
              {
                'score': 0.647322,
                'tone_id': 'anger',
                'tone_name': 'Anger'
              }
            ]
        }

for (i=0; i<5; i++){
    arr.push(obj);
}


get_score(arr);

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
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i]['std'] != null) {
            // looking at video output
            var std = arr[i]['std'];

            var confidence = 1 - std;
            if (confidence < 0.5) {
                // not a lot of divergence
                sum += confidence * arr[i]['median']*100;
            } else {
                // diverge a lot
                sum += confidence * arr[i]['mean']*100;
            }
        } else {
            sum += arr[i]*100;
        }
    }
    return sum/(arr.length);
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
        mean: mean(arr),
        median: median(arr),
        std: std(arr),
        };
    return data;
}

function mean(numbers) {
    var total = 0, i;
    for (i = 0; i < numbers.length; i += 1) {
        total += numbers[i];
    }
    return total / numbers.length;
}


function median(numbers) {
    // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
    var median = 0, numsLen = numbers.length;
    numbers.sort();
 
    if (
        numsLen % 2 === 0 // is even
    ) {
        // average of two middle numbers
        median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    } else { // is odd
        // middle number only
        median = numbers[(numsLen - 1) / 2];
    }
 
    return median;
}

function std(values){
  var avg = average(values);
  
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  
  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}

