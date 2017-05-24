//
// app.js
//

$(document).ready(function(){

    var baseUrl = $('body').data('baseurl');

    require([ baseUrl + '/public/js/controllers/controllerCommon.js' ]);
    require([ baseUrl + '/public/js/modules/moduleCommon.js' ]);

});