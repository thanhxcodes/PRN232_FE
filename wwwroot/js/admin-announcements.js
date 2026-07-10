document.addEventListener('DOMContentLoaded', () => {
    let announcements = [];
    let isUploading = false;
    let isSaving = false;

    // Elements
    const tableBody = document.getElementById('announcements-table-body');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    
    // Modal
    const modal = document.getElementById('announcement-modal');
    const modalContent = document.getElementById('modal-content');
    const btnAddNew = document.getElementById('btn-add-new');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancel');
    const btnSave = document.getElementById('btn-save');
    const form = document.getElementById('announcement-form');

    // Fetch
    const fetchAnnouncements = async () => {
        tableBody.innerHTML = '';
        loadingState.classList.remove('hidden');
        emptyState.classList.add('hidden');

        try {
            const res = await fetch('/api-proxy/announcement');
            const data = await res.json();
            if (data.success) {
                announcements = data.data || [];
                renderTable();
            } else {
                Swal.fire('Lỗi', data.message || 'Không thể tải danh sách sự kiện', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi kết nối đến máy chủ', 'error');
        } finally {
            loadingState.classList.add('hidden');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    };

    const renderTable = () => {
        const query = searchInput.value.toLowerCase();
        const filtered = announcements.filter(a => a.title.toLowerCase().includes(query));

        tableBody.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        filtered.forEach(a => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50/50 transition-colors group';
            
            // Generate Badges HTML if any
            let badgeHtml = '';
            if (a.badgeText) {
                badgeHtml = `<span class="px-2 py-0.5 text-[10px] font-bold bg-yellow-100 text-yellow-700 rounded ml-2 whitespace-nowrap">${a.badgeText}</span>`;
            }

            const activeClass = a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
            const activeText = a.isActive ? 'Đang bật' : 'Đang tắt';
            const activeIcon = a.isActive ? 'check' : 'x';

            tr.innerHTML = `
                <td class="py-4 px-6">
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                            ${a.imageUrl ? `<img src="${a.imageUrl}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-gray-400"><i data-lucide="image" class="w-5 h-5"></i></div>`}
                        </div>
                        <div>
                            <div class="font-bold text-gray-900 line-clamp-1 break-all">${a.title} ${badgeHtml}</div>
                            <div class="text-xs text-gray-500 line-clamp-1 mt-1 break-all">${a.description}</div>
                            <div class="text-xs text-gray-400 mt-1">${a.redirectUrl}</div>
                        </div>
                    </div>
                </td>
                <td class="py-4 px-6 text-center">
                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-700 font-semibold text-sm border border-gray-100">${a.priority}</span>
                </td>
                <td class="py-4 px-6">
                    <div class="flex flex-col text-xs text-gray-600 gap-1 items-center">
                        <span class="bg-gray-50 px-2 py-1 rounded border border-gray-100">Từ: ${formatDate(a.startAt)}</span>
                        <span class="bg-gray-50 px-2 py-1 rounded border border-gray-100">Đến: ${formatDate(a.endAt)}</span>
                    </div>
                </td>
                <td class="py-4 px-6 text-center">
                    <button onclick="window.toggleStatus(${a.announcementId})" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${activeClass} hover:opacity-80 transition-opacity">
                        <i data-lucide="${activeIcon}" class="w-3.5 h-3.5"></i>
                        ${activeText}
                    </button>
                </td>
                <td class="py-4 px-6 text-right">
                    <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.openEdit(${a.announcementId})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Chỉnh sửa">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.deleteAnnouncement(${a.announcementId})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        lucide.createIcons();
    };

    searchInput.addEventListener('input', renderTable);

    // Form logic
    const resetForm = () => {
        form.reset();
        document.getElementById('form-id').value = '';
        document.getElementById('form-image-url').value = '';
        
        // Reset preview image
        document.getElementById('upload-preview-container').classList.add('hidden');
        document.getElementById('upload-preview-container').classList.remove('flex');
        document.getElementById('upload-placeholder').classList.remove('hidden');
        document.getElementById('upload-preview-img').src = '';
        
        // Default Priority
        document.getElementById('form-priority').value = '0';
        document.getElementById('form-active').checked = true;
        
        // Start date = now, End date = now + 1 month
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        
        const formatForInput = (d) => {
            const pad = n => n < 10 ? '0'+n : n;
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        
        document.getElementById('form-start').value = formatForInput(now);
        document.getElementById('form-end').value = formatForInput(nextMonth);
        
        updatePreview();
    };

    const openModal = (title = "Thêm Thông Báo Mới") => {
        document.getElementById('modal-title').textContent = title;
        modal.classList.remove('hidden');
        // Trigger reflow
        void modal.offsetWidth;
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
    };

    const closeModal = () => {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            resetForm();
        }, 300);
    };

    btnAddNew.addEventListener('click', () => {
        resetForm();
        openModal();
    });

    btnCloseModal.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });

    // Update Live Preview
    const updatePreview = () => {
        const title = document.getElementById('form-title').value || 'Tiêu đề thông báo';
        const desc = document.getElementById('form-description').value || 'Mô tả chi tiết sự kiện sẽ hiển thị ở đây...';
        const btnText = document.getElementById('form-button-text').value || 'Khám phá ngay';
        const badge = document.getElementById('form-badge').value;
        const imgUrl = document.getElementById('form-image-url').value;

        document.getElementById('preview-title').textContent = title;
        document.getElementById('preview-description').textContent = desc;
        document.getElementById('preview-button').textContent = btnText;

        const badgeEl = document.getElementById('preview-badge');
        if (badge) {
            document.getElementById('preview-badge-text').textContent = badge;
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
        }

        const imgEl = document.getElementById('preview-img-tag');
        const noImgEl = document.getElementById('preview-no-image');
        if (imgUrl) {
            imgEl.src = imgUrl;
            imgEl.classList.remove('hidden');
            noImgEl.classList.add('hidden');
        } else {
            imgEl.src = '';
            imgEl.classList.add('hidden');
            noImgEl.classList.remove('hidden');
        }
    };

    const inputsToWatch = ['form-title', 'form-description', 'form-button-text', 'form-badge', 'form-image-url'];
    inputsToWatch.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
    });

    // Image Upload
    const fileInput = document.getElementById('form-image-file');
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            Swal.fire('Lỗi', 'Dung lượng ảnh không được vượt quá 5MB.', 'error');
            e.target.value = '';
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            Swal.fire('Lỗi', 'Chỉ hỗ trợ định dạng JPG, PNG, WEBP.', 'error');
            e.target.value = '';
            return;
        }

        try {
            document.getElementById('upload-loading').classList.remove('hidden');
            document.getElementById('upload-loading').classList.add('flex');
            
            const formData = new FormData();
            formData.append('files', file);

            const res = await fetch('/Admin/UploadImage', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success && data.urls && data.urls.length > 0) {
                const url = data.urls[0];
                document.getElementById('form-image-url').value = url;
                
                // Show in upload box
                document.getElementById('upload-placeholder').classList.add('hidden');
                document.getElementById('upload-preview-container').classList.remove('hidden');
                document.getElementById('upload-preview-container').classList.add('flex');
                document.getElementById('upload-preview-img').src = url;
                
                updatePreview();
                Swal.fire({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
                    icon: 'success', title: 'Tải ảnh lên thành công'
                });
            } else {
                Swal.fire('Lỗi', data.message || 'Tải ảnh thất bại', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi khi tải ảnh lên', 'error');
        } finally {
            document.getElementById('upload-loading').classList.add('hidden');
            document.getElementById('upload-loading').classList.remove('flex');
            e.target.value = '';
        }
    });

    // Save
    btnSave.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Validate
        const title = document.getElementById('form-title').value.trim();
        const desc = document.getElementById('form-description').value.trim();
        const imgUrl = document.getElementById('form-image-url').value.trim();
        const link = document.getElementById('form-link').value.trim();
        const btnText = document.getElementById('form-button-text').value.trim();
        const badge = document.getElementById('form-badge').value.trim();
        const priority = parseInt(document.getElementById('form-priority').value) || 0;
        const startAt = document.getElementById('form-start').value;
        const endAt = document.getElementById('form-end').value;
        const isActive = document.getElementById('form-active').checked;
        const id = document.getElementById('form-id').value;

        if (!title || !desc || !imgUrl || !link || !btnText || !startAt || !endAt) {
            Swal.fire('Lỗi', 'Vui lòng điền đầy đủ các trường bắt buộc', 'warning');
            return;
        }

        const start = new Date(startAt).getTime();
        const end = new Date(endAt).getTime();
        if (start >= end) {
            Swal.fire('Lỗi', 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc', 'warning');
            return;
        }

        try {
            isSaving = true;
            btnSave.disabled = true;
            document.getElementById('save-icon').classList.add('hidden');
            document.getElementById('save-spinner').classList.remove('hidden');
            document.getElementById('save-text').textContent = 'Đang lưu...';

            const payload = {
                imageUrl: imgUrl,
                title: title,
                description: desc,
                redirectUrl: link,
                buttonText: btnText,
                badgeText: badge,
                priority: priority,
                isActive: isActive,
                startAt: new Date(startAt).toISOString(),
                endAt: new Date(endAt).toISOString()
            };

            const url = id ? `/api-proxy/announcement/${id}` : '/api-proxy/announcement';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                Swal.fire('Thành công', id ? 'Cập nhật thành công!' : 'Tạo mới thành công!', 'success');
                closeModal();
                fetchAnnouncements();
            } else {
                Swal.fire('Lỗi', data.message || 'Lỗi khi lưu dữ liệu', 'error');
            }

        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi kết nối máy chủ', 'error');
        } finally {
            isSaving = false;
            btnSave.disabled = false;
            document.getElementById('save-icon').classList.remove('hidden');
            document.getElementById('save-spinner').classList.add('hidden');
            document.getElementById('save-text').textContent = 'Lưu Thông Báo';
        }
    });

    // Window Functions
    window.openEdit = (id) => {
        const a = announcements.find(x => x.announcementId === id);
        if (!a) return;

        resetForm();
        document.getElementById('form-id').value = a.announcementId;
        document.getElementById('form-title').value = a.title;
        document.getElementById('form-description').value = a.description;
        
        let linkValue = a.redirectUrl || '';
        const routeMap = {
            '/sell': '/Products/Create',
            '/shorts': '/Shorts',
            '/plans': '/Plans',
            '/profile': '/Profile',
            '/messages': '/Chat'
        };
        if (routeMap[linkValue.toLowerCase()]) {
            linkValue = routeMap[linkValue.toLowerCase()];
        }
        document.getElementById('form-link').value = linkValue;
        
        document.getElementById('form-button-text').value = a.buttonText;
        document.getElementById('form-badge').value = a.badgeText || '';
        document.getElementById('form-priority').value = a.priority;
        document.getElementById('form-active').checked = a.isActive;
        
        const formatForInput = (dateStr) => {
            const d = new Date(dateStr);
            const pad = n => n < 10 ? '0'+n : n;
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        document.getElementById('form-start').value = formatForInput(a.startAt);
        document.getElementById('form-end').value = formatForInput(a.endAt);

        document.getElementById('form-image-url').value = a.imageUrl;
        if (a.imageUrl) {
            document.getElementById('upload-placeholder').classList.add('hidden');
            document.getElementById('upload-preview-container').classList.remove('hidden');
            document.getElementById('upload-preview-container').classList.add('flex');
            document.getElementById('upload-preview-img').src = a.imageUrl;
        }

        updatePreview();
        openModal("Chỉnh Sửa Thông Báo");
    };

    window.toggleStatus = async (id) => {
        const a = announcements.find(x => x.announcementId === id);
        if (!a) return;

        try {
            const payload = { ...a, isActive: !a.isActive };
            const res = await fetch(`/api-proxy/announcement/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
                    icon: 'success', title: `Đã ${!a.isActive ? 'bật' : 'tắt'} thông báo.`
                });
                fetchAnnouncements();
            } else {
                Swal.fire('Lỗi', data.message || 'Lỗi khi cập nhật trạng thái', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi máy chủ', 'error');
        }
    };

    window.deleteAnnouncement = async (id) => {
        const result = await Swal.fire({
            title: 'Xóa thông báo này?',
            text: "Hành động này không thể hoàn tác!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Đồng ý xóa',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api-proxy/announcement/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    Swal.fire('Đã xóa!', 'Xóa thông báo thành công.', 'success');
                    fetchAnnouncements();
                } else {
                    Swal.fire('Lỗi', data.message || 'Lỗi khi xóa', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Lỗi', 'Lỗi kết nối', 'error');
            }
        }
    };

    // Initial Load
    fetchAnnouncements();
});
