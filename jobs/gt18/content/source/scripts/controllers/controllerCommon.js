//
// CONTROLLER COMMON
//

//CALLS
function controllerCommon() {

    //FULLPAGE
	$('#fullpage').fullpage({
        responsiveWidth: 767,
		onLeave: function(index, nextIndex, direction){
            $('.toggle_nav').removeClass('active');
            $('.toggle_nav_'+nextIndex).addClass('active');
        },
    });

    $('.toggle_nav').click(function(){
        $.fn.fullpage.moveTo($(this).data('nav'));
        return false;
    });

    //FORM
    $('.section-contact__form form').validate({
        submitHandler : function(){
            var form = $('.section-contact__form form');
            $.ajax({
                url : form.attr('action'),
                type: form.attr('method'),
                data: form.serialize(),
                dataType: 'json',
                beforeSend: function(){
                    $('.loading').fadeIn();
                },
                success: function(data){
                    console.log(data);
                    $('.loading').fadeOut();
                    $('.overlay').fadeIn();
                    if(data.status == 1){
                        $('.message-success').fadeIn();
                    }else{
                        $('.message-error').fadeIn();
                    }
                }
            });
            return false;
        }
    });
    $('.message__button,.overlay').click(function(){
        $('.overlay').fadeOut(500);
        $('.message').fadeOut(100);
    });

    //MENU MOBILE
    $('.header__nav__button, .header__nav__links a').click(function(){
        if($(window).width() <= 991){
            $('.header__nav__button').toggleClass('active');
            $('.header__nav__links').fadeToggle(500);
        }
    });

}

//END
//controllerCommon();