/**
 * animations.js - Handles page scroll effects, intersection reveal, counters, and smooth scrolling
 */
function initAnimations() {
    // ─── Navbar scroll effect ───
    const nav = document.getElementById('mainNav');
    if (nav) {
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 20);
        });
    }

    // ─── Scroll-to-top button ───
    const scrollTopBtn = document.getElementById('scrollTop');
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
        });
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ─── Intersection Observer for reveal animations ───
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    // Stagger by index within visible batch
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, i * 100);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealEls.forEach(el => observer.observe(el));
    }

    // ─── Smooth scroll for nav links ───
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId === '#') return;
            e.preventDefault();
            const target = document.querySelector(targetId);
            if (target) {
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
            // Close mobile offcanvas if open
            const navMenuEl = document.getElementById('navMenu');
            if (navMenuEl && window.bootstrap && bootstrap.Offcanvas) {
                const offcanvas = bootstrap.Offcanvas.getInstance(navMenuEl);
                if (offcanvas) offcanvas.hide();
            }
        });
    });
}
