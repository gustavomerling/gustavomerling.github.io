$(document).ready(function () {

    $('body').on('click', '.comment a', function () {
        $('body,html').animate({
            'scrollTop': 0
        }, 1000);
        return false;
    });

    const techSlider = new Swiper('.tech-slider', {
        spaceBetween:15,
        slidesPerView:5,
        pagination: {
            el: '.tech-slider__pagination',
            clickable: true
        },
    });

});

document.addEventListener("DOMContentLoaded", function () {
    // Obtenha todas as seções do site
    const sections = document.querySelectorAll("section");

    // Função para atualizar as classes do corpo da página com base na posição de rolagem
    function updateBodyClasses() {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;

        // Adicione classes com base na posição de rolagem
        sections.forEach(function (section, index) {
            if (scrollPosition >= section.offsetTop - windowHeight / 2) {
                document.body.classList.add(`section-${index + 1}`);
                if(index + 1 == 5){
                    setTimeout(function(){
                        AOS.init({
                            mirror: true,
                        });
                    },1000);
                }
            }
        });
    }

    // Atualize as classes do corpo da página quando a página for rolada
    window.addEventListener("scroll", updateBodyClasses);
    window.addEventListener("resize", updateBodyClasses);

    // Chame a função uma vez para garantir que as classes estejam corretas no carregamento da página
    updateBodyClasses();
});