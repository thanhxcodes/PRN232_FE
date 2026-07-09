const fs = require('fs');
let code = fs.readFileSync('Views/Home/Index.cshtml', 'utf8');

// The block to insert
const mostViewedBlock = `
    @if (ViewBag.MostViewedProducts != null && ViewBag.MostViewedProducts.Count > 0)
    {
        <!-- Most Viewed Products Section -->
        <section class="max-w-7xl scroll-animate opacity-0 translate-y-10 transition-all duration-700 ease-out mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <div class="flex items-center justify-between mb-8">
                <div class="flex items-center space-x-3">
                    <div class="p-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-full">
                        <i data-lucide="eye" class="w-6 h-6 text-white"></i>
                    </div>
                    <div>
                        <h2 class="text-3xl text-gray-900 font-bold">Được Xem Nhiều Nhất</h2>
                        <p class="text-sm text-gray-600">Sản phẩm có lượt xem cao nhất</p>
                    </div>
                </div>
                <a href="/Products?sort=most-viewed" class="flex items-center space-x-2 px-6 py-3 bg-white text-green-600 rounded-full hover:shadow-lg transition-all font-semibold border-2 border-green-500">
                    <span>Tất Cả Sản Phẩm</span>
                    <i data-lucide="chevron-right" class="w-5 h-5"></i>
                </a>
            </div>
            
            @await Html.PartialAsync("_ProductCarousel", (List<REVORA_MVC_FE.Models.ProductResponseDto>)ViewBag.MostViewedProducts)
        </section>
    }
`;

// Insert it before "Mới Nhất"
if (!code.includes('Được Xem Nhiều Nhất')) {
    code = code.replace(/@if\s*\(\s*ViewBag\.NewestProducts/g, mostViewedBlock + '\n    @if (ViewBag.NewestProducts');
}

// Fix rounded-xl to rounded-full for the other icons
code = code.replace(/<div class="p-2 bg-gradient-to-br from-\[#2D5A3D\] to-\[#3D7054\] rounded-xl">/g, '<div class="p-2 bg-gradient-to-br from-[#2D5A3D] to-[#3D7054] rounded-full">');
code = code.replace(/<div class="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">/g, '<div class="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-full">');
code = code.replace(/<div class="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">/g, '<div class="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full">');

// Capitalize "Được yêu thích nhất"
code = code.replace('Được yêu thích nhất', 'Được Yêu Thích Nhất');

fs.writeFileSync('Views/Home/Index.cshtml', code);
console.log('Restored Most Viewed section and fixed styles');
