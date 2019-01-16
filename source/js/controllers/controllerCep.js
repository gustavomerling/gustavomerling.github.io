//
//CONTROLLER CEP
//

function controllerCEP(){
	$('body').on('blur','input[data-js=cep]',controllerCEP.fillCep);
	$('body').on('blur','input[data-js=number]',controllerCEP.jumpToObservation);
}

//_ACTIONS

//Busca e preenche o CEP
window.controllerCEP.fillCep = function fillCep(){
	var fillingLocation = $(this).closest('form');
	var cep = $(this).val();
	$.ajax({
		url : 'https://viacep.com.br/ws/' + cep + '/json/',
		beforeSend : function(){
			fillingLocation.find('div[data-js=cep_loading]').fadeIn();
		},
		success : function(data){
			fillingLocation.find('div[data-js=cep_loading]').fadeOut();
			fillingLocation.find('input[data-js=street]').val(data.logradouro);
			fillingLocation.find('input[data-js=number]').focus();
			fillingLocation.find('input[data-js=neighborhood]').val(data.bairro);
			fillingLocation.find('input[data-js=city]').val(data.localidade);
			fillingLocation.find('input[data-js=state]').val(data.uf);
			fillingLocation.find('select[data-js=state]').val(data.uf);
		},
		complete : function(){
			fillingLocation.find('div[data-js=cep_loading]').fadeOut();
		}
	});
}

//Pula os campos de número para complemento
window.controllerCEP.jumpToObservation = function jumpToObservation(){
	var fillingLocation = $(this).closest('form');
	fillingLocation.find('input[data-js=observation]').focus();
}

//_END
controllerCEP();