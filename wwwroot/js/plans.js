document.addEventListener('DOMContentLoaded', () => {
    // === State ===
    let activeTab = 'packages';
    let creditPackages = [];
    let userCreditBatches = { posting: [], featured: [] };
    let creditSummaries = { posting: null, featured: null };
    let transactions = [];
    
    let isCreditLoading = true;
    let isPackageLoading = true;
    let isTransactionsLoading = false;
    let isCheckoutLoading = false;
    let loadingPackageId = null;

    let creditError = null;
    let packageError = null;
    let transactionsError = null;

    // === Constants & Meta ===
    const postingPackageMeta = {
        1: { badge: 'Cơ bản', badgeColor: 'bg-blue-100 text-blue-800', cta: 'Mua Ngay', tier: 1 },
        7: { badge: 'Phổ Biến', badgeColor: 'bg-purple-100 text-purple-800', cta: 'Chọn Gói', tier: 2 },
        30: { badge: 'Tiết Kiệm Nhất', badgeColor: 'bg-green-100 text-green-800', cta: 'Nhận Gói', tier: 3 },
    };

    const featuredPackageMeta = {
        1: { badge: 'Tăng Tốc Nhanh', badgeColor: 'bg-orange-100 text-orange-800', cta: 'Tăng Tốc', tier: 1 },
        7: { badge: 'Được Đề Xuất', badgeColor: 'bg-pink-100 text-pink-800', cta: 'Nâng Cấp', tier: 2 },
        30: { badge: 'Tối Ưu Cao Cấp', badgeColor: 'bg-yellow-100 text-yellow-800', cta: 'Mở Khóa', tier: 3 },
    };

    // === Helpers ===
    const formatTransactionDateTime = (isoDate) => {
        const date = new Date(isoDate);
        return {
            date: new Intl.DateTimeFormat('vi-VN').format(date),
            time: new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date),
        };
    };

    const mapPaymentStatus = (paymentStatus, createdAt, paidAt) => {
        const normalized = String(paymentStatus).trim().toLowerCase();
        if (normalized === '2' || normalized === 'successful' || normalized === 'success') {
            if (paidAt) {
                const createdDate = new Date(createdAt);
                const paidDate = new Date(paidAt);
                const diffMinutes = (paidDate.getTime() - createdDate.getTime()) / (1000 * 60);
                if (diffMinutes > 15) return 'late_paid';
            }
            return 'completed';
        }
        if (normalized === '1' || normalized === 'pending' || normalized === 'processing') return 'pending';
        if (normalized === '5' || normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
        return 'failed';
    };

    const getTransactionStatusClass = (status) => {
        switch (status) {
            case 'completed': return 'bg-emerald-50 text-emerald-700';
            case 'late_paid': return 'bg-amber-50 text-amber-700 border border-amber-200';
            case 'pending': return 'bg-blue-50 text-blue-700';
            case 'cancelled': return 'bg-gray-100 text-gray-600 opacity-80';
            case 'failed': return 'bg-red-50 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getTransactionStatusIconHTML = (status) => {
        switch (status) {
            case 'completed': return `<i data-lucide="check-circle" class="w-3.5 h-3.5 mr-1"></i>`;
            case 'late_paid': return `<i data-lucide="clock" class="w-3.5 h-3.5 mr-1"></i>`;
            case 'pending': return `<i data-lucide="clock" class="w-3.5 h-3.5 mr-1"></i>`;
            case 'cancelled': return `<i data-lucide="x-circle" class="w-3.5 h-3.5 mr-1"></i>`;
            case 'failed': return `<i data-lucide="alert-circle" class="w-3.5 h-3.5 mr-1"></i>`;
            default: return '';
        }
    };

    // === Logic Mapping ===
    const mapCreditBatches = (batches) => {
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
    };

    const resolveActivePackageId = (batch, packages, creditType) => {
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
    };

    const computeCreditTypePurchaseStatus = (summary, packages, creditType) => {
        if (!summary) return { pendingOrdersByPackageId: {} };

        const pendingOrdersByPackageId = {};
        if (summary.pendingOrders) {
            summary.pendingOrders.forEach((po) => {
                pendingOrdersByPackageId[po.packageId] = po;
            });
        }

        return { pendingOrdersByPackageId };
    };

    const getPackagePurchaseState = (packageIdNum, status) => {
        if (status.pendingOrdersByPackageId && status.pendingOrdersByPackageId[packageIdNum]) {
            return 'pending';
        }
        return 'available';
    };

    const postingFeatures = (credits, durationDays, discountRate) => {
        const savingsLine = discountRate > 0 ? `Tiết kiệm ${discountRate}% so với gói ngày` : null;
        const featuresByDuration = {
            1: [`${credits} credits đăng tin cơ bản`, 'Hiển thị sản phẩm trong 30 ngày', 'Liên hệ người mua qua chat/Zalo', 'Khả năng hiển thị tiêu chuẩn'],
            7: [`${credits} credits đăng tin cơ bản`, ...(savingsLine ? [savingsLine] : []), 'Tất cả tính năng Gói 1 Ngày'],
            30: [`${credits} credits đăng tin cơ bản`, ...(savingsLine ? [savingsLine] : []), 'Tất cả tính năng Gói 7 Ngày'],
        };
        return featuresByDuration[durationDays] || [`${credits} credits đăng tin cơ bản`];
    };

    const featuredFeatures = (credits, durationDays, discountRate, rewardBadge) => {
        const savingsLine = discountRate > 0 ? `Tiết kiệm ${discountRate}% so với gói ngày` : null;
        const rewardBadgeLine = rewardBadge && rewardBadge.name ? `Badge cao cấp "${rewardBadge.name}"` : null;
        const featuresByDuration = {
            1: [`${credits} credits nổi bật`, 'Mở khóa upload video Shorts', 'Mở khóa hiển thị trên Banner', 'Hiển thị sản phẩm trong 60 ngày', 'Viền sản phẩm nổi bật', 'Xuất hiện trên BXH Tuần'],
            7: [`${credits} credits nổi bật`, ...(savingsLine ? [savingsLine] : []), 'Tất cả tính năng Gói 1 Ngày'],
            30: [`${credits} credits nổi bật`, ...(savingsLine ? [savingsLine] : []), ...(rewardBadgeLine ? [rewardBadgeLine] : []), 'Tất cả tính năng Gói 1 Ngày'],
        };
        return featuresByDuration[durationDays] || [`${credits} credits nổi bật`];
    };

    const mapCreditPackages = (packages) => {
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
            badge: postingPackageMeta[pkg.durationDays]?.badge || 'Gói',
            badgeColor: postingPackageMeta[pkg.durationDays]?.badgeColor || 'bg-gray-100 text-gray-800',
            features: (pkg.descriptions && pkg.descriptions.length > 0) ? pkg.descriptions : postingFeatures(pkg.creditAmount, pkg.durationDays, pkg.discountRate),
            cta: postingPackageMeta[pkg.durationDays]?.cta || 'Mở Khóa',
            tier: postingPackageMeta[pkg.durationDays]?.tier || pkg.durationDays,
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
            badge: featuredPackageMeta[pkg.durationDays]?.badge || 'Gói',
            badgeColor: featuredPackageMeta[pkg.durationDays]?.badgeColor || 'bg-gray-100 text-gray-800',
            features: (pkg.descriptions && pkg.descriptions.length > 0) ? pkg.descriptions : featuredFeatures(pkg.creditAmount, pkg.durationDays, pkg.discountRate, pkg.rewardBadge),
            cta: (pkg.rewardBadge && pkg.rewardBadge.name) ? `Mở Khóa ${pkg.rewardBadge.name}` : (featuredPackageMeta[pkg.durationDays]?.cta || 'Mở Khóa'),
            tier: featuredPackageMeta[pkg.durationDays]?.tier || pkg.durationDays,
        }));

        return { posting, featured };
    };

    // === Render Functions ===
    const renderCreditDisplay = (type, batches, containerId) => {
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
    };

    const renderPackages = (containerId, packages, variant, purchaseStatus, isAnyLoading) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (isPackageLoading) {
            container.innerHTML = `<div class="md:col-span-3 bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400 text-sm">Đang tải danh sách gói credits...</div>`;
            return;
        }

        if (packages.length === 0) {
            container.innerHTML = `<div class="md:col-span-3 bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400 text-sm">Chưa có gói đăng tin nào khả dụng.</div>`;
            return;
        }

        container.innerHTML = packages.map(pkg => {
            const purchaseState = getPackagePurchaseState(pkg.paidCreditPackageId, purchaseStatus);
            
            const isRecommended = pkg.tier === 2;
            const isPremium = pkg.tier === 3;
            
            let containerClasses = `relative rounded-2xl transition-all duration-300 p-[2px] ${purchaseState === 'available' ? 'hover:-translate-y-1' : 'opacity-90'} `;
            let innerStyle = '';
            let sparklesHtml = '';
            let ribbonHtml = '';
            
            let badgeBgClass = '';
            let titleColorClass = '';
            let priceColorClass = '';
            let originalPriceColorClass = '';
            let creditBgClass = '';
            let creditTextColorClass = '';
            let creditLabelColorClass = '';
            let checkIconBgClass = '';
            let checkIconColorClass = '';
            let featureTextColorClass = '';
            
            if (variant === 'posting') {
                if (isPremium) {
                    containerClasses += 'bg-gradient-to-br from-blue-400 via-blue-800 to-[#0f172a] shadow-2xl shadow-blue-800/40';
                    innerStyle = `background-image: radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.08) 1.5px, transparent 0), linear-gradient(145deg, #0f172a 0%, #1e3a8a 100%); background-size: 20px 20px, auto;`;
                    sparklesHtml = `
                        <i data-lucide="sparkles" class="absolute top-4 left-4 w-6 h-6 text-blue-300 opacity-90 animate-pulse z-10"></i>
                        <i data-lucide="sparkles" class="absolute bottom-6 right-6 w-8 h-8 text-blue-400 opacity-70 animate-pulse delay-150 z-10"></i>
                        <i data-lucide="sparkles" class="absolute top-1/3 -left-3 w-5 h-5 text-blue-200 opacity-80 animate-bounce delay-300 z-10"></i>
                        <i data-lucide="sparkles" class="absolute top-6 right-1/4 w-4 h-4 text-blue-300 opacity-60 animate-ping delay-700 z-10"></i>
                    `;
                    badgeBgClass = 'bg-white/15 text-blue-300';
                    titleColorClass = 'text-white';
                    priceColorClass = 'text-white';
                    originalPriceColorClass = 'text-white/40';
                    creditBgClass = 'bg-white/10 border border-white/15';
                    creditTextColorClass = 'text-blue-300';
                    creditLabelColorClass = 'text-white/55';
                    checkIconBgClass = 'bg-blue-400/20';
                    checkIconColorClass = 'text-blue-300';
                    featureTextColorClass = 'text-white/75';
                } else if (isRecommended) {
                    containerClasses += 'bg-gradient-to-br from-blue-300 via-blue-400 to-blue-600 shadow-xl shadow-blue-200';
                    innerStyle = `background: linear-gradient(145deg, #dbeafe 0%, #eff6ff 100%);`;
                    ribbonHtml = `
                        <div class="absolute -top-3.5 inset-x-0 flex justify-center z-10">
                            <span class="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-md uppercase tracking-widest whitespace-nowrap">
                                Phổ Biến
                            </span>
                        </div>
                    `;
                    badgeBgClass = pkg.badgeColor;
                    titleColorClass = 'text-gray-900';
                    priceColorClass = 'text-blue-600';
                    originalPriceColorClass = 'text-gray-400';
                    creditBgClass = 'bg-blue-50 border border-blue-100';
                    creditTextColorClass = 'text-blue-600';
                    creditLabelColorClass = 'text-gray-500';
                    checkIconBgClass = 'bg-green-100';
                    checkIconColorClass = 'text-green-600';
                    featureTextColorClass = 'text-gray-600';
                } else {
                    containerClasses += 'bg-transparent border border-blue-100 shadow-sm';
                    innerStyle = `background: linear-gradient(145deg, #f0f7ff 0%, #e8f3ff 100%);`;
                    badgeBgClass = pkg.badgeColor;
                    titleColorClass = 'text-gray-900';
                    priceColorClass = 'text-blue-600';
                    originalPriceColorClass = 'text-gray-400';
                    creditBgClass = 'bg-blue-50 border border-blue-100';
                    creditTextColorClass = 'text-blue-600';
                    creditLabelColorClass = 'text-gray-500';
                    checkIconBgClass = 'bg-green-100';
                    checkIconColorClass = 'text-green-600';
                    featureTextColorClass = 'text-gray-600';
                }
            } else {
                if (isPremium) {
                    containerClasses += 'bg-gradient-to-br from-[#fbd38d] via-[#C4603A] to-[#7b341e] shadow-2xl shadow-[#C4603A]/40';
                    innerStyle = `background-image: radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.08) 1.5px, transparent 0), linear-gradient(145deg, #1f0d08 0%, #3d1f12 100%); background-size: 20px 20px, auto;`;
                    sparklesHtml = `
                        <i data-lucide="sparkles" class="absolute top-4 right-4 w-6 h-6 text-yellow-300 opacity-90 animate-pulse z-10"></i>
                        <i data-lucide="sparkles" class="absolute bottom-6 left-6 w-8 h-8 text-yellow-400 opacity-70 animate-pulse delay-150 z-10"></i>
                        <i data-lucide="sparkles" class="absolute top-1/3 -right-3 w-5 h-5 text-yellow-200 opacity-80 animate-bounce delay-300 z-10"></i>
                        <i data-lucide="sparkles" class="absolute top-6 left-1/4 w-4 h-4 text-orange-300 opacity-60 animate-ping delay-700 z-10"></i>
                    `;
                    badgeBgClass = 'bg-white/15 text-orange-300';
                    titleColorClass = 'text-white';
                    priceColorClass = 'text-white';
                    originalPriceColorClass = 'text-white/40';
                    creditBgClass = 'bg-white/10 border border-white/15';
                    creditTextColorClass = 'text-orange-300';
                    creditLabelColorClass = 'text-white/55';
                    checkIconBgClass = 'bg-orange-400/20';
                    checkIconColorClass = 'text-orange-300';
                    featureTextColorClass = 'text-white/75';
                } else if (isRecommended) {
                    containerClasses += 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 shadow-xl shadow-orange-200';
                    innerStyle = `background: linear-gradient(145deg, #ffedd5 0%, #fff7ed 100%);`;
                    ribbonHtml = `
                        <div class="absolute -top-3.5 inset-x-0 flex justify-center z-10">
                            <span class="bg-gradient-to-r from-[#C4603A] to-[#d4724a] text-white text-[10px] font-black px-4 py-1 rounded-full shadow-md uppercase tracking-widest whitespace-nowrap">
                                Được Đề Xuất
                            </span>
                        </div>
                    `;
                    badgeBgClass = pkg.badgeColor;
                    titleColorClass = 'text-gray-900';
                    priceColorClass = 'text-[#C4603A]';
                    originalPriceColorClass = 'text-gray-400';
                    creditBgClass = 'bg-orange-50 border border-orange-100';
                    creditTextColorClass = 'text-[#C4603A]';
                    creditLabelColorClass = 'text-gray-500';
                    checkIconBgClass = 'bg-orange-100';
                    checkIconColorClass = 'text-orange-600';
                    featureTextColorClass = 'text-gray-600';
                } else {
                    containerClasses += 'bg-transparent border border-orange-100 shadow-sm';
                    innerStyle = `background: linear-gradient(145deg, #fff7f0 0%, #fff0e6 100%);`;
                    badgeBgClass = pkg.badgeColor;
                    titleColorClass = 'text-gray-900';
                    priceColorClass = 'text-[#C4603A]';
                    originalPriceColorClass = 'text-gray-400';
                    creditBgClass = 'bg-orange-50 border border-orange-100';
                    creditTextColorClass = 'text-[#C4603A]';
                    creditLabelColorClass = 'text-gray-500';
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
                const isThisLoading = loadingPackageId === pkg.paidCreditPackageId;
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
                    <button type="button" onclick="window.handleSelectPackage(${pkg.paidCreditPackageId})" class="${btnClass}">
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
    };

    const renderTransactions = () => {
        const container = document.getElementById('transactions-container');
        if (!container) return;

        if (isTransactionsLoading) {
            container.innerHTML = `<div class="text-center py-16 text-gray-500">Đang tải lịch sử giao dịch...</div>`;
            return;
        }

        if (transactionsError) {
            document.getElementById('transactions-error').textContent = transactionsError;
            document.getElementById('transactions-error').classList.remove('hidden');
        }

        if (transactions.length === 0) {
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

        container.innerHTML = transactions.map(tx => {
            const iconBg = tx.packageType === 'posting' ? 'bg-blue-50' : 'bg-orange-50';
            const iconColor = tx.packageType === 'posting' ? 'text-blue-600' : 'text-[#C4603A]';
            const badgeBg = tx.packageType === 'posting' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-[#C4603A]';
            const amountColor = tx.packageType === 'posting' ? 'text-blue-600' : 'text-[#C4603A]';
            
            const transactionAmount = tx.status === 'completed' || tx.status === 'late_paid' ? tx.receivedAmount : tx.expectedAmount;

            let latePaidHtml = '';
            if (tx.status === 'late_paid') {
                latePaidHtml = `<p class="text-xs text-amber-700/80 mb-2 mt-0.5 leading-snug">Bạn đã chuyển tiền sau khi mã QR hết hạn. Hệ thống đã linh động ghi nhận và cộng credits thành công.</p>`;
            }

            return `
                <div class="px-8 py-5 hover:bg-gray-50 transition-colors">
                    <div class="flex items-start justify-between gap-6">
                        <div class="flex items-start gap-4 min-w-0">
                            <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}">
                                <i data-lucide="trending-up" class="w-6 h-6 ${iconColor}"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="flex flex-wrap items-center gap-2 mb-1">
                                    <h3 class="font-semibold text-gray-900">${tx.packageName}</h3>
                                    <span class="text-xs px-2.5 py-1 rounded-full font-semibold ${badgeBg}">${tx.creditTypeDisplayName}</span>
                                    <span class="text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center ${getTransactionStatusClass(tx.status)}">
                                        ${getTransactionStatusIconHTML(tx.status)}
                                        ${tx.status === 'late_paid' ? 'Thanh toán trễ' : tx.statusLabel}
                                    </span>
                                    ${(tx.creditsGranted && tx.status !== 'late_paid') ? `<span class="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700">Đã cộng credits</span>` : ''}
                                </div>
                                ${latePaidHtml}
                                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                    <span class="flex items-center gap-1">
                                        <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                                        ${tx.date} ${tx.time}
                                    </span>
                                    <span>•</span>
                                    <span>Mã đơn: ${tx.orderCode}</span>
                                    <span>•</span>
                                    <span>Mã GD: ${tx.transactionCode}</span>
                                    <span>•</span>
                                    <span>${tx.paymentMethod}</span>
                                </div>
                                ${tx.paidAt ? `<p class="text-xs text-gray-400 mt-1">Thanh toán lúc: ${formatTransactionDateTime(tx.paidAt).date} ${formatTransactionDateTime(tx.paidAt).time}</p>` : ''}
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <div class="flex items-center gap-1 justify-end mb-1">
                                <i data-lucide="trending-down" class="w-4 h-4 text-red-500"></i>
                                <span class="text-lg font-bold text-red-600">-${transactionAmount.toLocaleString('vi-VN')}đ</span>
                            </div>
                            ${(tx.status === 'completed' && tx.expectedAmount !== tx.receivedAmount) ? `<p class="text-xs text-gray-400 mb-1">Dự kiến: ${tx.expectedAmount.toLocaleString('vi-VN')}đ</p>` : ''}
                            <div class="text-sm font-semibold ${amountColor}">+${tx.credits} credits</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        if (window.lucide) lucide.createIcons({ root: container });

        // Update Summary
        const successfulTransactions = transactions.filter(tx => tx.status === 'completed');
        const totalSpent = successfulTransactions.reduce((sum, tx) => sum + tx.receivedAmount, 0);
        const totalCreditsPurchased = successfulTransactions.reduce((sum, tx) => sum + (tx.creditsGranted ? tx.credits : 0), 0);

        document.getElementById('summary-total').textContent = transactions.length;
        document.getElementById('summary-success').textContent = successfulTransactions.length;
        document.getElementById('summary-spent').textContent = `${totalSpent.toLocaleString('vi-VN')}đ`;
        document.getElementById('summary-credits').textContent = `${totalCreditsPurchased} credits`;
        document.getElementById('transactions-summary').classList.remove('hidden');
    };

    const updateUI = () => {
        // Tab display
        document.getElementById('tab-packages-content').classList.toggle('hidden', activeTab !== 'packages');
        document.getElementById('tab-history-content').classList.toggle('hidden', activeTab !== 'history');

        if (activeTab === 'packages') {
            document.getElementById('tab-packages-btn').className = 'flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all bg-[#2D5A3D] text-white shadow-lg';
            document.getElementById('tab-history-btn').className = 'flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-600 hover:bg-gray-50';

            // Credit Errors
            if (creditError) {
                document.getElementById('credit-error-msg').textContent = creditError;
                document.getElementById('credit-error-msg').classList.remove('hidden');
            } else {
                document.getElementById('credit-error-msg').classList.add('hidden');
            }

            renderCreditDisplay('posting', userCreditBatches.posting, 'posting-credit-display');
            renderCreditDisplay('featured', userCreditBatches.featured, 'featured-credit-display');

            // Package Errors & Blocks
            if (packageError) {
                document.getElementById('posting-package-error').textContent = packageError;
                document.getElementById('posting-package-error').classList.remove('hidden');
            } else {
                document.getElementById('posting-package-error').classList.add('hidden');
            }

            if (creditSummaries.posting && creditSummaries.posting.purchaseBlockReason) {
                document.getElementById('posting-block-reason').textContent = creditSummaries.posting.purchaseBlockReason;
                document.getElementById('posting-purchase-block').classList.remove('hidden');
            } else {
                document.getElementById('posting-purchase-block').classList.add('hidden');
            }

            if (creditSummaries.featured && creditSummaries.featured.purchaseBlockReason) {
                document.getElementById('featured-block-reason').textContent = creditSummaries.featured.purchaseBlockReason;
                document.getElementById('featured-purchase-block').classList.remove('hidden');
            } else {
                document.getElementById('featured-purchase-block').classList.add('hidden');
            }

            const { posting, featured } = mapCreditPackages(creditPackages);
            const postingStatus = computeCreditTypePurchaseStatus(creditSummaries.posting, posting, 'posting');
            const featuredStatus = computeCreditTypePurchaseStatus(creditSummaries.featured, featured, 'featured');

            renderPackages('posting-packages-container', posting, 'posting', postingStatus, isCheckoutLoading);
            renderPackages('featured-packages-container', featured, 'featured', featuredStatus, isCheckoutLoading);

        } else {
            document.getElementById('tab-history-btn').className = 'flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all bg-[#2D5A3D] text-white shadow-lg';
            document.getElementById('tab-packages-btn').className = 'flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all bg-white text-gray-600 hover:bg-gray-50';
            
            renderTransactions();
        }

        // Overlay Checkout
        const loadingEl = document.getElementById('global-checkout-loading');
        if (isCheckoutLoading) {
            loadingEl.classList.remove('hidden');
            loadingEl.classList.add('flex');
        } else {
            loadingEl.classList.add('hidden');
            loadingEl.classList.remove('flex');
        }
    };

    // === API Calls ===
    const loadCreditBatches = async () => {
        isCreditLoading = true;
        creditError = null;
        updateUI();

        try {
            const [postRes, featRes] = await Promise.all([
                fetch('/Plans/GetCreditSummary?creditTypeName=Posting'),
                fetch('/Plans/GetCreditSummary?creditTypeName=Featured')
            ]);
            
            const postData = await postRes.json();
            const featData = await featRes.json();

            creditSummaries.posting = postData.success ? postData.data : null;
            creditSummaries.featured = featData.success ? featData.data : null;

            userCreditBatches.posting = creditSummaries.posting ? mapCreditBatches(creditSummaries.posting.batches) : [];
            userCreditBatches.featured = creditSummaries.featured ? mapCreditBatches(creditSummaries.featured.batches) : [];

            if (!postData.success || !featData.success) {
                creditError = 'Không tải được một số credit hiện tại.';
            }
        } catch (err) {
            creditError = 'Lỗi kết nối khi tải credits.';
        } finally {
            isCreditLoading = false;
            updateUI();
        }
    };

    const loadCreditPackages = async () => {
        isPackageLoading = true;
        packageError = null;
        updateUI();

        try {
            const res = await fetch('/Plans/GetActivePackages');
            const data = await res.json();
            if (data.success) {
                creditPackages = data.data || [];
            } else {
                packageError = 'Không tải được danh sách gói credits hiện tại.';
            }
        } catch (err) {
            packageError = 'Lỗi kết nối khi tải danh sách gói.';
        } finally {
            isPackageLoading = false;
            updateUI();
        }
    };

    const loadTransactions = async () => {
        isTransactionsLoading = true;
        transactionsError = null;
        updateUI();

        try {
            const res = await fetch('/Plans/GetTransactions');
            const data = await res.json();
            if (data.success) {
                const txs = data.data || [];
                transactions = [...txs].sort((a, b) => new Date(b.transactionAt) - new Date(a.transactionAt)).map(tx => {
                    const { date, time } = formatTransactionDateTime(tx.transactionAt);
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
                        status: mapPaymentStatus(tx.paymentStatus, tx.createdAt, tx.paidAt),
                        statusLabel: tx.paymentStatusLabel,
                        creditsGranted: tx.creditsGranted,
                        paidAt: tx.paidAt,
                    };
                });
            } else {
                transactionsError = 'Không tải được lịch sử giao dịch.';
            }
        } catch (err) {
            transactionsError = 'Lỗi kết nối khi tải lịch sử.';
        } finally {
            isTransactionsLoading = false;
            updateUI();
        }
    };

    window.handleSelectPackage = async (packageId) => {
        if (isCheckoutLoading) return;
        isCheckoutLoading = true;
        loadingPackageId = packageId;
        
        document.getElementById('checkout-error-msg').classList.add('hidden');
        updateUI();

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
                document.getElementById('checkout-error-text').textContent = data.message || 'Có lỗi xảy ra khi tạo thanh toán.';
                document.getElementById('checkout-error-msg').classList.remove('hidden');
                isCheckoutLoading = false;
                loadingPackageId = null;
                updateUI();
            }
        } catch (err) {
            document.getElementById('checkout-error-text').textContent = 'Không thể kết nối đến máy chủ thanh toán. Vui lòng thử lại sau.';
            document.getElementById('checkout-error-msg').classList.remove('hidden');
            isCheckoutLoading = false;
            loadingPackageId = null;
            updateUI();
        }
    };

    // === Event Listeners ===
    document.getElementById('tab-packages-btn').addEventListener('click', () => {
        if (activeTab === 'packages') return;
        activeTab = 'packages';
        updateUI();
        loadCreditBatches();
    });

    document.getElementById('tab-history-btn').addEventListener('click', () => {
        if (activeTab === 'history') return;
        activeTab = 'history';
        updateUI();
        loadTransactions();
    });

    // === Init ===
    lucide.createIcons();
    loadCreditPackages().then(() => loadCreditBatches());
});
