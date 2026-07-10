using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using REVORA_MVC_FE.Models.ViewModels;
using REVORA_MVC_FE.Services;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace REVORA_MVC_FE.Controllers
{
    [Authorize(Roles = "Admin,ADMIN")]
    public class AdminController : Controller
    {
        private readonly ApiService _apiService;

        public AdminController(ApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index()
        {
            var response = await _apiService.GetDashboardStatsAsync();
            if (response != null && response.Success)
            {
                return View(response.Data);
            }
            // Fallback empty model
            return View(new DashboardStatsViewModel());
        }

        public async Task<IActionResult> Revenue(string filterType = "month", int? year = null, int? month = null, string? startDate = null, string? endDate = null)
        {
            if (!year.HasValue) year = DateTime.Now.Year;
            if (!month.HasValue) month = DateTime.Now.Month;

            ViewBag.FilterType = filterType;
            ViewBag.Year = year;
            ViewBag.Month = month;
            ViewBag.StartDate = startDate;
            ViewBag.EndDate = endDate;

            var response = await _apiService.GetRevenueStatsAsync(filterType, year.Value, month, startDate, endDate);
            if (response != null && response.Success)
            {
                return View(response.Data);
            }
            return View(new RevenueStatsViewModel());
        }

        public async Task<IActionResult> Packages()
        {
            var response = await _apiService.GetAdminPackagesAsync();
            if (response != null && response.Success)
            {
                return View(response.Data);
            }
            return View(new System.Collections.Generic.List<CreditPackageViewModel>());
        }

        [HttpPost]
        public async Task<IActionResult> EditPackage(CreditPackageViewModel model)
        {
            var response = await _apiService.EditCreditPackageAsync(model.PaidCreditPackageId, model);
            if (response != null && response.Success)
            {
                TempData["SuccessMessage"] = "Cập nhật gói cước thành công";
            }
            else
            {
                TempData["ErrorMessage"] = response?.Message ?? "Có lỗi xảy ra khi cập nhật";
            }
            return RedirectToAction("Packages");
        }

        public async Task<IActionResult> Users(int page = 1, string search = "", string statusFilter = "all")
        {
            int pageSize = 10;
            bool? isActive = null;
            if (statusFilter == "active") isActive = true;
            else if (statusFilter == "suspended") isActive = false;

            ViewBag.Search = search;
            ViewBag.StatusFilter = statusFilter;

            var response = await _apiService.GetAdminUsersAsync(page, pageSize, search, isActive);
            if (response != null && response.Success)
            {
                return View(response.Data);
            }
            return View(new AdminUserPagedResult());
        }

        [HttpPost]
        public async Task<IActionResult> ToggleUserStatus(long userId, bool isBanning, string reason)
        {
            var response = await _apiService.ToggleUserStatusAsync(userId, isBanning, reason);
            if (response != null && response.Success)
            {
                TempData["SuccessMessage"] = isBanning ? "Khóa tài khoản thành công" : "Mở khóa tài khoản thành công";
            }
            else
            {
                TempData["ErrorMessage"] = response?.Message ?? "Có lỗi xảy ra";
            }
            return RedirectToAction("Users");
        }

        public IActionResult Announcements()
        {
            return View();
        }

        public IActionResult Feedbacks()
        {
            return View();
        }

        public IActionResult Notifications()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> UploadImage(IFormFile files)
        {
            if (files == null || files.Length == 0)
                return Json(new { success = false, message = "Vui lòng chọn ít nhất 1 file ảnh." });

            var result = await _apiService.UploadImageAsync(files);
            if (result.Success)
            {
                return Json(new { success = true, urls = new[] { result.Data } });
            }
            return Json(new { success = false, message = result.Message });
        }

        [HttpGet]
        public async Task<IActionResult> SearchUsers(string query)
        {
            var response = await _apiService.SearchUsersAsync(query);
            if (response != null && response.Success)
            {
                // API BE trả về { success = true, data = [...] } nên response.Data sẽ là object chứa data
                return Json(new { success = true, data = response.Data });
            }
            return Json(new { success = false, message = "Không thể tìm kiếm" });
        }

        [HttpPost]
        public async Task<IActionResult> SendNotifications([FromBody] AdminSendNotificationRequestDto request)
        {
            var response = await _apiService.SendNotificationsAsync(request);
            if (response != null && response.Success)
            {
                // Backend trả về count bên trong response.Data? 
                // Wait, Backend controller uses Ok(new { success = true, count = count, message = ... })
                // ApiService deserializes this to ApiResponse<object>.
                // For simplicity, we just return the Data to FE.
                return Json(new { success = true, data = response.Data });
            }
            return Json(new { success = false, message = response?.Message ?? "Lỗi gửi thông báo" });
        }

        public async Task<IActionResult> Posts(int page = 1, string search = "", string statusFilter = "all", string categoryFilter = "all")
        {
            ViewBag.Search = search;
            ViewBag.StatusFilter = statusFilter;
            ViewBag.CategoryFilter = categoryFilter;

            var response = await _apiService.GetAdminProductsAsync();
            if (response != null && response.Success && response.Data != null)
            {
                var products = response.Data;
                
                // Calculate stats
                var stats = new AdminProductStatsViewModel
                {
                    TotalPosts = products.Count,
                    ActivePosts = products.Count(p => p.Status == "Public"),
                    PendingAds = products.Count(p => p.Status == "AppealPending"),
                    ViolatedPosts = products.Count(p => p.Status == "Violated"),
                    DeletedPosts = products.Count(p => p.Status == "Deleted" || p.Status == "AdminDeleted")
                };

                ViewBag.Categories = products.Select(p => p.Category).Where(c => !string.IsNullOrEmpty(c)).Distinct().OrderBy(c => c).ToList();

                // Filter
                if (!string.IsNullOrEmpty(search))
                {
                    search = search.ToLower();
                    products = products.Where(p => 
                        (p.Title != null && p.Title.ToLower().Contains(search)) || 
                        (p.Owner != null && p.Owner.Username != null && p.Owner.Username.ToLower().Contains(search)) || 
                        (p.Owner != null && p.Owner.Email != null && p.Owner.Email.ToLower().Contains(search))
                    ).ToList();
                }

                if (statusFilter != "all")
                {
                    products = products.Where(p => p.Status.Equals(statusFilter, StringComparison.OrdinalIgnoreCase)).ToList();
                }

                if (categoryFilter != "all")
                {
                    products = products.Where(p => p.Category.Equals(categoryFilter, StringComparison.OrdinalIgnoreCase)).ToList();
                }

                // Pagination
                int pageSize = 10;
                var totalCount = products.Count;
                var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
                
                // Ensure page is valid
                if (page < 1) page = 1;
                if (page > totalPages && totalPages > 0) page = totalPages;

                var pagedItems = products.Skip((page - 1) * pageSize).Take(pageSize).ToList();

                var result = new AdminProductPagedResult
                {
                    Items = pagedItems,
                    TotalCount = totalCount,
                    TotalPages = totalPages,
                    CurrentPage = page,
                    Stats = stats
                };

                return View(result);
            }
            return View(new AdminProductPagedResult());
        }

        [HttpPost]
        public async Task<IActionResult> UpdatePostStatus(long productId, string status, string note)
        {
            var response = await _apiService.UpdateProductStatusAsync(productId, status, note);
            if (response != null && response.Success)
            {
                TempData["SuccessMessage"] = "Cập nhật trạng thái bài đăng thành công";
            }
            else
            {
                TempData["ErrorMessage"] = response?.Message ?? "Có lỗi xảy ra";
            }
            return RedirectToAction("Posts");
        }

        public IActionResult ManageProducts()
        {
            return View();
        }
        [HttpGet]
        public async Task<IActionResult> GetUserOverview(long userId)
        {
            var response = await _apiService.GetUserOverviewAsync(userId);
            if (response != null && response.Success)
            {
                return Json(new { success = true, data = response.Data });
            }
            return Json(new { success = false, message = "Không thể tải thông tin tổng quan" });
        }

        [HttpGet]
        public async Task<IActionResult> GetUserTransactions(long userId, int page = 1)
        {
            var response = await _apiService.GetUserTransactionsAsync(userId, page, 10);
            if (response != null && response.Success)
            {
                return Json(new { success = true, data = response.Data });
            }
            return Json(new { success = false, message = "Không thể tải lịch sử giao dịch" });
        }
    }
}
