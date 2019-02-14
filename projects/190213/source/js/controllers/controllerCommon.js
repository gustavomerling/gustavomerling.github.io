//
//CONTROLLER COMMON
//

function controllerCommon() {

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
    });

    $('.pmg_faq-search input').keyup(function () {
        $('.pmg_faq-loadmore').hide();
        var value = $(this).val().toLowerCase().split(' ');
        for (var i = 0; i < value.length; i++) {
            $('.pmg_faq-questions-item').each(function(){
                if( $(this).text().toLowerCase().split(value[i]).length > 1 ){
                    $(this).slideDown();
                }else{
                    $(this).hide();
                }
            });
        }
    });

}
//ACTIONS

//END
controllerCommon();