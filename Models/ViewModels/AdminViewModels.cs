using System;
using System.Collections.Generic;

namespace REVORA_MVC_FE.Models.ViewModels
{
    public class DashboardStatsViewModel
    {
        public decimal CurrentMonthRevenue { get; set; }
        public decimal RevenueGrowth { get; set; }
        public int PackagesSold { get; set; }
        public decimal PackagesSoldGrowth { get; set; }
        public int TotalUsers { get; set; }
        public decimal TotalUsersGrowth { get; set; }
        public int ActiveProducts { get; set; }
        public decimal ActiveProductsGrowth { get; set; }
        public List<RevenueChartItem> RevenueChart7Days { get; set; } = new List<RevenueChartItem>();
        public List<PackageDistributionItem> PackageDistribution { get; set; } = new List<PackageDistributionItem>();
        public List<RecentActivityItem> RecentActivities { get; set; } = new List<RecentActivityItem>();
    }

    public class RevenueChartItem
    {
        public string Label { get; set; } = string.Empty;
        public decimal Posting { get; set; }
        public decimal Featured { get; set; }
    }

    public class PackageDistributionItem
    {
        public string Name { get; set; } = string.Empty;
        public int Value { get; set; }
        public string Color { get; set; } = string.Empty;
    }

    public class RecentActivityItem
    {
        public string User { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Time { get; set; } = string.Empty;
    }

    public class RevenueStatsViewModel
    {
        public decimal TotalRevenue { get; set; }
        public decimal RevenueGrowth { get; set; }
        public List<RevenueByPackageItem> RevenueByPackages { get; set; } = new List<RevenueByPackageItem>();
        public List<RevenueChartItem> ChartData { get; set; } = new List<RevenueChartItem>();
        public List<TransactionItem> Transactions { get; set; } = new List<TransactionItem>();
    }

    public class RevenueByPackageItem
    {
        public string PackageName { get; set; } = string.Empty;
        public decimal Revenue { get; set; }
    }

    public class TransactionItem
    {
        public string Id { get; set; } = string.Empty;
        public string User { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string Package { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Date { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class CreditPackageViewModel
    {
        public int PaidCreditPackageId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int CreditTypeId { get; set; }
        public string CreditTypeName { get; set; } = string.Empty;
        public int CreditAmount { get; set; }
        public int? DurationDays { get; set; }
        public decimal OriginalPrice { get; set; }
        public double DiscountRate { get; set; }
        public decimal DiscountedPrice { get; set; }
        public int? RewardBadgeId { get; set; }
        public int? BadgeDurationDays { get; set; }
        public bool IsActive { get; set; }
        public List<string> Descriptions { get; set; } = new List<string>();
    }

    public class AdminUserViewModel
    {
        public long UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int TradeSuccessCount { get; set; }
        public bool IsActive { get; set; }
    }

    public class AdminUserPagedResult
    {
        public List<AdminUserViewModel> Items { get; set; } = new List<AdminUserViewModel>();
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
    }
    public class AdminUserOverviewDto
    {
        public int PostingCredits { get; set; }
        public int FeaturedCredits { get; set; }
        public decimal TotalSpent { get; set; }
        public int ProductsPosted { get; set; }
        public int TotalTransactions { get; set; }
        public List<TransactionResponseDto> RecentTransactions { get; set; } = new List<TransactionResponseDto>();
    }

    public class TransactionResponseDto
    {
        public string OrderCode { get; set; } = string.Empty;
        public string PackageName { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int Credits { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class TransactionPagedResult
    {
        public List<TransactionResponseDto> Items { get; set; } = new List<TransactionResponseDto>();
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
    }
    public class AdminProductOwnerDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Avatar { get; set; } = string.Empty;
    }

    public class AdminProductViewModel
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Category { get; set; } = string.Empty;
        public List<string> Images { get; set; } = new List<string>();
        public AdminProductOwnerDto Owner { get; set; } = new AdminProductOwnerDto();
        public string CreatedAt { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int Views { get; set; }
        public int ContactCount { get; set; }
        public bool IsFeatured { get; set; }
        public string Condition { get; set; } = string.Empty;
        public string Size { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
    }

    public class AdminProductPagedResult
    {
        public List<AdminProductViewModel> Items { get; set; } = new List<AdminProductViewModel>();
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
        public AdminProductStatsViewModel Stats { get; set; } = new AdminProductStatsViewModel();
    }

    public class AdminProductStatsViewModel
    {
        public int TotalPosts { get; set; }
        public int ActivePosts { get; set; }
        public int PendingAds { get; set; }
        public int ViolatedPosts { get; set; }
        public int DeletedPosts { get; set; }
    }
}
