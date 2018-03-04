// global vars
var port = 3000;
var rootFolder = '/home/marcus/hacktech2018/';
var loadFromJson = true;
var jsonFile = rootFolder + 'soylent.json';

var express = require('express');
var app = express();
app.use('/node_modules', express.static(rootFolder + 'node_modules/'));
app.use('/app', express.static(rootFolder + 'app.js'));
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var impression = require('./impression');
var fs = require('fs');

var getSingle = function(instagramShortcode, fileName) {
    impression.getSingle(instagramShortcode, function(posts) {
        fs.writeFile(fileName + '.json', JSON.stringify(posts, null, 4), 'utf8');
    });
}

// getSingle('BfcSFaiBzAq', 'single_result');

var getAll =function(instagramTag, fileName) {
    impression.getAll(instagramTag, function(posts) {
        fs.writeFile(fileName + '.json', JSON.stringify(posts, null, 4), 'utf8');
    });
}

getAll('soylent', 'all_results');

// endpoints
app.get('/', function (req, res) {
    res.sendFile(rootFolder + 'index.html');
});

app.post('/search', function (req, res) {
    console.log(req.body);
    if (req.body.searchType === 'hashtag') {
        impression.getAll(req.body.query, function(posts) {
            res.send(posts);
        });
    } else if (req.body.searchType === 'shortcode') {
        impression.getSingle(req.body.query, function(posts) {
            res.send(posts);
        });
    }
})

app.get('/single_result', function (req, res) {
    res.header("Content-Type", "application/json");
    res.sendFile(rootFolder + 'single_result.json');
});

app.get('/all_results', function (req, res) {
    res.header("Content-Type", "application/json");
    res.sendFile(rootFolder + 'all_results.json');
});

app.listen(port, function () {
    console.log('listening on ' + port);
});