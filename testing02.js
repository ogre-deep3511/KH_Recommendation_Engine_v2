const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('morgan');
const neo4j = require('neo4j-driver');

const app = express();
const port = process.env.PORT || 5000;

//view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

//Setting up neo4j authentication
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '1241@deep'));
const session = driver.session();

// This is for displaying all the user data, genre data and kahani data from the neo4j database
app.get('/', (req, res) => {
    res.render('pindex');
})

app.post('/popularity/recommendation', (req, res) => {

    var user_id = req.body.user_id;
    // var confirmation = req.body.confirmation
    // console.log(user_id);

    if(user_id) {

        session
            .run('match(a:TrendingStories)<-[:NOW_TRENDING]-(s)-[:BELONGS_TO_KAHANI]->(k)-[:IS_OF_LANGUAGE]->(l)<-[:IS_OF_LANGUAGE]-(x)<-[:BELONGS_TO_KAHANI]-(y) return y limit 25')
            .then((result) => {
                console.log("Started trending-language-stories module");
                var trendingStoriesArr = [];
                // Inserting data into trendingStoriesArr 
                result.records.forEach((record) => {
                    trendingStoriesArr.push({
                        story_id: record._fields[0].properties.story_id
                    });
                });

                console.log(trendingStoriesArr);
            })
            .catch((err) => {
                console.log(err);
            })

    }

})

app.listen(port, () => {
    console.log("Server Started on port: 5000!!!");
});

module.exports = app;