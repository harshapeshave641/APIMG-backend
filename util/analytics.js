const Analytics=require('../schemas/analytics')
const Api=require('../schemas/api')

const calcAnalytics=async(req,res,)=>{
    const {apiId}=req.params.apiId;

    if(!apiId){
        res.status(400).json({message:"Api Id Not found"})
    }
    const Apit=await Api.findById({apiId})
    if(!Ap){
        res.status(400).json({message:"Api Not found"})
    }
    const ana=await Api.find({apiId:apiId})
    if(!ana){
        res.status(500)
    }
}