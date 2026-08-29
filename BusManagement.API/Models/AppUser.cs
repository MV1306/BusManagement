namespace BusManagement.API.Models;

public class AppUser
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "User"; // "Admin" | "User"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
