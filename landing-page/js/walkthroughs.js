/**
 * walkthroughs.js - Interactive video mockups, autoplay/pause, progress tracking, audio, fullscreen & category filtering
 */
function initWalkthroughs() {
    // ─── Feature Walkthrough Videos Observer & Controls ───
    const videoElements = document.querySelectorAll('.walkthrough-video');
    if (videoElements.length > 0) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target;
                const mockup = video.closest('.walkthrough-mockup');
                if (entry.isIntersecting) {
                    // Play video if not paused manually by user
                    if (!mockup.classList.contains('manual-pause')) {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                mockup.classList.remove('paused');
                            }).catch(err => {
                                console.log('Autoplay waiting for interaction:', err);
                            });
                        }
                    }
                } else {
                    // Pause video when scrolled out of view to save resources
                    video.pause();
                }
            });
        }, { threshold: 0.25 });

        videoElements.forEach(v => {
            videoObserver.observe(v);

            // Track playback progress
            const mockup = v.closest('.walkthrough-mockup');
            const progressBar = mockup.querySelector('.walkthrough-progress-bar');
            v.addEventListener('timeupdate', () => {
                if (v.duration && progressBar) {
                    const pct = (v.currentTime / v.duration) * 100;
                    progressBar.style.width = pct + '%';
                }
            });

            // Tap/Click video to toggle play/pause
            v.addEventListener('click', () => {
                if (v.paused) {
                    v.play();
                    mockup.classList.remove('paused', 'manual-pause');
                } else {
                    v.pause();
                    mockup.classList.add('paused', 'manual-pause');
                }
            });

            // Replay cleanly on loop
            v.addEventListener('ended', () => {
                v.currentTime = 0;
                v.play();
            });
        });
    }

    // Sound toggle buttons
    document.querySelectorAll('.video-sound-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const mockup = btn.closest('.walkthrough-mockup');
            const video = mockup.querySelector('.walkthrough-video');
            const icon = btn.querySelector('i');
            const statusPill = mockup.querySelector('.sound-status-pill');

            if (video.muted) {
                // Mute all other videos first so only one video plays audio
                document.querySelectorAll('.walkthrough-video').forEach(otherVid => {
                    if (otherVid !== video) {
                        otherVid.muted = true;
                        const otherMockup = otherVid.closest('.walkthrough-mockup');
                        const otherBtn = otherMockup?.querySelector('.video-sound-toggle');
                        if (otherBtn) {
                            otherBtn.classList.remove('active-audio');
                            const otherIcon = otherBtn.querySelector('i');
                            if (otherIcon) otherIcon.className = 'bi bi-volume-mute-fill';
                            otherBtn.setAttribute('aria-label', 'Unmute audio');
                        }
                        const otherPill = otherMockup?.querySelector('.sound-status-pill');
                        if (otherPill) otherPill.innerHTML = '<i class="bi bi-volume-mute"></i> Muted';
                    }
                });

                video.muted = false;
                btn.classList.add('active-audio');
                icon.className = 'bi bi-volume-up-fill';
                btn.setAttribute('aria-label', 'Mute audio');
                if (statusPill) statusPill.innerHTML = '<i class="bi bi-volume-up-fill"></i> Sound On';
            } else {
                video.muted = true;
                btn.classList.remove('active-audio');
                icon.className = 'bi bi-volume-mute-fill';
                btn.setAttribute('aria-label', 'Unmute audio');
                if (statusPill) statusPill.innerHTML = '<i class="bi bi-volume-mute"></i> Muted';
            }
        });
    });

    // Fullscreen / expand button
    document.querySelectorAll('.video-fullscreen-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const mockup = btn.closest('.walkthrough-mockup');
            const video = mockup.querySelector('.walkthrough-video');
            if (video.requestFullscreen) {
                video.requestFullscreen();
            } else if (video.webkitRequestFullscreen) {
                video.webkitRequestFullscreen();
            } else if (video.msRequestFullscreen) {
                video.msRequestFullscreen();
            }
        });
    });

    // Category Filter buttons
    document.querySelectorAll('.walkthrough-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.walkthrough-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');

            document.querySelectorAll('.walkthrough-card-col').forEach(col => {
                if (filter === 'all' || col.getAttribute('data-category') === filter) {
                    col.style.display = '';
                    setTimeout(() => col.classList.add('visible'), 50);
                } else {
                    col.style.display = 'none';
                }
            });
        });
    });
}
