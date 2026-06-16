using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;
using REVORA_MVC_FE.Services;

namespace REVORA_MVC_FE.Controllers
{
    [Authorize]
    public class PlansController : Controller
    {
        private readonly ApiService _apiService;

        public PlansController(ApiService apiService)
        {
            _apiService = apiService;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> GetActivePackages()
        {
            var content = await _apiService.GetRawJsonAsync("CreditPackages/active");
            return Content(content, "application/json");
        }

        [HttpGet]
        public async Task<IActionResult> GetCreditSummary(string creditTypeName)
        {
            var content = await _apiService.GetRawJsonAsync($"CreditPackages/my-{creditTypeName.ToLower()}-credits");
            return Content(content, "application/json");
        }

        [HttpGet]
        public async Task<IActionResult> GetTransactions()
        {
            var content = await _apiService.GetRawJsonAsync("payment/transactions");
            return Content(content, "application/json");
        }

        [HttpPost]
        public async Task<IActionResult> Checkout([FromBody] object dto)
        {
            var jsonContent = new StringContent(JsonSerializer.Serialize(dto), Encoding.UTF8, "application/json");
            var content = await _apiService.PostRawJsonAsync("payment/checkout", jsonContent);
            return Content(content, "application/json");
        }
    }
}
