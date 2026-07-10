using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using REVORA_MVC_FE.Models.ViewModels;
using REVORA_MVC_FE.Services;

namespace REVORA_MVC_FE.Controllers
{
    public class AuthController : Controller
    {
        private readonly ApiService _apiService;

        public AuthController(ApiService apiService)
        {
            _apiService = apiService;
        }

        [HttpGet]
        public IActionResult Login()
        {
            // If already logged in, redirect to home
            if (User.Identity != null && User.Identity.IsAuthenticated)
                return RedirectToAction("Index", "Home");

            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var response = await _apiService.LoginAsync(model);

            if (response != null && response.Success && response.Data != null)
            {
                var token = response.Data.AccessToken;
                if (!string.IsNullOrEmpty(token))
                {
                    _apiService.SetToken(token);
                    var profileResponse = await _apiService.GetUserProfileAsync();
                    
                    if (profileResponse != null && profileResponse.Success && profileResponse.Data != null)
                    {
                        var user = profileResponse.Data;
                        var role = "User";
                        try
                        {
                            var parts = token.Split('.');
                            if (parts.Length > 1)
                            {
                                var payload = parts[1];
                                payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
                                payload = payload.Replace('-', '+').Replace('_', '/');
                                var base64Decoded = Convert.FromBase64String(payload);
                                var json = System.Text.Encoding.UTF8.GetString(base64Decoded);
                                using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
                                var root = jsonDoc.RootElement;
                                
                                if (root.TryGetProperty("role", out var roleProp))
                                {
                                    role = roleProp.GetString() ?? "User";
                                }
                                else if (root.TryGetProperty("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", out var roleProp2))
                                {
                                    role = roleProp2.GetString() ?? "User";
                                }
                            }
                        }
                        catch { /* Ignored if decode fails */ }

                        var claims = new List<Claim>
                        {
                            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                            new Claim(ClaimTypes.Name, user.Username),
                            new Claim(ClaimTypes.Email, user.Email),
                            new Claim("FullName", user.FullName),
                            new Claim(ClaimTypes.Role, role),
                            new Claim("AvatarUrl", user.AvatarUrl ?? ""),
                            new Claim("AccessToken", token) // Store JWT
                        };

                        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

                        var authProperties = new AuthenticationProperties
                        {
                            IsPersistent = true,
                            ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7)
                        };

                        await HttpContext.SignInAsync(
                            CookieAuthenticationDefaults.AuthenticationScheme,
                            new ClaimsPrincipal(claimsIdentity),
                            authProperties);

                        if (role == "Admin" || role == "ADMIN")
                        {
                            return RedirectToAction("Index", "Admin");
                        }
                        return RedirectToAction("Index", "Home");
                    }
                }
            }

            ModelState.AddModelError(string.Empty, response?.Message ?? "Tài khoản hoặc mật khẩu không chính xác.");
            return View(model);
        }

        [HttpPost]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequestViewModel model)
        {
            if (string.IsNullOrEmpty(model?.IdToken))
            {
                return Json(new { success = false, message = "IdToken is required." });
            }

            var response = await _apiService.GoogleLoginAsync(model.IdToken);

            if (response != null && response.Success && response.Data != null)
            {
                var token = response.Data.AccessToken;
                if (!string.IsNullOrEmpty(token))
                {
                    _apiService.SetToken(token);
                    var profileResponse = await _apiService.GetUserProfileAsync();
                    
                    if (profileResponse != null && profileResponse.Success && profileResponse.Data != null)
                    {
                        var user = profileResponse.Data;
                        var role = "User";
                        try
                        {
                            var parts = token.Split('.');
                            if (parts.Length > 1)
                            {
                                var payload = parts[1];
                                payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
                                payload = payload.Replace('-', '+').Replace('_', '/');
                                var base64Decoded = Convert.FromBase64String(payload);
                                var json = System.Text.Encoding.UTF8.GetString(base64Decoded);
                                using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
                                var root = jsonDoc.RootElement;
                                
                                if (root.TryGetProperty("role", out var roleProp))
                                {
                                    role = roleProp.GetString() ?? "User";
                                }
                                else if (root.TryGetProperty("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", out var roleProp2))
                                {
                                    role = roleProp2.GetString() ?? "User";
                                }
                            }
                        }
                        catch { /* Ignored if decode fails */ }

                        var claims = new List<Claim>
                        {
                            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                            new Claim(ClaimTypes.Name, user.Username),
                            new Claim(ClaimTypes.Email, user.Email),
                            new Claim("FullName", user.FullName),
                            new Claim(ClaimTypes.Role, role),
                            new Claim("AvatarUrl", user.AvatarUrl ?? ""),
                            new Claim("AccessToken", token) // Store JWT
                        };

                        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

                        var authProperties = new AuthenticationProperties
                        {
                            IsPersistent = true,
                            ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7)
                        };

                        await HttpContext.SignInAsync(
                            CookieAuthenticationDefaults.AuthenticationScheme,
                            new ClaimsPrincipal(claimsIdentity),
                            authProperties);

                        return Json(new { success = true, isFirstLogin = response.Data.IsFirstLogin });
                    }
                }
            }

            return Json(new { success = false, message = response?.Message ?? "Đăng nhập Google thất bại." });
        }

        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }



        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Index", "Home");
        }

        [HttpGet]
        public IActionResult ForgotPassword()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
                return RedirectToAction("Index", "Home");

            return View();
        }
    }
}
