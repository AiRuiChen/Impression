var app = angular.module('myApp', [
//	Module Dependencies
	'ngMaterial'
]);
app.controller('myCtrl',
	function ($scope, $http, $window, $log) {
		$scope.imagePath = 'https://www.funnypica.com/wp-content/uploads/2015/05/Funny-Dog-faces-4.jpg';
		$scope.searchMethods = ['hashtag', 'shortcode'];
		$scope.selectMethod = 'shortcode';
		$scope.query = '';
		$scope.selectPlaceholders = {'hashtag': 'soylent',
									 'shortcode': 'BfcSFaiBzAq'}
		$scope.posts = [];
		$scope.score = {};

		$scope.init = function () {
			// get request
			$http({
				method: 'GET',
				url: '/all_results'
			}).then(function successCallback(response) {
				// handle success
				$scope.posts = response.data.posts;
				$scope.score = response.data.score;
				$log.log(response.data);
			}, function errorCallback(response) {
				// handle error
				$log.log(JSON.stringify("Failed to get t&c: " + response));
			});
		}

		$scope.submit = function () {
			$log.log($scope.selectMethod);
			// var data = $.param({
			// 	video: JSON.stringify({
			// 		title: $scope.title,
			// 		url: $scope.url,
			// 		body: $scope.body
			// 	})
			// });

			// post request
			$http({
				method: 'POST',
				url: '/search',
				data: {
					'searchType': $scope.selectMethod,
					'query': ($scope.query.length) ? $scope.query : $scope.selectPlaceholders[$scope.selectMethod]
				},
			}).then(function successCallback(response) {
				$scope.posts = response.data.posts;
				$scope.score = response.data.score;
			}, function errorCallback(response) {
				$log.log(JSON.stringify("Failed to get t&c: " + response));
			});
		}

		$scope.openVideo = function (obj) {
			if (obj.metadata.is_video){
				$window.open(obj.metadata.video_url, '_blank');				
			}
		}

		$scope.processRawData = function(obj) {
			return JSON.stringify(obj, null, 2);
		}

		$scope.getMaxText = function(obj) {
			var maxScore = 0;
			var maxObj;
			angular.forEach(obj.text_data, function(value) {
				if (value.score > maxScore) {
					maxScore = value.score;
					maxObj = value;
				}
			});
			return 'Text: ' + JSON.stringify(maxObj);
		}

		$scope.getMaxFrame = function(obj) {
			var maxScore = 0;
			var maxObj;
			var length = 0;

			$log.log(obj.frame_data);

			averages = {
				'anger': 0,
		        'contempt': 0,
		        'disgust': 0,
		        'fear': 0,
		        'happiness': 0,
		        'neutral': 0,
		        'sadness': 0,
		        'surprise': 0
			}
			angular.forEach(obj.frame_data, function(value) {
				averages.anger += value.anger;
				averages.contempt += value.contempt;
				averages.disgust += value.disgust;
				averages.fear += value.fear;
				averages.happiness += value.happiness;
				averages.neutral += value.neutral;
				averages.sadness += value.sadness;
				averages.surprise += value.surprise;
				length += 1;
			});
			averages.anger /= length;
			averages.contempt /= length;
			averages.disgust /= length;
			averages.fear /= length;
			averages.happiness /= length;
			averages.neutral /= length;
			averages.sadness /= length;
			averages.surprise /= length;

			$log.log(averages);

			var maxScore = 0;
			var maxKey;
			angular.forEach(averages, function(value, key) {
				if (value > maxScore) {
					maxScore = value;
					maxKey = key
				}
			});

			return 'Frame: ' + JSON.stringify({
				maxKey:maxKey,
				maxScore:maxScore
			});
		}

		$scope.getMaxAudio = function(obj) {
			var maxScore = 0;
			var maxObj;
			angular.forEach(obj.voice_data, function(value) {
				if (value.score > maxScore) {
					maxScore = value.score;
					maxObj = value;
				}
			});
			return 'Audio: ' + JSON.stringify(maxObj);
		}

		$scope.getImage = function(obj) {
			return 'Image: ' + JSON.stringify(obj.frame_data);
		}
	});