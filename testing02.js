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
const driver = neo4j.driver('bolt://localhost:11007', neo4j.auth.basic('neo4j', '1241@deep'));
const session = driver.session();

// This is for displaying all the user data, genre data and kahani data from the neo4j database
app.get('/', (req, res) => {
    res.render('pindex');
})

app.post('/popularity/recommendation', (req, res) => {

    var user_id = req.body.user_id;
    // var confirmation = req.body.confirmation
    console.log(user_id);

    if(user_id) {

        session
            .run('MATCH(a:Story), (b:TotalRating) where (a)-[:HAS_TOTAL_RATING]->(b) AND b.totalRating > 100 return a order by a.views_count desc limit 25')
            .then((result) => {
                console.log("Started process 6");
                var storiesByRatingArr = [];
                // Inserting data into storiesByRatingArr 
                result.records.forEach((record) => {
                    storiesByRatingArr.push({
                        title: record._fields[0].properties.title
                    });
                });

                console.log(storiesByRatingArr);
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