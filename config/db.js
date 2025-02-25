const mongoose = require('mongoose');

const connectDb = async (MONGO_URI) => {
    try {
        
        await mongoose.connect(MONGO_URI,{
            family:4
        });
        console.log("✅ Successfully connected to Database");
    } catch (error) {
        console.error("❌ Error connecting to Database:", error.message);
        process.exit(1); 
    }
};

module.exports = connectDb;
