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
				console.log(response.data);
			}, function errorCallback(response) {
				// handle error
				console.log(JSON.stringify("Failed to get t&c: " + response));
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
				console.log(JSON.stringify("Failed to get t&c: " + response));
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
	});