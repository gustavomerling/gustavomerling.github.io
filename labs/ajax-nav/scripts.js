//
// AJAX Navigation
//
window.page = 0;
window.origin = document.location.href;

$(document).ready(function(){

	$('body').on('click' , '.menu a' , function(){

		var link = $(this).attr('href');

		$.ajax({
			url : link,
			success : function(data){
				$('.content').html($(data).filter('.content').html());
				window.page++;
				const stateObj = { foo: "bar" };
				history.pushState( stateObj , "Page" + window.page , link );
				document.title = $(data).filter('title').text();
			}
		});

		return false;

	});

    $(window).on('popstate', function() {

    	if( window.page > 0 ){

    		window.page--;

			var link = document.location.href;

			if(window.page == 0)
				link = window.origin

			$.ajax({
				url : link,
				success : function(data){
					$('.content').html($(data).filter('.content').html());
					const stateObj = { foo: "bar" };
					history.pushState( stateObj , "Page" + window.page , link );
					document.title = $(data).filter('title').text();
				}
			});

    	}

    });

});