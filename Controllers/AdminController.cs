using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using REVORA_MVC_FE.Models.ViewModels;
using REVORA_MVC_FE.Services;
using System;
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

        public IActionResult Posts()
        {
            return View();
        }

        public IActionResult ManageProducts()
        {
            return View();
        }
    }
}
