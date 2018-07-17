//
// app.js
//

$(document).ready(function(){

	var jsVersion = '1.0'

    var baseUrl = $('body').data('baseurl');

    require([ baseUrl + '/public/js/controllers/controllerCommon.js?v=' + jsVersion ]);
    require([ baseUrl + '/public/js/controllers/controllerCep.js?v=' + jsVersion ]);
    require([ baseUrl + '/public/js/modules/moduleCommon.js?v=' + jsVersion ]);
    require([ baseUrl + '/public/js/modules/moduleSliders.js?v=' + jsVersion ]);
    require([ baseUrl + '/public/js/modules/moduleForms.js?v=' + jsVersion ]);

});