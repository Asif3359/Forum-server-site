const express = require("express");
const cors = require("cors");
require('dotenv').config();
const app = express();
const jwt = require('jsonwebtoken');
const SSLCommerzPayment = require('sslcommerz-lts')

const port = process.env.PORT || 5000;

// XVWPmIg2kGZUjttA
// forum12

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const SslCommerzPayment = require("sslcommerz-lts/api/payment-controller");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7ylhegt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const store_id = process.env.PAYMENT_ID
const store_passwd = process.env.STORE_PASS
const is_live = false //true for live, false for sandbox

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        const userCollection = client.db("forum").collection("users");
        const postCollection = client.db("forum").collection("posts");
        const memberCollection = client.db("forum").collection("members");
        const searchTextCollection = client.db("forum").collection("searchText");
        const ReportCollection = client.db("forum").collection("report");
        const feedbackCollection = client.db("forum").collection("feedback");
        const announcementCollection = client.db("forum").collection("announcement");
        const commentCollection = client.db("forum").collection("comment");
        const usersFeedbackCollection = client.db("forum").collection("usersFeedBack");
        const usersFeedbackReplayCollection = client.db("forum").collection("FeedBackReplay");



        // -----------------------------------------------


        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // middlewares ----------------------------------
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify admin after---------------------------
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }




        // --------------------------------------------------------


        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            let query;
            if (email) {
                query = { email: email };
            }
            const result = await userCollection.findOne(query);
            res.send(result);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;

            // if (email !== req.decoded.email) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role == 'admin';
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
        app.put('/users', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email };

            const updatedDoc = {
                $set: {
                    badgeType: req.body.badgeType
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

        app.delete('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await postCollection.deleteOne(query);
            res.send(result);
        });





        // post 
        app.post('/posts/:limit/:badgeType', async (req, res) => {
            const limit = parseInt(req.params.limit);
            const badgeType = req.params.badgeType;
            const post = req.body;
            let result;
            console.log(limit);

            if (badgeType == 'Bronze' && limit < 5) {
                result = await postCollection.insertOne(post);
            }
            else if (badgeType == 'diamond' && limit < 50) {
                result = await postCollection.insertOne(post);
            }
            else if (badgeType == 'gold' && limit < 100) {
                result = await postCollection.insertOne(post);
            }
            else {
                result = null;
            }
            if (result) {
                res.status(201).send({ message: 'Post created successfully', result });
            } else {
                res.status(200).send({ message: 'POST request received, but no data saved.', error: "200" });
            }
        });
        app.post('/announcement', async (req, res) => {
            const announcement = req.body;
            const result = await announcementCollection.insertOne(announcement);
            res.send(result);
        });
        app.get('/announcement', async (req, res) => {
            const result = await announcementCollection.find().sort({ announcementDate: -1 }).toArray();;
            res.send(result);
        });
        // post 
        app.post('/reports', async (req, res) => {
            const report = req.body;
            const result = await ReportCollection.insertOne(report);
            res.send(result);
        });
        // comment 
        app.post('/comment', async (req, res) => {
            const comment = req.body;
            const result = await commentCollection.insertOne(comment);
            res.send(result);
        });
        // comment 
        app.get('/comment', async (req, res) => {
            const result = await commentCollection.find().toArray();
            res.send(result);
        });
        // post 
        app.post('/feedback', async (req, res) => {
            const feedback = req.body;
            const result = await feedbackCollection.insertOne(feedback);
            res.send(result);
        });
        app.get('/feedback/:email', async (req, res) => {
            const email = req.params.email
            if (!email) {
                res.status(401).send({ message: "unAuth" })
            }
            const query = {
                reportOnEmail: email
            }
            const result = await feedbackCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/usersFeedback', async (req, res) => {
            const feedback = req.body;
            const result = await usersFeedbackCollection.insertOne(feedback);
            res.send(result);
        });
        app.post('/feedbackReplay', async (req, res) => {
            const feedback = req.body;
            const result = await usersFeedbackReplayCollection.insertOne(feedback);
            res.send(result);
        });
        app.get('/usersFeedback', async (req, res) => {
            const result = await usersFeedbackCollection.find().toArray();
            res.send(result);
        });
        app.get('/feedbackReplay/:email', async (req, res) => {
            const email = req.params.email
            // console.log(email)
            if (!email) {
                res.status(401).send({ message: "unAuth" })
            }
            const query = {
                fedEamil: email
            }

            const result = await usersFeedbackReplayCollection.find(query).toArray();
            res.send(result);
        });
        //    get
        app.get('/reports', async (req, res) => {
            // const post = req.body;
            const result = await ReportCollection.find().toArray();
            res.send(result);
        });



        // searchText
        app.post('/searchText', async (req, res) => {
            const searchText = req.body;
            console.log(searchText)
            const result = await searchTextCollection.insertOne(searchText);
            res.send(result);
        });


        // searchText
        app.get('/searchText', async (req, res) => {
            const result = await searchTextCollection.aggregate([
                { $group: { _id: '$searchText', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]).toArray();
            res.send(result);
        });
        // get 
        app.get('/posts', async (req, res) => {

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const email = req.query.email || null;
            const tag = req.query.tag || null;

            let query = {};
            if (email) {
                query = { authorEmail: email };
            }
            if (tag) {
                query = { postTag: { $regex: `^${tag}`, $options: 'i' } }
            }

            const allPost = await postCollection.find(query).sort({ postTime: -1 }).toArray();


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



            results.result = await postCollection.find(query).sort({ postTime: -1 }).skip(startIndex).limit(limit).toArray();
            res.json(results);
        });

        app.get('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await postCollection.findOne(query);
            res.send(result);
        });
        app.get('/usersPosts/:email', async (req, res) => {
            const email = req.params.email;
            const query = { authorEmail: email }
            const result = await postCollection.find(query).toArray();
            res.send(result);
        });
        app.get('/totalPost', async (req, res) => {
            const result = await postCollection.find().toArray();
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


        const tran_id = new ObjectId().toString();


        app.post('/member', async (req, res) => {
            const email = req.query.email
            // console.log(email);
            const paymentInfo = req.body;
            let totalAmount;
            if (paymentInfo.badgeType === 'gold') {
                totalAmount = 100;
            }
            else if (paymentInfo.badgeType === 'diamond') {
                totalAmount = 500;
            }
            else {
                res.send({ message: "please Select Your" });
            }
            const data = {
                total_amount: totalAmount,
                currency: 'BDT',
                tran_id: tran_id, // use unique tran_id for each api call
                success_url: `https://blood-donation-server-beta.vercel.app/users/members/${email}/${tran_id}`,
                fail_url: 'http://localhost:3030/fail',
                cancel_url: 'http://localhost:3030/cancel',
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: 'Computer.',
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: paymentInfo.userName,
                cus_email: paymentInfo.userEmail,
                cus_add1: paymentInfo.address,
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: paymentInfo.paymentNumber,
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            };
            // console.log(data);
            const sslcz = new SslCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL
                res.send({ url: GatewayPageURL });
                const members = {
                    cus_name: paymentInfo.userName,
                    cus_email: paymentInfo.userEmail,
                    cus_add1: paymentInfo.address,
                    cus_phone: paymentInfo.paymentNumber,
                    badgeType: paymentInfo.badgeType,
                    paymentDate: paymentInfo.paymentDate,
                    paidStatus: false,
                    tranjectionId: tran_id
                }
                const result = memberCollection.insertOne(members)
                console.log('Redirecting to: ', GatewayPageURL)
            })
            app.post('/users/members/:email/:tran_id', async (req, res) => {
                const email = req.params.email;
                const tran_id = req.params.tran_id;


                const result = await memberCollection.updateOne(
                    { tranjectionId: tran_id },
                    {
                        $set: {
                            paidStatus: true
                        },
                    }
                );
                if (result.modifiedCount > 0) {
                    res.redirect(`https://assignment-12-786be.web.app/payment/success/${tran_id}`);
                }


            })
        })




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