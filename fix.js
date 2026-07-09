const fs = require('fs');
let content = fs.readFileSync('Views/Products/Create.cshtml', 'utf8');

// Normalize line endings for reliable replacement
content = content.replace(/\r\n/g, '\n');

// 1. Add isEditMode at top
content = content.replace(
    'var categories = ViewBag.Categories as List<REVORA_MVC_FE.Models.CategoryDto> ?? new List<REVORA_MVC_FE.Models.CategoryDto>();\n}',
    'var categories = ViewBag.Categories as List<REVORA_MVC_FE.Models.CategoryDto> ?? new List<REVORA_MVC_FE.Models.CategoryDto>();\n    bool isEditMode = ViewBag.EditId != null;\n}'
);

// 2. Change text
content = content.replace('Đăng Sản Phẩm \n', '@(isEditMode ? "Chỉnh Sửa" : "Đăng Sản Phẩm") \n');
content = content.replace('Điền thông tin và chọn tính năng nâng cao để tối đa hóa lượt tiếp cận', '@(isEditMode ? "Chỉnh sửa thông tin sản phẩm của bạn" : "Điền thông tin và chọn tính năng nâng cao để tối đa hóa lượt tiếp cận")');

// 3. Change form tag and add existingFilesContainer
content = content.replace(
    '<form asp-action="Create" method="post" enctype="multipart/form-data" id="createProductForm">',
    '<form asp-action="@(isEditMode ? "Edit" : "Create")" asp-route-id="@(isEditMode ? ViewBag.EditId : null)" method="post" enctype="multipart/form-data" id="createProductForm">\n        <div id="existingFilesContainer"></div>'
);

// 4. Change script block
const newScript = `        window.EDIT_PRODUCT_ID = @(ViewBag.EditId ?? "null");
        window.existingImageUrls = [];
        document.addEventListener('DOMContentLoaded', function () {
            if (window.jQuery && window.jQuery.validator) {
                window.jQuery.validator.setDefaults({ ignore: "" });
            }

            if (window.EDIT_PRODUCT_ID && window.EDIT_PRODUCT_ID !== null) {
                fetchProductDetails(window.EDIT_PRODUCT_ID);
            }

            async function fetchProductDetails(id) {
                try {
                    const response = await fetch('/api-proxy/Products/' + id);
                    const result = await response.json();
                    if (result.success) {
                        const prod = result.data;
                        document.getElementById('Title').value = prod.title || '';
                        
                        // Select category by name
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
                        
                        const priceInput = document.getElementById('realPrice');
                        const displayPrice = document.getElementById('displayPrice');
                        if (priceInput && displayPrice) {
                            priceInput.value = prod.price || 0;
                            displayPrice.value = new Intl.NumberFormat('en-US').format(prod.price || 0);
                            // Fire input event to update text
                            displayPrice.dispatchEvent(new Event('input'));
                        }
                        
                        document.getElementById('Brand').value = prod.brand || '';
                        document.getElementById('Description').value = prod.description || '';

                        const existingFilesContainer = document.getElementById('existingFilesContainer');
                        if (prod.imageUrls && prod.imageUrls.length > 0) {
                            window.existingImageUrls = [...prod.imageUrls];
                            renderImagePreviews();
                        }
                        // Note: BannerUrl might not be returned in ProductDetailResponseDto, but if it is, we map it
                        if (prod.bannerUrl) {
                            const input = document.createElement('input');
                            input.type = 'hidden';
                            input.name = 'ExistingBannerUrl';
                            input.value = prod.bannerUrl;
                            existingFilesContainer.appendChild(input);
                            
                            document.getElementById('enableBannerBoost').checked = true;
                            document.getElementById('enableBannerBoost').dispatchEvent(new Event('change'));
                        }
                        if (prod.videoUrl) {
                            const input = document.createElement('input');
                            input.type = 'hidden';
                            input.name = 'ExistingVideoUrl';
                            input.value = prod.videoUrl;
                            existingFilesContainer.appendChild(input);
                            
                            document.getElementById('enableVideoUpload').checked = true;
                            document.getElementById('enableVideoUpload').dispatchEvent(new Event('change'));
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch product details', err);
                }
            }`;
content = content.replace(
    /document\.addEventListener\('DOMContentLoaded', function \(\) \{\n\s*if \(window\.jQuery && window\.jQuery\.validator\) \{\n\s*window\.jQuery\.validator\.setDefaults\(\{ ignore: "" \}\);\n\s*\}/,
    newScript
);

// 5. Update renderImagePreviews and images limits
content = content.replace(
    /if \(dataTransfer\.items\.length \+ files\.length > 5\) \{/,
    'const existingCount = window.existingImageUrls ? window.existingImageUrls.length : 0;\n                if (dataTransfer.items.length + files.length + existingCount > 5) {'
);
content = content.replace(
    /\$\{dataTransfer\.items\.length\} ảnh\./,
    '${dataTransfer.items.length + existingCount} ảnh.'
);

const oldRenderFunc = `            function renderImagePreviews() {
                imagePreviewContainer.innerHTML = '';
                const files = dataTransfer.files;

                if (files.length > 0) {
                    imagePreviewContainer.classList.remove('hidden');
                    imageCounter.textContent = \`\${files.length}/5 ảnh\`;
                } else {
                    imagePreviewContainer.classList.add('hidden');
                    imageCounter.textContent = \`0/5 ảnh\`;
                }

                if (files.length >= 5) {
                    imageUploadArea.classList.add('hidden');
                } else {
                    imageUploadArea.classList.remove('hidden');
                }

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const objectUrl = URL.createObjectURL(file);

                    const div = document.createElement('div');
                    div.className = 'relative group rounded-xl overflow-hidden shadow-sm border border-gray-100 aspect-square';
                    
                    const img = document.createElement('img');
                    img.src = objectUrl;
                    img.className = 'w-full h-full object-cover';
                    
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm';
                    btn.innerHTML = '<i data-lucide="x" class="w-3.5 h-3.5"></i>';
                    
                    btn.onclick = function() {
                        const newDataTransfer = new DataTransfer();
                        for (let j = 0; j < dataTransfer.files.length; j++) {
                            if (j !== i) {
                                newDataTransfer.items.add(dataTransfer.files[j]);
                            }
                        }
                        dataTransfer = newDataTransfer;
                        imagesInput.files = dataTransfer.files;
                        renderImagePreviews();
                    };

                    div.appendChild(img);
                    div.appendChild(btn);
                    imagePreviewContainer.appendChild(div);
                }
                lucide.createIcons();
            }`;

const newRenderFunc = `            function renderImagePreviews() {
                imagePreviewContainer.innerHTML = '';
                const files = dataTransfer.files;
                const existingImages = window.existingImageUrls || [];
                const totalImages = files.length + existingImages.length;

                if (totalImages > 0) {
                    imagePreviewContainer.classList.remove('hidden');
                    imageCounter.textContent = \`\${totalImages}/5 ảnh\`;
                } else {
                    imagePreviewContainer.classList.add('hidden');
                    imageCounter.textContent = \`0/5 ảnh\`;
                }

                if (totalImages >= 5) {
                    imageUploadArea.classList.add('hidden');
                } else {
                    imageUploadArea.classList.remove('hidden');
                }
                
                const existingFilesContainer = document.getElementById('existingFilesContainer');
                if (existingFilesContainer) {
                    const oldInputs = existingFilesContainer.querySelectorAll('input[name^="ExistingImages"]');
                    oldInputs.forEach(input => input.remove());
                    
                    existingImages.forEach((url, idx) => {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'ExistingImages[' + idx + ']';
                        input.value = url;
                        existingFilesContainer.appendChild(input);
                    });
                }

                for (let i = 0; i < existingImages.length; i++) {
                    const url = existingImages[i];
                    const div = document.createElement('div');
                    div.className = 'relative group rounded-xl overflow-hidden shadow-sm border border-gray-100 aspect-square';
                    
                    const img = document.createElement('img');
                    img.src = url;
                    img.className = 'w-full h-full object-cover';
                    
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm';
                    btn.innerHTML = '<i data-lucide="x" class="w-3.5 h-3.5"></i>';
                    
                    btn.onclick = function() {
                        window.existingImageUrls.splice(i, 1);
                        renderImagePreviews();
                    };

                    div.appendChild(img);
                    div.appendChild(btn);
                    imagePreviewContainer.appendChild(div);
                }

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const objectUrl = URL.createObjectURL(file);

                    const div = document.createElement('div');
                    div.className = 'relative group rounded-xl overflow-hidden shadow-sm border border-gray-100 aspect-square';
                    
                    const img = document.createElement('img');
                    img.src = objectUrl;
                    img.className = 'w-full h-full object-cover';
                    
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm';
                    btn.innerHTML = '<i data-lucide="x" class="w-3.5 h-3.5"></i>';
                    
                    btn.onclick = function() {
                        const newDataTransfer = new DataTransfer();
                        for (let j = 0; j < dataTransfer.files.length; j++) {
                            if (j !== i) {
                                newDataTransfer.items.add(dataTransfer.files[j]);
                            }
                        }
                        dataTransfer = newDataTransfer;
                        imagesInput.files = dataTransfer.files;
                        renderImagePreviews();
                    };

                    div.appendChild(img);
                    div.appendChild(btn);
                    imagePreviewContainer.appendChild(div);
                }
                lucide.createIcons();
            }`;
            
// Use precise regex match
content = content.replace(oldRenderFunc, newRenderFunc);

// 6. Fix submit handler
content = content.replace(
    /if \(dataTransfer\.items\.length === 0\) \{/,
    'const hasExistingImages = window.EDIT_PRODUCT_ID && document.querySelectorAll(\'input[name^="ExistingImages"]\').length > 0;\n                if (dataTransfer.items.length === 0 && !hasExistingImages) {'
);

fs.writeFileSync('Views/Products/Create.cshtml', content, 'utf8');
console.log('Fixed Create.cshtml');
