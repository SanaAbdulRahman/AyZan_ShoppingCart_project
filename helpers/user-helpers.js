var db = require('../config/connection')
var collections = require('../config/collections');

const bcrypt = require('bcrypt');

var objectId = require('mongodb').ObjectId;


const Razorpay=require('razorpay');

var instance = new Razorpay({
    key_id: 'rzp_test_GcrX4DZhSJ0mzp',
    key_secret: '9l2Vw97Xtl7HS7g58WzDrMHw',
  });


module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collections.USER_COLLECTION).insertOne(userData).then((response) => {
                userData._id = response.insertedId;
                resolve(userData)
            })

        })


    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collections.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log("Login success");
                        response.user = user
                        response.status = true
                        resolve(response)
                    }
                    else {
                        console.log("Login failed");
                        resolve({ status: false })
                    }
                })
            }
            else {
                console.log("Login failed");
                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1

        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log(proExist)
                if (proExist != -1) {
                    db.get().collection(collections.CART_COLLECTION)
                        .updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }

                        ).then(() => {
                            resolve()
                        })

                }
                else {
                    db.get().collection(collections.CART_COLLECTION)
                        .updateOne({ user: objectId(userId) },
                            {
                                $push: { products: proObj }
                            }
                        ).then(() => {
                            resolve()
                        })
                }
            }
            else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collections.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }

                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'

                    }

                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
           // console.log(cartItems[0].cartItems);
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length;
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count);
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {


                db.get().collection(collections.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart)},
                        {
                            $pull:{products:{item:objectId(details.product)}}
                             }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })
            }
            else {
              db.get().collection(collections.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }).then((response) => {
                            resolve({status:true});
                        })
            }
           


        })

    },
           
    removeProduct:(proId,userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collections.CART_COLLECTION).updateOne({
            user: objectId(userId),
           'products.item': objectId(proId)
            }, {
            
            $pull: {
                
            products: { item: objectId(proId) }
            }
            
            }).then((response) => {
            
            resolve(response);
            
            });
         })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }

                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'

                    }

                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $project: {
                    quantity: { $toInt: "$quantity" },
                    price: {$toInt: "$product.price"},
                        }
                },
                {
                $group:{
                    _id:null,
                    total:{$sum:{$multiply:['$quantity','$price']}}
                }
            }

            ]).toArray()
            console.log(total[0].total);
            resolve(total[0].total)
        })

    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            console.log(order,products,total);
            let status=order['payment-method']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    address:order.address,
                    state:order.state,
                    city:order.city,
                    pincode:order.pincode,
                    mobile:order.mobile
                },
                user:objectId(order.userId),
                paymentmethod:order['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date:new Date()
            }
            db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collections.CART_COLLECTION).deleteOne({user:objectId(order.userId)})
                resolve(response.insertedId)
            })
        })

    },
    getcartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
            resolve(cart.products)
        })
    },
    getOrderCount:(userId)=>{
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length;
            }
            resolve(count)
        })
    },
    getUserOrders:(userId)=>{
        return new Promise(async (resolve,reject)=>{
            console.log(userId);
            let orders=await db.get().collection(collections.ORDER_COLLECTION)
            .find({user:objectId(userId)}).toArray()
            console.log(orders);
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collections.ORDER_COLLECTION)
            .aggregate([
                {
                    $match:{_id:objectId(orderId)}
                },

                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collections.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()
            console.log(orderItems);
            resolve(orderItems)
        })
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
             var options={
                amount: total*100,
                currency: "INR",
                receipt: ""+orderId
             };
            instance.orders.create(options,function(err,order){
                console.log("new order",order);
                resolve(order)
            });
              })
            
        },
        verifyPayment: (paymentDetails) => {
            return new Promise((resolve, reject) => {
                const crypto = require('crypto');
    
                let hmac = crypto.createHmac('sha256', '9l2Vw97Xtl7HS7g58WzDrMHw');
                hmac.update(paymentDetails['payment[razorpay_order_id]'] + '|' + paymentDetails['payment[razorpay_payment_id]']);
                hmac = hmac.digest('hex');
    
                if (hmac === paymentDetails['payment[razorpay_signature]']) {
                    resolve();
                } else {
                    reject();
                }
            })
        },
        changePaymentStatus:(orderId)=>{

            return new Promise((resolve,reject)=>{
                db.get().collection(collections.ORDER_COLLECTION)
                .updateOne({_id:objectId(orderId)},
                {
                    $set:{
                        status:'placed'
                    }
                
                }
                ).then(()=>{
                     resolve()
                })
            })
        }
}
