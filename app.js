var app = angular.module('myApp', [
//	Module Dependencies
	'ngMaterial'
]);
app.controller('myCtrl',
	function ($scope) {
		$scope.imagePath = 'https://www.funnypica.com/wp-content/uploads/2015/05/Funny-Dog-faces-4.jpg';
		$scope.searchMethods = ['# Hash Tag', '/ Short path']
		$scope.myObj =
			[
				{
					"anger": 0.037,
					"contempt": 0.001,
					"disgust": 0.015,
					"fear": 0.001,
					"happiness": 0.939,
					"neutral": 0.001,
					"sadness": 0.0,
					"surprise": 0.007
				},
				{
					"anger": 0.037,
					"contempt": 0.001,
					"disgust": 0.015,
					"fear": 0.001,
					"happiness": 0.939,
					"neutral": 0.001,
					"sadness": 0.0,
					"surprise": 0.007
				},
				{
					"anger": 0.037,
					"contempt": 0.001,
					"disgust": 0.015,
					"fear": 0.001,
					"happiness": 0.939,
					"neutral": 0.001,
					"sadness": 0.0,
					"surprise": 0.007
				},
				{
					"anger": 0.037,
					"contempt": 0.001,
					"disgust": 0.015,
					"fear": 0.001,
					"happiness": 0.939,
					"neutral": 0.001,
					"sadness": 0.0,
					"surprise": 0.007
				},
				{
					"anger": 0.037,
					"contempt": 0.001,
					"disgust": 0.015,
					"fear": 0.001,
					"happiness": 0.939,
					"neutral": 0.001,
					"sadness": 0.0,
					"surprise": 0.007
				},
				{
					"anger": 0.037,
					"contempt": 0.001,
					"disgust": 0.015,
					"fear": 0.001,
					"happiness": 0.939,
					"neutral": 0.001,
					"sadness": 0.0,
					"surprise": 0.007
				}

			];

		$scope.submit = function () {
			var data = $.param({
				video: JSON.stringify({
					title: $scope.title,
					url: $scope.url,
					body: $scope.body
				})
			});
			// get request
			$http({
				method: 'GET',
				url: '/someUrl'
			}).then(function successCallback(response) {
				// handle success
				$scope.videos = response.data;
			}, function errorCallback(response) {
				// handle error
				console.log(JSON.stringify("Failed to get t&c: " + response));
			});

			// post request
			$http({
				method: 'POST',
				url: '/someUrl',
				headers: {
					'Content-Type': undefined
				},
				data: data,
			}).then(function successCallback(response) {
				// handle success here

			}, function errorCallback(response) {
				// handle error
				console.log(JSON.stringify("Failed to get t&c: " + response));
			});
		}
	});