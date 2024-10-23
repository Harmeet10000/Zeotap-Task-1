import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGO_URI;
    // console.log("MONGODB_URI: ", MONGODB_URI);
    const connectionInstance = await mongoose.connect(MONGODB_URI);
    console.log(
      `\nDatabase connection successful!\nDB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("Database connection failed\n", error);
    process.exit(1);
  }
};

export default connectDB;
