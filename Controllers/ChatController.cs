using Microsoft.AspNetCore.Mvc;

namespace REVORA_MVC_FE.Controllers
{
    [Microsoft.AspNetCore.Authorization.Authorize]
    public class ChatController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.AccessToken = User.Claims.FirstOrDefault(c => c.Type == "AccessToken")?.Value;
            ViewBag.CurrentUserId = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return View();
        }
    }
}
