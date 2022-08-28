//const { response } = require("express")

(function () {
    'use strict'
    const forms = document.querySelectorAll('.requires-validation')
    Array.from(forms)
      .forEach(function (form) {
        form.addEventListener('submit', function (event) {
          if (!form.checkValidity()) {
            event.preventDefault()
            event.stopPropagation()
          }
    
          form.classList.add('was-validated')
        }, false)
      })
    })()
      
    function addToCart(proId){
      $.ajax({
        url:'/add-to-cart/'+proId,
        method:'get',
        success:(response)=>{
          if(response.status)
          {
            let count=$('#cart-count').html()
            count=parseInt(count)+1
            $("#cart-count").html(count)
          }
          //alert(response)
        }
      })
    }