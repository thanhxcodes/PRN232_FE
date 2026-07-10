document.addEventListener('DOMContentLoaded', function () {
    const templates = [
        { id: 'promotion', label: 'Khuyến mãi', icon: 'tag', color: 'text-[#C4603A]', bg: 'bg-orange-50', sampleTitle: '🎉 Sale lớn tháng 6 - Giảm đến 30% gói credits!', sampleContent: 'Chào bạn! Nhân dịp Hè 2024, REVORA tặng ngay ưu đãi giảm giá đặc biệt cho tất cả gói credits. Đừng bỏ lỡ cơ hội bán hàng hiệu quả hơn với chi phí thấp nhất!' },
        { id: 'announcement', label: 'Thông báo', icon: 'megaphone', color: 'text-blue-600', bg: 'bg-blue-50', sampleTitle: '📢 Cập nhật chính sách đăng tin mới', sampleContent: 'REVORA vừa cập nhật chính sách đăng tin để đảm bảo trải nghiệm mua bán tốt hơn cho cộng đồng. Vui lòng đọc kỹ các điều khoản mới trước khi đăng sản phẩm.' },
        { id: 'warning', label: 'Cảnh báo', icon: 'alert-triangle', color: 'text-yellow-600', bg: 'bg-yellow-50', sampleTitle: '⚠️ Lưu ý bảo mật tài khoản của bạn', sampleContent: 'Chúng tôi phát hiện hoạt động đăng nhập bất thường. Vui lòng kiểm tra lại bảo mật tài khoản và thay đổi mật khẩu nếu cần thiết.' },
        { id: 'event', label: 'Sự kiện', icon: 'calendar', color: 'text-purple-600', bg: 'bg-purple-50', sampleTitle: '🎊 Flash Sale 12/12 - REVORA Birthday!', sampleContent: 'REVORA tròn 1 tuổi! Để kỷ niệm, chúng tôi tổ chức Flash Sale 12/12 với hàng ngàn sản phẩm thời trang second-hand giá cực ưu đãi.' },
        { id: 'feature', label: 'Tính năng mới', icon: 'star', color: 'text-[#2D5A3D]', bg: 'bg-green-50', sampleTitle: '✨ Ra mắt tính năng REVORA Match!', sampleContent: 'Chúng tôi vừa ra mắt tính năng REVORA Match - giúp bạn tìm kiếm phong cách phù hợp dựa trên AI. Hãy thử ngay!' },
    ];

    const targetOptions = [
        { value: 'all', label: 'Tất cả người dùng', desc: 'Gửi đến toàn bộ tài khoản', count: 1234 },
        { value: 'active', label: 'Người dùng hoạt động', desc: 'Đăng nhập trong 30 ngày qua', count: 892 },
        { value: 'new', label: 'Người dùng mới', desc: 'Tham gia trong 7 ngày qua', count: 156 },
        { value: 'posting_users', label: 'Người dùng có Credit Đăng Tin', desc: 'Đang có credit đăng tin', count: 547 },
        { value: 'featured_users', label: 'Người dùng có Credit Nổi Bật', desc: 'Đang có credit nổi bật', count: 213 },
        { value: 'specific', label: 'Người dùng cụ thể', desc: 'Tìm và chọn tài khoản', count: 0 },
    ];

    const mockSentNotifs = [
        { id: 'N001', title: '🎉 Chào mừng tháng 5 - Ưu đãi đặc biệt!', content: 'Tháng 5 này REVORA tặng bạn 10 credits đăng tin miễn phí khi nạp bất kỳ gói nào.', type: 'promotion', target: 'all', sentAt: '01/05/2024 09:00', recipientCount: 1234, readRate: 68 },
        { id: 'N002', title: '📢 Thay đổi giao diện Shorts mới!', content: 'Chúng tôi đã cập nhật trang Shorts với nút Xem SP giúp bạn xem sản phẩm dễ dàng hơn.', type: 'feature', target: 'all', sentAt: '20/04/2024 14:30', recipientCount: 1234, readRate: 54 },
        { id: 'N003', title: '⚠️ Nhắc nhở: Gia hạn gói trước khi hết hạn', content: 'Gói của bạn sắp hết hạn trong 3 ngày. Gia hạn ngay để không gián đoạn dịch vụ.', type: 'warning', target: 'posting_users', sentAt: '15/04/2024 10:00', recipientCount: 547, readRate: 79 },
    ];

    let selectedType = 'announcement';
    let selectedTarget = 'all';
    let scheduleMode = false;
    let selectedUsers = []; // [{id, username}]

    // Render Templates
    const templatesContainer = document.getElementById('type-templates');
    function renderTemplates() {
        templatesContainer.innerHTML = templates.map(t => {
            const isActive = selectedType === t.id;
            return `
                <button type="button" data-id="${t.id}" class="template-btn flex flex-col items-center space-y-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${isActive ? `${t.bg} border-current ${t.color}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'}">
                    <i data-lucide="${t.icon}" class="w-5 h-5 mb-1 ${isActive ? t.color : 'text-gray-400'}"></i>
                    <span class="${isActive ? t.color : 'text-gray-600'}">${t.label}</span>
                </button>
            `;
        }).join('');
        lucide.createIcons();

        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const t = templates.find(x => x.id === id);
                selectedType = id;
                document.getElementById('notif-title').value = t.sampleTitle;
                document.getElementById('notif-content').value = t.sampleContent;
                updateCharCount();
                renderTemplates();
                updateSummary();
            });
        });
    }

    // Render Targets
    const targetsContainer = document.getElementById('target-options');
    function renderTargets() {
        targetsContainer.innerHTML = targetOptions.map(t => {
            const isSelected = selectedTarget === t.value;
            return `
                <label class="flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#2D5A3D] bg-green-50/50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}">
                    <div class="relative flex items-center justify-center w-5 h-5 rounded-full border-2 mr-3 ${isSelected ? 'border-[#2D5A3D]' : 'border-gray-300'}">
                        ${isSelected ? '<div class="w-2.5 h-2.5 rounded-full bg-[#2D5A3D]"></div>' : ''}
                    </div>
                    <input type="radio" name="target" value="${t.value}" class="hidden" ${isSelected ? 'checked' : ''}>
                    <div class="flex-1">
                        <div class="text-sm font-semibold text-gray-900">${t.label}</div>
                        <div class="text-xs text-gray-500">${t.desc}</div>
                    </div>
                    ${t.value !== 'specific' ? `<div class="text-sm font-medium ${isSelected ? 'text-[#2D5A3D]' : 'text-gray-500'}">${t.count.toLocaleString('vi-VN')}</div>` : ''}
                </label>
            `;
        }).join('');

        document.querySelectorAll('input[name="target"]').forEach(radio => {
            radio.addEventListener('change', function() {
                selectedTarget = this.value;
                document.getElementById('specific-users-box').classList.toggle('hidden', selectedTarget !== 'specific');
                renderTargets();
                updateSummary();
            });
        });
    }

    // Content char count
    const contentInput = document.getElementById('notif-content');
    function updateCharCount() {
        document.getElementById('char-count').textContent = contentInput.value.length;
    }
    contentInput.addEventListener('input', updateCharCount);

    // Schedule mode
    const scheduleCheckbox = document.getElementById('schedule-mode');
    const scheduleInput = document.getElementById('scheduled-at');
    scheduleCheckbox.addEventListener('change', function() {
        scheduleMode = this.checked;
        scheduleInput.classList.toggle('hidden', !scheduleMode);
        document.getElementById('btn-send-text').textContent = scheduleMode ? 'Lên lịch gửi' : 'Gửi ngay';
    });

    // Summary
    function updateSummary() {
        const tType = templates.find(x => x.id === selectedType);
        const tTarget = targetOptions.find(x => x.value === selectedTarget);
        
        document.getElementById('summary-type').textContent = tType ? tType.label : 'Thông báo';
        document.getElementById('summary-target').textContent = tTarget ? tTarget.label : 'Tất cả';
        
        const count = selectedTarget === 'specific' ? selectedUsers.length : (tTarget ? tTarget.count : 0);
        document.getElementById('summary-count').textContent = count.toLocaleString('vi-VN');

        const btnSend = document.getElementById('btn-send');
        if (selectedTarget === 'specific' && selectedUsers.length === 0) {
            btnSend.disabled = true;
        } else {
            btnSend.disabled = false;
        }
    }

    // Search Users
    const searchInput = document.getElementById('search-users');
    const searchResults = document.getElementById('search-results');
    const selectedUsersBox = document.getElementById('selected-users');
    let searchTimeout;

    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch('/Admin/SearchUsers?query=' + encodeURIComponent(query));
                const json = await res.json();
                if (json.success && json.data) {
                    renderSearchResults(json.data);
                }
            } catch (e) { console.error(e); }
        }, 500);
    });

    function renderSearchResults(users) {
        if (users.length === 0) {
            searchResults.innerHTML = '<div class="p-3 text-sm text-gray-500 text-center">Không tìm thấy kết quả</div>';
        } else {
            searchResults.innerHTML = users.map(u => `
                <div class="search-item p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b last:border-0" data-id="${u.id}" data-username="${u.username}">
                    <div>
                        <div class="text-sm font-medium text-gray-900">${u.username}</div>
                        <div class="text-xs text-gray-500">${u.email}</div>
                    </div>
                    <i data-lucide="plus" class="w-4 h-4 text-gray-400"></i>
                </div>
            `).join('');
            lucide.createIcons();

            document.querySelectorAll('.search-item').forEach(item => {
                item.addEventListener('click', function() {
                    const id = parseInt(this.getAttribute('data-id'));
                    const username = this.getAttribute('data-username');
                    
                    if (!selectedUsers.find(x => x.id === id)) {
                        selectedUsers.push({id, username});
                        renderSelectedUsers();
                        updateSummary();
                    }
                    searchResults.classList.add('hidden');
                    searchInput.value = '';
                });
            });
        }
        searchResults.classList.remove('hidden');
    }

    function renderSelectedUsers() {
        selectedUsersBox.innerHTML = selectedUsers.map(u => `
            <div class="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D5A3D]/10 text-[#2D5A3D] rounded-lg text-sm font-medium border border-[#2D5A3D]/20">
                <span>@${u.username}</span>
                <button type="button" class="remove-user hover:bg-[#2D5A3D]/20 rounded-full p-0.5" data-id="${u.id}">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        `).join('');
        lucide.createIcons();

        document.querySelectorAll('.remove-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                selectedUsers = selectedUsers.filter(x => x.id !== id);
                renderSelectedUsers();
                updateSummary();
            });
        });
    }

    // Hide search results on click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#specific-users-box')) {
            searchResults.classList.add('hidden');
        }
    });

    // History Toggle
    let historyVisible = true;
    const historyList = document.getElementById('history-list');
    const historyIcon = document.getElementById('history-icon');
    
    document.getElementById('toggle-history').addEventListener('click', () => {
        historyVisible = !historyVisible;
        historyList.style.display = historyVisible ? 'block' : 'none';
        historyIcon.style.transform = historyVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    let sentNotifs = [...mockSentNotifs];

    function renderHistory() {
        document.getElementById('history-count').textContent = sentNotifs.length;
        
        historyList.innerHTML = sentNotifs.map(n => {
            const tType = templates.find(x => x.id === n.type) || templates[1];
            return `
                <div class="py-4 border-b border-gray-100 last:border-0 group">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-medium px-2.5 py-1 rounded-md ${tType.bg} ${tType.color}">${tType.label}</span>
                            <span class="text-xs text-gray-400 flex items-center"><i data-lucide="clock" class="w-3.5 h-3.5 mr-1"></i> ${n.sentAt}</span>
                        </div>
                        <button class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <h4 class="font-bold text-gray-900 text-sm mb-1">${n.title}</h4>
                    <p class="text-gray-600 text-sm mb-3 line-clamp-2">${n.content}</p>
                    <div class="flex items-center gap-4 text-xs font-medium">
                        <div class="flex items-center text-gray-500"><i data-lucide="users" class="w-3.5 h-3.5 mr-1.5"></i> ${n.recipientCount.toLocaleString('vi-VN')} người nhận</div>
                        <div class="flex items-center text-[#2D5A3D]"><i data-lucide="check-circle" class="w-3.5 h-3.5 mr-1.5"></i> Tỷ lệ đọc: ${n.readRate}%</div>
                    </div>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }

    // Submit
    const btnSend = document.getElementById('btn-send');
    btnSend.addEventListener('click', async function() {
        const title = document.getElementById('notif-title').value.trim();
        const content = document.getElementById('notif-content').value.trim();
        
        if (!title || !content) {
            alert('Vui lòng nhập đầy đủ Tiêu đề và Nội dung!');
            return;
        }

        const originalText = document.getElementById('btn-send-text').textContent;
        document.getElementById('btn-send-text').textContent = 'Đang xử lý...';
        btnSend.disabled = true;

        try {
            const payload = {
                type: selectedType,
                target: selectedTarget,
                title: title,
                content: content,
                scheduledAt: scheduleMode ? (document.getElementById('scheduled-at').value || null) : null,
                specificUserIds: selectedTarget === 'specific' ? selectedUsers.map(u => u.id) : null
            };

            const res = await fetch('/Admin/SendNotifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();

            if (json.success) {
                // Show success alert
                const alertBox = document.getElementById('success-alert');
                alertBox.classList.remove('hidden');
                setTimeout(() => alertBox.classList.add('hidden'), 3000);

                // Add to history
                const newNotif = {
                    id: 'N' + Date.now(),
                    title: title,
                    content: content,
                    type: selectedType,
                    target: selectedTarget,
                    sentAt: scheduleMode && payload.scheduledAt ? new Date(payload.scheduledAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN'),
                    recipientCount: selectedTarget === 'specific' ? selectedUsers.length : (targetOptions.find(t => t.value === selectedTarget).count),
                    readRate: 0
                };
                sentNotifs.unshift(newNotif);
                renderHistory();

                // Clear form
                document.getElementById('notif-title').value = '';
                document.getElementById('notif-content').value = '';
                updateCharCount();
            } else {
                alert(json.message || 'Có lỗi xảy ra');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi kết nối máy chủ');
        } finally {
            document.getElementById('btn-send-text').textContent = originalText;
            btnSend.disabled = false;
        }
    });

    // Initialize
    renderTemplates();
    renderTargets();
    updateSummary();
    renderHistory();
    
    // Set default template content
    const t = templates.find(x => x.id === selectedType);
    document.getElementById('notif-title').value = t.sampleTitle;
    document.getElementById('notif-content').value = t.sampleContent;
    updateCharCount();
});
