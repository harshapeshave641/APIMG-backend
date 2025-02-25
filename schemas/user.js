const { default: mongoose } = require("mongoose");

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true }, 
    fullName: { type: String, required: true }, 
    apiKeys: [{type:mongoose.Schema.Types.ObjectId,ref:'ApiKey'}],
    createdAt: { type: Date, default: Date.now }, 
    updatedAt: { type: Date, default: Date.now }, 
    isActive: { type: Boolean, default: true }, 
  });
  
  const User = mongoose.model('User', userSchema);

  module.exports=User