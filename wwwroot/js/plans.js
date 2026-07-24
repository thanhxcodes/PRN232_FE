class PlansManager {
    constructor() {
        // === State ===
        this.state = {
            activeTab: 'packages',
            creditPackages: [],
            creditSummaries: { posting: null, featured: null },
            userCreditBatches: { posting: [], featured: [] },
            transactions: [],
            isCreditLoading: true,
            isPackageLoading: true,
            isTransactionsLoading: false,
            isCheckoutLoading: false,
            loadingPackageId: null,
            creditError: null,
            packageError: null,
            transactionsError: null
        };

        // === Constants & Meta ===
        this.postingPackageMeta = {
            1: { badge: 'Cơ bản', badgeColor: 'bg-blue-100 text-blue-800', cta: 'Mua Ngay', tier: 1 },
            7: { badge: 'Phổ Biến', badgeColor: 'bg-purple-100 text-purple-800', cta: 'Chọn Gói', tier: 2 },
            30: { badge: 'Tiết Kiệm Nhất', badgeColor: 'bg-green-100 text-green-800', cta: 'Nhận Gói', tier: 3 },
        };

        this.featuredPackageMeta = {
            1: { badge: 'Tăng Tốc Nhanh', badgeColor: 'bg-orange-100 text-orange-800', cta: 'Tăng Tốc', tier: 1 },
            7: { badge: 'Được Đề Xuất', badgeColor: 'bg-pink-100 text-pink-800', cta: 'Nâng Cấp', tier: 2 },
            30: { badge: 'Tối Ưu Cao Cấp', badgeColor: 'bg-yellow-100 text-yellow-800', cta: 'Mua Ngay', tier: 3 },
        };

        // Binds
        this.switchTab = this.switchTab.bind(this);
        this.handleSelectPackage = this.handleSelectPackage.bind(this);

        this.init();
    }

    init() {
        if (window.lucide) lucide.createIcons();
        this.loadCreditPackages().then(() => this.loadCreditBatches());
    }

    // === Helpers ===
    formatTransactionDateTime(dateString) {
        if (!dateString) return { date: '', time: '' };
        const d = dateString.endsWith('Z') ? new Date(dateString) : new Date(dateString + 'Z');
        const optsDate = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' };
        const optsTime = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' };
        return {
            date: d.toLocaleDateString('vi-VN', optsDate),
            time: d.toLocaleTimeString('vi-VN', optsTime)
        };
    }

    mapPaymentStatus(statusId, createdAt, paidAt) {
        const normalized = String(statusId).toLowerCase();
        if (normalized === '2' || normalized === 'successful' || normalized === 'paid') {
            if (paidAt && createdAt) {
                const createdTime = new Date(createdAt.endsWith('Z') ? createdAt : createdAt + 'Z').getTime();
                const paidTime = new Date(paidAt.endsWith('Z') ? paidAt : paidAt + 'Z').getTime();
                if (paidTime - createdTime > 15 * 60 * 1000 + 60000) return 'late_paid';
            }
            return 'completed';
        }
        if (normalized === '1' || normalized === 'pending' || normalized === 'processing') return 'pending';
        if (normalized === '5' || normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
        return 'failed';
    }

    getTransactionStatusClass(status) {
        switch (status) {
            case 'completed': return 'bg-emerald-50 text-emerald-700';
            case 'late_paid': return 'bg-amber-50 text-amber-700 border border-amber-200';
            case 'pending': return 'bg-blue-50 text-blue-700';
            case 'cancelled': return 'bg-gray-100 text-gray-600 opacity-80';
            case 'failed': return 'bg-red-50 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    getTransactionStatusIconHTML(status) {
        switch (status) {
            case 'completed': return `<i data-lucide="check-circle" class="w-3.5 h-3.5 mr-1"></i>`;
            case 'late_paid': return `<i data-lucide="clock" class="w-3.5 h-3.5 mr-1"></i>`;
            case 'pending': return `<i data-lucide="clock" class="w-3.5 h-3.5 mr-1"></i>`;
            case 'cancelled': return `<i data-lucide="x-circle" class="w-3.5 h-3.5 mr-1"></i>`;
            case 'failed': return `<i data-lucide="alert-circle" class="w-3.5 h-3.5 mr-1"></i>`;
            default: return '';
        }
    }

    // === Logic Mapping ===
    mapCreditBatches(batches) {
        return batches.map(batch => {
            const expDate = new Date(batch.expiresAt);
            const now = new Date();
            const diffTime = Math.abs(expDate.getTime() - now.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return {
                credits: batch.remainingCredits,
                expiresDate: new Intl.DateTimeFormat('vi-VN').format(expDate),
                expiresIn: diffDays,
                packageName: batch.packageName
            };
        });
    }

    resolveActivePackageId(batch, packages, creditType) {
        if (!batch.isPaid || batch.remainingCredits <= 0) return null;
        
        const matchedByPaidId = packages.find(pkg => pkg.paidCreditPackageId === batch.packageId);
        if (matchedByPaidId) return matchedByPaidId.id;

        const normalizedName = batch.packageName.trim().toLowerCase();
        const matchedByName = packages.find(pkg => pkg.title.trim().toLowerCase() === normalizedName);
        if (matchedByName) return matchedByName.id;

        const durationMatch = batch.packageName.match(/(\d+)\s*ngày/i);
        if (durationMatch) {
            const packageId = `${creditType}-${durationMatch[1]}`;
            if (packages.some(pkg => pkg.id === packageId)) return packageId;
        }
        return null;
    }

    computeCreditTypePurchaseStatus(summary, packages, creditType) {
        if (!summary) return { pendingOrdersByPackageId: {} };

        const pendingOrdersByPackageId = {};
        if (summary.pendingOrders) {
            summary.pendingOrders.forEach((po) => {
                pendingOrdersByPackageId[po.packageId] = po;
            });
        }

        return { pendingOrdersByPackageId };
    }

    getPackagePurchaseState(packageIdNum, status) {
        if (status.pendingOrdersByPackageId && status.pendingOrdersByPackageId[packageIdNum]) {
            return 'pending';
        }
        return 'available';
    }

    postingFeatures(credits, durationDays, discountRate) {
        const savingsLine = discountRate > 0 ? `Tiết kiệm ${discountRate}% so với gói ngày` : null;
        const featuresByDuration = {
            1: [`${credits} credits đăng tin cơ bản`, 'Hiển thị sản phẩm trong 30 ngày', 'Liên hệ người mua qua chat/Zalo', 'Khả năng hiển thị tiêu chuẩn'],
            7: [`${credits} credits đăng tin cơ bản`, ...(savingsLine ? [savingsLine] : []), 'Tất cả tính năng Gói 1 Ngày'],
            30: [`${credits} credits đăng tin cơ bản`, ...(savingsLine ? [savingsLine] : []), 'Tất cả tính năng Gói 7 Ngày'],
        };
        return featuresByDuration[durationDays] || [`${credits} credits đăng tin cơ bản`];
    }

    featuredFeatures(credits, durationDays, discountRate, rewardBadge) {
        const savingsLine = discountRate > 0 ? `Tiết kiệm ${discountRate}% so với gói ngày` : null;
        const rewardBadgeLine = rewardBadge && rewardBadge.name ? `Badge cao cấp "${rewardBadge.name}"` : null;
        const featuresByDuration = {
            1: [`${credits} credits nổi bật`, 'Mở khóa upload video Shorts', 'Mở khóa hiển thị trên Banner', 'Hiển thị sản phẩm trong 60 ngày', 'Viền sản phẩm nổi bật', 'Xuất hiện trên BXH Tuần'],
            7: [`${credits} credits nổi bật`, ...(savingsLine ? [savingsLine] : []), 'Tất cả tính năng Gói 1 Ngày'],
            30: [`${credits} credits nổi bật`, ...(savingsLine ? [savingsLine] : []), ...(rewardBadgeLine ? [rewardBadgeLine] : []), 'Tất cả tính năng Gói 1 Ngày'],
        };
        return featuresByDuration[durationDays] || [`${credits} credits nổi bật`];
    }

    mapCreditPackages(packages) {
        const sorted = [...packages].sort((a, b) => {
            if (a.creditTypeName === b.creditTypeName) return a.durationDays - b.durationDays;
            return a.creditTypeName.toLowerCase() === 'posting' ? -1 : 1;
        });

        const posting = sorted.filter(p => p.creditTypeName.toLowerCase() === 'posting').map(pkg => ({
            id: `posting-${pkg.durationDays}`,
            paidCreditPackageId: pkg.paidCreditPackageId,
            title: pkg.name,
            price: pkg.discountedPrice,
            originalPrice: pkg.discountRate > 0 ? pkg.originalPrice : null,
            discountPercent: pkg.discountRate > 0 ? pkg.discountRate : null,
            credits: pkg.creditAmount,
            duration: pkg.durationDays,
            badge: this.postingPackageMeta[pkg.durationDays]?.badge || 'Gói',
            badgeColor: this.postingPackageMeta[pkg.durationDays]?.badgeColor || 'bg-gray-100 text-gray-800',
            features: (pkg.descriptions && pkg.descriptions.length > 0) ? pkg.descriptions : this.postingFeatures(pkg.creditAmount, pkg.durationDays, pkg.discountRate),
            cta: this.postingPackageMeta[pkg.durationDays]?.cta || 'Mua Ngay',
            tier: this.postingPackageMeta[pkg.durationDays]?.tier || pkg.durationDays,
        }));

        const featured = sorted.filter(p => p.creditTypeName.toLowerCase() === 'featured').map(pkg => ({
            id: `featured-${pkg.durationDays}`,
            paidCreditPackageId: pkg.paidCreditPackageId,
            title: pkg.name,
            price: pkg.discountedPrice,
            originalPrice: pkg.discountRate > 0 ? pkg.originalPrice : null,
            discountPercent: pkg.discountRate > 0 ? pkg.discountRate : null,
            credits: pkg.creditAmount,
            duration: pkg.durationDays,
            badge: this.featuredPackageMeta[pkg.durationDays]?.badge || 'Gói',
            badgeColor: this.featuredPackageMeta[pkg.durationDays]?.badgeColor || 'bg-gray-100 text-gray-800',
            features: (pkg.descriptions && pkg.descriptions.length > 0) ? pkg.descriptions : this.featuredFeatures(pkg.creditAmount, pkg.durationDays, pkg.discountRate, pkg.rewardBadge),
            cta: (pkg.rewardBadge && pkg.rewardBadge.name) ? `Mua Khóa ${pkg.rewardBadge.name}` : (this.featuredPackageMeta[pkg.durationDays]?.cta || 'Mua Ngay'),
            tier: this.featuredPackageMeta[pkg.durationDays]?.tier || pkg.durationDays,
        }));

        return { posting, featured };
    }

    // === Render Functions ===
    renderCreditDisplay(type, batches, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const totalCredits = batches.reduce((sum, b) => sum + b.credits, 0);
        const iconName = type === 'posting' ? 'image' : 'sparkles';
        const bgColor = type === 'posting' ? 'bg-blue-50' : 'bg-orange-50';
        const textColor = type === 'posting' ? 'text-blue-600' : 'text-orange-600';
        const borderColor = type === 'posting' ? 'border-blue-200' : 'border-orange-200';
        const label = type === 'posting' ? 'Đăng Tin' : 'Nổi Bật';

        let batchesHtml = '';
        if (batches.length > 0) {
            batchesHtml = batches.map(b => `
                <div class="flex justify-between items-start text-xs border-b border-gray-100 pb-2 last:border-0 mb-2 last:mb-0">
                    <div>
                        <div class="font-bold ${textColor}">${b.credits} credits</div>
                        ${b.packageName ? `<div class="text-gray-500">${b.packageName}</div>` : ''}
                    </div>
                    <div class="text-right">
                        <div class="text-gray-600">HSD: ${b.expiresDate}</div>
                        ${b.expiresIn !== undefined ? `<div class="text-orange-500">Còn ${b.expiresIn} ngày</div>` : ''}
                    </div>
                </div>
            `).join('');
        }

        container.innerHTML = `
            <div class="flex items-center justify-between ${bgColor} ${borderColor} border-2 rounded-xl px-4 py-3">
                <div class="flex items-center gap-3">
                    <i data-lucide="${iconName}" class="w-6 h-6 ${textColor}"></i>
                    <div>
                        <div class="text-sm text-gray-600">${label}</div>
                        <div class="text-2xl font-bold ${textColor}">${totalCredits}</div>
                    </div>
                </div>
                <div class="relative group">
                    <i data-lucide="info" class="w-5 h-5 ${textColor} cursor-help"></i>
                    ${batches.length > 0 ? `
                        <div class="absolute right-0 top-8 w-64 bg-white rounded-xl shadow-xl border-2 border-gray-200 p-4 z-50 hidden group-hover:block">
                            <div class="text-sm font-medium text-gray-900 mb-3">Chi Tiết Credits</div>
                            <div class="space-y-2">
                                ${batchesHtml}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons({ root: container });
    }

    renderPackages(containerId, packages, variant, purchaseStatus, isAnyLoading) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (this.state.isPackageLoading) {
            container.innerHTML = `<div class="md:col-span-3 bg-white rounded-3xl border border-dashed border-gray-300 p-10 text-center text-gray-500">Đang tải danh sách gói credits...</div>`;
            return;
        }

        if (this.state.packageError) {
            container.innerHTML = `<div class="md:col-span-3 bg-red-50 text-red-600 rounded-3xl p-10 text-center">${this.state.packageError}</div>`;
            return;
        }

        if (packages.length === 0) {
            container.innerHTML = `<div class="md:col-span-3 bg-gray-50 text-gray-500 rounded-3xl p-10 text-center">Không có gói nào khả dụng</div>`;
            return;
        }

        container.innerHTML = packages.map(pkg => {
            const purchaseState = this.getPackagePurchaseState(pkg.paidCreditPackageId, purchaseStatus);
            
            const isPremium = pkg.tier === 3;
            let containerClasses = "relative bg-white rounded-2xl border transition-all duration-300";
            let innerStyle = "";
            let sparklesHtml = "";
            let ribbonHtml = "";
            let titleColorClass = "text-gray-900";
            let badgeBgClass = pkg.badgeColor;
            let priceColorClass = "text-gray-900";
            let originalPriceColorClass = "text-gray-400";
            let creditBgClass = "bg-gray-50";
            let creditTextColorClass = "text-gray-900";
            let creditLabelColorClass = "text-gray-500";
            let checkIconBgClass = "bg-green-100";
            let checkIconColorClass = "text-green-600";
            let featureTextColorClass = "text-gray-600";

            if (isPremium) {
                containerClasses += " transform hover:-translate-y-2 hover:shadow-2xl z-10 scale-[1.02] md:-mx-2 shadow-xl";
                if (variant === 'posting') {
                    innerStyle = "background: linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%);";
                    containerClasses += " border-blue-200 ring-2 ring-blue-500 ring-offset-2";
                    badgeBgClass = "bg-blue-600 text-white shadow-md";
                    titleColorClass = "text-blue-900";
                    priceColorClass = "text-blue-600";
                    originalPriceColorClass = "text-blue-300";
                    creditBgClass = "bg-blue-600";
                    creditTextColorClass = "text-white";
                    creditLabelColorClass = "text-blue-100";
                    ribbonHtml = `
                        <div class="absolute -top-4 -right-4 z-20">
                            <div class="bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider py-1 px-3 rounded-full shadow-lg border border-blue-400 transform rotate-12">
                                BEST SELLER
                            </div>
                        </div>
                    `;
                    checkIconBgClass = 'bg-blue-100';
                    checkIconColorClass = 'text-blue-600';
                    featureTextColorClass = 'text-blue-900/80';
                } else {
                    innerStyle = "background: linear-gradient(180deg, #fff5f0 0%, #ffffff 100%);";
                    containerClasses += " border-orange-200 ring-2 ring-[#C4603A] ring-offset-2";
                    badgeBgClass = "bg-[#C4603A] text-white shadow-md";
                    titleColorClass = "text-[#8a3e20]";
                    priceColorClass = "text-[#C4603A]";
                    originalPriceColorClass = "text-[#e8a38a]";
                    creditBgClass = "bg-[#C4603A]";
                    creditTextColorClass = "text-white";
                    creditLabelColorClass = "text-orange-100";
                    ribbonHtml = `
                        <div class="absolute -top-4 -right-4 z-20">
                            <div class="bg-[#C4603A] text-white text-[10px] font-black uppercase tracking-wider py-1 px-3 rounded-full shadow-lg border border-orange-400 transform rotate-12">
                                VIP
                            </div>
                        </div>
                    `;
                    checkIconBgClass = 'bg-orange-100';
                    checkIconColorClass = 'text-orange-600';
                    featureTextColorClass = 'text-[#8a3e20]/80';
                }
            } else {
                containerClasses += " hover:shadow-xl hover:-translate-y-1 border-gray-200";
                if (variant === 'posting') {
                    checkIconBgClass = 'bg-blue-100';
                    checkIconColorClass = 'text-blue-600';
                    featureTextColorClass = 'text-gray-600';
                } else {
                    checkIconBgClass = 'bg-orange-100';
                    checkIconColorClass = 'text-orange-600';
                    featureTextColorClass = 'text-gray-600';
                }
            }

            const featuresHtml = pkg.features.map(f => `
                <li class="flex items-start gap-2.5">
                    <div class="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 mt-px ${checkIconBgClass}">
                        <i data-lucide="check" class="w-2.5 h-2.5 ${checkIconColorClass}"></i>
                    </div>
                    <span class="text-sm leading-snug ${featureTextColorClass}">${f}</span>
                </li>
            `).join('');

            let buttonHtml = '';
            if (purchaseState === 'pending') {
                const po = purchaseStatus.pendingOrdersByPackageId[pkg.paidCreditPackageId];
                let formattedTime = '';
                if (po && po.expiredAt) {
                    const utcExpiredAt = po.expiredAt.endsWith('Z') ? po.expiredAt : `${po.expiredAt}Z`;
                    formattedTime = new Date(utcExpiredAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                }
                const btnClass = variant === 'posting' 
                    ? 'w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl font-bold hover:shadow-lg transition-all'
                    : 'w-full bg-gradient-to-r from-[#C4603A] to-[#d4724a] text-white py-3.5 rounded-xl font-bold hover:shadow-lg transition-all';
                buttonHtml = `
                    <div class="flex flex-col items-center">
                        <button type="button" onclick="window.location.href='${po.checkoutUrl}'" class="${btnClass}">Tiếp tục thanh toán</button>
                        ${formattedTime ? `<div class="mt-3 text-red-500 text-sm font-semibold">Hết hạn vào ${formattedTime}</div>` : ''}
                    </div>
                `;
            } else if (isAnyLoading) {
                const bgDisabled = isPremium ? 'bg-white/20 text-white/50' : (variant === 'posting' ? 'bg-blue-300 text-white' : 'bg-[#C4603A]/50 text-white');
                const isThisLoading = this.state.loadingPackageId === pkg.paidCreditPackageId;
                buttonHtml = `
                    <button disabled class="w-full py-3.5 rounded-xl font-semibold flex items-center justify-center transition-all ${bgDisabled} cursor-not-allowed">
                        ${isThisLoading ? `<span class="flex items-center space-x-2"><span>Đang Xử Lý...</span></span>` : pkg.cta}
                    </button>
                `;
            } else {
                const btnClass = isPremium
                  ? (variant === 'posting' ? 'w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 py-3.5 rounded-xl font-bold transition-all relative overflow-hidden group' : 'w-full bg-[#C4603A] hover:bg-[#d4724a] text-white shadow-lg shadow-[#C4603A]/30 py-3.5 rounded-xl font-bold transition-all relative overflow-hidden group')
                  : (variant === 'posting' ? 'w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 py-3.5 rounded-xl font-bold transition-all relative overflow-hidden group' : 'w-full bg-[#C4603A] hover:bg-[#9a4b2d] text-white shadow-md shadow-orange-200 py-3.5 rounded-xl font-bold transition-all relative overflow-hidden group');
                  
                buttonHtml = `
                    <button type="button" onclick="window.plansManager.handleSelectPackage(${pkg.paidCreditPackageId})" class="${btnClass}">
                        <span class="relative z-10 flex items-center justify-center gap-2">
                            ${pkg.cta}
                            ${isPremium ? `<i data-lucide="sparkles" class="w-4 h-4"></i>` : ''}
                        </span>
                    </button>
                `;
            }

            return `
                <div class="${containerClasses}">
                    <div class="relative h-full rounded-[14px]" style="${innerStyle}">
                        ${sparklesHtml}
                        ${ribbonHtml}
                        <div class="p-7">
                            <div class="flex items-start justify-between mb-5">
                                <span class="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${badgeBgClass}">
                                    ${pkg.badge}
                                </span>
                                ${pkg.discountPercent ? `
                                    <span class="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                                        -${pkg.discountPercent}%
                                    </span>
                                ` : ''}
                            </div>
                            <h3 class="text-xl font-bold mb-3 ${titleColorClass}">
                                ${pkg.title}
                            </h3>
                            <div class="mb-5">
                                <span class="text-[32px] font-black leading-none ${priceColorClass}">
                                    ${pkg.price.toLocaleString('vi-VN')}đ
                                </span>
                                ${pkg.originalPrice ? `
                                    <div class="mt-1">
                                        <span class="text-sm line-through ${originalPriceColorClass}">
                                            ${pkg.originalPrice.toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="rounded-xl p-4 mb-5 text-center ${creditBgClass}">
                                <div class="text-4xl font-black tabular-nums ${creditTextColorClass}">
                                    ${pkg.credits}
                                </div>
                                <div class="text-xs font-medium mt-0.5 ${creditLabelColorClass}">
                                    Credits ${variant === 'posting' ? 'Đăng Tin' : 'Nổi Bật'}
                                </div>
                            </div>
                            <ul class="space-y-2.5 mb-6">
                                ${featuresHtml}
                            </ul>
                            ${buttonHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        if (window.lucide) lucide.createIcons({ root: container });
    }

    renderTransactions() {
        const container = document.getElementById('transactions-container');
        if (!container) return;

        if (this.state.isTransactionsLoading) {
            container.innerHTML = `<div class="text-center py-16 text-gray-500">Đang tải lịch sử giao dịch...</div>`;
            return;
        }

        if (this.state.transactionsError) {
            document.getElementById('transactions-error').textContent = this.state.transactionsError;
            document.getElementById('transactions-error').classList.remove('hidden');
        }

        if (this.state.transactions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16">
                    <i data-lucide="history" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Chưa có giao dịch nào</h3>
                    <p class="text-gray-500 text-sm">Lịch sử mua gói của bạn sẽ hiển thị tại đây</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons({ root: container });
            return;
        }

        container.innerHTML = this.state.transactions.map(tx => {
            const iconBg = tx.packageType === 'posting' ? 'bg-blue-50' : 'bg-orange-50';
            const iconColor = tx.packageType === 'posting' ? 'text-blue-600' : 'text-orange-600';
            const iconName = tx.packageType === 'posting' ? 'image' : 'sparkles';
            const statusClass = this.getTransactionStatusClass(tx.status);
            const statusIconHtml = this.getTransactionStatusIconHTML(tx.status);
            const displayCredit = (tx.status === 'completed' || tx.status === 'late_paid') ? tx.creditsGranted : tx.credits;

            return `
                <div class="p-6 sm:px-8 hover:bg-gray-50/80 transition-colors">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0">
                                <i data-lucide="${iconName}" class="w-6 h-6 ${iconColor}"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-gray-900 text-base mb-1">
                                    ${tx.packageName}
                                </h4>
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                                    <span class="font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded text-xs">${tx.orderCode}</span>
                                    <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${tx.date}</span>
                                    <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i> ${tx.time}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pl-16 sm:pl-0">
                            <div class="text-right">
                                <div class="font-bold text-gray-900">${(tx.receivedAmount || tx.expectedAmount).toLocaleString('vi-VN')}đ</div>
                                <div class="text-sm font-medium ${tx.packageType === 'posting' ? 'text-blue-600' : 'text-[#2D5A3D]'}">
                                    +${displayCredit} credits
                                </div>
                            </div>
                            <div class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${statusClass}">
                                ${statusIconHtml}
                                ${tx.statusLabel}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        if (window.lucide) lucide.createIcons({ root: container });

        const totalSuccess = this.state.transactions.filter(t => t.status === 'completed' || t.status === 'late_paid');
        const sumSpent = totalSuccess.reduce((sum, t) => sum + (t.receivedAmount || t.expectedAmount), 0);
        const sumCredits = totalSuccess.reduce((sum, t) => sum + (t.creditsGranted || 0), 0);
        
        document.getElementById('summary-total').textContent = this.state.transactions.length;
        document.getElementById('summary-success').textContent = totalSuccess.length;
        document.getElementById('summary-spent').textContent = sumSpent.toLocaleString('vi-VN') + 'đ';
        document.getElementById('summary-credits').textContent = sumCredits + ' credits';
        document.getElementById('transactions-summary').classList.remove('hidden');
    }

    updateUI() {
        const { activeTab } = this.state;
        const packagesContent = document.getElementById('tab-packages-content');
        const historyContent = document.getElementById('tab-history-content');

        if (activeTab === 'packages') {
            packagesContent?.classList.remove('hidden');
            historyContent?.classList.add('hidden');
            this.renderPackagesTabUI();
        } else {
            packagesContent?.classList.add('hidden');
            historyContent?.classList.remove('hidden');
            document.getElementById('tab-history-btn').className = 'flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all bg-[#2D5A3D] text-white shadow-lg';
            document.getElementById('tab-packages-btn').className = 'flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-600 hover:bg-gray-50';
            this.renderTransactions();
        }

        const loadingEl = document.getElementById('global-checkout-loading');
        if (this.state.isCheckoutLoading) {
            loadingEl?.classList.remove('hidden');
            loadingEl?.classList.add('flex');
        } else {
            loadingEl?.classList.add('hidden');
            loadingEl?.classList.remove('flex');
        }
    }

    renderPackagesTabUI() {
        const tabPackagesBtn = document.getElementById('tab-packages-btn');
        const tabHistoryBtn = document.getElementById('tab-history-btn');
        if (tabPackagesBtn) tabPackagesBtn.className = 'flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all bg-[#2D5A3D] text-white shadow-lg';
        if (tabHistoryBtn) tabHistoryBtn.className = 'flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-600 hover:bg-gray-50';

        if (this.state.creditError) {
            const errEl = document.getElementById('credit-error-msg');
            if (errEl) {
                errEl.textContent = this.state.creditError;
                errEl.classList.remove('hidden');
            }
        }

        if (!this.state.isCreditLoading) {
            this.renderCreditDisplay('posting', this.state.userCreditBatches.posting, 'posting-credit-display');
            this.renderCreditDisplay('featured', this.state.userCreditBatches.featured, 'featured-credit-display');
        }

        if (this.state.creditSummaries.posting && this.state.creditSummaries.posting.purchaseBlockReason) {
            document.getElementById('posting-block-reason').textContent = this.state.creditSummaries.posting.purchaseBlockReason;
            document.getElementById('posting-purchase-block').classList.remove('hidden');
        } else {
            document.getElementById('posting-purchase-block')?.classList.add('hidden');
        }

        if (this.state.creditSummaries.featured && this.state.creditSummaries.featured.purchaseBlockReason) {
            document.getElementById('featured-block-reason').textContent = this.state.creditSummaries.featured.purchaseBlockReason;
            document.getElementById('featured-purchase-block').classList.remove('hidden');
        } else {
            document.getElementById('featured-purchase-block')?.classList.add('hidden');
        }

        const { posting, featured } = this.mapCreditPackages(this.state.creditPackages);
        const postingStatus = this.computeCreditTypePurchaseStatus(this.state.creditSummaries.posting, posting, 'posting');
        const featuredStatus = this.computeCreditTypePurchaseStatus(this.state.creditSummaries.featured, featured, 'featured');

        this.renderPackages('posting-packages-container', posting, 'posting', postingStatus, this.state.isCheckoutLoading);
        this.renderPackages('featured-packages-container', featured, 'featured', featuredStatus, this.state.isCheckoutLoading);
    }

    // === API Calls ===
    async loadCreditBatches() {
        this.state.isCreditLoading = true;
        this.state.creditError = null;
        this.updateUI();

        try {
            const [postRes, featRes] = await Promise.all([
                fetch('/Plans/GetCreditSummary?creditTypeName=Posting'),
                fetch('/Plans/GetCreditSummary?creditTypeName=Featured')
            ]);
            
            const postData = await postRes.json();
            const featData = await featRes.json();

            this.state.creditSummaries.posting = postData.success ? postData.data : null;
            this.state.creditSummaries.featured = featData.success ? featData.data : null;

            this.state.userCreditBatches.posting = this.state.creditSummaries.posting ? this.mapCreditBatches(this.state.creditSummaries.posting.batches) : [];
            this.state.userCreditBatches.featured = this.state.creditSummaries.featured ? this.mapCreditBatches(this.state.creditSummaries.featured.batches) : [];

            if (!postData.success || !featData.success) {
                this.state.creditError = 'Không tải được một số credit hiện tại.';
            }
        } catch (err) {
            this.state.creditError = 'Lỗi kết nối khi tải credits.';
        } finally {
            this.state.isCreditLoading = false;
            this.updateUI();
        }
    }

    async loadCreditPackages() {
        this.state.isPackageLoading = true;
        this.state.packageError = null;
        this.updateUI();

        try {
            const res = await fetch('/Plans/GetActivePackages');
            const data = await res.json();
            if (data.success) {
                this.state.creditPackages = data.data || [];
            } else {
                this.state.packageError = 'Không tải được danh sách gói credits hiện tại.';
            }
        } catch (err) {
            this.state.packageError = 'Lỗi kết nối khi tải danh sách gói.';
        } finally {
            this.state.isPackageLoading = false;
            this.updateUI();
        }
    }

    async loadTransactions() {
        this.state.isTransactionsLoading = true;
        this.state.transactionsError = null;
        this.updateUI();

        try {
            const res = await fetch('/Plans/GetTransactions');
            const data = await res.json();
            if (data.success) {
                const txs = data.data || [];
                this.state.transactions = [...txs].sort((a, b) => new Date(b.transactionAt) - new Date(a.transactionAt)).map(tx => {
                    const { date, time } = this.formatTransactionDateTime(tx.transactionAt);
                    return {
                        id: tx.orderId,
                        orderCode: tx.orderCode,
                        transactionCode: tx.transactionCode,
                        date, time,
                        packageName: tx.packageName,
                        packageType: tx.creditTypeName.toLowerCase() === 'featured' ? 'featured' : 'posting',
                        creditTypeDisplayName: tx.creditTypeDisplayName,
                        credits: tx.creditAmount,
                        expectedAmount: tx.expectedAmount,
                        receivedAmount: tx.receivedAmount,
                        paymentMethod: tx.paymentMethod,
                        status: this.mapPaymentStatus(tx.paymentStatus, tx.createdAt, tx.paidAt),
                        statusLabel: tx.paymentStatusLabel,
                        creditsGranted: tx.creditsGranted,
                        paidAt: tx.paidAt,
                    };
                });
            } else {
                this.state.transactionsError = 'Không tải được lịch sử giao dịch.';
            }
        } catch (err) {
            this.state.transactionsError = 'Lỗi kết nối khi tải lịch sử.';
        } finally {
            this.state.isTransactionsLoading = false;
            this.updateUI();
        }
    }

    async handleSelectPackage(packageId) {
        if (this.state.isCheckoutLoading) return;
        this.state.isCheckoutLoading = true;
        this.state.loadingPackageId = packageId;
        
        document.getElementById('checkout-error-msg')?.classList.add('hidden');
        this.updateUI();

        try {
            const response = await fetch('/Plans/Checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId })
            });
            const data = await response.json();
            
            if (data.success && data.data) {
                sessionStorage.setItem("lastOrderCode", data.data.orderCode);
                setTimeout(() => {
                    window.location.href = data.data.paymentUrl;
                }, 1500);
            } else {
                const errMsgEl = document.getElementById('checkout-error-text');
                if (errMsgEl) errMsgEl.textContent = data.message || 'Có lỗi xảy ra khi tạo thanh toán.';
                document.getElementById('checkout-error-msg')?.classList.remove('hidden');
                this.state.isCheckoutLoading = false;
                this.state.loadingPackageId = null;
                this.updateUI();
            }
        } catch (err) {
            const errMsgEl = document.getElementById('checkout-error-text');
            if (errMsgEl) errMsgEl.textContent = 'Không thể kết nối đến máy chủ thanh toán. Vui lòng thử lại sau.';
            document.getElementById('checkout-error-msg')?.classList.remove('hidden');
            this.state.isCheckoutLoading = false;
            this.state.loadingPackageId = null;
            this.updateUI();
        }
    }

    // === Event Listeners via Methods ===
    switchTab(tab) {
        if (this.state.activeTab === tab) return;
        this.state.activeTab = tab;
        this.updateUI();
        if (tab === 'packages') {
            this.loadCreditBatches();
        } else {
            this.loadTransactions();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.plansManager = new PlansManager();
});
