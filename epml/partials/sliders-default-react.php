<div class='row'>
	<div class='col'>
		
		<h1>Default Slider <b>React*</b></h1>

		<div class='common_react_slider'>
			<div class='swiper-wrapper' id='applySlides'></div>
			<div class='common_react_slider-left'></div>
			<div class='common_react_slider-right'></div>
			<div class='common_react_slider-pagination'></div>
		</div>

	</div>
</div>

<script>
	
	var slides = [];
	slides.push('200x200');
	slides.push('300x300');
	slides.push('400x400');
	slides.push('500x500');
	slides.push('600x600');
	slides.push('700x700');
	slides.push('800x800');
	slides.push('900x900');
	slides.push('1000x1000');
	slides.push('1100x1100');

	for(var i = 0; i < slides.length; i++ ){
		slides[i] = React.createElement(
			'div',
			{
				className: 'swiper-slide slide_' + slides[i],
				style: { background : 'url(http://via.placeholder.com/'+ slides[i] +') no-repeat center center', backgroundSize : 'cover' },
			},
			''
		)
	}

	ReactDOM.render(slides,document.getElementById('applySlides'));

</script>