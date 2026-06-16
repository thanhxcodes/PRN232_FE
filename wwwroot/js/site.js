document.addEventListener('DOMContentLoaded', () => {
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const spacer = document.getElementById('sidebar-spacer');

    let isOpen = localStorage.getItem('sidebar_isOpen') !== 'false';

    function toggleSidebar() {
        isOpen = !isOpen;
        localStorage.setItem('sidebar_isOpen', isOpen);
        
        if (isOpen) {
            sidebar.classList.remove('w-20');
            sidebar.classList.add('w-64');
            spacer.classList.remove('w-20');
            spacer.classList.add('w-64');
            
            document.querySelectorAll('.sidebar-text').forEach(el => el.classList.remove('hidden'));
            
            if (window.innerWidth < 1024) {
                overlay.classList.remove('hidden');
            }
        } else {
            sidebar.classList.remove('w-64');
            sidebar.classList.add('w-20');
            spacer.classList.remove('w-64');
            spacer.classList.add('w-20');
            
            document.querySelectorAll('.sidebar-text').forEach(el => el.classList.add('hidden'));
            
            overlay.classList.add('hidden');
        }
    }

    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', toggleSidebar);
    }
    if (overlay) {
        overlay.addEventListener('click', () => {
            if (isOpen) toggleSidebar();
        });
    }

    // Initialize state based on screen size
    if (window.innerWidth < 1024) {
        if (isOpen) toggleSidebar(); // Start closed on mobile
    }
});

// Global Wishlist Logic
window.globalWishlistIds = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/Profile/GetWishlistIds');
        const result = await response.json();
        if (result.success && result.data) {
            window.globalWishlistIds = result.data;
            updateAllWishlistButtons();
        }
    } catch (err) {
        console.error('Error fetching wishlist ids:', err);
    }
});

function updateAllWishlistButtons() {
    // Update global navbar badge
    const totalCount = window.globalWishlistIds.length;
    const globalCountEl = document.getElementById('global-wishlist-count');
    if (globalCountEl) {
        if (totalCount > 0) {
            globalCountEl.textContent = totalCount;
            globalCountEl.classList.remove('hidden');
        } else {
            globalCountEl.classList.add('hidden');
        }
    }

    document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
        const productId = parseInt(btn.getAttribute('data-wishlist-btn'));
        const icon = btn.querySelector('svg, i');
        if (!icon) return;
        
        const isAbsolute = btn.classList.contains('absolute');
        
        if (window.globalWishlistIds.includes(productId)) {
            icon.classList.add('fill-current', 'text-red-500');
            icon.classList.remove('text-[#C4603A]', 'text-[#2D5A3D]', 'text-gray-400');
            btn.classList.add('text-red-500');
            btn.classList.remove('text-gray-400');
            
            if (isAbsolute) {
                btn.classList.add('bg-red-50');
                btn.classList.remove('bg-white/90');
                if (btn.classList.contains('group-hover:opacity-100')) {
                    btn.classList.replace('opacity-0', 'opacity-100');
                }
            }
        } else {
            icon.classList.remove('fill-current', 'text-red-500');
            btn.classList.remove('text-red-500');
            btn.classList.add('text-gray-400');
            
            if (isAbsolute) {
                btn.classList.remove('bg-red-50');
                btn.classList.add('bg-white/90');
                if (btn.classList.contains('group-hover:opacity-100')) {
                    btn.classList.replace('opacity-100', 'opacity-0');
                }
            }
        }
    });
}

window.toggleGlobalWishlist = async function(e, productId) {
    let btn = null;
    if (e) {
        e.preventDefault();
        e.stopPropagation();
        btn = e.currentTarget;
    }
    
    // Optimistic UI update
    const index = window.globalWishlistIds.indexOf(productId);
    const isAdding = index === -1;
    
    if (isAdding) {
        window.globalWishlistIds.push(productId);
    } else {
        window.globalWishlistIds.splice(index, 1);
    }
    updateAllWishlistButtons();
    
    try {
        const response = await fetch(`/Profile/ToggleWishlist?productId=${productId}`, { method: 'POST' });
        const result = await response.json();
        
        if (!result.success) {
            // Revert if failed
            if (isAdding) {
                window.globalWishlistIds.splice(window.globalWishlistIds.indexOf(productId), 1);
            } else {
                window.globalWishlistIds.push(productId);
            }
            updateAllWishlistButtons();
            console.error('Failed to toggle wishlist');
        } else {
            // Show toast if available
            if (typeof window.showToast === 'function') {
                window.showToast(!isAdding ? 'Đã bỏ yêu thích' : 'Đã thêm vào yêu thích', 'success');
            }
        }
    } catch (err) {
        // Revert on error
        if (isAdding) {
            window.globalWishlistIds.splice(window.globalWishlistIds.indexOf(productId), 1);
        } else {
            window.globalWishlistIds.push(productId);
        }
        updateAllWishlistButtons();
        console.error('Error toggling wishlist:', err);
    }
};
