const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const cookiesParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;


// middle ware

app.use(cors({
    origin: [
        'http://localhost:5173'
    ],
    credentials: true
}));
app.use(express.json())
app.use(cookiesParser())

// custom middle ware

const logger = async (req, res, next) => {
    console.log('called:', req.host, req.originalUrl);
    next()
}


const veryFyToken = async (req, res, next) => {
    const token = req.cookies?.token
    // console.log('custom middle ware', token);
    if (!token) {
        return res.status(401).send({ massage: 'Authorized access' })
    }
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        // console.log(decoded.foo)
        if (err) {
            return res.status(401).send({ massage: 'Authorized access' })
        }
        req.user = decoded
    });
    next()
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vfr78tp.mongodb.net/?retryWrites=true&w=majority`;

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

        const servicesCollection = client.db("carDoctor").collection("services")

        const bookingCollection = client.db("carDoctor").collection("booking")


        // auth related api
        // console.log(process.env.ACCESS_SECRET_TOKEN)
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            // console.log('user for token', user)
            const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h' })

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            }).send({ success: true })
        })


        app.post('/login', async (req, res) => {
            const user = req.body;
            // console.log('logout user', user)
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })


        // our services stor
        app.get('/services', async (req, res) => {
            const cursor = servicesCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })


        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const option = {
                projection: { title: 1, price: 1, service_id: 1, img: 1 }
            }
            const result = await servicesCollection.findOne(query, option)
            res.send(result)
        })

        // booking store

        app.get('/bookings', veryFyToken, async (req, res) => {


            // console.log('token oner info', req.user?.email)

            if (req.user?.email !== req.query.email) {
                return res.status(403).send({ massage: 'Forbidden access' })
            }

            let query = {}

            if (req.query?.email) {
                query = { email: req.query.email }
                const result = await bookingCollection.find(query).toArray()
                res.send(result)
            }

            // const result = await bookingCollection.find(query).toArray()
            // res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
            // console.log(booking)
        })
        // patch items
        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateBooking = req.body;
            // console.log(updateBooking)
            const updateDoc = {
                $set: {
                    status: updateBooking.status
                }
            }
            const result = await bookingCollection.updateOne(filter, updateDoc)
            res.send(result)
            console.log(result)
        })

        // delete items
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




// last line

app.get('/', (req, res) => {
    res.send('car doctor is running')
})

app.listen(port, () => {
    console.log(`car doctor is running port on:${port}`)
})