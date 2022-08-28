var express = require('express');
var router = express.Router();

var productHelpers=require('../helpers/product-helpers');
var userHelpers=require('../helpers/user-helpers')


const verifyLogin=(req,res,next)=>{
 
  if(req.session.userLoggedIn){
    next()
  }
  else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function(req, res, next) {
  let user=req.session.user
  let cartCount=null
  if(req.session.user){
 cartCount=await userHelpers.getCartCount(req.session.user._id)
  //console.log(user);
  }
  productHelpers.getAllProducts().then((products)=>{
   //console.log(products)
  res.render('user/view-products',{products,user,cartCount});
});
})
router.get('/login',(req,res)=>{
  if(req.session.userLoggedIn)
  {
    res.redirect('/')
  }
  else{

    res.render('user/login',{"loginErr":req.session.userLoginErr})
    req.session.userLoginErr=false
  }
})
router.get('/signup',(req,res)=>{
  res.render('user/signup')
})
router.post('/signup',(req,res)=>{
  userHelpers.doSignup(req.body).then((response)=>{
    //console.log(response)
    
    req.session.user=response
    req.session.userLoggedIn=true
    res.redirect('/')

  })

})

router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      
      req.session.user=response.user;
      req.session.userLoggedIn=true;

      res.redirect('/')
    }
    else{
      req.session.userLoginErr="Invalid Username or Password"
      res.redirect('/login')
    }
  })

})
router.get('/logout',(req,res)=>{
  req.session.user=null
  res.redirect('/')
})
router.get('/cart',verifyLogin,async(req,res)=>{
  let user=req.session.user
  let products=await userHelpers.getCartProducts(req.session.user._id)
  //console.log(products)
  let cartCount=await userHelpers.getCartCount(req.session.user._id)
  let totalValue=await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/cart',{products,user,cartCount,totalValue})
})

router.get('/add-to-cart/:id',(req,res)=>{
  let user=req.session.user
  console.log("api call");
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    
    res.json({status:true})
  })
  
})
router.post('/change-product-quantity',(req,res,next)=>{
  
    userHelpers.changeProductQuantity(req.body).then(async(response)=>{
      response.total=await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})
router.get('/remove-cart-product/:id',(req,res)=>{
 //let proId=req.params.id;

  userHelpers.removeProduct(proId,req.session.user._id).then((response)=>{
    res.redirect('user/cart')
  })
})
router.get('/place-order',verifyLogin,async (req,res)=>{
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user})
})

router.post('/place-order',async(req,res)=>{
  let products=await userHelpers.getcartProductList(req.body.userId)
  let totalPrice=await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
      if(req.body['payment-method']==='COD'){
    res.json({codSuccess:true})
      }
      else{
          userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
            res.json((response))
          })
      }

  })
  console.log(req.body);
})



router.get('/orderSuccess',verifyLogin,async(req,res)=>{
  let orderCount=await userHelpers.getOrderCount(req.session.user._id)
  res.render('user/orderSuccess',{orderCount,user:req.session.user})
})

router.get('/orders',verifyLogin,async(req,res)=>{
  let orders=await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
})

router.get('/view-order-products/:id',async(req,res)=>{
  console.log(req.params.id);
  let products=await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})
router.post('/verify-payment',(req,res)=>{
    userHelpers.verifyPayment(req.body).then(()=>{
        userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
            console.log("Payment successfull");
            res.json({status:true})
        })
    }).catch((err)=>{
        console.log(err);
        res.json({status:false,errMsg:''})
    })
})

module.exports = router;