//
// moduleForms
//

function moduleForms(){
	
	window.moduleForms.applyMasks();

	$('.validation_forms form').each(function(){
		$(this).validate({
			submitHandler : function(){
				alert('ajax!');
				return false;
			}
		});
	});

}

//_ACTIONS
window.moduleForms.applyMasks = function applyMasks(){

	var SPMaskBehavior = function (val) {
		return val.replace(/\D/g, '').length === 11 ? '(00) 00000-0000' : '(00) 0000-00009';
	},
	spOptions = {
		onKeyPress: function(val, e, field, options) {
			field.mask(SPMaskBehavior.apply({}, arguments), options);
		}
	};

	$('.phone').mask(SPMaskBehavior, spOptions);
	$('input[data-js=cep]').mask('00000-000');

}

//_END
moduleForms();