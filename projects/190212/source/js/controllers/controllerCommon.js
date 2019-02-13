//
//CONTROLLER COMMON
//

function controllerCommon() {

    setTimeout(function(){$('.header-bubble_1').addClass('active');},1000);
    setTimeout(function(){$('.header-bubble_2').addClass('active');},1500);
    setTimeout(function(){$('.header-towel').addClass('active');},200);

    $('.download_modal-close,.download_overlay').click(function(){
        $('.download_modal').addClass('hidden');
        $('.download_overlay').fadeOut();
    });

    $('.travel-content-link').click(function(e){
        e.preventDefault();
        $('.download_modal').removeClass('hidden');
        $('.download_overlay').fadeIn();
    });

    if($(window).width() >= 1280){
        $(document).on('mousemove', function (e) {

            var xCenter = e.pageX - $(document).width() / 2;
            var yCenter = e.pageY - $(document).height() / 2;
            var xPercentCenter = ((Math.abs(xCenter) * 2) * 100 / $(document).width()) / 100;
            var yPercentCenter = ((Math.abs(yCenter) * 2) * 100 / $(document).height()) / 100;

            $('.header-bubble_1').css({
                'margin-left' : xCenter / 20 + 'px',
                'margin-top' : (yCenter) / 20 + 'px',
            });

            $('.header-bubble_2').css({
                'margin-left' : xCenter / 20 + 'px',
                'margin-top' : (yCenter) / 20 + 'px',
            });

            $('.header-towel').css({
                'margin-left' : xCenter / 10 + 'px',
                'margin-top' : (yCenter) / 10 + 'px',
            });

            $('.register-call').css({
                'transform': 'translate(0px,' + yCenter / 100 + 'px)',
            });

            $('.travel-tablet').css({
                'transform': 'translate(' + xCenter / 30 + 'px,0px)',
            });

        });
    }
}
//ACTIONS

//END
controllerCommon();