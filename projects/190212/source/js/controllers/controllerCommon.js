//
//CONTROLLER COMMON
//

function controllerCommon() {
    setTimeout(function(){$('.header-bubble_1').addClass('active');},1000);
    setTimeout(function(){$('.header-bubble_2').addClass('active');},1500);
    setTimeout(function(){$('.header-towel').addClass('active');},200);
    if($(window).width() >= 1280){
        $(document).on('mousemove', function (e) {

            var xCenter = e.pageX - $(document).width() / 2;
            var yCenter = e.pageY - $(document).height() / 2;
            var xPercentCenter = ((Math.abs(xCenter) * 2) * 100 / $(document).width()) / 100;
            var yPercentCenter = ((Math.abs(yCenter) * 2) * 100 / $(document).height()) / 100;

            $('.header-bubble_1').css({
                'transform': 'translate(' + xCenter / 20 + 'px,' + yCenter / 20 + 'px)',
            });

            $('.header-bubble_2').css({
                'transform': 'translate(' + xCenter / 20 + 'px,' + yCenter / 20 + 'px)',
            });

            $('.header-towel').css({
                'transform': 'translate(' + xCenter / 10 + 'px,' + yCenter / 10 + 'px)',
            });

            $('.register-call').css({
                'transform': 'translate(' + xCenter / 50 + 'px,' + yCenter / 50 + 'px)',
            });

            $('.travel-tablet').css({
                'transform': 'translate(' + xCenter / 30 + 'px,' + yCenter / 30 + 'px)',
            });

        });
    }
}
//ACTIONS

//END
controllerCommon();