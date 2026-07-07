using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using REVORA_MVC_FE.Services;

namespace REVORA_MVC_FE.Controllers
{
    [Authorize]
    public class PaymentController : Controller
    {
        private readonly ApiService _apiService;

        public PaymentController(ApiService apiService)
        {
            _apiService = apiService;
        }

        [HttpGet]
        public IActionResult Result(string? revoraOrder, string? status, string? cancel, string? id, string? orderCode)
        {
            var targetCode = !string.IsNullOrEmpty(revoraOrder) ? revoraOrder : orderCode;

            if (string.IsNullOrEmpty(targetCode))
            {
                // If no order code is provided, we can either redirect to home or show an error
                return RedirectToAction("Index", "Plans");
            }

            ViewData["OrderCode"] = targetCode;
            
            // We pass the raw query params to the view just in case, but JS will do the polling
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> GetPaymentStatus(string revoraOrder)
        {
            try
            {
                var content = await _apiService.GetRawJsonAsync($"payment/status/{revoraOrder}");
                return Content(content, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CancelPayment(string revoraOrder)
        {
            try
            {
                var content = await _apiService.PostRawJsonAsync($"payment/cancel/{revoraOrder}", new StringContent("", System.Text.Encoding.UTF8, "application/json"));
                return Content(content, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        public IActionResult TransactionHistory()
        {
            return View();
        }
    }
}
