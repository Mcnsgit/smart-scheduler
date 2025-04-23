const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({path: './backend/.env'});

const connectDB = async ()  => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error('MONGODB_URI is not defined in the enviornment variables')
        }

        const conn = await mongoose.connect(mongoURI, {
      // Mongoose 6+ handles these options by default, but keeping them doesn't hurt
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex: true, // Not needed in Mongoose 6+
      // useFindAndModify: false // Not needed in Mongoose 6+
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;

