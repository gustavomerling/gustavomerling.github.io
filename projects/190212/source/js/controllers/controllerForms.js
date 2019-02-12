//
//CONTROLLER FORMS
//

//Aplica máscara de telefone
function applyPhoneMask(){

    var SPMaskBehavior = function (val) {
        return val.replace(/\D/g, '').length === 11 ? '(00) 00000-0000' : '(00) 0000-00009';
    },
    spOptions = {
        onKeyPress: function(val, e, field, options) {
            field.mask(SPMaskBehavior.apply({}, arguments), options);
        }
    };

    $('.phone').mask(SPMaskBehavior, spOptions);

}
//Aplica máscara de cep
function applyCepMask(){

    $('input[data-js=cep]').mask('99999-999');

}

function controllerForms(){

    //Configura mensagens para validação.
    jQuery.extend(jQuery.validator.messages, {
        required: "Este campo é obrigatório.",
        email: "Por favor, preencha um e-mail válido.",
        equalTo: "O valor não é igual ao anterior.",
        minlength: jQuery.validator.format("Telefone inválido.")
    });

    //Aplicar máscaras.
    applyPhoneMask();
    applyCepMask();
    
    //Validação de Formulários
    $('.content-block-form form').validate();

}

//END
controllerForms();