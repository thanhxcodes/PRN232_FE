using System;

namespace REVORA_MVC_FE.Models.ViewModels
{
    public class NotificationViewModel
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public bool Read { get; set; }
        public string? ReferenceId { get; set; }
    }
}
