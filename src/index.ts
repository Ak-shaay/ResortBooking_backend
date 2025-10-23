import express, { Request, Response } from 'express';
import { MongoClient, ServerApiVersion, Collection, Db } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB setup
const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("MONGO_URI is not defined in the environment variables");
}

let client: MongoClient;
let db: Db;
let collection: Collection;

// ✅ Connect to MongoDB (only once)
async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
    console.log("Connected to MongoDB!");
  }

  if (!db) db = client.db("Resortdb");
  if (!collection) collection = db.collection("bookings");
  return collection;
}

// Routes
app.post('/bookings', async (req: Request, res: Response) => {
  try {
    const collection = await connectToDatabase();

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
  try {
    const collection = await connectToDatabase();
    const bookings = await collection.find().toArray();
    return res.status(200).json({ bookings });
  } catch (err) {
    console.error("Error fetching booking details:", err);
    return res.status(500).json({ message: "Error fetching booking details" });
  }
});

// Export for Vercel
export default app;
