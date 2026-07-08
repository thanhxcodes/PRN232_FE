using Microsoft.AspNetCore.Mvc;
using REVORA_MVC_FE.Services;

namespace REVORA_MVC_FE.Controllers
{
    public class ProductsController : Controller
    {
        private readonly ApiService _apiService;

        public ProductsController(ApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index(
            string? search = null, 
            int? categoryId = null, 
            string? city = null, 
            string? brand = null, 
            string? condition = null, 
            decimal? minPrice = null, 
            decimal? maxPrice = null, 
            string sortBy = "newest", 
            int pageNumber = 1)
        {
            var result = await _apiService.GetFilteredProductsAsync(
                search, categoryId, city, brand, condition, minPrice, maxPrice, sortBy, pageNumber, 12);
            
            ViewBag.Products = result.Items;
            ViewBag.TotalCount = result.TotalCount;
            ViewBag.TotalPages = result.TotalPages;
            ViewBag.CurrentPage = pageNumber;
            
            ViewBag.Search = search;
            ViewBag.CategoryId = categoryId ?? 0;
            ViewBag.City = string.IsNullOrEmpty(city) ? "Tất Cả" : city;
            ViewBag.Brand = string.IsNullOrEmpty(brand) ? "Tất Cả" : brand;
            ViewBag.Condition = string.IsNullOrEmpty(condition) ? "Tất Cả" : condition;
            ViewBag.MinPrice = minPrice ?? 0;
            ViewBag.MaxPrice = maxPrice ?? 1000000000m;
            ViewBag.SortBy = sortBy;

            ViewBag.Categories = await _apiService.GetCategoriesAsync();

            return View();
        }

        public async Task<IActionResult> Details(int id)
        {
            var product = await _apiService.GetProductByIdAsync(id);
            if (product == null)
            {
                // Fallback mock
                product = new Models.ProductDetailResponseDto 
                { 
                    ProductId = id, 
                    Title = "Đồng hồ thông minh Apple Watch Series 8", 
                    Price = 5500000, 
                    Condition = "Như Mới",
                    CategoryName = "Đồng Hồ",
                    Brand = "Apple",
                    Location = "Quận 1, TP.HCM",
                    ImageUrls = new List<string> { "https://images.unsplash.com/photo-1434493789847-2f02b9d28220" },
                    SellerName = "John Doe",
                    IsPremium = true,
                    ViewCount = 120,
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    SellerUsername = "tranvana",
                    Description = "Đồng hồ Apple Watch Series 8 size 41mm bản nhôm GPS màu Midnight.\nMáy nữ dùng rất giữ gìn, pin còn 98%.\nPhụ kiện còn đủ hộp sạc zin theo máy."
                };
            }
            return View(product);
        }

        [HttpGet]
        public async Task<IActionResult> GetDetailApi(int id)
        {
            var product = await _apiService.GetProductByIdAsync(id);
            if (product != null)
                return Json(new { success = true, data = product });
            return Json(new { success = false });
        }

        [HttpGet]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> Create()
        {
            ViewBag.Categories = await _apiService.GetCategoriesAsync();
            var creditsResponse = await _apiService.GetMyCreditsAsync();
            if (creditsResponse?.Success == true && creditsResponse.Data != null)
            {
                ViewBag.PostingCredits = creditsResponse.Data.PostingCredits;
                ViewBag.FeaturedCredits = creditsResponse.Data.FeaturedCredits;
            }
            else
            {
                ViewBag.PostingCredits = 0;
                ViewBag.FeaturedCredits = 0;
            }
            var postingSummary = await _apiService.GetPostingCreditSummaryAsync();
            ViewBag.PostingBatches = postingSummary?.Batches ?? new List<REVORA_MVC_FE.Models.CreditBatchDto>();
            
            var featuredSummary = await _apiService.GetFeaturedCreditSummaryAsync();
            ViewBag.FeaturedBatches = featuredSummary?.Batches ?? new List<REVORA_MVC_FE.Models.CreditBatchDto>();

            return View();
        }

        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> Create(REVORA_MVC_FE.Models.ViewModels.ProductCreateViewModel model)
        {
            if (!ModelState.IsValid)
            {
                ViewBag.Categories = await _apiService.GetCategoriesAsync();
                var creditsResponse = await _apiService.GetMyCreditsAsync();
                if (creditsResponse?.Success == true && creditsResponse.Data != null)
                {
                    ViewBag.PostingCredits = creditsResponse.Data.PostingCredits;
                    ViewBag.FeaturedCredits = creditsResponse.Data.FeaturedCredits;
                }
                else
                {
                    ViewBag.PostingCredits = 0;
                    ViewBag.FeaturedCredits = 0;
                }
                var postingSummary = await _apiService.GetPostingCreditSummaryAsync();
                ViewBag.PostingBatches = postingSummary?.Batches ?? new List<REVORA_MVC_FE.Models.CreditBatchDto>();
                
                var featuredSummary = await _apiService.GetFeaturedCreditSummaryAsync();
                ViewBag.FeaturedBatches = featuredSummary?.Batches ?? new List<REVORA_MVC_FE.Models.CreditBatchDto>();

                return View(model);
            }

            var response = await _apiService.CreateProductAsync(model);
            if (response != null && response.Success)
            {
                return RedirectToAction("Index", "Home");
            }

            ModelState.AddModelError(string.Empty, response?.Message ?? "Không thể đăng sản phẩm.");
            return View(model);
        }

        [HttpGet]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public IActionResult Manage()
        {
            return View();
        }
    }
}
