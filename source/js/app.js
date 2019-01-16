//
// 
// APP.JS
//
//

$(document).ready(function(){

    //CONFIGS
    var appVersion = '1.0';
    var baseUrl = $('body').data('base-url');

    //CONTROLLER COMMON SEMPRE SERÁ CHAMADO
    require([ baseUrl + '/public/js/controllers/controllerCommon.js?v=' + appVersion ]);

    //CASO EXISTA UM SWIPER-SLIDE, CHAMA CONTROLLER DE SLIDERS
    if( $('.swiper-slide').length > 0 )
        require([ baseUrl + '/public/js/controllers/controllerSlider.js?v=' + appVersion ]);

    //CASO EXISTA UM FORM, CHAMA CONTROLLER DE FORMS
    if( $('form').length > 0 )
        require([ baseUrl + '/public/js/controllers/controllerForms.js?v=' + appVersion ]);

    //CASO EXISTA UM INPUT DATA JS CEP, CHAMA CONTROLLER DE CEP
    if( $('input[data-js=cep]').length > 0 )
        require([ baseUrl + '/public/js/controllers/controllerCep.js?v=' + appVersion ]);

});