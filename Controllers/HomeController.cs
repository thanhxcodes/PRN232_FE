using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using REVORA_MVC_FE.Models;
using REVORA_MVC_FE.Services;

namespace REVORA_MVC_FE.Controllers;

public class HomeController : Controller
{
    private readonly ApiService _apiService;

    public HomeController(ApiService apiService)
    {
        _apiService = apiService;
    }

    public async Task<IActionResult> Index()
    {
        var featured = await _apiService.GetFeaturedProductsAsync(10);
        var loved = await _apiService.GetLovedProductsAsync(10);
        var newest = await _apiService.GetNewestProductsAsync(10);
        var mostViewed = await _apiService.GetMostViewedProductsAsync(10);
        
        // Cung cấp dữ liệu mẫu nếu API trống (vì DB có thể chưa có nhiều dữ liệu)
        if (featured == null || !featured.Any()) featured = GetMockProducts();
        if (loved == null || !loved.Any()) loved = GetMockProducts();
        if (newest == null || !newest.Any()) newest = GetMockProducts();
        if (mostViewed == null || !mostViewed.Any()) mostViewed = GetMockProducts();

        ViewBag.FeaturedProducts = featured;
        ViewBag.LovedProducts = loved;
        ViewBag.NewestProducts = newest;
        ViewBag.MostViewedProducts = mostViewed;
        
        var categories = await _apiService.GetCategoriesAsync();
        ViewBag.Categories = categories;

        return View();
    }

    private List<ProductResponseDto> GetMockProducts()
    {
        return new List<ProductResponseDto>
        {
            new ProductResponseDto { ProductId = 1, Title = "Áo khoác mùa đông", Price = 500000, Condition = "Mới", Brand = "Zara", ImageUrl = "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400", CreatedAt = DateTime.Now },
            new ProductResponseDto { ProductId = 2, Title = "Giày thể thao nam", Price = 300000, Condition = "Như mới", Brand = "Nike", ImageUrl = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", CreatedAt = DateTime.Now },
            new ProductResponseDto { ProductId = 3, Title = "Túi xách nữ thời trang", Price = 450000, Condition = "Mới", Brand = "Gucci", ImageUrl = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=400", CreatedAt = DateTime.Now },
            new ProductResponseDto { ProductId = 4, Title = "Đồng hồ thông minh", Price = 1200000, Condition = "Cũ", Brand = "Apple", ImageUrl = "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400", CreatedAt = DateTime.Now }
        };
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }

    public IActionResult PaymentGuide()
    {
        return View();
    }

    public IActionResult TermsOfUse()
    {
        return View();
    }

    public IActionResult Feedback()
    {
        return View();
    }
}
