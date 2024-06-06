require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://rove-shelter.web.app",
      "https://rove-shelter.firebaseapp.com",
    ],
    credentials: true,
  })
);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a3qxp45.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Middle wares
const verifyToken = async(req, res, next) => {
  const token = req.cookies?.token;
  // console.log('value of token from middleware: ', token)
  if(!token){
    return res.status(401).send({message: 'not authorized!'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    // error
    if(error){
      console.log(error)
      return res.status(401).send({message: 'Unauthorized'})
    }
    // if token is valid then it would be decoded
    // console.log('value in the token: ', decoded);
    req.user = decoded;

    next();
  })
}

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production"? 'none': 'strict',
  secure: process.env.NODE_ENV === "production"? true : false,
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const roomsCollections = client.db('hotelRoomsDB').collection('rooms');
    const reviewsCollections = client.db('hotelRoomsDB').collection('reviews');
    const paymentsCollection = client.db('hotelRoomsDB').collection('payments');

    // Auth related API (jwt token)
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user , process.env.ACCESS_TOKEN_SECRET, {expiresIn : "7d"});
      // console.log(token);
      res
      .cookie("token", token , cookieOptions)
      .send({success: true});
    })

    // Update a data in mongodb collection
    app.put('/rooms/:id',async(req, res) => {
      const query = {_id: new ObjectId(req.params.id)};
      const options = { upsert: true };
      const data ={
        $set:{
          availability: req.body.availability,
          user_email: req.body.user_email,
          date: req.body.date,
        }
      }
      const result = await roomsCollections.updateOne(query, data, options);
      // console.log(result);
      res.send(result);
    })

    app.put('/roomReviews/:id',async(req, res) => {
      const query = {_id: new ObjectId(req.params.id)};
      const options = { upsert: true};
      const data = {
        $set: {
          reviews: req.body.reviews, 
          rating: req.body.rating 
        }
      }
      const result = await roomsCollections.updateOne(query, data, options);
      // console.log(result);
      res.send(result);

    })

    // get data from mongodb
    app.get('/rooms', async(req, res) => {
        const result = await roomsCollections.find().toArray();
        res.send(result);
    })
    app.get('/myBookings', async(req, res) => {
        // console.log(req.query.email);
        // console.log('tok tok token', req.cookies.token);

        const result = await roomsCollections.find().toArray();
        res.send(result);
    })

    app.get('/specificRoom/:id', async(req, res) =>{
        // console.log(req.params.id);
        const result = await roomsCollections.findOne({_id: new ObjectId(req.params.id)});
        res.send(result);
        // console.log(result)
    })

    app.get('/prices', async(req, res) => {
        const result = await roomsCollections.find({}).sort({price: 1}).toArray();
        res.send(result);
    })

    //post reviews
    app.post('/reviews', async(req, res) => {
       const newReview = req.body;
       const result = await reviewsCollections.insertOne(newReview);
       res.send(result);
    })
    // get reviews
    app.get('/reviews', async(req, res) => {
      const result = await reviewsCollections.find({}).sort({ _id: -1}).toArray();
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Rove Shelter Server is running...');
})

app.listen(port,()=>{
    console.log(`Rove Server is running on port ${port}`);
})