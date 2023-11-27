const express = require("express");
const cors = require("cors");
require('dotenv').config();
const app = express();

const port = process.env.PORT || 5000;

// XVWPmIg2kGZUjttA
// forum12

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7ylhegt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        const userCollection = client.db("forum").collection("users");
        const postCollection = client.db("forum").collection("posts");




        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert email if user doesnt exists: 
            // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });





        // post 
        app.post('/posts', async (req, res) => {
            const post = req.body;
            const result = await postCollection.insertOne(post);
            res.send(result);
        });
        // get 
        app.get('/posts', async (req, res) => {
            try {
                const allPost = await postCollection.find().sort({ postTime: -1 }).toArray();

                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10; // Set a default limit if not provided
                //   const page =  1;
                //   const limit =  5; 

                const startIndex = (page - 1) * limit;
                const endIndex = page * limit;

                const results = {};
                results.totalPost = allPost.length;
                results.pageCount = Math.ceil(allPost.length / limit);

                if (endIndex < allPost.length) {
                    results.next = {
                        page: page + 1,
                    };
                }

                if (startIndex > 0) {
                    results.prev = {
                        page: page - 1,
                    };
                }

                results.result = await postCollection.find().sort({ postTime: -1 }).skip(startIndex).limit(limit).toArray();
                res.json(results);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });
        app.get('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await postCollection.findOne(query);
            res.send(result);
        });
        app.put('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatePost = req.body;
            console.log(updatePost.authorImg);
            const post = {
                $set: {
                    authorImg: updatePost.authorImg,
                    authorName: updatePost.authorName,
                    authorEmail: updatePost.authorEmail,
                    postTitle: updatePost.postTitle,
                    postDescription: updatePost.postDescription,
                    postTag: updatePost.postTag,
                    postComments: updatePost.postComments,
                    upVote: updatePost.upVote,
                    downVote: updatePost.downVote,
                    postTime: updatePost.postTime,

                }
            }
            const result = await postCollection.updateOne(filter, post, options);
            res.send(result);
        })
        app.patch('/posts/:id/', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatePost = req.body;
            // console.log(updatePost);
            const post = {
                $push: {
                    postComments: updatePost.postComments,
                }
            }
            const result = await postCollection.updateOne(filter, post, options);
            res.send(result);
        })

        app.patch('/posts/:id/:commentId/:replayId', async (req, res) => {
            const id = req.params.id;
            const commentId = req.params.commentId;
            const replayId = req.params.replayId;

            // const filter = { _id: new ObjectId(postId), 'postComments.commentId': commentId };
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatePost = req.body;

            console.log("post Comment ,", updatePost.postComments);

            let update;

            if (replayId) {
                update = {
                    $push: {
                        [`postComments.${commentId}.commentsReplay`]: updatePost.postComments.commentsReplay,
                    },
                };
            }

            const result = await postCollection.updateOne(filter, update, options);

            res.send(result);
        });

        app.get('/popular', async (req, res) => {
            try {
                const allPost = await postCollection.find().sort({ postTime: -1 }).toArray();

                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10; // Set a default limit if not provided
                // const page =  1;
                // const limit = 5;

                const startIndex = (page - 1) * limit;
                const endIndex = page * limit;

                const results = {};
                results.totalPost = allPost.length;
                results.pageCount = Math.ceil(allPost.length / limit);

                if (endIndex < allPost.length) {
                    results.next = {
                        page: page + 1,
                    };
                }

                if (startIndex > 0) {
                    results.prev = {
                        page: page - 1,
                    };
                }

                const popular = await postCollection.aggregate([
                    {
                        $addFields: {
                            voteDifference: { $subtract: ['$upVote', '$downVote'] },
                        },
                    },
                    {
                        $sort: { voteDifference: -1 }, // Sort in descending order based on the voteDifference
                    },
                ]).toArray();

                // Apply sorting, skip, and limit directly to the aggregated array
                results.result = await popular.slice(startIndex, endIndex);

                res.json(results);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });


        // app.get("/posts", async (req, res) => {

        // })


        // try {
        //     const result = await postCollection.aggregate([
        //         {
        //             $addFields: {
        //                 voteDifference: { $subtract: ['$upVote', '$downVote'] }
        //             }
        //         },
        //         {
        //             $sort: { voteDifference: -1 } // Sort in descending order based on the voteDifference
        //         }
        //     ]).toArray();

        //     res.send(result);
        // } catch (error) {
        //     console.error('Error fetching and sorting posts:', error);
        //     res.status(500).json({ error: 'Internal Server Error' });
        // }




        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Blood Donation Server is running");
});


app.listen(port, () => {
    console.log(`Blood Donation Server is running :${port}`);
});