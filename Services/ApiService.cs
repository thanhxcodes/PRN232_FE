using System.Net.Http.Json;
using REVORA_MVC_FE.Models;
using REVORA_MVC_FE.Models.ViewModels;

namespace REVORA_MVC_FE.Services
{
    public class ApiService
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ApiService(HttpClient httpClient, IHttpContextAccessor httpContextAccessor)
        {
            _httpClient = httpClient;
            _httpContextAccessor = httpContextAccessor;

            var token = _httpContextAccessor.HttpContext?.User?.Claims?.FirstOrDefault(c => c.Type == "AccessToken")?.Value;
            if (!string.IsNullOrEmpty(token))
            {
                _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }
        }

        public void SetToken(string token)
        {
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }

        public async Task<string> GetRawJsonAsync(string url)
        {
            var response = await _httpClient.GetAsync(url);
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> PostRawJsonAsync(string url, HttpContent content)
        {
            var response = await _httpClient.PostAsync(url, content);
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<ApiResponse<LoginResponseDto>?> LoginAsync(LoginViewModel model)
        {
            var response = await _httpClient.PostAsJsonAsync("auth/login", new { 
                email = model.Email, 
                password = model.Password 
            });
            
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<ApiResponse<LoginResponseDto>>();
            }

            return new ApiResponse<LoginResponseDto> { Success = false, Message = "Đăng nhập thất bại" };
        }

        public async Task<ApiResponse<object>?> RegisterAsync(RegisterViewModel model)
        {
            var response = await _httpClient.PostAsJsonAsync("auth/register", new {
                fullName = model.FullName,
                username = model.Username,
                email = model.Email,
                password = model.Password
            });

            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            }

            return new ApiResponse<object> { Success = false, Message = "Đăng ký thất bại" };
        }

        public async Task<List<CategoryDto>> GetCategoriesAsync()
        {
            try {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<List<CategoryDto>>>("categories");
                return response?.Data ?? new List<CategoryDto>();
            } catch (Exception ex) {
                Console.WriteLine("API GetCategoriesAsync Error: " + ex.ToString());
                return new List<CategoryDto>(); 
            }
        }

        public async Task<List<ProductResponseDto>> GetFeaturedProductsAsync(int limit = 10)
        {
            try {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<List<ProductResponseDto>>>($"products/featured?limit={limit}");
                return response?.Data ?? new List<ProductResponseDto>();
            } catch { return new List<ProductResponseDto>(); }
        }

        public async Task<List<ProductResponseDto>> GetLovedProductsAsync(int limit = 10)
        {
            try {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<List<ProductResponseDto>>>($"products/loved?limit={limit}");
                return response?.Data ?? new List<ProductResponseDto>();
            } catch { return new List<ProductResponseDto>(); }
        }

        public async Task<List<ProductResponseDto>> GetNewestProductsAsync(int limit = 10)
        {
            try {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<List<ProductResponseDto>>>($"products/newest?limit={limit}");
                return response?.Data ?? new List<ProductResponseDto>();
            } catch { return new List<ProductResponseDto>(); }
        }

        public async Task<List<ProductResponseDto>> GetMostViewedProductsAsync(int limit = 10)
        {
            try {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<List<ProductResponseDto>>>($"products/most-viewed?limit={limit}");
                return response?.Data ?? new List<ProductResponseDto>();
            } catch { return new List<ProductResponseDto>(); }
        }

        public async Task<PaginatedList<ProductResponseDto>> GetFilteredProductsAsync(
            string? keyword = null, int? categoryId = null, string? city = null, 
            string? brand = null, string? condition = null, decimal? minPrice = null, 
            decimal? maxPrice = null, string sortBy = "newest", int pageNumber = 1, int pageSize = 12)
        {
            try {
                var query = new List<string>();
                if (!string.IsNullOrEmpty(keyword)) query.Add($"keyword={Uri.EscapeDataString(keyword)}");
                if (categoryId.HasValue && categoryId > 0) query.Add($"categoryId={categoryId.Value}");
                if (!string.IsNullOrEmpty(city) && city != "Tất Cả") query.Add($"city={Uri.EscapeDataString(city)}");
                if (!string.IsNullOrEmpty(brand) && brand != "Tất Cả") query.Add($"brand={Uri.EscapeDataString(brand)}");
                if (!string.IsNullOrEmpty(condition) && condition != "Tất Cả") query.Add($"condition={Uri.EscapeDataString(condition)}");
                if (minPrice.HasValue) query.Add($"minPrice={minPrice.Value}");
                if (maxPrice.HasValue) query.Add($"maxPrice={maxPrice.Value}");
                query.Add($"sortBy={Uri.EscapeDataString(sortBy)}");
                query.Add($"pageNumber={pageNumber}");
                query.Add($"pageSize={pageSize}");

                string queryString = string.Join("&", query);
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<PaginatedList<ProductResponseDto>>>($"products?{queryString}");
                return response?.Data ?? new PaginatedList<ProductResponseDto>();
            } catch (Exception ex) { 
                Console.WriteLine($"API Error: {ex.Message}");
                return new PaginatedList<ProductResponseDto>(); 
            }
        }

        public async Task<ProductDetailResponseDto?> GetProductByIdAsync(int id)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<ProductDetailResponseDto>>($"products/{id}");
                return response?.Data;
            } catch { return null; }
        }

        public async Task<UserCreditSummaryDto?> GetPostingCreditSummaryAsync()
        {
            try {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<UserCreditSummaryDto>>("CreditPackages/my-posting-credits");
                return response?.Data;
            } catch { return null; }
        }

        public async Task<UserCreditSummaryDto?> GetFeaturedCreditSummaryAsync()
        {
            try {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<UserCreditSummaryDto>>("CreditPackages/my-featured-credits");
                return response?.Data;
            } catch { return null; }
        }

        public async Task<ApiResponse<MyCreditsDto>?> GetMyCreditsAsync()
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<MyCreditsDto>>("Products/my-credits");
                return response;
            } catch { return new ApiResponse<MyCreditsDto> { Success = false, Message = "Lỗi kết nối", Data = new MyCreditsDto { PostingCredits = 0, FeaturedCredits = 0 } }; }
        }

        public async Task<ApiResponse<string>> UploadImageAsync(Microsoft.AspNetCore.Http.IFormFile file)
        {
            try
            {
                using var content = new MultipartFormDataContent();
                var fileContent = new StreamContent(file.OpenReadStream());
                fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType);
                content.Add(fileContent, "files", file.FileName);
                
                var response = await _httpClient.PostAsync("media/upload-images", content);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                    if (result.TryGetProperty("urls", out var urlsProp) && urlsProp.GetArrayLength() > 0)
                    {
                        return new ApiResponse<string> { Success = true, Data = urlsProp[0].GetString() };
                    }
                }
                var errorBody = await response.Content.ReadAsStringAsync();
                return new ApiResponse<string> { Success = false, Message = $"Lỗi upload: {response.StatusCode} - {errorBody}" };
            }
            catch (Exception ex)
            {
                return new ApiResponse<string> { Success = false, Message = ex.Message };
            }
        }

        public async Task<ApiResponse<object>?> CreateProductAsync(ProductCreateViewModel model)
        {
            try
            {
                var imageUrls = new List<string>();
                string? videoUrl = null;
                string? bannerUrl = null;

                // 1. Upload Images
                if (model.Images != null && model.Images.Any())
                {
                    using var content = new MultipartFormDataContent();
                    foreach (var file in model.Images)
                    {
                        var fileContent = new StreamContent(file.OpenReadStream());
                        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType);
                        content.Add(fileContent, "files", file.FileName);
                    }
                    var imgResponse = await _httpClient.PostAsync("media/upload-images", content);
                    if (imgResponse.IsSuccessStatusCode)
                    {
                        var imgResult = await imgResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                        if (imgResult.TryGetProperty("urls", out var urlsProp))
                        {
                            foreach (var url in urlsProp.EnumerateArray())
                            {
                                imageUrls.Add(url.GetString() ?? "");
                            }
                        }
                    }
                    else 
                    {
                        var errorBody = await imgResponse.Content.ReadAsStringAsync();
                        return new ApiResponse<object> { Success = false, Message = $"Lỗi khi upload hình ảnh: {imgResponse.StatusCode} - {errorBody}" };
                    }
                }

                // 2. Upload Video
                if (model.EnableVideoUpload && model.VideoFile != null)
                {
                    using var content = new MultipartFormDataContent();
                    var fileContent = new StreamContent(model.VideoFile.OpenReadStream());
                    fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(model.VideoFile.ContentType);
                    content.Add(fileContent, "file", model.VideoFile.FileName);
                    
                    var vidResponse = await _httpClient.PostAsync("media/upload-video", content);
                    if (vidResponse.IsSuccessStatusCode)
                    {
                        var vidResult = await vidResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                        if (vidResult.TryGetProperty("url", out var urlProp))
                        {
                            videoUrl = urlProp.GetString();
                        }
                    }
                }

                // 3. Upload Banner
                if (model.EnableBannerBoost && model.BannerFile != null)
                {
                    using var content = new MultipartFormDataContent();
                    var fileContent = new StreamContent(model.BannerFile.OpenReadStream());
                    fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(model.BannerFile.ContentType);
                    content.Add(fileContent, "files", model.BannerFile.FileName); // MediaController uses List<IFormFile> files for upload-images
                    
                    var banResponse = await _httpClient.PostAsync("media/upload-images", content);
                    if (banResponse.IsSuccessStatusCode)
                    {
                        var banResult = await banResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                        if (banResult.TryGetProperty("urls", out var urlsProp) && urlsProp.GetArrayLength() > 0)
                        {
                            bannerUrl = urlsProp[0].GetString();
                        }
                    }
                }

                // 4. Create Product
                var response = await _httpClient.PostAsJsonAsync("products", new {
                    title = model.Title,
                    categoryId = model.CategoryId,
                    price = model.Price,
                    condition = model.Condition,
                    description = model.Description,
                    brand = model.Brand,
                    imageUrls = imageUrls,
                    enableVideoUpload = model.EnableVideoUpload,
                    videoUrl = videoUrl,
                    enableBannerBoost = model.EnableBannerBoost,
                    bannerUrl = bannerUrl
                });

                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
                }
                else 
                {
                    var error = await response.Content.ReadAsStringAsync();
                    return new ApiResponse<object> { Success = false, Message = "Lỗi tạo sản phẩm: " + error };
                }
            } 
            catch (Exception ex) 
            { 
                return new ApiResponse<object> { Success = false, Message = "Lỗi hệ thống: " + ex.Message }; 
            }
        }

        public async Task<ApiResponse<object>?> UpdateProductAsync(int id, ProductCreateViewModel model)
        {
            try
            {
                var imageUrls = new List<string>();
                string? videoUrl = null;
                string? bannerUrl = null;

                // 1. Upload Images
                if (model.Images != null && model.Images.Any())
                {
                    using var content = new MultipartFormDataContent();
                    foreach (var file in model.Images)
                    {
                        var fileContent = new StreamContent(file.OpenReadStream());
                        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType);
                        content.Add(fileContent, "files", file.FileName);
                    }
                    var imgResponse = await _httpClient.PostAsync("media/upload-images", content);
                    if (imgResponse.IsSuccessStatusCode)
                    {
                        var imgResult = await imgResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                        if (imgResult.TryGetProperty("urls", out var urlsProp))
                        {
                            foreach (var url in urlsProp.EnumerateArray())
                            {
                                imageUrls.Add(url.GetString() ?? "");
                            }
                        }
                    }
                }

                if (model.ExistingImages != null && model.ExistingImages.Any())
                {
                    imageUrls.AddRange(model.ExistingImages);
                }

                // 2. Upload Video
                if (model.EnableVideoUpload && model.VideoFile != null)
                {
                    using var content = new MultipartFormDataContent();
                    var fileContent = new StreamContent(model.VideoFile.OpenReadStream());
                    fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(model.VideoFile.ContentType);
                    content.Add(fileContent, "file", model.VideoFile.FileName);
                    
                    var vidResponse = await _httpClient.PostAsync("media/upload-video", content);
                    if (vidResponse.IsSuccessStatusCode)
                    {
                        var vidResult = await vidResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                        if (vidResult.TryGetProperty("url", out var urlProp))
                        {
                            videoUrl = urlProp.GetString();
                        }
                    }
                }
                else if (model.EnableVideoUpload && !string.IsNullOrEmpty(model.ExistingVideoUrl))
                {
                    videoUrl = model.ExistingVideoUrl;
                }

                // 3. Upload Banner
                if (model.EnableBannerBoost && model.BannerFile != null)
                {
                    using var content = new MultipartFormDataContent();
                    var fileContent = new StreamContent(model.BannerFile.OpenReadStream());
                    fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(model.BannerFile.ContentType);
                    content.Add(fileContent, "files", model.BannerFile.FileName);
                    
                    var banResponse = await _httpClient.PostAsync("media/upload-images", content);
                    if (banResponse.IsSuccessStatusCode)
                    {
                        var banResult = await banResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                        if (banResult.TryGetProperty("urls", out var urlsProp) && urlsProp.GetArrayLength() > 0)
                        {
                            bannerUrl = urlsProp[0].GetString();
                        }
                    }
                }
                else if (model.EnableBannerBoost && !string.IsNullOrEmpty(model.ExistingBannerUrl))
                {
                    bannerUrl = model.ExistingBannerUrl;
                }


                // 4. Update Product
                var response = await _httpClient.PutAsJsonAsync($"products/{id}", new {
                    title = model.Title,
                    categoryId = model.CategoryId,
                    price = model.Price,
                    condition = model.Condition,
                    description = model.Description,
                    brand = model.Brand,
                    imageUrls = imageUrls,
                    enableVideoUpload = model.EnableVideoUpload,
                    videoUrl = videoUrl,
                    enableBannerBoost = model.EnableBannerBoost,
                    bannerUrl = bannerUrl
                });

                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
                }
                else 
                {
                    var error = await response.Content.ReadAsStringAsync();
                    return new ApiResponse<object> { Success = false, Message = "Lỗi cập nhật sản phẩm: " + error };
                }
            } 
            catch (Exception ex) 
            { 
                return new ApiResponse<object> { Success = false, Message = "Lỗi hệ thống: " + ex.Message }; 
            }
        }

        public async Task<ApiResponse<UserProfileDto>?> GetUserProfileAsync()
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<UserProfileDto>>("users/me");
                return response;
            } catch { return new ApiResponse<UserProfileDto> { Success = false, Message = "Lỗi kết nối Server" }; }
        }

        public async Task<ApiResponse<UserProfileDto>?> GetUserProfileByIdAsync(long userId)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<UserProfileDto>>($"users/{userId}");
                return response;
            } catch { return new ApiResponse<UserProfileDto> { Success = false, Message = "Lỗi kết nối Server" }; }
        }

        public async Task<ApiResponse<UserProfileDto>?> UpdateProfileAsync(object model)
        {
            try
            {
                var response = await _httpClient.PutAsJsonAsync("users/me", model);
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<ApiResponse<UserProfileDto>>();
                }
                var error = await response.Content.ReadAsStringAsync();
                return new ApiResponse<UserProfileDto> { Success = false, Message = "Lỗi cập nhật: " + error };
            } catch (Exception ex) { return new ApiResponse<UserProfileDto> { Success = false, Message = "Lỗi hệ thống: " + ex.Message }; }
        }

        public async Task<ApiResponse<object>?> ChangePasswordAsync(object model)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("auth/change-password", model);
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
                }
                var errorStr = await response.Content.ReadAsStringAsync();
                var errorMessage = "Lỗi đổi mật khẩu";
                try
                {
                    using var jsonDoc = System.Text.Json.JsonDocument.Parse(errorStr);
                    var root = jsonDoc.RootElement;
                    if (root.TryGetProperty("detail", out var detailProp) && detailProp.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        errorMessage = detailProp.GetString();
                    }
                    else if (root.TryGetProperty("errors", out var errorsProp))
                    {
                        foreach (var prop in errorsProp.EnumerateObject())
                        {
                            if (prop.Value.ValueKind == System.Text.Json.JsonValueKind.Array && prop.Value.GetArrayLength() > 0)
                            {
                                errorMessage = prop.Value[0].GetString();
                                break;
                            }
                        }
                    }
                    else if (root.TryGetProperty("message", out var msgProp) && msgProp.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        errorMessage = msgProp.GetString();
                    }
                    else
                    {
                        errorMessage = errorStr;
                    }
                }
                catch
                {
                    errorMessage = errorStr;
                }
                return new ApiResponse<object> { Success = false, Message = errorMessage };
            } catch (Exception ex) { return new ApiResponse<object> { Success = false, Message = "Lỗi hệ thống: " + ex.Message }; }
        }

        public async Task<ApiResponse<PaginatedList<ProductResponseDto>>?> GetMyProductsAsync(int pageIndex = 1, int pageSize = 10)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<PaginatedList<ProductResponseDto>>>($"products/me?pageNumber={pageIndex}&pageSize={pageSize}");
                return response;
            } catch { return new ApiResponse<PaginatedList<ProductResponseDto>> { Success = false, Message = "Lỗi kết nối Server" }; }
        }

        public async Task<ApiResponse<PaginatedList<ProductResponseDto>>?> GetSellerProductsAsync(long sellerId, int pageIndex = 1, int pageSize = 10)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<PaginatedList<ProductResponseDto>>>($"products/seller/{sellerId}?pageNumber={pageIndex}&pageSize={pageSize}");
                return response;
            } catch { return new ApiResponse<PaginatedList<ProductResponseDto>> { Success = false, Message = "Lỗi kết nối Server" }; }
        }

        public async Task<ApiResponse<PaginatedList<ProductResponseDto>>?> GetWishlistAsync(int pageIndex = 1, int pageSize = 10)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<List<ProductResponseDto>>>("wishlists/me");
                if (response?.Success == true && response.Data != null)
                {
                    var paginatedData = new PaginatedList<ProductResponseDto>
                    {
                        TotalCount = response.Data.Count,
                        TotalPages = (int)Math.Ceiling(response.Data.Count / (double)pageSize),
                        Items = response.Data.Skip((pageIndex - 1) * pageSize).Take(pageSize).ToList()
                    };
                    return new ApiResponse<PaginatedList<ProductResponseDto>> { Success = true, Data = paginatedData, Message = response.Message };
                }
                return new ApiResponse<PaginatedList<ProductResponseDto>> { Success = response?.Success ?? false, Message = response?.Message ?? "Lỗi tải danh sách yêu thích" };
            } catch { return new ApiResponse<PaginatedList<ProductResponseDto>> { Success = false, Message = "Lỗi kết nối Server" }; }
        }

        public async Task<ApiResponse<List<long>>?> GetWishlistIdsAsync()
        {
            try
            {
                return await _httpClient.GetFromJsonAsync<ApiResponse<List<long>>>("wishlists/my-ids");
            } catch { return new ApiResponse<List<long>> { Success = false, Message = "Lỗi kết nối Server" }; }
        }

        public async Task<ApiResponse<object>?> ToggleFollowAsync(long targetUserId)
        {
            try
            {
                var response = await _httpClient.PostAsync($"users/{targetUserId}/toggle-follow", null);
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
                }
                var error = await response.Content.ReadAsStringAsync();
                return new ApiResponse<object> { Success = false, Message = "Lỗi thao tác: " + error };
            } catch (Exception ex) { return new ApiResponse<object> { Success = false, Message = "Lỗi hệ thống: " + ex.Message }; }
        }

        public async Task<ApiResponse<object>?> ToggleWishlistAsync(long productId)
        {
            try
            {
                var response = await _httpClient.PostAsync($"wishlists/toggle/{productId}", null);
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
                }
                var error = await response.Content.ReadAsStringAsync();
                return new ApiResponse<object> { Success = false, Message = "Lỗi thao tác: " + error };
            } catch (Exception ex) { return new ApiResponse<object> { Success = false, Message = "Lỗi hệ thống: " + ex.Message }; }
        }

        public async Task<ApiResponse<object>?> GetFollowersAsync(long userId)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<object>>($"users/{userId}/followers?pageSize=100");
                return response;
            } catch { return new ApiResponse<object> { Success = false, Message = "Lỗi kết nối Server" }; }
        }

        public async Task<ApiResponse<object>?> GetFollowingAsync(long userId)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<object>>($"users/{userId}/following?pageSize=100");
                return response;
            } catch { return new ApiResponse<object> { Success = false, Message = "Lỗi kết nối Server" }; }
        }
        public async Task<ApiResponse<DashboardStatsViewModel>?> GetDashboardStatsAsync()
        {
            try
            {
                return await _httpClient.GetFromJsonAsync<ApiResponse<DashboardStatsViewModel>>("Admin/Dashboard");
            } catch { return null; }
        }

        public async Task<ApiResponse<RevenueStatsViewModel>?> GetRevenueStatsAsync(string filterType, int year, int? month = null, string? startDate = null, string? endDate = null)
        {
            try
            {
                var query = new List<string> { $"filterType={filterType}" };
                if (filterType == "year") query.Add($"year={year}");
                else if (filterType == "month") { query.Add($"year={year}"); if (month.HasValue) query.Add($"month={month.Value}"); }
                else if (filterType == "custom") { if (startDate != null) query.Add($"startDate={startDate}"); if (endDate != null) query.Add($"endDate={endDate}"); }
                
                string queryString = string.Join("&", query);
                return await _httpClient.GetFromJsonAsync<ApiResponse<RevenueStatsViewModel>>($"Admin/Revenue?{queryString}");
            } catch { return null; }
        }

        public async Task<ApiResponse<List<CreditPackageViewModel>>?> GetAdminPackagesAsync()
        {
            try
            {
                return await _httpClient.GetFromJsonAsync<ApiResponse<List<CreditPackageViewModel>>>("CreditPackages/active");
            } catch { return null; }
        }

        public async Task<ApiResponse<object>?> EditCreditPackageAsync(long id, CreditPackageViewModel model)
        {
            try
            {
                var response = await _httpClient.PutAsJsonAsync($"CreditPackages/{id}", model);
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
                }
                var error = await response.Content.ReadAsStringAsync();
                return new ApiResponse<object> { Success = false, Message = "Lỗi cập nhật: " + error };
            } catch (Exception ex) { return new ApiResponse<object> { Success = false, Message = "Lỗi hệ thống: " + ex.Message }; }
        }

        public async Task<ApiResponse<AdminUserPagedResult>?> GetAdminUsersAsync(int page, int pageSize, string search, bool? isActive)
        {
            try
            {
                var query = new List<string> { $"page={page}", $"pageSize={pageSize}" };
                if (!string.IsNullOrEmpty(search)) query.Add($"search={Uri.EscapeDataString(search)}");
                if (isActive.HasValue) query.Add($"isActive={isActive.Value}");
                
                string queryString = string.Join("&", query);
                return await _httpClient.GetFromJsonAsync<ApiResponse<AdminUserPagedResult>>($"Admin/Users?{queryString}");
            } catch { return null; }
        }

        public async Task<ApiResponse<object>> ToggleUserStatusAsync(long userId, bool isBanning, string reason)
        {
            try
            {
                var payload = new { IsActive = !isBanning, Reason = reason };
                var response = await _httpClient.PatchAsJsonAsync($"Admin/Users/{userId}/status", payload);
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
                }
                var error = await response.Content.ReadAsStringAsync();
                return new ApiResponse<object> { Success = false, Message = "Lỗi thao tác: " + error };
            } catch (Exception ex) { return new ApiResponse<object> { Success = false, Message = "Lỗi hệ thống: " + ex.Message }; }
        }

        public async Task<ApiResponse<AdminUserOverviewDto>?> GetUserOverviewAsync(long userId)
        {
            try
            {
                return await _httpClient.GetFromJsonAsync<ApiResponse<AdminUserOverviewDto>>($"Admin/Users/{userId}/overview");
            } catch { return null; }
        }

        public async Task<ApiResponse<TransactionPagedResult>?> GetUserTransactionsAsync(long userId, int page = 1, int pageSize = 10)
        {
            try
            {
                return await _httpClient.GetFromJsonAsync<ApiResponse<TransactionPagedResult>>($"Admin/Users/{userId}/transactions?page={page}&pageSize={pageSize}");
            } catch { return null; }
        }
    }
}
