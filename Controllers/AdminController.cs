using Microsoft.AspNetCore.Mvc;

namespace REVORA_MVC_FE.Controllers
{
    public class AdminController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
