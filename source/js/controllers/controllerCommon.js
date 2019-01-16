//
//CONTROLLER COMMON
//

function controllerCommon() {

    $('.home').addClass('step1');
    setTimeout(function () { $('.home').addClass('step2'); }, 2000);
    setTimeout(function () { $('.home').addClass('step3'); }, 3000);
    setTimeout(function () { $('.home').addClass('step4'); }, 4000);

    $(document).on('mousemove', function (e) {

        var xCenter = e.pageX - $(document).width() / 2;
        var yCenter = e.pageY - $(document).height() / 2;
        var xPercentCenter = ((Math.abs(xCenter) * 2) * 100 / $(document).width()) / 100;
        var yPercentCenter = ((Math.abs(yCenter) * 2) * 100 / $(document).height()) / 100;

        $('.home span').css({
            '-webkit-transform': 'translate(' + xCenter / 20 + 'px,' + yCenter / 20 + 'px)',
            'opacity': 1 - ((xPercentCenter + yPercentCenter) / 2),
        });

        $('.home-square_left').css({
            '-webkit-transform': 'translate(' + xCenter / 10 + 'px,' + yCenter / 10 + 'px)',
            'opacity': 1 - ((xPercentCenter + yPercentCenter) / 2),
        });

        $('.home-square_right').css({
            '-webkit-transform': 'translate(' + xCenter / 5 + 'px,' + yCenter / 5 + 'px)',
            'opacity': 1 - ((xPercentCenter + yPercentCenter) / 2),
        });

    });

}
//ACTIONS

//END
controllerCommon();