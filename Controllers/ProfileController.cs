using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace REVORA_MVC_FE.Controllers
{
    [Authorize]
    public class ProfileController : Controller
    {
        private readonly REVORA_MVC_FE.Services.ApiService _apiService;

        public ProfileController(REVORA_MVC_FE.Services.ApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index(long? id = null, string tab = "profile")
        {
            ViewBag.ActiveTab = tab;
            ViewBag.UserId = id;

            var response = id.HasValue
                ? await _apiService.GetUserProfileByIdAsync(id.Value)
                : await _apiService.GetUserProfileAsync();

            if (response != null && response.Success)
            {
                ViewBag.Profile = response.Data;
            }

            // Check if viewing own profile
            bool isOwnProfile = true;
            if (id.HasValue)
            {
                var meResponse = await _apiService.GetUserProfileAsync();
                if (meResponse != null && meResponse.Success && meResponse.Data != null && meResponse.Data.Id != id.Value)
                {
                    isOwnProfile = false;
                }
            }
            ViewBag.IsOwnProfile = isOwnProfile;

            return View();
        }

        [HttpGet]
        public async Task<IActionResult> GetProfileData(long? id = null)
        {
            var response = id.HasValue
                ? await _apiService.GetUserProfileByIdAsync(id.Value)
                : await _apiService.GetUserProfileAsync();
            return Json(response);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] object model)
        {
            var response = await _apiService.UpdateProfileAsync(model);
            return Json(response);
        }

        [HttpPost]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            var response = await _apiService.UploadImageAsync(file);
            return Json(response);
        }

        [HttpPost]
        public async Task<IActionResult> ChangePassword([FromBody] object model)
        {
            var response = await _apiService.ChangePasswordAsync(model);
            return Json(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetProducts(long? sellerId = null, int pageIndex = 1, int pageSize = 10)
        {
            var response = sellerId.HasValue
                ? await _apiService.GetSellerProductsAsync(sellerId.Value, pageIndex, pageSize)
                : await _apiService.GetMyProductsAsync(pageIndex, pageSize);
            return Json(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetWishlist(int pageIndex = 1, int pageSize = 10)
        {
            var response = await _apiService.GetWishlistAsync(pageIndex, pageSize);
            return Json(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetWishlistIds()
        {
            var response = await _apiService.GetWishlistIdsAsync();
            return Json(response);
        }

        [HttpPost]
        public async Task<IActionResult> ToggleFollow(long targetUserId)
        {
            var response = await _apiService.ToggleFollowAsync(targetUserId);
            return Json(response);
        }

        [HttpPost]
        public async Task<IActionResult> ToggleWishlist(long productId)
        {
            var response = await _apiService.ToggleWishlistAsync(productId);
            return Json(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetFollowers(long userId)
        {
            var response = await _apiService.GetFollowersAsync(userId);
            return Json(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetFollowing(long userId)
        {
            var response = await _apiService.GetFollowingAsync(userId);
            return Json(response);
        }

        public IActionResult Notifications()
        {
            return View();
        }
    }
}
