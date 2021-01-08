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
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '1241@deep'));
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
    var title_id = req.body.title_id;
    
    // Setting weightage for parameters
    const GENRE_WEIGHTAGE = 3;
    const LANGUAGE_WEIGHTAGE = 3;
    const AUTHOR_WEIGHTAGE = 2;
    const FOLLOWING_WEIGHTAGE = 2;

    session
        // Getting the details(particularly writing_style of the story) of the story user is reading
        .run('MATCH(a:Kahani {title_id: $title_idParam}) return a', {title_idParam: title_id})
        .then((result) => {
            var style;
            result.records.forEach((record) => {
                style = record._fields[0].properties.writing_style;
            });
            console.log(style);
            
            session
                // Getting all the stories which belongs to the genre of the story user is reading
                .run('MATCH(a:Kahani {title_id: $title_idParam})-[:BELONGS_TO]->(g)<-[:BELONGS_TO]-(k) return k order by k.views_count desc', {title_idParam: title_id})
                .then((result) => {
                    var kahaniesByGenreArr = [];
                    // Inserting data into kahaniesByGenreArr afetr filtering by views count
                    result.records.forEach((record) => {
                        if(record._fields[0].properties.writing_style == style) {
                            kahaniesByGenreArr.push({
                                title: record._fields[0].properties.title,
                                views_count: record._fields[0].properties.views_count
                            });
                        }
                    });

                    session
                        // Getting all the stories which belongs to the language of the story user is reading
                        .run('MATCH(a:Kahani {title_id: $title_idParam})-[:OF_LANGUAGE]->(l)<-[:OF_LANGUAGE]-(k) return k order by k.views_count desc', {title_idParam: title_id})
                        .then((result) => {
                            var kahaniesByLanguageArr = [];
                            // Inserting data into kahaniesByLanguageArr after filtering by views count
                            result.records.forEach((record) => {
                                if(record._fields[0].properties.writing_style == style) {
                                    kahaniesByLanguageArr.push({
                                        title: record._fields[0].properties.title,
                                        views_count: record._fields[0].properties.views_count
                                    });
                                }
                            });

                            session
                                // Getting all the stories which is written by the author of the story user is reading
                                .run('MATCH(a:Kahani {title_id: $title_idParam})<-[:HAS_WRITTEN_KAHANI]-(u)-[:HAS_WRITTEN_KAHANI]->(k) return k order by k.views_count desc', {title_idParam: title_id})
                                .then((result) => {
                                    var kahaniesWrittenByArr = [];
                                    // Inserting data into kahaniesWrittenByArr after filtering by views count
                                    result.records.forEach((record) => {
                                        if(record._fields[0].properties.writing_style == style) {
                                            kahaniesWrittenByArr.push({
                                                title: record._fields[0].properties.title,
                                                views_count: record._fields[0].properties.views_count
                                            });
                                        }
                                    });

                                    session
                                        // Getting all the stories which is written by the author user is following
                                        .run('MATCH(a:User {user_id: $user_idParam})-[:FOLLOWS]->(u)-[:HAS_WRITTEN]->(s) return s order by s.views_count desc', {user_idParam: user_id})
                                        .then((result) => {
                                            var storiesByAuthorFollowingArr = [];
                                            // Inserting data into storiesByAuthorFollowingArr after filtering by views count
                                            result.records.forEach((record) => {
                                                storiesByAuthorFollowingArr.push({
                                                    title: record._fields[0].properties.title,
                                                    views_count: record._fields[0].properties.views_count
                                                });
                                            });

                                            // console.log(kahaniesByGenreArr.length);
                                            // console.log(kahaniesByLanguageArr);
                                            // console.log(kahaniesWrittenByArr);
                                            // console.log(storiesByAuthorFollowingArr);

                                            var preFinalArray = [];
                                            var finalArr = [];
                                            var flag = 0;

                                            for(let i = 0; i < (kahaniesByGenreArr.length / 2); i++) {
                                                // Calculating weight for every story present in the kahaniesByGenreArr
                                                let weightDistributor = GENRE_WEIGHTAGE / (kahaniesByGenreArr.length - 1);
                                                if(kahaniesByGenreArr.length > 0) {
                                                    preFinalArray.push({
                                                        title: kahaniesByGenreArr[i].title,
                                                        // Calculating and setting weightage for priority 
                                                        priority: kahaniesByGenreArr[i].views_count * weightDistributor
                                                    });
                                                }
                                            }

                                            for(let i = 0; i < (kahaniesByLanguageArr.length / 2); i++) {
                                                // Calculating weight for every story present in the kahaniesByLanguageArr
                                                let weightDistributor = LANGUAGE_WEIGHTAGE / (kahaniesByLanguageArr.length - 1);
                                                if(kahaniesByLanguageArr.length > 0) {
                                                    preFinalArray.push({
                                                        title: kahaniesByLanguageArr[i].title,
                                                        // Calculating and setting weightage for priority
                                                        priority: kahaniesByLanguageArr[i].views_count * weightDistributor
                                                    });
                                                }
                                            }

                                            for(let i = 0; i < (kahaniesWrittenByArr.length / 2); i++) {
                                                // Calculating weight for every story present in the kahaniesWrittenByArr
                                                let weightDistributor = AUTHOR_WEIGHTAGE / (kahaniesWrittenByArr.length - 1);
                                                if(kahaniesWrittenByArr.length > 0) {
                                                    preFinalArray.push({
                                                        title: kahaniesWrittenByArr[i].title,
                                                        // Calculating and setting weightage for priority
                                                        priority: kahaniesWrittenByArr[i].views_count * weightDistributor
                                                    });
                                                }
                                            }

                                            for(let i = 0; i < (storiesByAuthorFollowingArr.length / 2); i++) {
                                                // Calculating weight for every story present in the storiesByAuthorFollowingArr
                                                let weightDistributor = FOLLOWING_WEIGHTAGE / (storiesByAuthorFollowingArr.length - 1);
                                                if(storiesByAuthorFollowingArr.length > 0) {
                                                    preFinalArray.push({
                                                        title: storiesByAuthorFollowingArr[i].title,
                                                        // Calculating and setting weightage for priority
                                                        priority: storiesByAuthorFollowingArr[i].views_count * weightDistributor
                                                    });
                                                }
                                            }

                                            // console.log(preFinalArray);

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

                                            // console.log(preFinalArray);
                                            // console.log(finalArr);

                                            // Inserting all the remaining stories from the preFinalArray to the finalArr
                                            for(let i = 0; i < preFinalArray.length; i++) {
                                                if(preFinalArray[i].title != 0 && preFinalArray[i].priority >= 10) {
                                                    finalArr.push(preFinalArray[i].title);
                                                }
                                            }

                                            // console.log(finalArr);

                                            res.render('finalRecommendation', {
                                                // kahaniesByGenre: kahaniesByGenreArr,
                                                // kahaniesByLanguage: kahaniesByLanguageArr,
                                                // kahaniesWrittenBy: kahaniesWrittenByArr,
                                                // storiesByAuthorFollowing: storiesByAuthorFollowingArr,
                                                final: finalArr
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