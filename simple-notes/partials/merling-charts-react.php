<div class='row'>
	<div class='col'>
		
		<div id='chartsTitle'></div>

		<div id="svg-container" class="react" style="width:100%;height:200px;">
		    <svg width='100%' height='100%' viewBox="0 0 100 100" preserveAspectRatio="none" id="chartsReceiver">
		    </svg>
		</div>

	</div>
</div>

<script>

	ReactDOM.render(React.createElement('h1',null,'Merling Charts <b>React*</b>'), document.getElementById('chartsTitle'));

	var chartItem = [];
	var maxVertical = 0;
	var maxHorizontal = 0;
	var charts = [];

	chartItem[0] = {
		name : 'Merling',
		color : '#f00',
		data : ['0,1','1,2','2,4','3,6','4,8'],
	}

	chartItem[1] = {
		name : 'Milena',
		color : '#0f0',
		data : ['0,8','1,6','2,4','3,2','4,1'],
	}

	//Verifica qual o valor máximo

	for( var i = 0; i < chartItem.length; i++ ){
		for( var j = 0; j < chartItem[i].data.length; j++ ){

			var values = chartItem[i].data[j].split(',');

			if( parseInt(values[0]) > maxVertical )
				maxVertical = parseInt(values[0]);

			if( parseInt(values[1]) > maxHorizontal )
				maxHorizontal = parseInt(values[1]);

		}
	}

	//Monta o gráfico com base no valor máximo

	for( var i = 0; i < chartItem.length; i++ ){

		var itemPoints = '';

		for( var j = 0; j < chartItem[i].data.length; j++ ){

			var values = chartItem[i].data[j].split(',');
			var x = ( parseInt(values[0]) * 100 ) / maxVertical;
			var y = ( parseInt(values[1]) * 100 ) / maxHorizontal;

			itemPoints += ' ' + x + ',' + y;

		}

		charts.push(React.createElement(
			'polygon',
			{
				className: 'chart_' + chartItem[i].name,
				points: '0,0' + itemPoints + ' 100,0',
				style: { fill : chartItem[i].color },
			},
			''
		));

	}

	//Rendeiza o gráfico com base na monagem

	ReactDOM.render(charts,document.getElementById('chartsReceiver'));

</script>