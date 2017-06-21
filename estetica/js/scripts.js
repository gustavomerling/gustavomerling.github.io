//
// SCRIPTS
//

function checkAnchors(){
	$('.anchor').each(function(){
		if( $(this).offset().top - 200 <= $(window).scrollTop() ){
			$('.anchor_button').removeClass('active');
			$('.anchor_button[data-index='+$(this).data('index')+']').addClass('active');
		}
	});
}

$(document).ready(function(){
	
	checkAnchors();

	$(window).scroll(function(){checkAnchors();});

	$('.anchor_button').click(function(){
		var index = $(this).data('index');
		$('body,html').animate({ 'scrollTop' : $('.anchor[data-index='+index+']').offset().top - 80 } , 800 );
	});
	
});