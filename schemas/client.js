const { default: mongoose } = require("mongoose");

const clientSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true }, 
    companyName: { type: String, required: true }, 
    apis: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Api' }], 
    createdAt: { type: Date, default: Date.now }, 
    updatedAt: { type: Date, default: Date.now }, 
    isActive: { type: Boolean, default: true }, 
  });
  
  const Client = mongoose.model('Client', clientSchema);

  module.exports=Client