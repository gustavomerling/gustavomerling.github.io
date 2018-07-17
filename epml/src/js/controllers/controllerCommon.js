//
// controllerCommon
//

function controllerCommon(){
	$('body').on('submit','.header form',controllerCommon.addItem);
	$('body').on('click','.list-item-cancel',controllerCommon.removeItem);
}

//_ACTIONS
window.controllerCommon.addItem = function addItem(){
	if($('.header input').val() != ''){
		window.items.push( $('.header input').val() );
		localStorage.setItem( "epml", window.items );
		$('.header input').val('');
		window.moduleCommon.writeItens();
	}
	return false;
}

window.controllerCommon.removeItem = function removeItem(){
	var text = $(this).siblings('.list-item-name').text();
	for( var i = 0 ; i < window.items.length ; i++ ){
		if( window.items[i] == text ){
			window.items.splice(i,1);
			localStorage.setItem( "epml", window.items );
			window.moduleCommon.writeItens();
		}
	}
}

//_END
controllerCommon();