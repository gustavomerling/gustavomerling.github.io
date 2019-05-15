//
// 
// APP.JS
//
//

$(document).ready(function(){

    //CONFIGS
    var appVersion = '1.4';
    var baseUrl = $('body').data('baseurl');

    //CONTROLLER COMMON SEMPRE SERÁ CHAMADO
    require([ baseUrl + '/public/js/controllers/controllerCommon.js?v=' + appVersion ]);
    require([ baseUrl + '/public/js/controllers/controllerForms.js?v=' + appVersion ]);

});