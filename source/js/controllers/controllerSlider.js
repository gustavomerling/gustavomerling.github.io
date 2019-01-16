//
//CONTROLLER SLIDER
//

function controllerSlider(){
    
    // Sempre bom verificar se o bloco do slider existe
    // e dar o nome da variável com o nome da classe.
    if( $('.content-block-slider').length > 0 ){
        var contentBlockSlider = new Swiper ('.content-block-slider', {
            loop: true,
            pagination: {
                el: '.content-block-slider-pagination',
            },
            navigation: {
                prevEl: '.content-block-slider-left',
                nextEl: '.content-block-slider-right',
            }
        });
    }

}

//END
controllerSlider();