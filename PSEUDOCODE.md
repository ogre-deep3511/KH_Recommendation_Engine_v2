# Recommendation Engine Pseudocode

## Priority Parameter

```bash
* GENRE_WEIGHTAGE set to 3
* LANGUAGE_WEIGHTAGE set to 3
* AUTHOR_WEIGHTAGE set to 2
* FOLLOWING_WEIGHTAGE set to 2
```

## Filtering Parameter

```bash
* VIEWS_COUNT
* WRITING_STYLE
```

## Pseudocode

```bash
* neo4j-driver is preinstalled with "npm install" command
* neo4j database instance is connected with the server

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '1241@deep'));
const session = driver.session();

* INPUT:
    - "user_id" of the user who is reading the story
    - "title_id" of the story user is reading

neo4j session start
    Getting the details(particularly writing_style of the story) of the story user is reading
        "MATCH(a:Kahani {title_id: $title_idParam}) return a"
        "var style = writing_style of the story user is reading"
    neo4j session start
        Getting all the stories which belongs to the genre of the story user is reading
            "MATCH(a:Kahani {title_id: $title_idParam})-[:BELONGS_TO]->(g)<-[:BELONGS_TO]-(k) return k order by k.views_count desc"
            "var kahaniesByGenreArr = []"
                    // Inserting data into kahaniesByGenreArr afetr filtering by views count
                    "result.records.forEach((record) => {
                        if(record._fields[0].properties.writing_style == style) {
                            kahaniesByGenreArr.push({
                                title: record._fields[0].properties.title,
                                views_count: record._fields[0].properties.views_count
                            });
                        }
                    });"
        neo4j session start
            Getting all the stories which belongs to the language of the story user is reading
            "MATCH(a:Kahani {title_id: $title_idParam})-[:OF_LANGUAGE]->(l)<-[:OF_LANGUAGE]-(k) return k order by k.views_count desc"
            "var kahaniesByLanguageArr = []"
                            // Inserting data into kahaniesByLanguageArr after filtering by views count
                            "result.records.forEach((record) => {
                                if(record._fields[0].properties.writing_style == style) {
                                    kahaniesByLanguageArr.push({
                                        title: record._fields[0].properties.title,
                                        views_count: record._fields[0].properties.views_count
                                    });
                                }
                            });"
            neo4j session start
                Getting all the stories which is written by the author of the story user is reading
                "MATCH(a:Kahani {title_id: $title_idParam})<-[:HAS_WRITTEN_KAHANI]-(u)-[:HAS_WRITTEN_KAHANI]->(k) return k order by k.views_count desc"
                "var kahaniesWrittenByArr = []"
                                    // Inserting data into kahaniesWrittenByArr after filtering by views count
                                    "result.records.forEach((record) => {
                                        if(record._fields[0].properties.writing_style == style) {
                                            kahaniesWrittenByArr.push({
                                                title: record._fields[0].properties.title,
                                                views_count: record._fields[0].properties.views_count
                                            });
                                        }
                                    });"
                neo4j session start
                    Getting all the stories which is written by the author user is following
                    "MATCH(a:User {user_id: $user_idParam})-[:FOLLOWS]->(u)-[:HAS_WRITTEN]->(s) return s order by s.views_count desc"
                    "var storiesByAuthorFollowingArr = []"
                                            // Inserting data into storiesByAuthorFollowingArr after filtering by views count
                                            "result.records.forEach((record) => {
                                                storiesByAuthorFollowingArr.push({
                                                    title: record._fields[0].properties.title,
                                                    views_count: record._fields[0].properties.views_count
                                                });
                                            });"
                    var preFinalArray = [];
                    var finalArr = [];
                    var flag = 0;

                    loop till (kahaniesByGenreArr.length / 2)
                    // Calculating weight for every story present in the kahaniesByGenreArr
                    let weightDistributor = GENRE_WEIGHTAGE / (kahaniesByGenreArr.length - 1);
                    if(kahaniesByGenreArr.length > 0) {
                        preFinalArray.push({
                            title: kahaniesByGenreArr[i].title,
                            // Calculating and setting weightage for priority 
                            priority: kahaniesByGenreArr[i].views_count * weightDistributor
                        });
                    }

                    loop till (kahaniesByLanguageArr.length / 2)
                        // Calculating weight for every story present in the kahaniesByLanguageArr
                        let weightDistributor = LANGUAGE_WEIGHTAGE / (kahaniesByLanguageArr.length - 1)
                        if(kahaniesByLanguageArr.length > 0) {
                            preFinalArray.push({
                                title: kahaniesByLanguageArr[i].title,
                                // Calculating and setting weightage for priority
                                priority: kahaniesByLanguageArr[i].views_count * weightDistributor
                            });
                        }

                    loop till (kahaniesWrittenByArr.length / 2)
                    // Calculating weight for every story present in the kahaniesWrittenByArr
                    let weightDistributor = AUTHOR_WEIGHTAGE / (kahaniesWrittenByArr.length - 1);
                    if(kahaniesWrittenByArr.length > 0) {
                        preFinalArray.push({
                            title: kahaniesWrittenByArr[i].title,
                            // Calculating and setting weightage for priority
                            priority: kahaniesWrittenByArr[i].views_count * weightDistributor
                        });
                    }

                    loop till (storiesByAuthorFollowingArr.length / 2)
                    // Calculating weight for every story present in the storiesByAuthorFollowingArr
                    let weightDistributor = FOLLOWING_WEIGHTAGE / (storiesByAuthorFollowingArr.length - 1);
                    if(storiesByAuthorFollowingArr.length > 0) {
                        preFinalArray.push({
                            title: storiesByAuthorFollowingArr[i].title,
                            // Calculating and setting weightage for priority
                            priority: storiesByAuthorFollowingArr[i].views_count * weightDistributor
                        });
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
                        if(preFinalArray[i].title != 0 && preFinalArray[i].priority >= 10) {
                            finalArr.push(preFinalArray[i].title);
                        }
                    }

                    Display finalArr
```