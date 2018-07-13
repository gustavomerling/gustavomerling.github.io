//
// controllerCommon
//

function controllerCommon(){

	$('body').on('click','.google_button',controllerCommon.buttonEffect);
	$('body').on('click','.add_button',controllerCommon.addNote);
	$('body').on('click','.remove',controllerCommon.removeNote);

	$('.simple_notes').html(localStorage.getItem("notes"));

}

//_ACTIONS
window.controllerCommon.buttonEffect = function buttonEffect(e){
	var button = $(this);
	button.addClass('active');
	setTimeout(function(){button.removeClass('active');},10);
	button.find('span').css({
		'left' : e.offsetX - 200,
		'top' : e.offsetY - 200,
	});
}

window.controllerCommon.addNote = function addNote(e){
	var note = prompt('Digite uma nota:');
	if( note != null ){
		$('.simple_notes').prepend('<div class="simple_notes-note">' + note + '<div class="remove"></div></div>');
	}
	localStorage.setItem("notes", $('.simple_notes').html());
}

window.controllerCommon.removeNote = function removeNote(e){
	$(this).parent().remove();
	localStorage.setItem("notes", $('.simple_notes').html());
}

//_END
controllerCommon();