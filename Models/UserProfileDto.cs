namespace REVORA_MVC_FE.Models
{
    public class UserProfileDto
    {
        [System.Text.Json.Serialization.JsonPropertyName("userId")]
        public long Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string BannerUrl { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public DateTime? Birthday { get; set; }
        public int FollowerCount { get; set; }
        public int FollowingCount { get; set; }
        public int PostingCredits { get; set; }
        public int FeaturedCredits { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsFollowing { get; set; }
    }
}
