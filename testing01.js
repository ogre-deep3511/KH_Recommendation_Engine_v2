const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('morgan');
const neo4j = require('neo4j-driver');
const { query } = require('express');

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
    res.render('index');
})

app.post('/kahani/recommendation', (req, res) => {

    var user_id = req.body.user_id;
    var kahani_id = req.body.kahani_id;

    const GENRE_WEIGHTAGE = 3;
    const POPULARITY_WEIGHTAGE = 3;
    const AUTHOR_WEIGHTAGE = 2;
    const FOLLOWING_WEIGHTAGE = 2;

    session
        .run('MATCH(a:Story {kahani_id: $kahani_idParam}), (b:Kahani) where a.kahani_id = b.kahani_id return b', {kahani_idParam: kahani_id})
        .then((result) => {

        let writing_style;
        let language;
        let genre;
        
        result.records.forEach((record) => {
            writing_style = record._fields[0].properties.writing_style;
            language = record._fields[0].properties.language;
            genre = record._fields[0].properties.genre;
        })

        // console.log(writing_style);
        // console.log(language);
        // console.log(genre);

        session
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

            // console.log(storiesByGenreArr);

            session
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

                // console.log(storiesWrittenByAuthorArr);

                session
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

                    // console.log(storiesByAuthorFollowingArr);

                    var preFinalArray = [];
                    var finalArr = [];
                    var flag = 0;

                    for(let i = 0; i < (storiesByGenreArr.length / 2); i++) {
                        // Calculating weight for every story present in the storiesByGenreArr
                        let weightDistributor = GENRE_WEIGHTAGE / storiesByGenreArr.length;
                        if(storiesByGenreArr.length > 0) {
                            preFinalArray.push({
                                title: storiesByGenreArr[i].title,
                                // Calculating and setting weightage for priority 
                                priority: storiesByGenreArr[i].views_count * weightDistributor
                            });
                        }
                    }

                    for(let i = 0; i < (storiesWrittenByAuthorArr.length / 2); i++) {
                        // Calculating weight for every story present in the storiesWrittenByAuthorArr
                        let weightDistributor = AUTHOR_WEIGHTAGE / storiesWrittenByAuthorArr.length;
                        if(storiesWrittenByAuthorArr.length > 0) {
                            preFinalArray.push({
                                title: storiesWrittenByAuthorArr[i].title,
                                // Calculating and setting weightage for priority
                                priority: storiesWrittenByAuthorArr[i].views_count * weightDistributor
                            });
                        }
                    }

                    for(let i = 0; i < (storiesByAuthorFollowingArr.length / 2); i++) {
                        // Calculating weight for every story present in the storiesByAuthorFollowingArr
                        let weightDistributor = FOLLOWING_WEIGHTAGE / storiesByAuthorFollowingArr.length;
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
                        if(preFinalArray[i].title != 0 && preFinalArray[i].priority >= 2) {
                            finalArr.push(preFinalArray[i].title);
                        }
                    }

                    // console.log(finalArr);

                    res.render('finalRecommendation', {
                        // kahaniesByGenre: storiesByGenreArr,
                        // kahaniesWrittenBy: storiesWrittenByAuthorArr,
                        // storiesByAuthorFollowing: storiesByAuthorFollowingArr,
                        final: finalArr
                    });
                    
                })

            })

        })
    })
        

})


app.listen(port, () => {
    console.log("Server Started on port: 5000!!!");
});

module.exports = app;