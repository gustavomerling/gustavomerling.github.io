//
// moduleCommon
//

window.items = [];
if(localStorage.getItem("epml") != null ){
	window.items = localStorage.getItem("epml").split(',');
}

function moduleCommon(){

	console.log(window.items)

	var list = document.getElementById("list");
	Sortable.create(list,{
		animation : 150,
		handle : '.list-item-move',
		draggable : '.list-item',
		onUpdate: function (){
			var newItensOrder = [];
			$($(".list-item-name").get().reverse()).each(function(){
				newItensOrder.push($(this).text());
			});
			window.items = newItensOrder;
			localStorage.setItem( "epml", window.items );
			moduleCommon.writeItens();
		}
	}); // That's all.

	moduleCommon.writeItens();

}

//_ACTIONS
window.moduleCommon.writeItens = function writeItens(){
	if( window.items != null && window.items != '' ){
		$('.list').empty();
		for( var i = 0 ; i < window.items.length ; i++ ){
			if( window.items[i] != '' ){
				$('.list').prepend("<div class='list-item'><div class='list-item-name'>" + window.items[i] + "</div><div class='list-item-check'></div><div class='list-item-cancel'></div><div class='list-item-move'></div></div>")
			}
		}
	}else{
		$('.list').empty();
	}
}

//_END
moduleCommon();