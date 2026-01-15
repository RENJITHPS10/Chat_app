import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    // Uses the MONGO_URI from the .env file
    const conn = await mongoose.connect(process.env.MONGODB_URL, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;
