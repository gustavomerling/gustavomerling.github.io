//
//
// SCRIPTS
//
//

$(document).ready(function () {
    
    //CURSOR
    $('a').mouseenter(function(){
        $('.cursor').addClass('hover');
        $('.cursor_plus').addClass('hover');
    });
    $('a').mouseleave(function(){
        $('.cursor').removeClass('hover');
        $('.cursor_plus').removeClass('hover');
    });
    var ball = document.querySelector(".cursor");
    var plus = document.querySelector(".cursor_plus");

    var mouseX = 0;
    var mouseY = 0;

    var ballX = 0;
    var ballY = 0;

    var plusX = 0;
    var plusY = 0;

    var speed = 0.1;
    var speedPlus = 0.5;


    function animateBall() {

        var distX = mouseX - ballX;
        var distY = mouseY - ballY;


        ballX = ballX + (distX * speed);
        ballY = ballY + (distY * speed);

        ball.style.left = ballX + "px";
        ball.style.top = ballY + "px";

        requestAnimationFrame(animateBall);
    }
    animateBall();


    function animatePlus() {

        var distX = mouseX - plusX;
        var distY = mouseY - plusY;


        plusX = plusX + (distX * speedPlus);
        plusY = plusY + (distY * speedPlus);

        plus.style.left = plusX + "px";
        plus.style.top = plusY + "px";

        requestAnimationFrame(animatePlus);
    }
    animatePlus();

    document.addEventListener("mousemove", function (event) {
        mouseX = event.pageX;
        mouseY = event.pageY;
    });

    //OPENING
    setTimeout(function () { $('body').addClass('on'); }, 1000);

    setTimeout(function () { $('.circle_1').addClass('show'); }, 800);
    setTimeout(function () { $('.circle_2').addClass('show'); }, 1200);

    setTimeout(function () { $('.logo').addClass('show'); }, 2000);
    setTimeout(function () { $('.title').addClass('show'); }, 2400);
    setTimeout(function () { $('.scrolling-text').addClass('show'); }, 2000);
    setTimeout(function () { $('.address').addClass('show'); }, 3200);
    setTimeout(function () { $('.copyright').addClass('show'); }, 3600);
    setTimeout(function () { $('.black_line').addClass('show'); }, 4000);
    setTimeout(function () { $('.links').addClass('show'); }, 4000);

    //SCROLLING TEXT
    var $tickerWrapper = $(".scrolling-text");
    var $list = $tickerWrapper.find("ul.list");
    var $clonedList = $list.clone();
    var listWidth = 8;

    $list.find("li").each(function (i) {
        listWidth += $(this, i).width();
    });

    var endPos = $tickerWrapper.width() - listWidth;

    $list.add($clonedList).css({
        "width": listWidth + "px"
    });

    $clonedList.addClass("cloned").appendTo($tickerWrapper);

    //TimelineMax
    var infinite = new TimelineMax({ repeat: -1, paused: true });
    var time = 20;

    infinite
        .fromTo($list, time, { rotation: 0.01, x: 0 }, { force3D: true, x: -listWidth, ease: Linear.easeNone }, 0)
        .fromTo($clonedList, time, { rotation: 0.01, x: listWidth }, { force3D: true, x: 0, ease: Linear.easeNone }, 0)
        .set($list, { force3D: true, rotation: 0.01, x: listWidth })
        .to($clonedList, time, { force3D: true, rotation: 0.01, x: -listWidth, ease: Linear.easeNone }, time)
        .to($list, time, { force3D: true, rotation: 0.01, x: 0, ease: Linear.easeNone }, time)
        .progress(1).progress(0)
        .play();

    //Pause/Play		
    // $tickerWrapper.on("mouseenter", function () {
    //     infinite.pause();
    // }).on("mouseleave", function () {
    //     infinite.play();
    // });
});