# Kahaniya Recommendation Model

## Genre-Users Relationship

```bash
call apoc.load.json("genre-users.json") yield value
unwind value as q
merge(u:User {user_id: q.user_id})
foreach(g in q.genres | merge(genre:Genre {name: g}) merge(u)-[:LIKES_TO_READ]->(genre))
```

## Kahanies-Genre Relationship

```bash
match(a:Genre), (b:Kahani)
where b.genre = a.name 
merge(b)-[:BELONGS_TO]->(a)
```

## Cypher query for making story collection

```bash
call apoc.load.json("stories.json") yield value
unwind value as q
merge(s:Story {story_id: q.kahani_id}) on create set s.title = q.title, s.author_id = q.author_id
```

## User-Story Relationship

```bash
match(a:User), (b:Story)
where a.user_id = b.author_id
merge(a)-[:HAS_WRITTRN]-(b)
```

## Cypher query for making rating colection

```bash
call apoc.load.json("ratings.json") yield value
unwind value as q
merge(r:Rating {story_id: q.story_id}) on create set r.user_id = q.user_id, r.rating = q.rating
```

## Loading and creating nodes with apoc.periodic.iterate for large json

```bash
call apoc.periodic.iterate("
	call apoc.load.json('users.json')
    yield value
    unwind value as q return q
    ","
    merge (u:User {user_name:q.user_name})
", {batchSize: 10000, iterateList: true, parallel:true});
```

## Loading and creating nodes with apoc.periodic.iterate for large json with mongo ObjectId


```bash
call apoc.periodic.iterate("
	call apoc.load.json('users.json')
    yield value
    unwind value as q return q
    ","
    merge (u:User {user_id: apoc.convert.toString(q._id)}) on create set u.full_name = q.full_name, u.phone = 	q.phone, u.email = q.email, u.country_code = q.country_code, u.gender = q.gender, u.user_name = q.user_name
", {batchSize: 10000, iterateList: true, parallel:true});
```

## Getting mongo ObjectId as neo4j key property

```bash
	call apoc.load.json('users.json')
    yield value
    unwind value as q 
    unwind q._id as r
    return [k in keys(r) | r[k]][0]
```

## Creating user nodes with mongoDB ObjectId as neo4j User's property

```bash
call apoc.periodic.iterate("
	call apoc.load.json('users.json')
    yield value
    unwind value as q return q
    ","
    merge (u:User {user_id: return [k in keys(q._id) | q._id[k]][0]}) on create set u.full_name = q.full_name, u.phone = 	q.phone, u.email = q.email, u.country_code = q.country_code, u.gender = q.gender, u.user_name = q.user_name
", {batchSize: 10000, iterateList: true, parallel:true});
```

## Creating Neo4j Ratings Collection 

```bash
call apoc.periodic.iterate("
	call apoc.load.json('ratings.json')
    yield value
    unwind value as q return q
    ","
    merge (r:Rating {story_id: q.story_id}) on create set r.rating = q.rating, r.user_id = q.user_id 
", {batchSize: 10000, iterateList: true, parallel:true});
```

## Creating Neo4j Likes Collection

```bash
call apoc.periodic.iterate("
	call apoc.load.json('likes.json')
    yield value
    unwind value as q return q
    ","
    merge (l:Like {nano_story: q.nano_story}) on create set l.user_id = q.user_id 
", {batchSize: 10000, iterateList: true, parallel:true});
```

## Creating Neo4j Language Collection

```bash
call apoc.periodic.iterate("
	call apoc.load.json('languages.json')
    yield value
    unwind value as q return q
    ","
    merge (l:Language {code: q.code}) on create set l.slug = q.slug, l.title = q.title
", {batchSize: 10000, iterateList: true, parallel:true});
```

## User-Kahani Relationship (HAS_WRITTEN_KAHANI)

```bash
match(a:User), (b:kahani)
where a.user_id = b.author_id
merge(a)-[:HAS_WRITTEN_KAHANI]->(b)
```

## User-Rating Relationship (Has_RATED)

```bash
match(a:User), (b:Rating)
where a.user_id = b.user_id
merge(a)-[:Has_RATED]->(b)
```

## User-Likes Relationship (LIKES)

```bash
match(a:User), (b:Like)
where a.user_id = b.user_id
marge(a)-[:LIKES]->(b)
```

## User-Genre Relationship (LIKES_GENRE)

```bash
match(a:User), (b:Genre)
where a.user_id = b.user_id
merge(a)-[:LIKES_GENRE]->(b)
```

## Kahani-Language Relationship (OF_LANGUAGE)

```bash
match(a:Kahani), (b:Language)
where a.language = b.slug
merge(a)-[:OF_LANGUAGE]->(b)
```

## Rating-Story Relationship (RATING_FOR)

```bash
match(a:Rating), (b:Story)
where a.story_id = b.story_id
merge(a)-[:RATING_FOR]->(b)
```

## Making user following relationship

- Created Userfollows collection with the help of:

```bash
call apoc.periodic.iterate("
call apoc.load.json('user-follows.json')
yield value
unwind value as q return q
","
merge (uf:userfollows {target_id: q.target_id}) on create set uf.source_id = q.source_id
", {batchSize: 10000, iterateList: true, parallel:true});
```

- Now time for making relations

```bash
match(a:User), (b:User), (c:Userfollows)
where a.user_id = c.source_id and b.user_id = c.target_id
merge(a)-[:FOLLOWS]->(b)
```

## Updated Recommendation Engine Model
