$(document).ready(function () {
    // 1. Initialize Particles.js
    if (document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            "particles": {
                "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": "#ffffff" },
                "shape": { "type": "circle" },
                "opacity": { "value": 0.2, "random": false },
                "size": { "value": 3, "random": true },
                "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.1, "width": 1 },
                "move": { "enable": true, "speed": 1.5, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": { "enable": true, "mode": "grab" },
                    "onclick": { "enable": true, "mode": "push" },
                    "resize": true
                },
                "modes": {
                    "grab": { "distance": 140, "line_linked": { "opacity": 1 } },
                    "push": { "particles_nb": 4 }
                }
            },
            "retina_detect": true
        });
    }

    // 2. Custom Cursor
    const cursor = document.querySelector('.custom-cursor');
    const cursorDot = document.querySelector('.custom-cursor-dot');

    if (cursor && cursorDot) {
        gsap.set([cursor, cursorDot], { xPercent: -50, yPercent: -50 });

        window.addEventListener('mousemove', e => {
            gsap.to(cursor, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.25,
                ease: "power2.out"
            });
            gsap.to(cursorDot, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.08
            });
        });

        document.addEventListener('mouseleave', () => gsap.to([cursor, cursorDot], { opacity: 0 }));
        document.addEventListener('mouseenter', () => gsap.to([cursor, cursorDot], { opacity: 1 }));

        // Cursor Hover Effects
        const hoverTargets = 'a, button, .tech-card, .header__social a, .hero__card img, .magnetic';
        $(document).on('mouseenter', hoverTargets, function () {
            cursor.classList.add('hover');
            if ($(this).hasClass('magnetic')) {
                cursorDot.classList.add('snap');
                gsap.to(cursorDot, { scale: 3, duration: 0.3 });
            }
            if ($(this).hasClass('tech-card') || $(this).closest('.tech-card').length) {
                cursor.classList.add('no-blend');
                cursorDot.classList.add('no-blend');
            }
        }).on('mouseleave', hoverTargets, function () {
            cursor.classList.remove('hover');
            cursor.classList.remove('no-blend');
            cursor.classList.remove('snap');
            cursorDot.classList.remove('no-blend');
            cursorDot.classList.remove('snap');
            gsap.to(cursorDot, { scale: 1, duration: 0.3 });
        });

        window.addEventListener('mousedown', () => gsap.to(cursor, { scale: 0.6, duration: 0.1 }));
        window.addEventListener('mouseup', () => gsap.to(cursor, { scale: 1, duration: 0.2 }));
    }

    // 3. Magical Floating Blobs
    const blobs = document.querySelectorAll('.bg-blob');
    if (blobs.length) {
        window.addEventListener('mousemove', e => {
            const { clientX, clientY } = e;
            blobs.forEach((blob, i) => {
                const speed = (i + 1) * 0.02;
                gsap.to(blob, {
                    x: (clientX - window.innerWidth / 2) * speed,
                    y: (clientY - window.innerHeight / 2) * speed,
                    duration: 1.5,
                    ease: "power2.out"
                });
            });
        });
    }

    // 4. Magical Smoke Trail Cursor Effect
    let lastX = 0;
    let lastY = 0;
    window.addEventListener('mousemove', e => {
        const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        if (dist > 15) { // Only create if mouse moved enough
            const particle = document.createElement('div');
            particle.className = 'smoke-particle';
            document.body.appendChild(particle);

            gsap.set(particle, { x: e.clientX, y: e.clientY, scale: Math.random() * 1.5 + 0.5 });

            gsap.to(particle, {
                y: e.clientY - 40 - Math.random() * 30,
                x: e.clientX + (Math.random() - 0.5) * 40,
                opacity: 0,
                scale: 0.1,
                duration: 1.2,
                ease: "power1.out",
                onComplete: () => particle.remove()
            });
            lastX = e.clientX;
            lastY = e.clientY;
        }
    });

    // 5. Enhanced Magnetic Effect with Child Support
    const magneticElements = document.querySelectorAll('.magnetic');
    magneticElements.forEach((el) => {
        const child = el.querySelector('span');
        el.addEventListener('mousemove', function (e) {
            const bounding = el.getBoundingClientRect();
            const posX = e.clientX - bounding.left - bounding.width / 2;
            const posY = e.clientY - bounding.top - bounding.height / 2;

            gsap.to(el, {
                x: posX * 0.5,
                y: posY * 0.5,
                duration: 0.4,
                ease: "power2.out"
            });
            if (child) {
                gsap.to(child, {
                    x: posX * 0.2,
                    y: posY * 0.2,
                    duration: 0.4,
                    ease: "power2.out"
                });
            }
        });

        el.addEventListener('mouseleave', function (e) {
            gsap.to([el, child], {
                x: 0,
                y: 0,
                duration: 0.8,
                ease: "elastic.out(1, 0.3)"
            });
        });
    });

    // 6. Image Reveal Logic (Intersection Observer)
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-img').forEach(img => revealObserver.observe(img));

    // 5. Vanilla Tilt for Cards & Magical Glow Tracking
    const techCards = document.querySelectorAll(".tech-card");
    techCards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });

    VanillaTilt.init(techCards, {
        max: 8,
        speed: 400,
        scale: 1.1, // Zoom effect on hover
        axis: "x",
    });

    // 6. GSAP Scroll & Premium Animations
    gsap.registerPlugin(ScrollTrigger);

    // Safe Title Reveal
    gsap.utils.toArray('h2, .hero h1').forEach(title => {
        const hasHTML = title.innerHTML.includes('<');

        if (!hasHTML) {
            const text = title.textContent;
            title.innerHTML = text.split('').map(char => `<span class="char">${char === ' ' ? '&nbsp;' : char}</span>`).join('');

            gsap.from(title.querySelectorAll('.char'), {
                opacity: 0,
                y: 20,
                stagger: 0.02,
                duration: 0.6,
                scrollTrigger: {
                    trigger: title,
                    start: "top 92%",
                    toggleActions: "play none none reverse"
                }
            });
        } else {
            gsap.from(title, {
                opacity: 0,
                y: 20,
                duration: 1,
                scrollTrigger: {
                    trigger: title,
                    start: "top 92%",
                    toggleActions: "play none none reverse"
                }
            });
        }
    });

    // Section Content Reveal
    gsap.utils.toArray('section p, .hero__card').forEach(el => {
        gsap.from(el, {
            opacity: 0,
            y: 30,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
                trigger: el,
                start: "top 90%",
                toggleActions: "play none none reverse"
            }
        });
    });

    // Hero Image Tilt Parallax (Separate from Tilt.js for subtle feel)
    const heroCard = document.querySelector('.hero__card');
    if (heroCard) {
        window.addEventListener('mousemove', (e) => {
            const xPercent = (e.clientX / window.innerWidth) - 0.5;
            const yPercent = (e.clientY / window.innerHeight) - 0.5;
            gsap.to(heroCard, {
                rotateY: xPercent * 10,
                rotateX: -yPercent * 10,
                duration: 1,
                ease: "power2.out"
            });
        });
    }

    // 7. Tech Cards Staggered Float
    gsap.from(".tech-card", {
        scrollTrigger: {
            trigger: ".tech__cards",
            start: "top 80%"
        },
        y: 60,
        opacity: 0,
        stagger: 0.1,
        duration: 1,
        ease: "power4.out"
    });

    // 8. Progress Bar & Floating Header (Consolidated)
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        gsap.to('.progress-bar', { width: scrolled + "%", duration: 0.1 });

        if (winScroll > 100) {
            $('.header').addClass('is-scrolled');
        } else {
            $('.header').removeClass('is-scrolled');
        }
    });

    // 9. Footer Physics Playground (Matter.js)
    const initPlayground = () => {
        const container = document.getElementById('footer-playground');
        if (!container) return;

        const { Engine, Render, Runner, Bodies, Body, Composite, Composites, Constraint, Mouse, MouseConstraint } = Matter;

        const engine = Engine.create();
        const world = engine.world;

        const width = container.offsetWidth;
        const height = container.offsetHeight;

        const render = Render.create({
            element: container,
            engine: engine,
            options: {
                width: width,
                height: height,
                background: 'transparent',
                wireframes: false,
                pixelRatio: window.devicePixelRatio
            }
        });

        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        // Boundaries at the edges of the full footer
        const ground = Bodies.rectangle(width / 2, height + 10, width, 20, { isStatic: true });
        const leftWall = Bodies.rectangle(-10, height / 2, 20, height, { isStatic: true });
        const rightWall = Bodies.rectangle(width + 10, height / 2, 20, height, { isStatic: true });
        Composite.add(world, [ground, leftWall, rightWall]);

        // Add many "building blocks" (Squares, Circles, Triangles only)
        for (let i = 0; i < 40; i++) {
            const size = Math.random() * 30 + 20;
            const x = Math.random() * width;
            const y = -100 - (i * 40);
            let body;

            const type = i % 3;
            if (type === 0) {
                body = Bodies.rectangle(x, y, size, size, { render: { fillStyle: '#000' }, friction: 0.5, restitution: 0.6 });
            } else if (type === 1) {
                body = Bodies.circle(x, y, size / 2, { render: { fillStyle: '#000' }, friction: 0.5, restitution: 0.6 });
            } else {
                body = Bodies.polygon(x, y, 3, size / 2, { render: { fillStyle: '#000' }, friction: 0.5, restitution: 0.6 });
            }
            Composite.add(world, body);
        }



        // Add mouse control
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });

        Composite.add(world, mouseConstraint);
        render.mouse = mouse;

        // Ensure canvas stays full width on resize
        window.addEventListener('resize', () => {
            const newWidth = container.offsetWidth;
            const newHeight = container.offsetHeight;
            render.canvas.width = newWidth;
            render.canvas.height = newHeight;
            Matter.Body.setPosition(ground, { x: newWidth / 2, y: newHeight + 10 });
            Matter.Body.setPosition(rightWall, { x: newWidth + 10, y: newHeight / 2 });
        });
    };

    initPlayground();

    // 10. Initialize AOS and Remove Loading
    setTimeout(() => {
        AOS.init({ duration: 1000, once: true, offset: 50 });
        $('body').removeClass('is-loading');
        ScrollTrigger.refresh();
    }, 500);

});