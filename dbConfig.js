const mongoose = require("mongoose");

const MONGO_URL =
  "mongodb+srv://anitaantony146:AnitA12345@cluster0.qpmnltj.mongodb.net/college?retryWrites=true&w=majority";

const connectToDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB (college DB)");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
  }
};

module.exports = connectToDatabase;
