const mongoose=require('mongoose')

const validateMongoUri = async (uri) => {
    try {
      const conn = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000,
      }).asPromise();
      
      await conn.close();
      return true;
    } catch (err) {
      return false;
    }
  };

  module.exports=validateMongoUri