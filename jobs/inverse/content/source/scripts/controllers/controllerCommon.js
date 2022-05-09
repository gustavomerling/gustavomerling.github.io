//
// CONTROLLER COMMON
//

//CALLS
function controllerCommon() {

    //CLONE LINEUP SLIDER
    function cloneLineupSliderToMobile(){
        if($(window).width() <= 991){
            $('.lineup-slider-mobile').append($('.section-lineup__slider'));
            $('.lineup-slider-mobile').append($('.section-lineup__pagination'));
        }
    }
    cloneLineupSliderToMobile();
    
    //EQUAL HEIGHTS
    setTimeout(function(){
        var tallestHeight = 0;
        $('.section-schedule__slider .section-schedule__slider__item').each(function(){
            if($(this).innerHeight() > tallestHeight){
                tallestHeight = $(this).innerHeight();
                console.log(tallestHeight);
            }
        });
        $('.section-schedule__slider .section-schedule__slider__item').height(tallestHeight - 24);
    },2000);

    //FORM
    $('.form-modal form').validate();

    //FULLPAGE
    var scrollable = false;
    if($(window).height() <= 959 && $(window).width() > 1199){
        scrollable = true;
    }
    $('#fullpage').fullpage({
        responsiveWidth: 1199,
        scrollOverflow: scrollable,
        scrollOverflowReset: scrollable,
        onLeave: function (index, nextIndex, direction) {
            $('.toggle_nav').removeClass('active');
            $('.toggle_nav_' + nextIndex).addClass('active');
        },
    });

    //CLICKS
    $('.toggle_nav').click(function () {
        $.fn.fullpage.moveTo($(this).data('nav'));
        $('.header__mobile-button').removeClass('active');
        $('.mobile-menu').removeClass('active');
        return false;
    });

    $('.toggle_nav_next').click(function () {
        $.fn.fullpage.moveSectionDown();
        return false;
    });

    $('.form-modal__close').click(function () {
        return false;
    });

    $('.yellow-button,.mobile-cta').click(function () {
        if($(window).width() <= 1199){
            $('body,html').animate({
                'scrollTop' : $('.form-modal').offset().top - 20
            },1000);
        }
        $.fn.fullpage.moveTo(6);
        $('.header__mobile-button').removeClass('active');
        $('.mobile-menu').removeClass('active');
        return false;
    });

    $('.section-tickets__tabs a').click(function () {
        $('.section-tickets__tabs a').removeClass('active');
        $(this).addClass('active');
        if ($(this).index() == 0) {
            $('.slider-full').slideDown();
            $('.slider-full-controls').slideDown();
            $('.slider-digital').slideUp();
            $('.slider-digital-controls').slideUp();
        } else {
            $('.slider-digital').slideDown();
            $('.slider-digital-controls').slideDown();
            $('.slider-full').slideUp();
            $('.slider-full-controls').slideUp();
        }
        return false;
    });
    $('.section-tickets__tabs a:eq(0)').click();

    $('.section-faq__item__question').click(function () {
        if ($(this).hasClass('active')) {
            $('.section-faq__item__content').slideUp();
            $(this).removeClass('active');
            return false;
        } else {
            $('.section-faq__item__content').slideUp();
            $('.section-faq__item__question').removeClass('active');
            $(this).addClass('active');
            $(this).next().slideDown();
            return false;
        }
    });

    $('.header__mobile-button').click(function () {
        $('.header__mobile-button').toggleClass('active');
        $('.mobile-menu').toggleClass('active');
    });

    //SLIDERS

    var sectionScheduleSlider = new Swiper('.section-schedule__slider', {
        loop: false,
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 60,
        speed: 1000,
        pagination: {
            el: '.section-schedule__pagination',
            clickable: true,
        },
        breakpoints: {
            992: {
                slidesPerView: 3,
                slidesPerGroup: 3,
            }
        }
    });

    var sectionLineupAvatarSlider;
    var sectionLineupSlider;

    sectionLineupAvatarSlider = new Swiper('.section-lineup__avatar-slider', {
        loop: true,
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 20,
        speed: 1000,
        slideToClickedSlide: true,
        breakpoints: {
            1600: {
                spaceBetween: 50,
                slidesPerView: 3,
                slidesPerGroup: 1,
            },
            992: {
                slidesPerView: 3,
                slidesPerGroup: 1,
            }
        }
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
            slideChange: function (swiper) {
                sectionLineupAvatarSlider.slideTo(swiper.activeIndex);
            }
        }
    });

    $('.section-lineup__avatar-selector__item').click(function () {
        sectionLineupSlider.slideTo($(this).index() + 1);
        return false;
    });

    sectionLineupAvatarSlider.on('slideChange', function (swiper) {
        sectionLineupSlider.slideTo(swiper.activeIndex);
    })

    var sliderFull = new Swiper('.slider-full', {
        loop: false,
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 60,
        speed: 1000,
        navigation: {
            nextEl: '.slider-full-controls-next',
            prevEl: '.slider-full-controls-prev',
        },
        breakpoints: {
            992: {
                slidesPerView: 5,
                slidesPerGroup: 5,
            },
            768: {
                slidesPerView: 2,
                slidesPerGroup: 2,
            }
        }
    });

    var sliderDigital = new Swiper('.slider-digital', {
        loop: false,
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 60,
        speed: 1000,
        navigation: {
            nextEl: '.slider-digital-controls-next',
            prevEl: '.slider-digital-controls-prev',
        },
        breakpoints: {
            992: {
                slidesPerView: 3,
                slidesPerGroup: 3,
            },
            768: {
                slidesPerView: 2,
                slidesPerGroup: 2,
            }
        }
    });

}

//END
//controllerCommon();