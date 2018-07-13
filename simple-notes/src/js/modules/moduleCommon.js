//
// moduleCommon
//

function moduleCommon(){

	//ZOOM
	$('.zoom_container').each(function(){
		var img = $(this).find('img');
		img.parent().zoom({ url : img.data('zoom') });
	});

}

//_ACTIONS

//_END
moduleCommon();