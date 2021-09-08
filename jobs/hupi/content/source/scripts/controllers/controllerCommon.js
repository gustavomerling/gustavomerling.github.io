//
// CONTROLLER COMMON
//

//CALLS
function controllerCommon() {

    //SCROLL
    $('.banner__scroll,.banner__content__button').click(function () {
        $('body,html').animate({
            'scrollTop': $(window).height()
        }, 1000);
    });
    $('.about__button').click(function () {
        $('body,html').animate({
            'scrollTop': $('.list').offset().top
        }, 1000);
    });

    //SLIDER
    var listSlider = new Swiper('.list__slider', {
        speed: 500,
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 30,
        pagination: {
            el: '.list__slider__pagination',
            clickable: true,
        },
        breakpoints: {
            991: {
                slidesPerView: 3,
                slidesPerGroup: 3,
            },
            767: {
                slidesPerView: 2,
                slidesPerGroup: 2,
            },
        }
    });

}

//END
//controllerCommon();