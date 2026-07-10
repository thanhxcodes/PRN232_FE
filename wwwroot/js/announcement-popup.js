document.addEventListener('DOMContentLoaded', () => {
    // Only run if authenticated
    if (!window.globalConfig || !window.globalConfig.currentUserId) return;

    const userId = window.globalConfig.currentUserId;
    const hideUntilStr = localStorage.getItem(`hide_all_announcements_until_${userId}`);
    
    if (hideUntilStr) {
        const hideUntil = parseInt(hideUntilStr, 10);
        if (Date.now() < hideUntil) {
            return; // Still hiding
        } else {
            localStorage.removeItem(`hide_all_announcements_until_${userId}`);
        }
    }

    if (sessionStorage.getItem('revora_announcement_shown') === 'true') {
        return; // Already shown in this session
    }

    let announcements = [];
    let currentIndex = 0;

    const popup = document.getElementById('user-announcement-popup');
    const content = document.getElementById('user-announcement-content');
    if (!popup || !content) return;

    // Elements
    const elImage = document.getElementById('user-ann-image');
    const elTitle = document.getElementById('user-ann-title');
    const elDesc = document.getElementById('user-ann-description');
    const elBtn = document.getElementById('user-ann-button');
    const elBadge = document.getElementById('user-ann-badge-text');
    const elBadgeContainer = document.getElementById('user-ann-badge-container');
    const elDots = document.getElementById('user-ann-dots');
    const elNav = document.getElementById('user-ann-nav');
    const chkHide = document.getElementById('user-ann-hide-checkbox');

    const fetchActiveAnnouncements = async () => {
        try {
            const res = await fetch('/api-proxy/Announcement/active', {
                headers: { 'Authorization': `Bearer ${window.globalConfig.accessToken}` }
            });
            const data = await res.json();
            if (data.success && data.data && data.data.length > 0) {
                announcements = data.data;
                sessionStorage.setItem('revora_announcement_shown', 'true');
                renderCurrent();
                showPopup();
            }
        } catch (error) {
            console.error('Failed to load announcements', error);
        }
    };

    const renderCurrent = () => {
        if (!announcements.length) return;
        const current = announcements[currentIndex];

        elTitle.textContent = current.title;
        elDesc.textContent = current.description;
        elBtn.textContent = current.buttonText;
        
        // Setup redirection
        elBtn.onclick = (e) => {
            e.preventDefault();
            closePopup();
            window.location.href = current.redirectUrl || '/';
        };

        if (current.badgeText) {
            elBadge.textContent = current.badgeText;
            elBadgeContainer.classList.remove('hidden');
        } else {
            elBadgeContainer.classList.add('hidden');
        }

        if (current.imageUrl) {
            elImage.src = current.imageUrl;
            elImage.parentElement.classList.remove('hidden');
            elImage.parentElement.nextElementSibling.classList.remove('w-full');
            elImage.parentElement.nextElementSibling.classList.add('w-[55%]');
        } else {
            elImage.src = '';
            elImage.parentElement.classList.add('hidden');
            elImage.parentElement.nextElementSibling.classList.remove('w-[55%]');
            elImage.parentElement.nextElementSibling.classList.add('w-full');
        }

        // Pagination
        if (announcements.length > 1) {
            elNav.classList.remove('hidden');
            elDots.innerHTML = announcements.map((_, i) => 
                `<div class="w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-white w-4' : 'bg-white/30'}"></div>`
            ).join('');
        } else {
            elNav.classList.add('hidden');
        }
    };

    const showPopup = () => {
        popup.classList.remove('hidden');
        // trigger reflow
        void popup.offsetWidth;
        popup.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    };

    const closePopup = () => {
        if (chkHide.checked) {
            const fourHoursLater = Date.now() + (4 * 60 * 60 * 1000);
            localStorage.setItem(`hide_all_announcements_until_${userId}`, fourHoursLater.toString());
        }

        popup.classList.add('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
        setTimeout(() => {
            popup.classList.add('hidden');
        }, 300);
    };

    const handleNext = () => {
        currentIndex = (currentIndex === announcements.length - 1) ? 0 : currentIndex + 1;
        renderCurrent();
    };

    const handlePrev = () => {
        currentIndex = (currentIndex === 0) ? announcements.length - 1 : currentIndex - 1;
        renderCurrent();
    };

    document.getElementById('user-ann-close').addEventListener('click', closePopup);
    document.getElementById('user-ann-later').addEventListener('click', () => {
        if (currentIndex < announcements.length - 1) {
            handleNext();
        } else {
            closePopup();
        }
    });

    document.getElementById('user-ann-next').addEventListener('click', handleNext);
    document.getElementById('user-ann-prev').addEventListener('click', handlePrev);

    fetchActiveAnnouncements();
});
