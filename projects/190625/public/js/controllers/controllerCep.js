function controllerCEP(){$("body").on("blur","input[data-js=cep]",controllerCEP.fillCep),$("body").on("blur","input[data-js=number]",controllerCEP.jumpToObservation)}window.controllerCEP.fillCep=function(){var n=$(this).closest("form"),t=$(this).val();$.ajax({url:"https://viacep.com.br/ws/"+t+"/json/",beforeSend:function(){n.find("div[data-js=cep_loading]").fadeIn()},success:function(t){n.find("div[data-js=cep_loading]").fadeOut(),n.find("input[data-js=street]").val(t.logradouro),n.find("input[data-js=number]").focus(),n.find("input[data-js=neighborhood]").val(t.bairro),n.find("input[data-js=city]").val(t.localidade),n.find("input[data-js=state]").val(t.uf),n.find("select[data-js=state]").val(t.uf)},complete:function(){n.find("div[data-js=cep_loading]").fadeOut()}})},window.controllerCEP.jumpToObservation=function(){$(this).closest("form").find("input[data-js=observation]").focus()},controllerCEP();