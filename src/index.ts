import express, { Request, Response } from 'express';
import { MongoClient, ServerApiVersion, Collection } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());


const PORT = process.env.PORT || 8080;

const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("MONGO_URI is not defined in the environment variables");
}
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
  tls: true,
});

let collection: Collection;

async function startServer() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const db = client.db("Resortdb");
        collection = db.collection("bookings");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1); 
    }
}

startServer();

// Booking route
app.post('/bookings', async (req: Request, res: Response) => {
    if (!collection) {
        return res.status(500).json({ message: "Database not ready" });
    }

    try {
        const { first_name, last_name, email, mobile, address, message, start_date, end_date } = req.body;

        if (!first_name || !last_name || !email || !mobile || !address || !start_date || !end_date) {
            return res.status(400).json({ message: "All fields including start and end dates are required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const mobileRegex = /^[0-9]{10}$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        if (!mobileRegex.test(mobile)) {
            return res.status(400).json({ message: "Invalid mobile number format" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(start_date);
        const end = new Date(end_date);

        if (start < today) {
            return res.status(400).json({ message: "Start date cannot be in the past" });
        }

        if (end <= start) {
            return res.status(400).json({ message: "End date must be after start date" });
        }

        const data = {
            first_name,
            last_name,
            email,
            mobile,
            address,
            message: message || '',
            start_date: start,
            end_date: end,
            createdAt: new Date()
        };

        const result = await collection.insertOne(data);

        return res.status(201).json({ insertedId: result.insertedId });
    } catch (err) {
        console.error("Error inserting booking:", err);
        return res.status(500).json({ message: "Error inserting data" });
    }
});


// Fetching Bookings 
app.get('/bookings', async (req: Request, res: Response) => {
    if (!collection) {
        return res.status(500).json({ message: "Database not ready" });
    }

    try {
        const bookings = await collection.find().toArray();
        return res.status(200).json({ bookings });
    } catch (err) {
        console.error("Error fetching booking details:", err);
        return res.status(500).json({ message: "Error fetching booking details" });
    }
});
