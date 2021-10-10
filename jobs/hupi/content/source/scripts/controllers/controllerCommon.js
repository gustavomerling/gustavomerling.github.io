//
// CONTROLLER COMMON
//

jQuery.validator.addMethod("cpf", function (value, element) {
    value = jQuery.trim(value);

    value = value.replace('.', '');
    value = value.replace('.', '');
    cpf = value.replace('-', '');
    while (cpf.length < 11) cpf = "0" + cpf;
    var expReg = /^0+$|^1+$|^2+$|^3+$|^4+$|^5+$|^6+$|^7+$|^8+$|^9+$/;
    var a = [];
    var b = new Number;
    var c = 11;
    for (i = 0; i < 11; i++) {
        a[i] = cpf.charAt(i);
        if (i < 9) b += (a[i] * --c);
    }
    if ((x = b % 11) < 2) { a[9] = 0 } else { a[9] = 11 - x }
    b = 0;
    c = 11;
    for (y = 0; y < 10; y++) b += (a[y] * c--);
    if ((x = b % 11) < 2) { a[10] = 0; } else { a[10] = 11 - x; }

    var retorno = true;
    if ((cpf.charAt(9) != a[9]) || (cpf.charAt(10) != a[10]) || cpf.match(expReg)) retorno = false;

    return this.optional(element) || retorno;

}, "Informe um CPF válido");

//CALLS
function controllerCommon() {

    //ZOOM
    $('.single-banner-slider__zoom').click(function(){
        $('.swiper-slide-active').find('a').click();
    });

    //MENU MOBILE
    $('.header__button').click(function(){
        $(this).toggleClass('active');
        $('.header__mobile-menu').toggleClass('active');
    });

    //LOGIN
    if ($('.login').length > 0) {
        setTimeout(function () { $('.login__container__cover').addClass('active'); }, 1000);
    }
    $('.login__container__form form').validate({
        rules: {
            cpf: { cpf: true, required: true }
        },
        messages: {
            cpf: { cpf: 'CPF inválido.' }
        }
    });
    $('.cpf_mask').mask('999.999.999-99');

    //SCROLL
    $('.banner__scroll,.banner__content__button').click(function () {
        $('body,html').animate({
            'scrollTop': $(window).height() - 83
        }, 1000);
        return false;
    });
    $('.about__button').click(function () {
        $('body,html').animate({
            'scrollTop': $('.list').offset().top - 83
        }, 1000);
        return false;
    });

    //SLIDER
    var listSlider = new Swiper('.list__slider', {
        speed: 1000,
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

    var singleBannerSlider = new Swiper('.single-banner-slider__container__holder', {
        speed: 1000,
        loop:true,
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 0,
        pagination: {
            el: '.single-banner-slider__pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.single-banner-slider__next',
            prevEl: '.single-banner-slider__prev',
        },
    });

}

//END
//controllerCommon();