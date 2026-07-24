class ProductCreateFormManager {
    constructor() {
        this.UI = {
            // Modals
            rulesModal: document.getElementById('rulesModal'),
            openRulesModal: document.getElementById('openRulesModal'),
            closeRulesModal: document.getElementById('closeRulesModal'),
            acceptRulesBtn: document.getElementById('acceptRulesBtn'),
            acceptRulesCheckbox: document.getElementById('acceptRules'),
            
            // Buttons
            submitBtn: document.getElementById('submitBtn'),
            
            // Images
            imagesInput: document.getElementById('Images'),
            imageUploadArea: document.getElementById('imageUploadArea'),
            imagePreviewContainer: document.getElementById('imagePreviewContainer'),
            imageCounter: document.getElementById('imageCounter'),
            existingFilesContainer: document.getElementById('existingFilesContainer'),
            imgUploadError: document.getElementById('imgUploadError'),
            
            // Video
            enableVideoUpload: document.getElementById('enableVideoUpload'),
            videoContainer: document.getElementById('videoContainer'),
            videoIconWrapper: document.getElementById('videoIconWrapper'),
            videoUploadSection: document.getElementById('videoUploadSection'),
            videoInput: document.getElementById('VideoFile'),
            videoPreviewArea: document.getElementById('videoPreviewArea'),
            videoUploadArea: document.getElementById('videoUploadArea'),
            videoPreview: document.getElementById('videoPreview'),
            removeVideoBtn: document.getElementById('removeVideoBtn'),
            vidUploadError: document.getElementById('vidUploadError'),
            
            // Banner
            enableBannerBoost: document.getElementById('enableBannerBoost'),
            bannerContainer: document.getElementById('bannerContainer'),
            bannerIconWrapper: document.getElementById('bannerIconWrapper'),
            bannerUploadSection: document.getElementById('bannerUploadSection'),
            bannerInput: document.getElementById('BannerFile'),
            bannerPreviewArea: document.getElementById('bannerPreviewArea'),
            bannerUploadArea: document.getElementById('bannerUploadArea'),
            bannerPreview: document.getElementById('bannerPreview'),
            removeBannerBtn: document.getElementById('removeBannerBtn'),
            banUploadError: document.getElementById('banUploadError'),
            
            // Form
            form: document.getElementById('createProductForm'),
            jsGlobalErrorSummary: document.getElementById('jsGlobalErrorSummary'),
            jsErrorList: document.getElementById('jsErrorList'),
            
            // Pricing
            realPrice: document.getElementById('realPrice'),
            displayPrice: document.getElementById('displayPrice'),
            priceText: document.getElementById('priceText')
        };
        
        this.state = {
            dataTransfer: new DataTransfer(),
            existingImages: window.existingImageUrls || [],
            totalPostingCredits: window.TOTAL_POSTING_CREDITS || 0,
            totalFeaturedCredits: window.TOTAL_FEATURED_CREDITS || 0
        };

        this.DOCSO = {
            chuSo: ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"],
            tien: ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"],
            doc3so: function (so) {
                let tram = Math.floor(so / 100);
                let chuc = Math.floor((so % 100) / 10);
                let donVi = so % 10;
                let ketQua = "";

                if (tram === 0 && chuc === 0 && donVi === 0) return "";
                if (tram !== 0) {
                    ketQua += this.chuSo[tram] + " trăm ";
                    if (chuc === 0 && donVi !== 0) ketQua += "linh ";
                }
                if (chuc !== 0 && chuc !== 1) {
                    ketQua += this.chuSo[chuc] + " mươi ";
                    if (chuc === 0 && donVi !== 0) ketQua += "linh ";
                }
                if (chuc === 1) ketQua += "mười ";
                switch (donVi) {
                    case 1:
                        if (chuc !== 0 && chuc !== 1) ketQua += "mốt ";
                        else ketQua += this.chuSo[donVi] + " ";
                        break;
                    case 5:
                        if (chuc === 0) ketQua += this.chuSo[donVi] + " ";
                        else ketQua += "lăm ";
                        break;
                    default:
                        if (donVi !== 0) ketQua += this.chuSo[donVi] + " ";
                        break;
                }
                return ketQua;
            },
            docTien: function (soTien) {
                if (soTien === 0) return "Không đồng";
                let ketQua = "";
                let viTri = 0;

                while (soTien > 0) {
                    let nhom3so = soTien % 1000;
                    soTien = Math.floor(soTien / 1000);

                    if (nhom3so > 0) {
                        let docNhom = this.doc3so(nhom3so);
                        if (docNhom.trim() !== "") {
                            ketQua = docNhom + this.tien[viTri] + " " + ketQua;
                        }
                    }
                    viTri++;
                }

                ketQua = ketQua.trim();
                ketQua = ketQua.replace(/ +/g, " ");
                ketQua = ketQua.charAt(0).toUpperCase() + ketQua.slice(1);
                return ketQua + " đồng";
            }
        };
    }

    init() {
        if (window.jQuery && window.jQuery.validator) {
            window.jQuery.validator.setDefaults({ ignore: "" });
        }

        this.bindEvents();
        this.updateCredits();
        this.checkSubmitStatus();

        if (window.EDIT_PRODUCT_ID && window.EDIT_PRODUCT_ID !== null) {
            this.fetchProductDetails(window.EDIT_PRODUCT_ID);
        }
    }

    bindEvents() {
        // Price Input
        if (this.UI.displayPrice) {
            this.UI.displayPrice.addEventListener('input', (e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val === '') {
                    this.UI.realPrice.value = '';
                    e.target.value = '';
                    this.UI.priceText.classList.add('hidden');
                    return;
                }
                
                const num = parseInt(val, 10);
                this.UI.realPrice.value = num;
                e.target.value = new Intl.NumberFormat('en-US').format(num);
                
                this.UI.priceText.textContent = this.DOCSO.docTien(num);
                this.UI.priceText.classList.remove('hidden');
            });
        }

        // Rules Modal
        if (this.UI.openRulesModal) {
            this.UI.openRulesModal.addEventListener('click', (e) => {
                e.preventDefault();
                this.UI.rulesModal.classList.remove('hidden');
            });

            this.UI.closeRulesModal.addEventListener('click', () => {
                this.UI.rulesModal.classList.add('hidden');
            });

            this.UI.acceptRulesBtn.addEventListener('click', () => {
                this.UI.acceptRulesCheckbox.checked = true;
                this.UI.rulesModal.classList.add('hidden');
                this.checkSubmitStatus();
            });

            this.UI.acceptRulesCheckbox.addEventListener('change', () => this.checkSubmitStatus());
        }

        // Images Drag & Drop
        if (this.UI.imageUploadArea) {
            this.UI.imageUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.UI.imageUploadArea.classList.add('border-[#2D5A3D]', 'bg-[#2D5A3D]/5');
            });
            this.UI.imageUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                this.UI.imageUploadArea.classList.remove('border-[#2D5A3D]', 'bg-[#2D5A3D]/5');
            });
            this.UI.imageUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.UI.imageUploadArea.classList.remove('border-[#2D5A3D]', 'bg-[#2D5A3D]/5');
                const droppedFiles = e.dataTransfer.files;
                if (droppedFiles.length > 0) this.handleImageFiles(droppedFiles);
            });
            this.UI.imagesInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) this.handleImageFiles(e.target.files);
            });
        }

        // Video
        if (this.UI.enableVideoUpload) {
            this.UI.enableVideoUpload.addEventListener('change', () => {
                this.updateCredits();
                if (this.UI.enableVideoUpload.checked) {
                    this.UI.videoContainer.classList.add('border-[#2D5A3D]', 'bg-[#2D5A3D]/[0.02]');
                    this.UI.videoContainer.classList.remove('border-gray-100');
                    this.UI.videoIconWrapper.classList.add('bg-[#2D5A3D]', 'text-white');
                    this.UI.videoIconWrapper.classList.remove('bg-gray-100', 'text-gray-400');
                    this.UI.videoUploadSection.classList.remove('hidden');
                } else {
                    this.UI.videoContainer.classList.remove('border-[#2D5A3D]', 'bg-[#2D5A3D]/[0.02]');
                    this.UI.videoContainer.classList.add('border-gray-100');
                    this.UI.videoIconWrapper.classList.remove('bg-[#2D5A3D]', 'text-white');
                    this.UI.videoIconWrapper.classList.add('bg-gray-100', 'text-gray-400');
                    this.UI.videoUploadSection.classList.add('hidden');
                    
                    this.UI.videoInput.value = '';
                    this.UI.videoPreview.src = '';
                    this.UI.videoPreviewArea.classList.add('hidden');
                    this.UI.videoUploadArea.classList.remove('hidden');
                }
            });

            this.UI.videoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (file.size > 30 * 1024 * 1024) {
                    Swal.fire({ icon: 'warning', title: 'File quá lớn', text: 'Dung lượng video không được vượt quá 30MB.' });
                    this.UI.videoInput.value = '';
                    return;
                }

                const videoElement = document.createElement('video');
                videoElement.preload = 'metadata';
                videoElement.onloadedmetadata = () => {
                    window.URL.revokeObjectURL(videoElement.src);
                    if (videoElement.duration > 61) {
                        Swal.fire({ icon: 'warning', title: 'Video quá dài', text: 'Video của bạn không được dài quá 1 phút (60 giây).' });
                        this.UI.videoInput.value = '';
                        return;
                    }
                    
                    this.UI.videoPreview.src = URL.createObjectURL(file);
                    this.UI.videoUploadArea.classList.add('hidden');
                    this.UI.videoPreviewArea.classList.remove('hidden');
                };
                videoElement.src = URL.createObjectURL(file);
            });

            this.UI.removeVideoBtn.addEventListener('click', () => {
                this.UI.videoInput.value = '';
                this.UI.videoPreview.src = '';
                this.UI.videoPreviewArea.classList.add('hidden');
                this.UI.videoUploadArea.classList.remove('hidden');
            });
        }

        // Banner
        if (this.UI.enableBannerBoost) {
            this.UI.enableBannerBoost.addEventListener('change', () => {
                this.updateCredits();
                if (this.UI.enableBannerBoost.checked) {
                    this.UI.bannerContainer.classList.add('border-orange-500', 'bg-orange-50/30');
                    this.UI.bannerContainer.classList.remove('border-gray-100');
                    this.UI.bannerIconWrapper.classList.add('bg-gradient-to-br', 'from-orange-400', 'to-orange-600', 'text-white');
                    this.UI.bannerIconWrapper.classList.remove('bg-gray-100', 'text-gray-400');
                    this.UI.bannerUploadSection.classList.remove('hidden');
                } else {
                    this.UI.bannerContainer.classList.remove('border-orange-500', 'bg-orange-50/30');
                    this.UI.bannerContainer.classList.add('border-gray-100');
                    this.UI.bannerIconWrapper.classList.remove('bg-gradient-to-br', 'from-orange-400', 'to-orange-600', 'text-white');
                    this.UI.bannerIconWrapper.classList.add('bg-gray-100', 'text-gray-400');
                    this.UI.bannerUploadSection.classList.add('hidden');
                    
                    this.UI.bannerInput.value = '';
                    this.UI.bannerPreview.src = '';
                    this.UI.bannerPreviewArea.classList.add('hidden');
                    this.UI.bannerUploadArea.classList.remove('hidden');
                }
            });

            this.UI.bannerInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                this.UI.bannerPreview.src = URL.createObjectURL(file);
                this.UI.bannerUploadArea.classList.add('hidden');
                this.UI.bannerPreviewArea.classList.remove('hidden');
            });

            this.UI.removeBannerBtn.addEventListener('click', () => {
                this.UI.bannerInput.value = '';
                this.UI.bannerPreview.src = '';
                this.UI.bannerPreviewArea.classList.add('hidden');
                this.UI.bannerUploadArea.classList.remove('hidden');
            });
        }

        // Form Submit
        if (this.UI.form) {
            this.UI.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    handleImageFiles(files) {
        const remainingSlots = 5 - (this.state.dataTransfer.items.length + this.state.existingImages.length);
        if (remainingSlots <= 0) {
            Swal.fire({ icon: 'warning', title: 'Tối đa 5 ảnh', text: 'Bạn chỉ có thể chọn tối đa 5 hình ảnh.' });
            return;
        }

        let addedCount = 0;
        Array.from(files).forEach(file => {
            if (addedCount < remainingSlots && file.type.startsWith('image/')) {
                this.state.dataTransfer.items.add(file);
                addedCount++;
            }
        });

        this.UI.imagesInput.files = this.state.dataTransfer.files;
        this.renderImagePreviews();
    }

    renderImagePreviews() {
        this.UI.imagePreviewContainer.innerHTML = '';
        
        let totalImages = 0;

        // Render existing
        this.state.existingImages.forEach((url, idx) => {
            totalImages++;
            const div = document.createElement('div');
            div.className = 'relative group aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm';
            
            const img = document.createElement('img');
            img.src = url;
            img.className = 'w-full h-full object-cover';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm text-red-500 p-1.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-sm';
            btn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
            
            btn.onclick = () => {
                this.state.existingImages.splice(idx, 1);
                this.renderImagePreviews();
            };

            div.appendChild(img);
            div.appendChild(btn);
            this.UI.imagePreviewContainer.appendChild(div);
        });

        // Render new
        Array.from(this.state.dataTransfer.files).forEach((file, i) => {
            totalImages++;
            const div = document.createElement('div');
            div.className = 'relative group aspect-square rounded-xl overflow-hidden border border-[#2D5A3D]/20 shadow-sm';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'w-full h-full object-cover';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'absolute top-1.5 right-1.5 bg-white/90 text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm';
            btn.innerHTML = '<i data-lucide="x" class="w-4 h-4"></i>';
            
            btn.onclick = () => {
                const newDataTransfer = new DataTransfer();
                for (let j = 0; j < this.state.dataTransfer.files.length; j++) {
                    if (j !== i) {
                        newDataTransfer.items.add(this.state.dataTransfer.files[j]);
                    }
                }
                this.state.dataTransfer = newDataTransfer;
                this.UI.imagesInput.files = this.state.dataTransfer.files;
                this.renderImagePreviews();
            };

            div.appendChild(img);
            div.appendChild(btn);
            this.UI.imagePreviewContainer.appendChild(div);
        });

        if (totalImages > 0) {
            this.UI.imagePreviewContainer.classList.remove('hidden');
            this.UI.imageCounter.textContent = `${totalImages}/5 ảnh`;
        } else {
            this.UI.imagePreviewContainer.classList.add('hidden');
            this.UI.imageCounter.textContent = `0/5 ảnh`;
        }

        if (totalImages >= 5) {
            this.UI.imageUploadArea.classList.add('hidden');
        } else {
            this.UI.imageUploadArea.classList.remove('hidden');
        }
        
        // Sync existing images to hidden inputs
        if (this.UI.existingFilesContainer) {
            const oldInputs = this.UI.existingFilesContainer.querySelectorAll('input[name^="ExistingImages"]');
            oldInputs.forEach(input => input.remove());
            
            this.state.existingImages.forEach((url, idx) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = `ExistingImages[${idx}]`;
                input.value = url;
                this.UI.existingFilesContainer.appendChild(input);
            });
        }

        lucide.createIcons();
    }

    updateCredits() {
        let usedFeatured = 0;
        if (this.UI.enableVideoUpload.checked) {
            document.getElementById('costVideo').classList.remove('hidden');
            usedFeatured += 1;
        } else {
            document.getElementById('costVideo').classList.add('hidden');
        }

        if (this.UI.enableBannerBoost.checked) {
            document.getElementById('costBanner').classList.remove('hidden');
            usedFeatured += 1;
        } else {
            document.getElementById('costBanner').classList.add('hidden');
        }

        document.getElementById('remainPosting').textContent = this.state.totalPostingCredits - 1;
        document.getElementById('remainFeatured').textContent = this.state.totalFeaturedCredits - usedFeatured;

        const expireDays = usedFeatured > 0 ? 60 : 30;
        const date = new Date();
        date.setDate(date.getDate() + expireDays);
        document.getElementById('txtExpireDate').textContent = date.toLocaleDateString('vi-VN');

        // Disable checkboxes if not enough featured credits
        if (this.state.totalFeaturedCredits - usedFeatured <= 0) {
            if (!this.UI.enableVideoUpload.checked) this.UI.enableVideoUpload.disabled = true;
            if (!this.UI.enableBannerBoost.checked) this.UI.enableBannerBoost.disabled = true;
        } else {
            this.UI.enableVideoUpload.disabled = false;
            this.UI.enableBannerBoost.disabled = false;
        }
        
        this.checkSubmitStatus();
    }

    checkSubmitStatus() {
        const noCreditWarning = document.getElementById('noCreditWarning');
        
        if (this.state.totalPostingCredits < 1) {
            // Out of credits
            this.UI.submitBtn.disabled = true;
            this.UI.submitBtn.textContent = 'Hết Credit Đăng Tin';
            this.UI.submitBtn.classList.remove('bg-[#2D5A3D]', 'hover:bg-[#234830]');
            this.UI.submitBtn.classList.add('bg-gray-400');
            noCreditWarning.classList.remove('hidden');
        } else {
            // Have credits, check rules checkbox
            if (this.UI.acceptRulesCheckbox && this.UI.acceptRulesCheckbox.checked) {
                this.UI.submitBtn.disabled = false;
            } else {
                this.UI.submitBtn.disabled = true;
            }
            this.UI.submitBtn.textContent = 'Đăng Sản Phẩm';
            this.UI.submitBtn.classList.add('bg-[#2D5A3D]', 'hover:bg-[#234830]');
            this.UI.submitBtn.classList.remove('bg-gray-400');
            noCreditWarning.classList.add('hidden');
        }
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        this.UI.jsGlobalErrorSummary.classList.add('hidden');
        this.UI.jsErrorList.innerHTML = '';
        this.UI.imgUploadError.classList.add('hidden');
        this.UI.vidUploadError.classList.add('hidden');
        this.UI.banUploadError.classList.add('hidden');
        
        let isValid = true;
        let errorMessages = [];
        let firstErrorElement = null;

        // 1. Basic Validation
        if (window.jQuery && !window.jQuery(this.UI.form).valid()) {
            isValid = false;
            errorMessages.push("Vui lòng điền đầy đủ các thông tin bắt buộc.");
            const firstInvalid = document.querySelector('.input-validation-error');
            if (firstInvalid && !firstErrorElement) firstErrorElement = firstInvalid;
        }

        // 2. Images
        const hasExistingImages = window.EDIT_PRODUCT_ID && document.querySelectorAll('input[name^="ExistingImages"]').length > 0;
        if (!hasExistingImages && this.state.dataTransfer.items.length === 0) {
            isValid = false;
            this.UI.imgUploadError.classList.remove('hidden');
            errorMessages.push("Bạn chưa tải lên hình ảnh sản phẩm.");
            if (!firstErrorElement) firstErrorElement = this.UI.imageUploadArea;
        }

        // 3. Video
        if (this.UI.enableVideoUpload.checked) {
            const hasExistingVideo = window.EDIT_PRODUCT_ID && document.querySelector('input[name="ExistingVideoUrl"]');
            if (!hasExistingVideo && !this.UI.videoInput.value) {
                isValid = false;
                this.UI.vidUploadError.classList.remove('hidden');
                errorMessages.push("Bạn đã bật tính năng Video Shorts nhưng chưa tải video lên.");
                if (!firstErrorElement) firstErrorElement = this.UI.videoUploadArea;
            }
        }

        // 4. Banner
        if (this.UI.enableBannerBoost.checked) {
            const hasExistingBanner = window.EDIT_PRODUCT_ID && document.querySelector('input[name="ExistingBannerUrl"]');
            if (!hasExistingBanner && !this.UI.bannerInput.value) {
                isValid = false;
                this.UI.banUploadError.classList.remove('hidden');
                errorMessages.push("Bạn đã bật tính năng Banner VIP nhưng chưa tải ảnh Banner lên.");
                if (!firstErrorElement) firstErrorElement = this.UI.bannerUploadArea;
            }
        }
        
        if (!isValid) {
            errorMessages.forEach(msg => {
                const li = document.createElement('li');
                li.textContent = msg;
                this.UI.jsErrorList.appendChild(li);
            });
            this.UI.jsGlobalErrorSummary.classList.remove('hidden');
            this.UI.jsGlobalErrorSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        this.UI.submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Đang tải lên...';
        this.UI.submitBtn.disabled = true;
        lucide.createIcons();
        
        this.UI.form.submit();
    }

    async fetchProductDetails(id) {
        try {
            const response = await fetch('/api-proxy/Products/' + id);
            const result = await response.json();
            if (result.success) {
                const prod = result.data;
                document.getElementById('Title').value = prod.title || '';
                
                const categorySelect = document.getElementById('CategoryId');
                if (prod.categoryName && categorySelect) {
                    for (let i = 0; i < categorySelect.options.length; i++) {
                        if (categorySelect.options[i].text === prod.categoryName) {
                            categorySelect.selectedIndex = i;
                            break;
                        }
                    }
                }

                document.getElementById('Condition').value = prod.condition || '';
                
                if (this.UI.realPrice && this.UI.displayPrice) {
                    this.UI.realPrice.value = prod.price || 0;
                    this.UI.displayPrice.value = new Intl.NumberFormat('en-US').format(prod.price || 0);
                    this.UI.displayPrice.dispatchEvent(new Event('input'));
                }
                
                document.getElementById('Brand').value = prod.brand || '';
                document.getElementById('Description').value = prod.description || '';

                if (prod.imageUrls && prod.imageUrls.length > 0) {
                    this.state.existingImages = [...prod.imageUrls];
                    this.renderImagePreviews();
                }

                if (prod.bannerUrl) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'ExistingBannerUrl';
                    input.value = prod.bannerUrl;
                    this.UI.existingFilesContainer.appendChild(input);
                    
                    this.UI.enableBannerBoost.checked = true;
                    this.UI.enableBannerBoost.dispatchEvent(new Event('change'));
                }

                if (prod.videoUrl) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'ExistingVideoUrl';
                    input.value = prod.videoUrl;
                    this.UI.existingFilesContainer.appendChild(input);
                    
                    this.UI.enableVideoUpload.checked = true;
                    this.UI.enableVideoUpload.dispatchEvent(new Event('change'));
                }
            }
        } catch (err) {
            console.error('Failed to fetch product details', err);
        }
    }
}
