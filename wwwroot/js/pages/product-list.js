class ProductListManager {
    constructor() {
        this.UI = {
            filterForm: document.getElementById('filterForm'),
            pageNumber: document.getElementById('pageNumber'),
            minPrice: document.getElementById('minPrice'),
            maxPrice: document.getElementById('maxPrice'),
            viewModeInput: document.getElementById('viewMode'),
            productContainer: document.getElementById('productContainer'),
            btnGridMode: document.getElementById('btnGridMode'),
            btnListMode: document.getElementById('btnListMode'),
            filtersSidebar: document.getElementById('filtersSidebar'),
            filterBtnText: document.getElementById('filterBtnText')
        };
    }

    init() {
        // Initialize view mode from localStorage
        const savedMode = localStorage.getItem('revora_view_mode') || 'grid';
        this.setViewMode(savedMode);
    }

    resetPageAndSubmit() {
        if (this.UI.pageNumber) this.UI.pageNumber.value = 1;
        if (this.UI.filterForm) this.UI.filterForm.submit();
    }

    changePage(page) {
        if (this.UI.pageNumber) this.UI.pageNumber.value = page;
        if (this.UI.filterForm) this.UI.filterForm.submit();
    }

    setPriceRange(min, max) {
        if (this.UI.minPrice) this.UI.minPrice.value = min;
        if (this.UI.maxPrice) this.UI.maxPrice.value = max;
        this.resetPageAndSubmit();
    }

    toggleFilters() {
        if (!this.UI.filtersSidebar || !this.UI.filterBtnText) return;
        
        if (this.UI.filtersSidebar.classList.contains('hidden')) {
            this.UI.filtersSidebar.classList.remove('hidden');
            this.UI.filterBtnText.innerText = 'Ẩn Bộ Lọc';
        } else {
            this.UI.filtersSidebar.classList.add('hidden');
            this.UI.filterBtnText.innerText = 'Hiện Bộ Lọc';
        }
    }

    setViewMode(mode) {
        if (!this.UI.viewModeInput) return;
        
        this.UI.viewModeInput.value = mode;
        localStorage.setItem('revora_view_mode', mode);
        
        if (!this.UI.productContainer || !this.UI.btnGridMode || !this.UI.btnListMode) return;
        
        if (mode === 'grid') {
            this.UI.productContainer.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 view-grid';
            this.UI.btnGridMode.className = 'p-2 rounded-lg transition-colors bg-[#2D5A3D]/10 text-[#2D5A3D]';
            this.UI.btnListMode.className = 'p-2 rounded-lg transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-50';
        } else {
            this.UI.productContainer.className = 'space-y-4 view-list';
            this.UI.btnGridMode.className = 'p-2 rounded-lg transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-50';
            this.UI.btnListMode.className = 'p-2 rounded-lg transition-colors bg-[#2D5A3D]/10 text-[#2D5A3D]';
        }
    }
}

// Global instance to allow inline HTML onclick calls
window.productListManager = new ProductListManager();

document.addEventListener("DOMContentLoaded", () => {
    window.productListManager.init();
});
