window.manageProducts = (function() {
    let state = {
        activeTab: 'products',
        products: [],
        deletedProducts: [],
        creditHistory: [],
        postingCredits: 0,
        featuredCredits: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        totalProductsCount: 0,
        violatedProductsCount: 0,
        productStatusFilter: 'all',
        expandedProductIds: new Set()
    };

    const apiBase = window.globalConfig?.apiBaseUrl || '/api-proxy';

    async function apiCall(endpoint, method = 'GET', data = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (window.globalConfig?.accessToken) {
            headers['Authorization'] = `Bearer ${window.globalConfig.accessToken}`;
        }
        
        const config = { method, headers };
        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(`${apiBase}${endpoint}`, config);
        return await response.json();
    }

    async function init() {
        if (!window.globalConfig?.accessToken) {
            Swal.fire('Lỗi', 'Vui lòng đăng nhập để xem trang này', 'error');
            return;
        }
        await loadData();
        setActiveTab('products');
    }

    async function loadData() {
        try {
            Swal.showLoading();
            
            const actualFilter = state.activeTab === 'violated' ? 'violated' : state.productStatusFilter;
            
            const [productsRes, deletedRes, violatedRes] = await Promise.all([
                apiCall(`/Products/me?status=${actualFilter}&pageNumber=${state.page}&pageSize=${state.pageSize}`),
                apiCall(`/Products/me/deleted`),
                apiCall(`/Products/me?status=violated&pageNumber=1&pageSize=1`)
            ]);

            if (productsRes.success) {
                state.products = productsRes.data.items || [];
                state.totalPages = productsRes.data.totalPages || 1;
                state.totalProductsCount = productsRes.data.totalCount || 0;
            }
            if (deletedRes.success) {
                state.deletedProducts = deletedRes.data.items || [];
            }
            if (violatedRes?.success) {
                state.violatedProductsCount = violatedRes.data.totalCount || 0;
            }

            document.getElementById('trash-count-badge').innerText = `Thùng Rác (${state.deletedProducts.length})`;
            document.getElementById('violated-count-badge').innerText = `Vi phạm (${state.violatedProductsCount})`;

            renderCurrentTab();
            Swal.close();
        } catch (e) {
            console.error(e);
            Swal.close();
        }
    }

    function setActiveTab(tab) {
        state.activeTab = tab;
        
        // Update tab styles
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.className = 'tab-btn flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-gray-600 hover:bg-gray-100';
            btn.style.backgroundColor = '';
        });
        
        const activeBtn = document.getElementById(`tab-${tab}`);
        if (activeBtn) {
            if (tab === 'products' || tab === 'credits') {
                activeBtn.className = 'tab-btn flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-white';
                activeBtn.style.backgroundColor = '#2D5A3D';
            }
            else if (tab === 'shorts') {
                activeBtn.className = 'tab-btn flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-white';
                activeBtn.style.backgroundColor = '#2563EB'; // blue-600
            }
            else if (tab === 'trash') {
                activeBtn.className = 'tab-btn flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-white';
                activeBtn.style.backgroundColor = '#DC2626'; // red-600
            }
            else if (tab === 'violated') {
                activeBtn.className = 'tab-btn flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-white';
                activeBtn.style.backgroundColor = '#EA580C'; // orange-600
            }
        }

        // Show content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`content-${tab}`)?.classList.remove('hidden');

        if (tab === 'credits') {
            loadCreditData();
        } else {
            loadData();
        }
    }

    async function loadCreditData() {
        try {
            Swal.showLoading();
            const [historyRes, summaryRes] = await Promise.all([
                apiCall('/Credit/history'),
                apiCall('/Credit/me')
            ]);
            
            if (historyRes.success) {
                state.creditHistory = historyRes.data || [];
            }
            if (summaryRes.success) {
                const data = summaryRes.data;
                const now = new Date();
                const parseCredits = (batches) => {
                    return batches.filter(b => b.status === 'Active' && (!b.expiresDate || b.expiresDate === 'Vĩnh viễn' || new Date(b.expiresDate + (b.expiresDate.endsWith('Z') ? '' : 'Z')) > now))
                                  .reduce((sum, b) => sum + b.credits, 0);
                };
                
                state.postingCredits = parseCredits(data.posting || []);
                state.featuredCredits = parseCredits(data.featured || []);
            }
            renderCurrentTab();
            Swal.close();
        } catch (e) {
            console.error(e);
            Swal.close();
        }
    }

    function renderCurrentTab() {
        if (state.activeTab === 'products') renderProducts('content-products');
        else if (state.activeTab === 'shorts') renderShorts();
        else if (state.activeTab === 'credits') renderCredits();
        else if (state.activeTab === 'trash') renderTrash();
        else if (state.activeTab === 'violated') renderProducts('content-violated');
        lucide.createIcons();
    }

    // Helper to format Date
    function formatVNTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
        return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatCountdown(expiredAtStr) {
        if (!expiredAtStr) return '';
        const expiredAt = new Date(expiredAtStr + (expiredAtStr.endsWith('Z') ? '' : 'Z'));
        const now = new Date();
        const diffMs = expiredAt.getTime() - now.getTime();
        if (diffMs <= 0) return 'Đã hết hạn';
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) return `còn ${diffDays} ngày`;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `còn ${diffHours} giờ ${diffMins} phút`;
    }

    function renderProducts(targetContainerId) {
        const container = document.getElementById(targetContainerId);
        
        let html = '';
        if (state.activeTab === 'products' || state.activeTab === 'violated') {
            html += `
            <div class="mt-4 flex items-center justify-between bg-gray-50/50 p-2 rounded-lg border border-gray-100 mb-6">
                <div class="flex items-center space-x-2 text-sm px-2">
                    <span class="text-gray-700 font-medium">Tổng: ${state.totalProductsCount} sản phẩm</span>
                </div>
                <div>
                    <select id="productStatusFilter" class="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 cursor-pointer" onchange="window.manageProducts.onFilterChange(this.value)">
                        <option value="all" ${state.productStatusFilter === 'all' ? 'selected' : ''}>Tất cả trạng thái</option>
                        <option value="public" ${state.productStatusFilter === 'public' ? 'selected' : ''}>Công khai</option>
                        <option value="private" ${state.productStatusFilter === 'private' ? 'selected' : ''}>Riêng tư</option>
                        <option value="expired" ${state.productStatusFilter === 'expired' ? 'selected' : ''}>Hết hạn</option>
                        <option value="normal" ${state.productStatusFilter === 'normal' ? 'selected' : ''}>Bài viết thường</option>
                        <option value="premium" ${state.productStatusFilter === 'premium' ? 'selected' : ''}>Bài viết nổi bật</option>
                        ${state.activeTab === 'violated' ? `<option value="violated" ${state.productStatusFilter === 'violated' ? 'selected' : ''}>Vi phạm</option>` : ''}
                    </select>
                </div>
            </div>`;
        }

        if (state.products.length === 0) {
            html += `<div class="text-center py-20"><div class="text-6xl mb-4">📦</div><h3 class="text-xl font-semibold text-gray-700 mb-2">Chưa có sản phẩm nào</h3><p class="text-gray-500">Bắt đầu đăng sản phẩm để quản lý tại đây</p></div>`;
            container.innerHTML = html;
            return;
        }

        html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;
        state.products.forEach(p => {
            const isExpired = p.productExpiredAt && new Date(p.productExpiredAt + (p.productExpiredAt.endsWith('Z') ? '' : 'Z')).getTime() <= new Date().getTime();
            const ringClass = p.isPremium ? 'ring-2 ring-[#C4603A] border-transparent shadow-[0_0_20px_rgba(196,96,58,0.3)]' : 'border-gray-200';
            
            let statusBadge = '';
            if (isExpired) {
                statusBadge = `<div class="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 shadow-sm"><i data-lucide="clock" class="w-3 h-3"></i><span>Đã hết hạn</span></div>`;
            } else if (p.productStatus === 'Public') {
                statusBadge = `<div class="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 shadow-sm"><i data-lucide="eye" class="w-3 h-3"></i><span>Công khai</span></div>`;
            } else if (p.productStatus === 'Violated') {
                statusBadge = `<div class="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 shadow-sm"><i data-lucide="alert-triangle" class="w-3 h-3"></i><span>Vi phạm</span></div>`;
            } else if (p.productStatus === 'AppealPending') {
                statusBadge = `<div class="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 shadow-sm"><i data-lucide="clock" class="w-3 h-3"></i><span>Chờ kháng cáo</span></div>`;
            } else {
                statusBadge = `<div class="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 shadow-sm"><i data-lucide="eye-off" class="w-3 h-3"></i><span>Riêng tư</span></div>`;
            }

            let premiumBadge = '';
            let shimmerEffect = '';
            if (p.isPremium) {
                shimmerEffect = `<div class="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"><div class="absolute inset-0 bg-gradient-to-r from-transparent via-[#C4603A]/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" style="background-size: 200% 100%"></div></div>`;
                premiumBadge = `<div class="absolute top-2 left-2 bg-gradient-to-r from-[#C4603A] to-[#d4724a] text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-semibold flex items-center gap-1.5 animate-pulse"><span class="text-sm">✨</span><span>Premium</span></div>`;
            }

            let extraInfo = '';
            if (state.expandedProductIds.has(p.productId)) {
                extraInfo = `
                <div class="mt-2 space-y-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-600">Hạn Banner:</span>
                        ${p.bannerExpiredAt 
                            ? `<div class="flex items-center space-x-2"><span class="font-semibold">${formatVNTime(p.bannerExpiredAt)}</span><span class="text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded text-[10px]">${formatCountdown(p.bannerExpiredAt)}</span></div>` 
                            : `<div class="flex items-center space-x-1"><span class="text-gray-400 italic">Không dùng</span><button onclick="window.manageProducts.handleEdit(${p.productId})" class="w-5 h-5 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 transition-colors ml-1" title="Thêm Banner"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button></div>`}
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-600">Hạn Video Short:</span>
                        ${p.shortExpiredAt 
                            ? `<div class="flex items-center space-x-2"><span class="font-semibold">${formatVNTime(p.shortExpiredAt)}</span><span class="text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded text-[10px]">${formatCountdown(p.shortExpiredAt)}</span></div>` 
                            : `<div class="flex items-center space-x-1"><span class="text-gray-400 italic">Không dùng</span><button onclick="window.manageProducts.handleEdit(${p.productId})" class="w-5 h-5 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 transition-colors ml-1" title="Thêm Video Short"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button></div>`}
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-600">Hạn Viền Nổi Bật:</span>
                        ${p.highlightExpiredAt 
                            ? `<div class="flex items-center space-x-2"><span class="font-semibold">${formatVNTime(p.highlightExpiredAt)}</span><span class="text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded text-[10px]">${formatCountdown(p.highlightExpiredAt)}</span></div>` 
                            : `<span class="text-gray-400 italic">Không dùng</span>`}
                    </div>
                </div>`;
            }

            let actionButtons = '';
            if (p.productStatus === 'Violated' || p.productStatus === 'AppealPending') {
                if (p.productStatus === 'Violated') {
                    actionButtons = `
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="window.manageProducts.handleEdit(${p.productId})" class="py-2.5 px-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all flex items-center justify-center space-x-1 border border-blue-200 shadow-sm"><i data-lucide="edit-2" class="w-4 h-4"></i><span>Sửa bài</span></button>
                        <button onclick="window.manageProducts.openAppealModal(${p.productId})" class="py-2.5 px-2 rounded-xl text-sm font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all flex items-center justify-center space-x-1 border border-orange-200 shadow-sm"><i data-lucide="alert-triangle" class="w-4 h-4"></i><span>Gửi duyệt lại</span></button>
                    </div>`;
                } else {
                    actionButtons = `
                    <div class="grid grid-cols-2 gap-2">
                        <div class="col-span-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-50 text-gray-500 flex items-center justify-center space-x-2 w-full border border-gray-200 cursor-not-allowed"><i data-lucide="clock" class="w-4 h-4"></i><span>Đang chờ Admin duyệt kháng cáo</span></div>
                    </div>`;
                }
            } else {
                actionButtons = `
                <div class="grid grid-cols-4 gap-2">
                    <button onclick="window.manageProducts.requestTogglePublic(${p.productId})" class="py-2 px-2 rounded-lg text-xs font-semibold transition-all ${p.productStatus === 'Public' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-50 text-green-700 hover:bg-green-100'}">
                        ${p.productStatus === 'Public' 
                            ? `<span class="flex items-center justify-center space-x-1"><i data-lucide="eye-off" class="w-3 h-3"></i><span>Ẩn</span></span>`
                            : `<span class="flex items-center justify-center space-x-1"><i data-lucide="eye" class="w-3 h-3"></i><span>Hiện</span></span>`
                        }
                    </button>
                    <button onclick="window.manageProducts.handleEdit(${p.productId})" class="py-2 px-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all flex items-center justify-center space-x-1"><i data-lucide="edit-2" class="w-3 h-3"></i><span>Sửa</span></button>
                    <button onclick="window.manageProducts.openRenewModal(${p.productId})" class="py-2 px-2 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all flex items-center justify-center space-x-1"><i data-lucide="refresh-cw" class="w-3 h-3"></i><span>Gia hạn</span></button>
                    <button onclick="window.manageProducts.handleDelete(${p.productId})" class="py-2 px-2 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-all flex items-center justify-center space-x-1"><i data-lucide="trash-2" class="w-3 h-3"></i><span>Xóa</span></button>
                </div>`;
            }

            html += `
            <div class="relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${ringClass} flex flex-col h-full">
                ${shimmerEffect}
                <div class="relative">
                    <img src="${p.imageUrl || 'https://via.placeholder.com/400'}" alt="${p.title}" class="w-full h-48 object-cover block ${isExpired ? 'grayscale' : ''}" onerror="this.src='https://via.placeholder.com/400'" />
                    ${isExpired ? `<div class="absolute inset-0 bg-red-900/10"></div>` : ''}
                    ${premiumBadge}
                    <div class="absolute top-2 right-2 flex flex-col gap-2 items-end">
                        ${statusBadge}
                    </div>
                </div>

                <div class="p-4 flex flex-col flex-1">
                    <h3 class="font-semibold text-gray-900 mb-1 line-clamp-1">${p.title}</h3>
                    <p class="text-[#2D5A3D] font-bold text-lg mb-2">${p.price.toLocaleString()}đ</p>
                    <p class="text-gray-600 text-sm mb-3 line-clamp-2">${p.condition || 'Chưa cập nhật'}</p>
                    <div class="flex flex-col gap-2 mb-4">
                        <div class="flex items-center justify-between text-xs text-gray-500">
                            <span class="bg-gray-100 px-2 py-1 rounded">${p.location || 'Chưa cập nhật'}</span>
                            <span class="font-medium text-[#2D5A3D]">Ngày đăng: ${formatVNTime(p.createdAt)}</span>
                        </div>
                        ${p.productExpiredAt ? `<div class="flex items-center justify-between text-xs text-gray-500"><span>Hết hạn: ${formatVNTime(p.productExpiredAt)}</span><span class="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded">${formatCountdown(p.productExpiredAt)}</span></div>` : ''}
                        
                        <div class="mt-2 border-t border-gray-100 pt-3">
                            <button onclick="window.manageProducts.toggleExpand(${p.productId})" class="flex items-center space-x-1 text-sm font-semibold text-gray-700 hover:text-[#2D5A3D] transition-colors">
                                <span>Xem thêm</span>
                                <i data-lucide="${state.expandedProductIds.has(p.productId) ? 'chevron-up' : 'chevron-down'}" class="w-4 h-4"></i>
                            </button>
                        </div>
                        ${extraInfo}
                    </div>
                    <div class="mt-auto">
                        <div class="flex items-center justify-between text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
                            <span class="flex items-center gap-1.5"><i data-lucide="eye" class="w-4 h-4 text-blue-500"></i> ${p.viewCount} lượt xem</span>
                            <span class="flex items-center gap-1.5"><i data-lucide="heart" class="w-4 h-4 text-red-500"></i> ${p.likeCount || 0} lượt thích</span>
                        </div>

                        ${actionButtons}
                    </div>
                </div>
            </div>`;
        });
        html += `</div>`;

        if (state.totalPages > 1) {
            html += `
            <div class="flex justify-center mt-8 space-x-2">
                <button onclick="window.manageProducts.setPage(${state.page - 1})" ${state.page === 1 ? 'disabled' : ''} class="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 disabled:opacity-50">Trước</button>
                <span class="px-4 py-2 text-gray-700">Trang ${state.page} / ${state.totalPages}</span>
                <button onclick="window.manageProducts.setPage(${state.page + 1})" ${state.page === state.totalPages ? 'disabled' : ''} class="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 disabled:opacity-50">Sau</button>
            </div>`;
        }

        container.innerHTML = html;
        lucide.createIcons();
    }

    function onFilterChange(value) {
        state.productStatusFilter = value;
        state.page = 1;
        loadData();
    }

    function setPage(p) {
        state.page = p;
        loadData();
    }

    function toggleExpand(id) {
        if (state.expandedProductIds.has(id)) {
            state.expandedProductIds.delete(id);
        } else {
            state.expandedProductIds.add(id);
        }
        renderCurrentTab();
    }

    function handleEdit(id) {
        window.location.href = `/Products/Edit/${id}`;
    }

    // Modal and action functions will be added...

    function renderShorts() {
        const container = document.getElementById('content-shorts');
        const shortsProducts = state.products.filter(p => p.shortId);

        let html = `
        <div class="flex items-center space-x-6 mb-6 text-sm mt-4">
            <div class="flex items-center space-x-2">
                <span class="text-gray-700">Sản phẩm có Video: ${shortsProducts.length}</span>
            </div>
        </div>`;

        if (shortsProducts.length === 0) {
            html += `<div class="text-center py-20"><div class="text-6xl mb-4">📹</div><h3 class="text-xl font-semibold text-gray-700 mb-2">Chưa có sản phẩm nào đính kèm Video</h3></div>`;
            container.innerHTML = html;
            return;
        }

        html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;
        shortsProducts.forEach(p => {
            let statusBadge = p.shortStatus === 'Active' 
                ? `<div class="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1"><i data-lucide="eye" class="w-3 h-3"></i><span>Video Đang Hiện</span></div>`
                : `<div class="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1"><i data-lucide="eye-off" class="w-3 h-3"></i><span>Video Đang Ẩn</span></div>`;

            let actionBtn = p.shortStatus === 'Active'
                ? `<button onclick="window.manageProducts.handleToggleShortStatus(${p.productId})" class="py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-1 bg-gray-100 text-gray-700 hover:bg-gray-200"><i data-lucide="eye-off" class="w-4 h-4"></i><span>Ẩn Video</span></button>`
                : `<button onclick="window.manageProducts.handleToggleShortStatus(${p.productId})" class="py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-1 bg-blue-50 text-blue-700 hover:bg-blue-100"><i data-lucide="eye" class="w-4 h-4"></i><span>Hiện Video</span></button>`;

            html += `
            <div class="relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                <div class="relative h-64 bg-gray-900 group">
                    <img src="${p.imageUrl || 'https://via.placeholder.com/400'}" alt="${p.title}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity block" onerror="this.src='https://via.placeholder.com/400'" />
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 group-hover:scale-110 transition-transform">
                            <i data-lucide="play" class="w-6 h-6 text-white ml-1"></i>
                        </div>
                    </div>
                    <div class="absolute top-2 right-2">
                        ${statusBadge}
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-gray-900 mb-1 line-clamp-2">${p.title}</h3>
                    <div class="flex items-center text-xs text-gray-500 mb-4 space-x-4">
                        <span class="flex items-center space-x-1"><i data-lucide="eye" class="w-3.5 h-3.5"></i><span>${p.viewCount || 0}</span></span>
                        <span class="flex items-center space-x-1"><i data-lucide="heart" class="w-3.5 h-3.5"></i><span>${p.likeCount || 0}</span></span>
                        <span class="flex items-center space-x-1"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i><span>0</span></span>
                    </div>
                    <div class="mt-2 border-t border-gray-100 pt-3 flex flex-col gap-2">
                        ${actionBtn}
                    </div>
                </div>
            </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
        lucide.createIcons();
    }
    function renderCredits() {
        const container = document.getElementById('content-credits');
        
        const filteredHistory = state.creditHistory.filter(item => {
            if (state.creditTypeFilter === 'all' || !state.creditTypeFilter) return true;
            return item.creditType === state.creditTypeFilter;
        });

        let html = `
        <div class="max-w-4xl mx-auto px-4 py-6">
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-blue-50 rounded-2xl border-2 border-blue-200 p-5">
                    <div class="flex items-center space-x-2 mb-3">
                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><i data-lucide="image" class="w-5 h-5 text-blue-600"></i></div>
                        <span class="text-sm font-semibold text-blue-700">Credit Đăng Tin</span>
                    </div>
                    <div class="flex items-baseline space-x-2">
                        <span class="text-4xl font-bold text-blue-600">${state.postingCredits || 0}</span>
                        <span class="text-sm text-gray-600">còn lại</span>
                    </div>
                </div>
                <div class="bg-orange-50 rounded-2xl border-2 border-orange-200 p-5">
                    <div class="flex items-center space-x-2 mb-3">
                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><i data-lucide="sparkles" class="w-5 h-5 text-[#C4603A]"></i></div>
                        <span class="text-sm font-semibold text-[#C4603A]">Credit Nổi Bật</span>
                    </div>
                    <div class="flex items-baseline space-x-2">
                        <span class="text-4xl font-bold text-[#C4603A]">${state.featuredCredits || 0}</span>
                        <span class="text-sm text-gray-600">còn lại</span>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center space-x-2">
                <span class="text-sm text-gray-600 font-medium">Lọc theo:</span>
                <button onclick="window.manageProducts.setCreditTypeFilter('all')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${(!state.creditTypeFilter || state.creditTypeFilter === 'all') ? 'bg-[#2D5A3D] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">Tất cả</button>
                <button onclick="window.manageProducts.setCreditTypeFilter('posting')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${state.creditTypeFilter === 'posting' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">Credit Đăng Tin</button>
                <button onclick="window.manageProducts.setCreditTypeFilter('featured')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${state.creditTypeFilter === 'featured' ? 'bg-[#C4603A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">Credit Nổi Bật</button>
            </div>

            <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 flex items-center space-x-2">
                    <i data-lucide="clock" class="w-4 h-4 text-[#2D5A3D]"></i>
                    <span class="text-sm font-semibold text-gray-800">Lịch sử trừ credit</span>
                    <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">${filteredHistory.length} giao dịch</span>
                </div>
                <div class="divide-y divide-gray-50">`;

        if (filteredHistory.length === 0) {
            html += `<div class="text-center py-16 text-gray-400"><i data-lucide="credit-card" class="w-10 h-10 mx-auto mb-3 opacity-30"></i><p class="text-sm">Không có lịch sử nào</p></div>`;
        } else {
            filteredHistory.forEach(item => {
                const isPosting = item.creditType === 'posting';
                const iconHTML = isPosting ? `<i data-lucide="image" class="w-5 h-5 text-blue-600"></i>` : `<i data-lucide="sparkles" class="w-5 h-5 text-[#C4603A]"></i>`;
                
                let label = item.action;
                if (label === 'Create') label = 'Đăng tin mới';
                if (label === 'Renew') label = 'Gia hạn tin';
                if (label === 'Highlight') label = 'Mua viền nổi bật';

                html += `
                <div class="px-5 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPosting ? 'bg-blue-50' : 'bg-orange-50'}">${iconHTML}</div>
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="text-sm font-semibold text-gray-900">${label}</span>
                                <span class="text-xs px-2 py-0.5 rounded-full font-medium ${isPosting ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}">${isPosting ? 'Đăng Tin' : 'Nổi Bật'}</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-0.5 flex items-center space-x-1.5">
                                <span class="truncate max-w-48">${item.productName || 'N/A'}</span>
                                <span class="text-gray-300">·</span>
                                <span>${item.date || ''} ${item.time || ''}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <div class="flex items-center space-x-1 justify-end font-bold text-sm ${isPosting ? 'text-blue-600' : 'text-[#C4603A]'}">
                            <i data-lucide="arrow-down-left" class="w-3.5 h-3.5"></i>
                            <span>-${item.amount} credit</span>
                        </div>
                        <div class="text-xs text-gray-400 mt-0.5">Còn lại: <span class="font-medium text-gray-600">${item.balanceAfter}</span></div>
                    </div>
                </div>`;
            });
        }

        html += `
                </div>
            </div>
        </div>`;
        container.innerHTML = html;
        lucide.createIcons();
    }
    function renderTrash() {
        const container = document.getElementById('content-trash');
        
        let html = `
        <div class="flex items-center space-x-6 mb-6 text-sm mt-4">
            <div class="flex items-center space-x-2">
                <span class="text-gray-700 font-semibold">Thùng rác: ${state.deletedProducts.length} sản phẩm</span>
            </div>
        </div>`;

        if (state.deletedProducts.length === 0) {
            html += `<div class="text-center py-20"><div class="text-6xl mb-4 text-gray-300"><i data-lucide="trash-2" class="w-16 h-16 mx-auto mb-2 opacity-30"></i></div><h3 class="text-xl font-semibold text-gray-700 mb-2">Thùng rác trống</h3><p class="text-gray-500">Các sản phẩm bạn xóa sẽ xuất hiện tại đây.</p></div>`;
            container.innerHTML = html;
            lucide.createIcons();
            return;
        }

        html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;
        state.deletedProducts.forEach(p => {
            let deleteText = "Còn 30 ngày trước khi bị xóa vĩnh viễn";
            if (p.deletedAt) {
                const dDate = new Date(p.deletedAt + (p.deletedAt.endsWith('Z') ? '' : 'Z'));
                const expiryDate = new Date(dDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                const now = new Date();
                const diffMs = expiryDate.getTime() - now.getTime();
                
                if (diffMs <= 0) {
                    deleteText = "Sắp bị xóa vĩnh viễn";
                } else {
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) deleteText = `Còn ${diffDays} ngày trước khi bị xóa vĩnh viễn`;
                    else {
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        if (diffHours > 0) deleteText = `Còn ${diffHours} giờ trước khi bị xóa vĩnh viễn`;
                        else {
                            const diffMins = Math.floor(diffMs / (1000 * 60));
                            deleteText = `Còn ${diffMins > 0 ? diffMins : 1} phút trước khi bị xóa vĩnh viễn`;
                        }
                    }
                }
            }

            let actionBtn = '';
            if (p.productStatus === 'AdminDeleted') {
                actionBtn = `<div class="flex flex-col gap-2"><div class="py-2 px-3 rounded-lg text-sm font-semibold bg-red-50 text-red-700 text-center border border-red-100 leading-snug">Bài viết đã bị quản trị viên xóa do vi phạm nghiêm trọng quy định.</div></div>`;
            } else if (p.productStatus === 'AppealPending') {
                actionBtn = `<div class="flex flex-col gap-2"><div class="py-2 px-3 rounded-lg text-sm font-semibold bg-gray-50 text-gray-500 flex items-center justify-center space-x-2 border border-gray-200 cursor-not-allowed"><i data-lucide="clock" class="w-4 h-4"></i><span>Đang chờ Admin duyệt kháng cáo</span></div></div>`;
            } else {
                actionBtn = `<div class="grid grid-cols-1"><button onclick="window.manageProducts.handleRestore(${p.productId})" class="py-2 px-3 rounded-lg text-sm font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-all flex items-center justify-center space-x-2"><i data-lucide="refresh-ccw" class="w-4 h-4"></i><span>Khôi phục tin đăng</span></button></div>`;
            }

            html += `
            <div class="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden opacity-90 hover:opacity-100 transition-all flex flex-col h-full">
                <div class="relative">
                    <img src="${p.imageUrl || 'https://placehold.co/400x300?text=No+Image'}" alt="${p.title}" class="w-full h-48 object-cover grayscale block" onerror="this.src='https://placehold.co/400x300?text=No+Image'" />
                    <div class="absolute inset-0 bg-red-900/10"></div>
                    <div class="absolute top-2 right-2">
                        <div class="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1"><i data-lucide="trash-2" class="w-3 h-3"></i><span>Đã Xóa</span></div>
                    </div>
                </div>
                <div class="bg-[#e43c3c] text-white text-xs font-bold py-2 text-center shadow-sm">
                    ${deleteText}
                </div>
                <div class="p-4 flex flex-col flex-1">
                    <h3 class="font-semibold text-gray-900 mb-1 line-clamp-1">${p.title}</h3>
                    <p class="text-gray-500 font-bold text-lg mb-2">${p.price.toLocaleString()}đ</p>
                    <div class="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                        <span>Đã xóa vào: ${p.deletedAt ? new Date(p.deletedAt + (p.deletedAt.endsWith('Z') ? '' : 'Z')).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div class="mt-auto w-full">
                        ${actionBtn}
                    </div>
                </div>
            </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
        lucide.createIcons();
    }
    function renderViolated() {}

    function setCreditTypeFilter(filter) {
        state.creditTypeFilter = filter;
        renderCurrentTab();
    }

    async function requestTogglePublic(id) {
        const p = state.products.find(x => x.productId === id);
        if (!p) return;
        
        const newStatus = p.productStatus === 'Public' ? 'Private' : 'Public';
        const actionName = newStatus === 'Public' ? 'hiển thị' : 'ẩn';

        const result = await Swal.fire({
            title: 'Xác nhận',
            text: `Bạn có chắc muốn ${actionName} sản phẩm này?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                Swal.showLoading();
                const res = await apiCall(`/Products/${id}/status`, 'PATCH', { status: newStatus });
                if (res.success) {
                    Swal.fire('Thành công', 'Cập nhật trạng thái thành công', 'success');
                    loadData();
                } else {
                    Swal.fire('Lỗi', res.message || 'Có lỗi xảy ra', 'error');
                }
            } catch(e) {
                Swal.fire('Lỗi', 'Lỗi kết nối', 'error');
            }
        }
    }

    async function handleDelete(id) {
        const result = await Swal.fire({
            title: 'Xác nhận xóa',
            text: `Bạn có chắc muốn xóa sản phẩm này vào thùng rác?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                Swal.showLoading();
                const res = await apiCall(`/Products/${id}`, 'DELETE');
                if (res.success) {
                    Swal.fire('Đã xóa', 'Sản phẩm đã được chuyển vào thùng rác', 'success');
                    loadData();
                } else {
                    Swal.fire('Lỗi', res.message || 'Có lỗi xảy ra', 'error');
                }
            } catch(e) {
                Swal.fire('Lỗi', 'Lỗi kết nối', 'error');
            }
        }
    }

    async function handleRestore(id) {
        const result = await Swal.fire({
            title: 'Khôi phục',
            text: `Bạn muốn khôi phục sản phẩm này?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Khôi phục',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                Swal.showLoading();
                const res = await apiCall(`/Products/${id}/restore`, 'PUT');
                if (res.success) {
                    Swal.fire('Thành công', 'Khôi phục sản phẩm thành công', 'success');
                    loadData();
                } else {
                    Swal.fire('Lỗi', res.message || 'Có lỗi xảy ra', 'error');
                }
            } catch(e) {
                Swal.fire('Lỗi', 'Lỗi kết nối', 'error');
            }
        }
    }

    async function handleToggleShortStatus(id) {
        const p = state.products.find(x => x.productId === id);
        if (!p || !p.shortId) return;

        const newStatus = p.shortStatus === 'Active' ? 'Hidden' : 'Active';
        try {
            Swal.showLoading();
            const res = await apiCall(`/Shorts/${p.shortId}/status`, 'PUT', { status: newStatus });
            if (res.success) {
                Swal.fire('Thành công', 'Cập nhật trạng thái video thành công', 'success');
                loadData();
            } else {
                Swal.fire('Lỗi', res.message || 'Có lỗi xảy ra', 'error');
            }
        } catch(e) {
            Swal.fire('Lỗi', 'Lỗi kết nối', 'error');
        }
    }

    let currentRenewProduct = null;
    let renewOptions = { product: false, banner: false, short: false };

    async function openRenewModal(id) {
        const p = state.products.find(x => x.productId === id);
        if (!p) return;
        currentRenewProduct = p;
        
        Swal.showLoading();
        let postingCredits = 0;
        let featuredCredits = 0;
        try {
            const creditRes = await apiCall('/Products/my-credits', 'GET');
            if (creditRes && creditRes.success) {
                postingCredits = creditRes.data.postingCredits;
                featuredCredits = creditRes.data.featuredCredits;
            }
        } catch(e) {}
        Swal.close();

        document.getElementById('rm-posting-credit').textContent = postingCredits;
        document.getElementById('rm-featured-credit').textContent = featuredCredits;
        document.getElementById('rm-product-title').value = p.title;
        
        const isProductExpired = p.productExpiredAt ? new Date(p.productExpiredAt + (p.productExpiredAt.endsWith('Z') ? '' : 'Z')).getTime() <= new Date().getTime() : false;
        
        renewOptions = { product: isProductExpired, banner: false, short: false };
        
        const optProduct = document.getElementById('rm-opt-product');
        const optBanner = document.getElementById('rm-opt-banner');
        const optShort = document.getElementById('rm-opt-short');
        
        optProduct.checked = renewOptions.product;
        optProduct.disabled = isProductExpired;
        document.getElementById('rm-expired-badge').classList.toggle('hidden', !isProductExpired);
        
        if (p.bannerExpiredAt) {
            document.getElementById('rm-label-banner').classList.remove('hidden');
            optBanner.checked = false;
        } else {
            document.getElementById('rm-label-banner').classList.add('hidden');
        }
        
        if (p.shortExpiredAt) {
            document.getElementById('rm-label-short').classList.remove('hidden');
            optShort.checked = false;
        } else {
            document.getElementById('rm-label-short').classList.add('hidden');
        }
        
        optProduct.onchange = (e) => { renewOptions.product = e.target.checked; updateRenewSummary(); };
        optBanner.onchange = (e) => { renewOptions.banner = e.target.checked; updateRenewSummary(); };
        optShort.onchange = (e) => { 
            renewOptions.short = e.target.checked; 
            updateRenewSummary(); 
        };
        
        updateRenewSummary();
        document.getElementById('renewModal').classList.remove('hidden');
    }

    function closeRenewModal() {
        document.getElementById('renewModal').classList.add('hidden');
        currentRenewProduct = null;
    }

    function updateRenewSummary() {
        if (renewOptions.short) {
            renewOptions.product = true;
            document.getElementById('rm-opt-product').checked = true;
        }

        const costPosting = renewOptions.product ? 1 : 0;
        const costFeatured = (renewOptions.banner ? 1 : 0) + (renewOptions.short ? 1 : 0);
        document.getElementById('rm-cost-posting').textContent = costPosting > 0 ? `-${costPosting}` : '0';
        document.getElementById('rm-cost-posting').className = `font-bold text-base ${costPosting > 0 ? 'text-red-600' : 'text-gray-400'}`;
        
        document.getElementById('rm-cost-featured').textContent = costFeatured > 0 ? `-${costFeatured}` : '0';
        document.getElementById('rm-cost-featured').className = `font-bold text-base ${costFeatured > 0 ? 'text-red-600' : 'text-gray-400'}`;
        
        const summaryList = document.getElementById('rm-summary-list');
        let productDays = 0;
        let highlightDays = 0;
        
        if (renewOptions.short) {
            productDays = 60;
            highlightDays = 60;
        } else if (renewOptions.product && renewOptions.banner) {
            productDays = 60;
            highlightDays = 60;
        } else if (renewOptions.product) {
            productDays = 30;
        } else if (renewOptions.banner) {
            productDays = 30;
            highlightDays = 30;
        }

        const results = [];
        if (productDays > 0) results.push(`+ ${productDays} ngày Sản Phẩm`);
        if (renewOptions.short) results.push(`+ 60 ngày Video Short`);
        if (renewOptions.banner) results.push(`+ 24 giờ Banner`);
        if (highlightDays > 0) results.push(`+ ${highlightDays} ngày Viền Nổi Bật`);
        
        if (results.length === 0) {
            summaryList.innerHTML = `<span class="text-gray-500 font-normal italic text-center w-full block">Vui lòng chọn dịch vụ để xem trước.</span>`;
        } else {
            summaryList.innerHTML = results.map(res => `<div class="flex items-center space-x-2"><i data-lucide="check-circle" class="w-4 h-4 text-[#2D5A3D] flex-shrink-0"></i><span>${res}</span></div>`).join('');
            lucide.createIcons({root: summaryList});
        }
        
        const isProductExpired = currentRenewProduct?.productExpiredAt ? new Date(currentRenewProduct.productExpiredAt + (currentRenewProduct.productExpiredAt.endsWith('Z') ? '' : 'Z')).getTime() <= new Date().getTime() : false;
        const optProduct = document.getElementById('rm-opt-product');
        const lblProduct = document.getElementById('rm-label-product');
        
        if (isProductExpired || renewOptions.short) {
            optProduct.disabled = true;
            lblProduct.classList.add('opacity-70', 'cursor-not-allowed', 'bg-gray-50');
            lblProduct.classList.remove('hover:bg-gray-50', 'cursor-pointer');
        } else {
            optProduct.disabled = false;
            lblProduct.classList.remove('opacity-70', 'cursor-not-allowed', 'bg-gray-50');
            lblProduct.classList.add('hover:bg-gray-50', 'cursor-pointer');
        }
    }

    async function confirmRenew() {
        if (!currentRenewProduct) return;
        if (!renewOptions.product && !renewOptions.banner && !renewOptions.short) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn ít nhất một dịch vụ để gia hạn.', 'warning');
            return;
        }
        
        document.getElementById('rm-confirm-btn').disabled = true;
        document.getElementById('rm-confirm-btn').innerHTML = 'Đang xử lý...';
        
        try {
            const res = await apiCall(`/Products/${currentRenewProduct.productId}/renew`, 'POST', {
                renewProduct: renewOptions.product,
                renewBanner: renewOptions.banner,
                renewShort: renewOptions.short,
                newBannerUrl: null
            });
            
            if (res.success) {
                Swal.fire('Thành công!', 'Gia hạn thành công!', 'success');
                closeRenewModal();
                loadData();
            } else {
                Swal.fire('Lỗi', res.message || 'Có lỗi xảy ra khi gia hạn.', 'error');
            }
        } catch(e) {
            Swal.fire('Lỗi', 'Lỗi kết nối khi gia hạn', 'error');
        } finally {
            const btn = document.getElementById('rm-confirm-btn');
            btn.disabled = false;
            btn.innerHTML = 'Xác nhận';
        }
    }

    async function openAppealModal(id) {
        const { value: text } = await Swal.fire({
            title: 'Gửi duyệt lại',
            input: 'textarea',
            inputLabel: 'Lý do gửi duyệt lại',
            inputPlaceholder: 'Vui lòng nhập lý do bạn cho rằng bài viết không vi phạm...',
            inputAttributes: {
                'aria-label': 'Lý do gửi duyệt lại'
            },
            showCancelButton: true,
            confirmButtonText: 'Gửi',
            cancelButtonText: 'Hủy',
            inputValidator: (value) => {
                if (!value) {
                    return 'Bạn cần nhập lý do!'
                }
            }
        });

        if (text) {
            try {
                Swal.showLoading();
                const res = await apiCall(`/Products/${id}/appeal`, 'POST', { reason: text });
                if (res.success) {
                    Swal.fire('Thành công', 'Đã gửi yêu cầu duyệt lại thành công, vui lòng chờ Quản trị viên duyệt.', 'success');
                    loadData();
                } else {
                    Swal.fire('Lỗi', res.message || 'Có lỗi xảy ra', 'error');
                }
            } catch (e) {
                Swal.fire('Lỗi', 'Lỗi kết nối', 'error');
            }
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        setActiveTab,
        onFilterChange,
        setPage,
        toggleExpand,
        handleEdit,
        setCreditTypeFilter,
        requestTogglePublic,
        handleDelete,
        handleRestore,
        handleToggleShortStatus,
        openRenewModal,
        closeRenewModal,
        confirmRenew,
        openAppealModal
    };
})();
