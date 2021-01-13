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

    const POPULARITY_WEIGHTAGE = 3 / 5;

    if(user_id) {
        session
        .run('MATCH(a:Story), (b:StoryViews) where (a)-[:HAS_VIEWS]->(b) AND b.totalViews > 50 return a order by a.views_count desc limit 25')
        .then((result) => {
            console.log("Started process 4");
            var storiesByViewsArr = [];
            // Inserting data into storiesByViewsArr
            result.records.forEach((record) => {
                storiesByViewsArr.push({
                    title: record._fields[0].properties.title
                });
            });

            // console.log(storiesByViewsArr);

            session
                .run('MATCH(a:Story), (b:StoryReads) where (a)-[:HAS_READS]->(b) AND b.totalReads > 15 return a order by a.views_count desc limit 25')
                .then((result) => {
                    console.log("Started process 5");
                    var storiesByReadsArr = [];
                    // Inserting data into storiesByReadsArr
                    result.records.forEach((record) => {
                        storiesByReadsArr.push({
                            title: record._fields[0].properties.title
                        });
                    });

                    // console.log(storiesByReadsArr);

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

                            // console.log(storiesByRatingArr);

                            session
                                .run('MATCH(a:Story), (b:TotalComment) where (a)-[:HAS_COMMENT]->(b) AND b.totalComment > 100 return a order by a.views_count desc limit 25')
                                .then((result) => {
                                    console.log("Started process 7");
                                    var storiesByCommentArr = [];
                                    // Inserting data into storiesByCommentArr
                                    result.records.forEach((record) => {
                                        storiesByCommentArr.push({
                                            title: record._fields[0].properties.title
                                        });
                                    });

                                    // console.log(storiesByCommentArr);

                                    session
                                        .run('MATCH(a:Story), (b:TotalPurchase) where (a)-[:HAS_PURCHASES]->(b) AND b.totalPurchase > 500 return a order by a.views_count desc limit 25')
                                        .then((result) => {
                                            console.log("Started process 8");
                                            var storiesByPurchaseArr = [];
                                            // Inserting data into storiesByPurchaseArr
                                            result.records.forEach((record) => {
                                                storiesByPurchaseArr.push({
                                                    title: record._fields[0].properties.title
                                                });
                                            });

                                            // console.log(storiesByPurchaseArr);

                                            var preFinalArray = [];
                                            var finalArr = [];
                                            var flag = 0;

                                            for(let i = 0; i < (storiesByViewsArr.length); i++) {
                                                // Calculating weight for every story present in the storiesByViewsArr
                                                let weightDistributor = POPULARITY_WEIGHTAGE / storiesByViewsArr.length;
                                                if(storiesByViewsArr.length > 0) {
                                                    preFinalArray.push({
                                                        title: storiesByViewsArr[i].title,
                                                        // Calculating and setting weightage for priority 
                                                        priority: storiesByViewsArr[i].views_count * weightDistributor
                                                    });
                                                }
                                            }

                                            for(let i = 0; i < (storiesByReadsArr.length); i++) {
                                                // Calculating weight for every story present in the storiesByReadsArr
                                                let weightDistributor = POPULARITY_WEIGHTAGE / storiesByReadsArr.length;
                                                if(storiesByReadsArr.length > 0) {
                                                    preFinalArray.push({
                                                        title: storiesByReadsArr[i].title,
                                                        // Calculating and setting weightage for priority
                                                        priority: storiesByReadsArr[i].views_count * weightDistributor
                                                    });
                                                }
                                            }

                                            for(let i = 0; i < (storiesByRatingArr.length); i++) {
                                                // Calculating weight for every story present in the storiesByRatingArr
                                                let weightDistributor = POPULARITY_WEIGHTAGE / storiesByRatingArr.length;
                                                if(storiesByRatingArr.length > 0) {
                                                    preFinalArray.push({
                                                        title: storiesByRatingArr[i].title,
                                                        // Calculating and setting weightage for priority
                                                        priority: storiesByRatingArr[i].views_count * weightDistributor
                                                    });
                                                }
                                            }

                                            for(let i = 0; i < (storiesByCommentArr.length); i++) {
                                                // Calculating weight for every story present in the storiesByCommentArr
                                                let weightDistributor = POPULARITY_WEIGHTAGE / storiesByCommentArr.length;
                                                if(storiesByCommentArr.length > 0) {
                                                    preFinalArray.push({
                                                        title: storiesByCommentArr[i].title,
                                                        // Calculating and setting weightage for priority
                                                        priority: storiesByCommentArr[i].views_count * weightDistributor
                                                    });
                                                }
                                            }

                                            for(let i = 0; i < (storiesByPurchaseArr.length); i++) {
                                                // Calculating weight for every story present in the storiesByPurchaseArr
                                                let weightDistributor = POPULARITY_WEIGHTAGE / storiesByPurchaseArr.length;
                                                if(storiesByPurchaseArr.length > 0) {
                                                    preFinalArray.push({
                                                        title: storiesByPurchaseArr[i].title,
                                                        // Calculating and setting weightage for priority
                                                        priority: storiesByPurchaseArr[i].views_count * weightDistributor
                                                    });
                                                }
                                            }

                                            // Inserting identical stories which is repeated in the preFinalArray to the finalArr
                                            for(let i = 0; i < preFinalArray.length; i++) {
                                                for(let j = (i + 1); j < preFinalArray.length; j++) {
                                                    if(preFinalArray[i].title == preFinalArray[j].title && preFinalArray[i].title != 0) {
                                                        flag = 1;
                                                        preFinalArray[j].title = 0;
                                                    }
                                                }
                                                if(flag == 1) {
                                                    finalArr.push(preFinalArray[i].title);
                                                    preFinalArray[i].title = 0;
                                                    flag = 0;
                                                }
                                            }

                                            // Inserting all the remaining stories from the preFinalArray to the finalArr
                                            for(let i = 0; i < preFinalArray.length; i++) {
                                                if(preFinalArray[i].title != 0 && preFinalArray[i].priority >= 2) {
                                                    finalArr.push(preFinalArray[i].title);
                                                }
                                            }

                                            res.render('finalRecommendation', {
                                                // kahaniesByGenre: storiesByGenreArr,
                                                // kahaniesWrittenBy: storiesWrittenByAuthorArr,
                                                // storiesByAuthorFollowing: storiesByAuthorFollowingArr,
                                                final: finalArr
                                            });

                                        })
                                        .catch((err) => {
                                            console.log(err);
                                        })
                                })
                                .catch((err) => {
                                    console.log(err);
                                })
                        })
                        .catch((err) => {
                            console.log(err);
                        })
                })
                .catch((err) => {
                    console.log(err);
                })
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