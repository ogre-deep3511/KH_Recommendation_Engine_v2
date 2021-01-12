const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('morgan');
const neo4j = require('neo4j-driver');
// const apoc = require('apoc');

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
    res.render('index');
})

// Method for Story recommendation
app.post('/kahani/recommendation', (req, res) => {

    // Getting user id and title id from the front-end(Assuming user reads this story)
    var user_id = req.body.user_id;
    var kahani_id = req.body.kahani_id;
    
    // Setting weightage for parameters
    const GENRE_WEIGHTAGE = 3;
    const POPULARITY_WEIGHTAGE = 3;
    const AUTHOR_WEIGHTAGE = 2;
    const FOLLOWING_WEIGHTAGE = 2;

    session
        // Getting the details(particularly writing_style, language and genre of the story) of the story user is reading
        .run('MATCH(a:Story {kahani_id: $kahani_idParam}), (b:Kahani) where a.kahani_id = b.kahani_id return b', {kahani_idParam: kahani_id})
        .then((result) => {
            var writing_style;
            var language;
            var genre;
            result.records.forEach((record) => {
                writing_style = record._fields[0].properties.writing_style;
                language = record._fields[0].properties.language;
                genre = record._fields[0].properties.genre;
            });
            // console.log(style);
            
            session
                // Getting all the stories which belongs to the genre of the story user is reading
                .run('match(a:Story {kahani_id: $kahani_idParam})-[:BELONGS_TO_KAHANI]->(k)-[:IS_OF_GENRE]->(g)<-[:IS_OF_GENRE]-(s)<-[:BELONGS_TO_KAHANI]-(m) return m order by m.views_count desc limit 25', {kahani_idParam: kahani_id})
                .then((result) => {
                    console.log("Started process 1");
                    var storiesByGenreArr = [];
                    // Inserting data into storiesByGenreArr afetr filtering by views count
                    result.records.forEach((record) => {
                            storiesByGenreArr.push({
                                title: record._fields[0].properties.title
                            });
                    });

                    console.log(storiesByGenreArr);

                    session
                        // Getting all the stories which is written by the author of the story user is reading
                        .run('match(s:Story {kahani_id: $kahani_idParam})<-[:HAS_WRITTEN]-(a)-[:HAS_WRITTEN]->(s1) return s1 order by s1.views_count desc limit 25', {kahani_idParam: kahani_id})
                        .then((result) => {
                            console.log("Started process 2")
                            var storiesWrittenByAuthorArr = [];
                            // Inserting data into storiesWrittenByAuthorArr after filtering by views count
                            result.records.forEach((record) => {
                                    storiesWrittenByAuthorArr.push({
                                        title: record._fields[0].properties.title,
                                    });
                            });

                            console.log(storiesWrittenByAuthorArr);

                            session
                                // Getting all the stories which is written by the author user is following
                                .run('MATCH(u:User {user_id: $user_idParam})-[:FOLLOWS]-(u1)-[:HAS_WRITTEN]-(s) return s order by s.views_count desc limit 25', {user_idParam: user_id})
                                .then((result) => {
                                    console.log("Started process 3");
                                    var storiesByAuthorFollowingArr = [];
                                    // Inserting data into storiesByAuthorFollowingArr after filtering by views count
                                    result.records.forEach((record) => {
                                        storiesByAuthorFollowingArr.push({
                                            title: record._fields[0].properties.title,
                                        });
                                    });

                                    console.log(storiesByAuthorFollowingArr);

                                    session
                                        // Getting all the stories which has total views greater than the threshold
                                        .run('MATCH(a:Story), (b:StoryViews) where (a)-[:HAS_VIEWS]->(b) AND b.totalViews > 5 return a order by a.views_count desc limit 25')
                                        .then((result) => {
                                            console.log("Started process 4");
                                            var storiesByViewsArr = [];
                                            // Inserting data into storiesByViewsArr
                                            result.records.forEach((record) => {
                                                storiesByViewsArr.push({
                                                    title: record._fields[0].properties.title
                                                });
                                            });

                                            console.log(storiesByViewsArr);

                                            session
                                                // Getting all the stories which has total reads greater than the threshold
                                                .run('MATCH(a:Story), (b:StoryReads) where (a)-[:HAS_READS]->(b) AND b.totalReads > 5 return a order by a.views_count desc limit 25')
                                                .then((result) => {
                                                    console.log("Started process 5");
                                                    var storiesByReadsArr = [];
                                                    // Inserting data into storiesByReadsArr
                                                    result.records.forEach((record) => {
                                                        storiesByReadsArr.push({
                                                            title: record._fields[0].properties.title
                                                        });
                                                    });

                                                    console.log(storiesByReadsArr);

                                                    session
                                                        // Getting all the stories which has total rating greater than the threshold
                                                        .run('MATCH(a:Story), (b:TotalRating) where (a)-[:HAS_TOTAL_RATING]->(b) AND b.totalRating > 5 return a order by a.views_count desc limit 25')
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

                                                            session
                                                                // Getting all the stories which has total comments greater than the threshold
                                                                .run('MATCH(a:Story), (b:TotalComment) where (a)-[:HAS_COMMENT]->(b) AND b.totalComment > 5 return a order by a.views_count desc limit 25')
                                                                .then((result) => {
                                                                    console.log("Started process 7");
                                                                    var storiesByCommentArr = [];
                                                                    // Inserting data into storiesByCommentArr
                                                                    result.records.forEach((record) => {
                                                                        storiesByCommentArr.push({
                                                                            title: record._fields[0].properties.title
                                                                        });
                                                                    });

                                                                    console.log(storiesByCommentArr);

                                                                    session
                                                                        // Getting all the stories which has total purchases greater than the threshold
                                                                        .run('MATCH(a:Story), (b:TotalPurchase) where (a)-[:HAS_PURCHASES]->(b) AND b.totalPurchase > 5 return a order by a.views_count desc limit 25')
                                                                        .then((result) => {
                                                                            console.log("Started process 8");
                                                                            var storiesByPurchaseArr = [];
                                                                            // Inserting data into storiesByPurchaseArr
                                                                            result.records.forEach((record) => {
                                                                                storiesByPurchaseArr.push({
                                                                                    title: record._fields[0].properties.title
                                                                                });
                                                                            });

                                                                            console.log(storiesByPurchaseArr);

                                                                            // console.log(storiesByGenreArr);
                                                                            // console.log(storiesWrittenByAuthorArr);
                                                                            // console.log(storiesByAuthorFollowingArr);
                                                                            // console.log(storiesByViewsArr);
                                                                            // console.log(storiesByReadsArr);
                                                                            // console.log(storiesByRatingArr);
                                                                            // console.log(storiesByCommentArr);
                                                                            // console.log(storiesByPurchaseArr);

                                                                        })
                                                                        .catch((err) => {
                                                                            console.log(err);
                                                                        })
                                                                        // .then(() => session.close())
                                                                })
                                                                .catch((err) => {
                                                                    console.log(err);
                                                                })
                                                                // .then(() => session.close())
                                                        })
                                                        .catch((err) => {
                                                            console.log(err);
                                                        })
                                                        // .then(() => session.close())
                                                })
                                                .catch((err) => {
                                                    console.log(err);
                                                })
                                                // .then(() => session.close())
                                        })
                                        .catch((err) => {
                                            console.log(err);
                                        })
                                        // .then(() => session.close())

                                })
                                .catch((err) => {
                                    console.log(err);
                                })
                                // .then(() => session.close())

                        })
                        .catch((err) => {
                            console.log(err);
                        })
                        // .then(() => session.close())
                })
                .catch((err) => {
                    console.log(err);
                })
                // .then(() => session.close())
        })
        .catch((err) => {
            console.log(err);
        })
        // .then(() => session.close())
});


app.listen(port, () => {
    console.log("Server Started on port: 5000!!!");
});

module.exports = app;



// session
//         .run('MATCH(a:User {user_id: $user_idParam})-[r:LIKES_GENRE]->(f)<-[r2:BELONGS_TO]-(k) RETURN k', {user_idParam: user_id})
//         .then((result3) => {
//             var kahaniArr = [];
//             //Inserting data into movieArr array
//             result3.records.forEach((record) => {
//                 if(record._fields[0].properties.views_count > 150 && record._fields[0].properties.language == language) {
//                     kahaniArr.push({
//                         // id: record._fields[0].identity.low,
//                         title: record._fields[0].properties.title
//                         // year: record._fields[0].properties.release_date
//                     });
//                 }
//             });
//             console.log(kahaniArr);

//             session
//                 .run('MATCH(a:User {user_id: $user_idParam})-[:LIKES]->(n) RETURN n', {user_idParam: user_id})
//                 .then((result) => {
//                     var nanoStoryArr = [];
//                     //Inserting data into nanoStoryArr array
//                     result.records.forEach((record) => {
//                         nanoStoryArr.push({
//                             id: record._fields[0].properties.nano_story
//                         });
//                     });
//                     // console.log(nanoStoryArr);
//                     session
//                         .run('MATCH(a:User {email: $email_idParam})-[:Has_RATED]-(n)-[:RATING_FOR]->(k) RETURN k', {email_idParam: email_id})
//                         .then((result) => {
//                             var storiesArrByRating = [];
//                             //Inserting data into kahaniArrByRating array
//                             result.records.forEach((record) => {
//                                 if(record._fields[0].properties.views_count > 150 || record._fields[0].properties.avgRating > 3.5) {
//                                     storiesArrByRating.push({
//                                         title: record._fields[0].properties.title  
//                                     });
//                                 }
//                             });

//                             res.render('index1', {
//                                 kahanies: kahaniArr,
//                                 nanoStories: nanoStoryArr,
//                                 stories: storiesArrByRating
//                             });
//                         })
//                         .catch((err) => {
//                             console.log(err);
//                         });
//                 })
//                 .catch((err) => {
//                     console.log(err);
//                 });
//         })
//         .catch((err) => {
//             console.log(err);
//         });