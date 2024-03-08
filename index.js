const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')('sk_test_51OeuTqAZRjcCEap1keEI9LaxvZXrUpw0EUbwhXvnuQUW2LxFsj3aJL6g7U7Cn00NxgPSfh3ODj9UQRLSggo7ocGq00zkll2dzz');
const port = process.env.PORT || 7000;


app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8xx0tkq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true, // Added for compatibility with older versions
  useUnifiedTopology: true, // Added for compatibility with older versions
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    const itemCollection = client.db("freshFood").collection("item");
    const cartCollection = client.db("freshFood").collection("carts");
    const paymentCollection = client.db("freshFood").collection("payments");

    

    
  //  JWT(JSON WEB TOKEN) Token

   // jwt related api
   app.post('/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    res.send({ token });
  })

  // middlewares 
  const verifyToken = (req, res, next) => {
    console.log('inside verify token', req.headers.authorization);
    if (!req.headers.authorization) {
      return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      req.decoded = decoded;
      next();
    })
  }
  
  



    app.get('/item', async (req, res) => {
      const result = await itemCollection.find().toArray();
      res.send(result);
    });
    

    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      console.log(email);
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100); // Convert to cents
      console.log(amount, 'amount is sufficient');
      if (amount < 50) {
        return res.status(400).json({ error: 'Amount must be at least 50 cents' });
      }
    
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
    
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // app.get('/payments/:email', verifyToken, async(req,res) =>{
    //   const query = {email: req.params.email}
    //   if(req.params.email !== req.decoded.email){
    //     return res.status(403).send({message: 'forbidden access'});
    //   }
    //   const result = await paymentCollection.find(query).toArray();
    //   res.send(result);
    // })

    app.get('/payments/:email', verifyToken, async (req, res) => {
      try {
        if (req.params.email !== req.decoded.email) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        const query = { email: req.params.email };
        const result = await paymentCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching payment data:', error);
        res.status(500).send({ message: 'Failed to fetch payment data' });
      }
    });
    
    
    
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      console.log("payment info", payment);
      const query = {
        _id: {
          $in: payment.cardIds.map(id => new ObjectId(id))
        }
      }
      const deleteResult = await cartCollection.deleteMany(query);
      res.send({ paymentResult, deleteResult });
    });
    
    

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error('MongoDB connection error:', error);
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Food is life');
});

app.listen(port, () => {
  console.log(`Food is life ${port}`);
});

