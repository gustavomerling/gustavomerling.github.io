$(document).ready(function () {

    $(window).scroll(function(){
        if($(window).scrollTop() > 0){
            $('.header').addClass('scrolling');
        }else{
            $('.header').removeClass('scrolling');
        }
    });
    
    AOS.init();

});