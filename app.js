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
    session
        //Fetching User's data from the database
        .run('match(n:User) return n')
        .then((result) => {
            let userArray = [];
            //Inserting data into userArray array
            result.records.forEach((record) => {
                userArray.push({
                    id: record._fields[0].identity.low,
                    user_id: record._fields[0].properties.user_id
                });
            });

            session
                //Fetching Genre's data from database
                .run('match(n:Genre) return n')
                .then((result) => {
                    let genreArray = [];
                    //Inserting data into genreArray
                    result.records.forEach((record) => {
                        genreArray.push({
                            id: record._fields[0].identity.low,
                            name: record._fields[0].properties.name
                        });
                    });

                    session
                        //Fetching Kahanies data from database
                        .run('match(n:Kahani) return n')
                        .then((result) => {
                            let kahaniArray = [];
                            //Inserting data into kahaniAray array
                            result.records.forEach((record) => {
                                kahaniArray.push({
                                    id: record._fields[0].identity.low,
                                    title: record._fields[0].properties.title
                                });
                            });

                            //Rendering data to the homepage
                            res.render('index', {
                                users: userArray,
                                genres: genreArray,
                                kahanies: kahaniArray
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
        });
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
                .run('match(a:Story {kahani_id: $kahani_idParam})-[:BELONGS_TO_KAHANI]->(k)-[:IS_OF_GENRE]->(g)<-[:IS_OF_GENRE]-(s)<-[:BELONGS_TO_KAHANI]-(m) return m order by m.views_count desc', {kahani_idParam: kahani_id})
                .then((result) => {
                    var storiesByGenreArr = [];
                    // Inserting data into storiesByGenreArr afetr filtering by views count
                    result.records.forEach((record) => {
                            storiesByGenreArr.push({
                                title: record._fields[0].properties.title,
                                views_count: record._fields[0].properties.views_count
                            });
                    });

                    session
                        // Getting all the stories which is written by the author of the story user is reading
                        .run('match(s:Story {kahani_id: $kahani_idParam})<-[:HAS_WRITTEN]-(a)-[:HAS_WRITTEN]->(s1) return s1 order by s1.views_count desc', {kahani_idParam: kahani_id})
                        .then((result) => {
                            var storiesWrittenByAuthorArr = [];
                            // Inserting data into storiesWrittenByAuthorArr after filtering by views count
                            result.records.forEach((record) => {
                                    storiesWrittenByAuthorArr.push({
                                        title: record._fields[0].properties.title,
                                        views_count: record._fields[0].properties.views_count
                                    });
                            });

                            session
                                // Getting all the stories which is written by the author user is following
                                .run('MATCH(u:User {user_id: $user_idParam})-[:FOLLOWS]-(u1)-[:HAS_WRITTEN]-(s) return s order by s.views_count desc', {user_idParam: user_id})
                                .then((result) => {
                                    var storiesByAuthorFollowingArr = [];
                                    // Inserting data into storiesByAuthorFollowingArr after filtering by views count
                                    result.records.forEach((record) => {
                                        storiesByAuthorFollowingArr.push({
                                            title: record._fields[0].properties.title,
                                            views_count: record._fields[0].properties.views_count
                                        });
                                    });

                                    session
                                        // Getting all the stories which has total views greater than the threshold
                                        .run('MATCH(a:Story), (b:StoryViews) where (a)-[:HAS_VIEWS]->(b) AND b.totalViews > 5 return a order by a.views_count desc')
                                        .then((result) => {
                                            var storiesByViewsArr = [];
                                            // Inserting data into storiesByViewsArr
                                            result.records.forEach((record) => {
                                                storiesByViewsArr.push({
                                                    title: record._fields[0].properties.title
                                                });
                                            });

                                            session
                                                // Getting all the stories which has total reads greater than the threshold
                                                .run('MATCH(a:Story), (b:StoryReads) where (a)-[:HAS_READS]->(b) AND b.totalReads > 5 return a order by a.views_count desc')
                                                .then((result) => {
                                                    var storiesByReadsArr = [];
                                                    // Inserting data into storiesByReadsArr
                                                    result.records.forEach((record) => {
                                                        storiesByReadsArr.push({
                                                            title: record._fields[0].properties.title
                                                        });
                                                    });

                                                    session
                                                        // Getting all the stories which has total rating greater than the threshold
                                                        .run('MATCH(a:Story), (b:TotalRating) where (a)-[:HAS_TOTAL_RATING]->(b) AND b.totalRating > 5 return a order by a.views_count desc')
                                                        .then((result) => {
                                                            var storiesByRatingArr = [];
                                                            // Inserting data into storiesByRatingArr 
                                                            result.records.forEach((record) => {
                                                                storiesByRatingArr.push({
                                                                    title: record._fields[0].properties.title
                                                                });
                                                            });

                                                            session
                                                                // Getting all the stories which has total comments greater than the threshold
                                                                .run('MATCH(a:Story), (b:TotalComment) where (a)-[:HAS_COMMENT]->(b) AND b.totalComment > 5 return a order by a.views_count desc')
                                                                .then((result) => {
                                                                    var storiesByCommentArr = [];
                                                                    // Inserting data into storiesByCommentArr
                                                                    result.records.forEach((record) => {
                                                                        storiesByCommentArr.push({
                                                                            title: record._fields[0].properties.title
                                                                        });
                                                                    });

                                                                    session
                                                                        // Getting all the stories which has total purchases greater than the threshold
                                                                        .run('MATCH(a:Story), (b:TotalPurchase) where (a)-[:HAS_PURCHASES]->(b) AND b.totalPurchase > 5 return a order by a.views_count desc')
                                                                        .then((result) => {
                                                                            var storiesByPurchaseArr = [];
                                                                            // Inserting data into storiesByPurchaseArr
                                                                            result.records.forEach((record) => {
                                                                                storiesByPurchaseArr.push({
                                                                                    title: record._fields[0].properties.title
                                                                                });
                                                                            });

                                                                            console.log(storiesByGenreArr);
                                                                            console.log(storiesWrittenByAuthorArr);
                                                                            console.log(storiesByAuthorFollowingArr);
                                                                            console.log(storiesByViewsArr);
                                                                            console.log(storiesByReadsArr);
                                                                            console.log(storiesByRatingArr);
                                                                            console.log(storiesByCommentArr);
                                                                            console.log(storiesByPurchaseArr);

                                                                        })
                                                                        .catch((err) => {
                                                                            console.log(err);
                                                                        })
                                                                })
                                                                .then((err) => {
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
                                });

                        })
                        .catch((err) => {
                            console.log(err);
                        });
                        
                })
                .catch((err) => {
                    console.log(err);
                });
        })
        .catch((err) => {
            console.log(err);
        });
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