document.addEventListener('DOMContentLoaded', function () {
    const filtersConfig = [
        { key: 'all', label: 'Tất cả' },
        { key: 'unread', label: 'Chưa đọc' },
        { key: 'promotion', label: 'Đăng tin' },
        { key: 'feature', label: 'Nạp Credit' },
        { key: 'event', label: 'Theo dõi' },
        { key: 'announcement', label: 'Lượt tim' },
        { key: 'warning', label: 'Hệ thống' },
        { key: 'comment', label: 'Bình luận' },
    ];

    const typeConfig = {
        'promotion': { icon: 'tag', color: 'text-[#C4603A]', bg: 'bg-orange-50' },
        'announcement': { icon: 'heart', color: 'text-red-500', bg: 'bg-red-50' }, // Lượt tim
        'event': { icon: 'user', color: 'text-purple-600', bg: 'bg-purple-50' }, // Theo dõi
        'feature': { icon: 'credit-card', color: 'text-[#2D5A3D]', bg: 'bg-green-50' }, // Nạp Credit
        'warning': { icon: 'alert-triangle', color: 'text-yellow-600', bg: 'bg-yellow-50' }, // Hệ thống
        'comment': { icon: 'message-circle', color: 'text-blue-500', bg: 'bg-blue-50' }, // Bình luận
    };

    let notifications = [];
    let currentFilter = 'all';

    // 1. Fetch Notifications
    async function fetchNotifications() {
        try {
            const res = await fetch('/api/notifications');
            const json = await res.json();
            if (json.success && json.data) {
                notifications = json.data;
                updateHeaderDropdown();
                if (document.getElementById('notif-page-list')) {
                    renderPageFilters();
                    renderPageList();
                }
            }
        } catch (e) { console.error('Lỗi tải thông báo', e); }
    }

    // 2. Update Header
    function updateHeaderDropdown() {
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.getElementById('nav-notif-badge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.classList.toggle('hidden', unreadCount === 0);
        }

        const markAllBtn = document.getElementById('nav-notif-mark-all');
        if (markAllBtn) {
            markAllBtn.classList.toggle('hidden', unreadCount === 0);
        }

        const listContainer = document.getElementById('nav-notif-list');
        if (listContainer) {
            if (notifications.length === 0) {
                listContainer.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">Chưa có thông báo nào</div>';
            } else {
                listContainer.innerHTML = notifications.slice(0, 5).map(n => {
                    const cfg = typeConfig[n.type] || { icon: 'bell', color: 'text-gray-500', bg: 'bg-gray-50' };
                    return `
                        <div class="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}" onclick="markAsRead('${n.id}')">
                            <div class="w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0">
                                <i data-lucide="${cfg.icon}" class="w-5 h-5 ${cfg.color}"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="text-sm font-semibold text-gray-900 truncate ${!n.read ? 'text-[#2D5A3D]' : ''}">${n.title}</h4>
                                <p class="text-xs text-gray-600 line-clamp-2 mt-0.5">${n.message}</p>
                                <div class="text-[10px] text-gray-400 mt-1">${n.time}</div>
                            </div>
                            ${!n.read ? '<div class="w-2 h-2 rounded-full bg-[#C4603A] mt-1.5 flex-shrink-0"></div>' : ''}
                        </div>
                    `;
                }).join('');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    }

    // 3. Mark As Read & Smart Navigation
    window.markAsRead = async function(id) {
        const notif = notifications.find(n => n.id === id);
        if (notif && !notif.read) {
            notif.read = true;
            updateHeaderDropdown();
            if (document.getElementById('notif-page-list')) {
                renderPageFilters();
                renderPageList();
            }
            try {
                fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
            } catch(e) { console.error(e); }
        }

        // Smart Navigation logic
        if (notif && notif.referenceId) {
            // Không điều hướng nếu là thông báo xóa/khóa bài
            if (notif.title && (notif.title.toLowerCase().includes('xóa') || notif.title.toLowerCase().includes('khóa'))) {
                return;
            }

            let targetUrl = '';
            
            if (notif.referenceId.startsWith('product/')) {
                const id = notif.referenceId.split('/')[1];
                targetUrl = `/Products/Details/${id}`;
            } else if (notif.referenceId.startsWith('/')) {
                targetUrl = notif.referenceId;
            } else if (notif.type === 'promotion' || notif.type === 'post') {
                targetUrl = `/Products/Details/${notif.referenceId}`;
            } else if (notif.type === 'comment' || notif.type === 'announcement' || notif.type === 'like') {
                if (notif.title && notif.title.includes('Shorts')) {
                    targetUrl = `/Shorts`;
                } else {
                    targetUrl = `/Products/Details/${notif.referenceId}`;
                }
            } else if (notif.type === 'event') {
                targetUrl = `/Profile?id=${notif.referenceId}`;
            } else if (notif.type === 'feature') {
                targetUrl = `/Profile?tab=wallet`;
            } else if (notif.type === 'warning') {
                return; // Cảnh báo hệ thống thường không chuyển hướng
            } else {
                if (!isNaN(notif.referenceId)) {
                    targetUrl = `/Products/Details/${notif.referenceId}`;
                }
            }

            if (targetUrl) {
                window.location.href = targetUrl;
            }
        }
    };

    const markAllBtn = document.getElementById('nav-notif-mark-all');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            notifications.forEach(n => n.read = true);
            updateHeaderDropdown();
            if (document.getElementById('notif-page-list')) {
                renderPageFilters();
                renderPageList();
            }
            try {
                await fetch('/api/notifications/read-all', { method: 'PUT' });
            } catch(e) { console.error(e); }
        });
    }

    // 4. Page Logic
    function renderPageFilters() {
        const filterContainer = document.getElementById('notif-filters');
        if (!filterContainer) return;

        filterContainer.innerHTML = filtersConfig.map(f => {
            let count = 0;
            if (f.key === 'all') count = notifications.length;
            else if (f.key === 'unread') count = notifications.filter(n => !n.read).length;
            else count = notifications.filter(n => n.type === f.key).length;

            if (f.key !== 'all' && f.key !== 'unread' && count === 0) return '';

            const isActive = currentFilter === f.key;
            return `
                <button class="whitespace-nowrap px-4 py-2 mr-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${isActive ? 'bg-[#2D5A3D] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}" onclick="setFilter('${f.key}')">
                    ${f.label} (${count})
                </button>
            `;
        }).join('');

        const unreadCount = notifications.filter(n => !n.read).length;
        document.getElementById('notifications-subtitle').textContent = unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : 'Bạn đã đọc tất cả thông báo';
    }

    window.setFilter = function(filter) {
        currentFilter = filter;
        renderPageFilters();
        renderPageList();
    };

    function renderPageList() {
        const listContainer = document.getElementById('notif-page-list');
        const emptyContainer = document.getElementById('notif-empty');
        if (!listContainer) return;

        let filtered = notifications;
        if (currentFilter === 'unread') {
            filtered = notifications.filter(n => !n.read);
        } else if (currentFilter !== 'all') {
            filtered = notifications.filter(n => n.type === currentFilter);
        }

        if (filtered.length === 0) {
            listContainer.classList.add('hidden');
            emptyContainer.classList.remove('hidden');
        } else {
            listContainer.classList.remove('hidden');
            emptyContainer.classList.add('hidden');
            listContainer.innerHTML = filtered.map(n => {
                const cfg = typeConfig[n.type] || { icon: 'bell', color: 'text-gray-500', bg: 'bg-gray-50' };
                return `
                    <div class="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-white shadow-sm' : 'bg-gray-50/50'}" onclick="markAsRead('${n.id}')">
                        <div class="w-12 h-12 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-1">
                            <i data-lucide="${cfg.icon}" class="w-6 h-6 ${cfg.color}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="text-base font-bold ${!n.read ? 'text-[#2D5A3D]' : 'text-gray-900'}">${n.title}</h4>
                            <p class="text-sm text-gray-600 mt-1">${n.message}</p>
                            <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                <span class="flex items-center"><i data-lucide="clock" class="w-3.5 h-3.5 mr-1"></i>${n.time}</span>
                            </div>
                        </div>
                        ${!n.read ? '<div class="w-3 h-3 rounded-full bg-[#C4603A] mt-2 flex-shrink-0"></div>' : ''}
                    </div>
                `;
            }).join('');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    // Init
    fetchNotifications();
});
