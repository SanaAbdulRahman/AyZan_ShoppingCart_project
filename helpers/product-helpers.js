var db=require('../config/connection')
var collections=require('../config/collections');
const { response } = require('express');

var objectId=require('mongodb').ObjectId;

module.exports={

addProduct:(product,callback)=>{
    console.log(product);
    db.get().collection(collections.PRODUCT_COLLECTION).insertOne(product).then((data)=>{
        console.log(data)
        callback(data.insertedId)
    })
},

getAllProducts:()=>{
    return new Promise(async(resolve,reject)=>{
        let products=await db.get().collection(collections.PRODUCT_COLLECTION).find().toArray()
        resolve(products)
    })
},


deleteProduct:(prodId)=>{
    console.log(prodId)
    return new Promise((resolve,reject)=>{
        db.get().collection(collections.PRODUCT_COLLECTION).deleteOne({_id:objectId(prodId)}).then((response)=>{
            resolve(response)
        })
    })
},
getProductDetails:(prodId)=>{
    return new Promise((resolve,reject)=>{
        db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)}).then((product)=>{
            resolve(product)
        })

    })

},
updateProduct:(proId,proDetails)=>{
    return new Promise((resolve,reject)=>{
        db.get().collection(collections.PRODUCT_COLLECTION)
        .updateOne({_id:objectId(proId)},{
            $set:{
                name:proDetails.name,
                category:proDetails.category,
                description:proDetails.description,
                price:proDetails.price
            }
        }).then((response)=>{
            resolve()
        })
    })
}
}
