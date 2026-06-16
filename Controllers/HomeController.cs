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
        
        ViewBag.FeaturedProducts = featured;
        ViewBag.LovedProducts = loved;
        ViewBag.NewestProducts = newest;

        return View();
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
}
