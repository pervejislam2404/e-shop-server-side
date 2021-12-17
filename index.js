const ObjectId = require('mongodb').ObjectId;
var admin = require("firebase-admin");
const { MongoClient } = require('mongodb');
const express = require('express');
require('dotenv').config()
const app = express();
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const fileUpload = require('express-fileupload');
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());
app.use(fileUpload());

// jwt
const serviceAccount = require("./baby-care-products-50b0d-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// jwt



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qvyqk.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// jwt

async function verifyToken(req,res,next){
    if(req?.headers?.authorization?.startsWith('Bearer ')){
        const token = req.headers?.authorization.split(' ')[1];   
        try{
           const decodedUser = await admin.auth().verifyIdToken(token);
           req.decodedEmail= decodedUser.email;
        }
        catch{
    
        }
        }
        next()
    }
// jwt



async function run() {
    try {
        await client.connect();
        const database = client.db("e-shop");
        const shopCollections = database.collection("shopProducts");
        const userCollections = database.collection("users");
        const myCollections = database.collection("myProducts");
        const reviewCollections = database.collection("userReview");

        app.get('/products/:category', async(req, res) => {
            const category = req.params.category;
            const query = { category: category }
            const result = await shopCollections.find(query).toArray();
            res.json(result);
        })


        app.get('/allProducts', async(req, res) => {
           const cursor = shopCollections.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();

            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }

            res.send({
                count,
                products
            });
        })


        app.get('/detailOne/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await shopCollections.findOne(query);
            res.json(result);
        })

        app.post('/setUser', async(req, res) => {
            const user = req.body;
            const result = await userCollections.insertOne(user);
            res.send(result)
        })

        app.put('/setUser', async(req, res) => {
            const user = req.body;
            const upsert = { upsert: true };
            const filter = { email: user.email };
            const updateDocs = {
                $set: { email: user.email, name: user.name },
            };
            const result = await userCollections.updateOne(filter, updateDocs, upsert);
            res.send(result)
        })

        app.get('/checkAdmin/:email', async(req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollections.findOne(query);
            if (result?.role === 'admin') {
                res.json(true);
            } else {
                res.json(false);
            }
        })


        app.post('/myProduct', async(req, res)=>{
            const product= req.body;
            const result = await myCollections.insertOne(product);
            res.json(result);
        })

        // review
        app.post('/saveReview', async (req,res)=>{
            const name = req.body.name;
            const email = req.body.email;
            const ratting = req.body.ratting;
            const description = req.body.description;
            const pic = req.files.img;
            const picData = pic?.data;
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const doctor = {
                description,
                ratting,
                name,
                email,
                img: imageBuffer
            }
            const result = await reviewCollections.insertOne(doctor);
            res.json(result);
        })

        //all-review

        app.get('/getAllReview', async (req,res)=>{
            const query = {};
            const result = await reviewCollections.find(query).toArray();
            res.json(result);
        })


        app.get('/getAllOrders',verifyToken, async (req,res)=>{
            const query = {};
            if(req?.decodedEmail){
                const result = await myCollections.find(query).toArray();
                res.json(result);
            }else{
                res.json([])
            }
        })


          // delete-an-order-and-verify-user-with-jwt
          app.delete('/deleteOrder/:id',verifyToken, async (req,res)=>{
            const id = req.params.id;
            if(req?.decodedEmail){
            const query = {_id: ObjectId(id)};
            const result = await myCollections.deleteOne(query);
            res.json(result);
            }else{
                res.json({})
            }
        })


         // updating-the-product-status-and-verify-user-with-jwt
         app.put('/setStatus/:id',verifyToken, async (req,res)=>{
            if(req?.decodedEmail){
                const id = req.params.id;
                const query = {_id: ObjectId(id)};
                const upsert= {upsert: true};
                const updateDocs ={$set:{status: 'shipped'}};
                const result = await myCollections.updateOne(query,updateDocs, upsert);
                res.json(result); 
            }else{
                res.json({})
            }
        })

        // get-the-all-products-of-logged-user
        app.get('/singleUserOrders/:email', async (req,res)=>{
            const email = req.params.email;
            const query = {email: email};
            const result = await myCollections.find(query).toArray();
            res.json(result)
        })



       // make-admin-with-email-and-verify-user-with-jwt 
        app.put('/makeAdmin/:email',verifyToken, async (req,res)=>{
            const email = req.params.email;
           if(req?.decodedEmail){
               const query = {email: email};
               const upsert = { upsert: true };
               const updateDocs = {$set:{role: 'admin'}};
               const result = await userCollections.updateOne(query,updateDocs,upsert);
               res.send(result)
           }else{
            res.json({})
           }
        })



        // get-all-main-products
        app.get('/getAllProducts', async (req,res)=>{
            const query = {};
            const result = await shopCollections.find(query).toArray();
            res.json(result);
        })


         // get-product-for-payment
         app.get('/paymentProduct/:id', async (req,res)=>{
             const id = req.params.id;
             const query = {_id: ObjectId(id)};
             const result = await myCollections.findOne(query);
             res.json(result);
        })



        // delete-the-main-product-and-verify-user-with-jwt
        app.delete('/deleteProduct/:id',verifyToken, async (req,res)=>{
            if(req?.decodedEmail){
                const id = req.params.id;
                const query = {_id: ObjectId(id)};
                const result = await shopCollections.deleteOne(query);
                res.json(result);
            }else{
                res.json({})
            }
        })



        // add-a-product-to-main-product-and-verify-user-with-jwt
        app.post('/addProduct',verifyToken, async (req,res)=>{
            if(req?.decodedEmail){
                const product = req.body;
                const result = await shopCollections.insertOne(product);
                res.json(result);
            }else{
                res.json({})
            }
        })


        app.put('/updateStock',verifyToken, async (req,res)=>{
            if(req?.decodedEmail){
                const stock = req.body.TotalStock.stock;
                console.log(stock+'from stock')
                const id = req.body.TotalStock.id;
                const options = { upsert: true };
                const query = {_id: ObjectId(id)}
                const updateDoc = {
                  $set: {
                    stock: stock,
                  },
                };
                
                const result = await shopCollections.updateOne(query, updateDoc, options);
                res.json(result);
            }else{
                res.json({})
            }
        })





        app.put('/updateStockWithDes',verifyToken, async (req,res)=>{
            if(req?.decodedEmail){
                const stock = req.body.stock.stock;
                const description = req.body.stock.description;
                const options = { upsert: true };
                const query = {description: description};
                const updateDoc = {
                  $set: {
                    stock: stock,
                  },
                };
               
                const result = await shopCollections.updateOne(query, updateDoc, options);
                res.json(result);
            }else{
                res.json({})
            }
        })




        app.post('/create-payment-intent', async (req, res) => {
            const paymentInfo = req.body;
            const amount = Number(paymentInfo.price) * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                payment_method_types: ['card']
            });
            res.json({ clientSecret: paymentIntent.client_secret })
        })




        app.put('/paidProduct/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            };
            const result = await myCollections.updateOne(filter, updateDoc);
            res.json(result);
        });


        app.get('/trail', async (req,res)=>{
            res.json('successfully came from heroku')
        })

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log('server listening on port ' + port);
});