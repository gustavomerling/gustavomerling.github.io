//
// CONTROLLER COMMON
//

//CALLS
function controllerCommon() {

    //FULLPAGE
    $('#fullpage').fullpage({
        responsiveWidth: 767,
        onLeave: function (index, nextIndex, direction) {
            $('.toggle_nav').removeClass('active');
            $('.toggle_nav_' + nextIndex).addClass('active');
        },
    });

    //CLICKS
    $('.toggle_nav').click(function () {
        $.fn.fullpage.moveTo($(this).data('nav'));
        $('.form-modal').fadeOut();
        $('body').removeClass('form-active');
        return false;
    });

    $('.toggle_nav_next').click(function () {
        $.fn.fullpage.moveSectionDown();
        return false;
    });

    $('.form-modal__close').click(function () {
        $('.form-modal').fadeOut();
        $('body').removeClass('form-active');
        return false;
    });

    $('.yellow-button').click(function () {
        $('.form-modal').fadeIn();
        $('body').addClass('form-active');
        return false;
    });

    $('.section-tickets__tabs a').click(function(){
        $('.section-tickets__tabs a').removeClass('active');
        $(this).addClass('active');
        if($(this).index() == 0){
            $('.slider-full').slideDown();
            $('.slider-full-controls').slideDown();
            $('.slider-digital').slideUp();
            $('.slider-digital-controls').slideUp();
        }else{
            $('.slider-digital').slideDown();
            $('.slider-digital-controls').slideDown();
            $('.slider-full').slideUp();
            $('.slider-full-controls').slideUp();
        }
    });
    $('.section-tickets__tabs a:eq(0)').click();

    $('.section-faq__item__question').click(function () {
        if($(this).hasClass('active')){
            $('.section-faq__item__content').slideUp();
            $(this).removeClass('active');
            return false;
        }else{
            $('.section-faq__item__content').slideUp();
            $('.section-faq__item__question').removeClass('active');
            $(this).addClass('active');
            $(this).next().slideDown();
            return false;
        }
    });

    //SLIDERS

    var sectionScheduleSlider = new Swiper('.section-schedule__slider', {
        loop: false,
        slidesPerView: 3,
        slidesPerGroup: 3,
        spaceBetween: 60,
        speed: 1000,
        pagination: {
            el: '.section-schedule__pagination',
            clickable: true,
        }
    });

    var sectionLineupAvatarSlider;
    var sectionLineupSlider;

    sectionLineupAvatarSlider = new Swiper('.section-lineup__avatar-slider', {
        loop: true,
        slidesPerView: 3,
        slidesPerGroup: 1,
        spaceBetween: 50,
        speed: 1000,
        slideToClickedSlide: true
    });

    sectionLineupSlider = new Swiper('.section-lineup__slider', {
        loop: true,
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 60,
        speed: 1000,
        pagination: {
            el: '.section-lineup__pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.section-lineup__avatar-slider__controls__next',
            prevEl: '.section-lineup__avatar-slider__controls__prev',
        },
        on: {
            slideChange : function(swiper){
                sectionLineupAvatarSlider.slideTo(swiper.activeIndex);
            }
        }
    });

    sectionLineupAvatarSlider.on('slideChange',function(swiper){
        sectionLineupSlider.slideTo(swiper.activeIndex);
    })

    var sliderFull = new Swiper('.slider-full', {
        loop: false,
        slidesPerView: 5,
        slidesPerGroup: 5,
        spaceBetween: 60,
        speed: 1000,
        navigation: {
            nextEl: '.slider-full-controls-next',
            prevEl: '.slider-full-controls-prev',
        }
    });

    var sliderDigital = new Swiper('.slider-digital', {
        loop: false,
        slidesPerView: 3,
        slidesPerGroup: 3,
        spaceBetween: 60,
        speed: 1000,
        navigation: {
            nextEl: '.slider-digital-controls-next',
            prevEl: '.slider-digital-controls-prev',
        }
    });

}

//END
//controllerCommon();