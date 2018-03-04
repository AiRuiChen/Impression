var app = angular.module('myApp', []);
app.controller('myCtrl', function ($scope, $http) {
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