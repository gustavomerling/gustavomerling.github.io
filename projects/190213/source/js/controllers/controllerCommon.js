//
//CONTROLLER COMMON
//

function controllerCommon() {

    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('safari') != -1) {
        if (ua.indexOf('chrome') > -1) {
        } else {
            $('*').each(function(){
                var style = $(this)[0].currentStyle || window.getComputedStyle($(this)[0], false);
                if(style.backgroundImage != 'none'){
                    $(this).css('background-image',style.backgroundImage.replace('.webp','.png'));
                }
            });
            $('img').each(function(){
                $(this).attr('src',$(this).attr('src').replace('.webp','.png'));
            });
        }
    }

    if ($('.pmg_header-letters').length) {
        setTimeout(function () { $('.header').addClass('active'); }, 500);
        setTimeout(function () { $('.pmg_header-title').addClass('active'); }, 1000);
        setTimeout(function () { $('.pmg_header-subtitle').addClass('active'); }, 1300);
        setTimeout(function () { $('.pmg_header-letters img:eq(0)').addClass('active'); }, 2000);
        setTimeout(function () { $('.pmg_header-letters img:eq(1)').addClass('active'); }, 2500);
        setTimeout(function () { $('.pmg_header-letters img:eq(2)').addClass('active'); }, 3000);
        setTimeout(function () { $('.pmg_header-letters img:eq(2)').addClass('active'); }, 3000);
    } else {
        $('.header').addClass('fast_active');
    }

    $('.pmg_header-letters').click(function () {
        $('body,html').animate({ 'scrollTop': $('.pmg_form-form').offset().top }, 500);
    });

    $('body').append('<a href="https://api.whatsapp.com/send?phone=5511976213562" target="_blank" class="wp_floater"></a>');

    setInterval(function () {
        $('.wp_floater').toggleClass('active');
    }, 5000);

    $('.pmg_faq-questions-item-question').click(function () {
        if ($(this).hasClass('active')) {
            $(this).removeClass('active');
            $(this).next().slideUp();
        } else {
            $('.pmg_faq-questions-item-question').removeClass('active');
            $('.pmg_faq-questions-item-answer').slideUp();
            $(this).addClass('active');
            $(this).next().slideDown();
        }
    });

    $('.pmg_faq-loadmore').click(function () {
        $('.pmg_faq-questions-item').slideDown();
        $(this).slideUp();
    });

    $('.pmg_faq-search input').keyup(function () {
        $('.pmg_faq-loadmore').hide();
        var value = $(this).val().toLowerCase().split(' ');
        for (var i = 0; i < value.length; i++) {
            $('.pmg_faq-questions-item').each(function () {
                if ($(this).text().toLowerCase().split(value[i]).length > 1) {
                    $(this).slideDown();
                } else {
                    $(this).hide();
                }
            });
        }
    });

}
//ACTIONS

//END
controllerCommon();