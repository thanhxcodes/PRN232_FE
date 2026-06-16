using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace REVORA_MVC_FE.Models.ViewModels
{
    public class ProductCreateViewModel
    {
        [Required(ErrorMessage = "Vui lòng nhập tên sản phẩm")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng chọn danh mục")]
        public int CategoryId { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn tình trạng")]
        public string Condition { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập giá")]
        [Range(1000, double.MaxValue, ErrorMessage = "Giá sản phẩm tối thiểu là 1,000 VNĐ")]
        public decimal Price { get; set; }

        public string? Brand { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập mô tả")]
        public string Description { get; set; } = string.Empty;

        // Note: For file uploads we use IFormFile
        public List<IFormFile> Images { get; set; } = new List<IFormFile>();

        public bool EnableVideoUpload { get; set; }
        public IFormFile? VideoFile { get; set; }

        public bool EnableBannerBoost { get; set; }
        public IFormFile? BannerFile { get; set; }
    }
}
