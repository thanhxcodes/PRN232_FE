const fs = require('fs');
let code = fs.readFileSync('Views/Home/Index.cshtml', 'utf8');

// Replace rounded-xl with rounded-full for the 4 specific icon containers
code = code.replace(/<div class="p-2 bg-gradient-to-br from-\[#2D5A3D\] to-\[#3D7054\] rounded-xl">/g, '<div class="p-2 bg-gradient-to-br from-[#2D5A3D] to-[#3D7054] rounded-full">');
code = code.replace(/<div class="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">/g, '<div class="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-full">');
code = code.replace(/<div class="p-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl">/g, '<div class="p-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-full">');
code = code.replace(/<div class="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">/g, '<div class="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full">');

// Capitalize Được yêu thích nhất
code = code.replace('Được yêu thích nhất', 'Được Yêu Thích Nhất');

fs.writeFileSync('Views/Home/Index.cshtml', code);

// Now for _ProductCarousel.cshtml (Add drag to scroll feature)
let carouselCode = fs.readFileSync('Views/Shared/_ProductCarousel.cshtml', 'utf8');

const replacementScript = `
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const wrapper = document.getElementById('@id');
        if (!wrapper) return;

        const container = wrapper.querySelector('.carousel-container');
        const prevBtn = wrapper.querySelector('.carousel-prev');
        const nextBtn = wrapper.querySelector('.carousel-next');

        function updateButtons() {
            if (container.scrollLeft > 0) {
                prevBtn.classList.remove('hidden');
            } else {
                prevBtn.classList.add('hidden');
            }

            if (container.scrollLeft < container.scrollWidth - container.clientWidth - 10) {
                nextBtn.classList.remove('hidden');
            } else {
                nextBtn.classList.add('hidden');
            }
        }

        container.addEventListener('scroll', updateButtons);
        updateButtons();

        prevBtn.addEventListener('click', () => {
            const cardWidth = container.scrollWidth / container.children.length;
            container.scrollBy({ left: -cardWidth * 2, behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', () => {
            const cardWidth = container.scrollWidth / container.children.length;
            container.scrollBy({ left: cardWidth * 2, behavior: 'smooth' });
        });

        // Drag to scroll functionality
        let isDown = false;
        let startX;
        let scrollLeft;

        container.addEventListener('mousedown', (e) => {
            isDown = true;
            container.classList.add('cursor-grabbing');
            container.classList.remove('snap-x', 'snap-mandatory', 'scroll-smooth');
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });

        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.classList.remove('cursor-grabbing');
            container.classList.add('snap-x', 'snap-mandatory', 'scroll-smooth');
        });

        container.addEventListener('mouseup', () => {
            isDown = false;
            container.classList.remove('cursor-grabbing');
            container.classList.add('snap-x', 'snap-mandatory', 'scroll-smooth');
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2; // Scroll-fast
            container.scrollLeft = scrollLeft - walk;
        });
        
        // Lazy loading for images inside carousel when scrolled
        const images = container.querySelectorAll('img[src]');
        const lazyObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    // Trigger load if needed or just add class
                    img.classList.remove('opacity-0');
                    img.classList.add('opacity-100');
                    obs.unobserve(img);
                }
            });
        }, { root: container, rootMargin: '100px 0px' });
        
        images.forEach(img => {
            img.classList.add('transition-opacity', 'duration-500'); // Add smooth fade if not present
            lazyObserver.observe(img);
        });
    });
</script>
`;

carouselCode = carouselCode.replace(/<script>[\s\S]*<\/script>/, replacementScript.trim());
fs.writeFileSync('Views/Shared/_ProductCarousel.cshtml', carouselCode);

console.log('Fixed Index.cshtml and _ProductCarousel.cshtml');
