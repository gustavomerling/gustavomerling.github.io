//
// CONTROLLER COMMON
//

//CALLS
function controllerCommon() {

    //FULLPAGE
	$('#fullpage').fullpage({
		onLeave: function(index, nextIndex, direction){
            console.log(nextIndex);
            $('.toggle_nav').removeClass('active');
            $('.toggle_nav_'+nextIndex).addClass('active');
        },
    });

    $('.toggle_nav').click(function(){
        $.fn.fullpage.moveTo($(this).data('nav'));
        return false;
    });

}

//END
//controllerCommon();