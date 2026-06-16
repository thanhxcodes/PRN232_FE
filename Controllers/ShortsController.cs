using Microsoft.AspNetCore.Mvc;
using REVORA_MVC_FE.Services;

namespace REVORA_MVC_FE.Controllers
{
    public class ShortsController : Controller
    {
        private readonly ApiService _apiService;

        public ShortsController(ApiService apiService)
        {
            _apiService = apiService;
        }

        public IActionResult Index()
        {
            // Pass the current user's access token to ViewBag for JS usage
            var token = User.Claims.FirstOrDefault(c => c.Type == "AccessToken")?.Value ?? "";
            ViewBag.AccessToken = token;
            ViewBag.IsAuthenticated = User.Identity?.IsAuthenticated ?? false;
            ViewBag.CurrentUserFullName = User.Claims.FirstOrDefault(c => c.Type == "FullName")?.Value ?? "";
            ViewBag.CurrentUserAvatar = User.Claims.FirstOrDefault(c => c.Type == "AvatarUrl")?.Value ?? "";
            ViewBag.CurrentUserId = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
            return View();
        }
    }
}
