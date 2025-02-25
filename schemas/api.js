const { default: mongoose } = require("mongoose");

const apiSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  name: { type: String, required: true },
  baseUrl: { type: String, required: true },
  endpoint:{type:String},
  method: { type: String }, 
  apiKey:{type:String},
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

  const Api = mongoose.model('Api', apiSchema);

  module.exports=Api