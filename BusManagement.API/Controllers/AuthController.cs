using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BusManagement.API.Data;
using BusManagement.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(BusManagementDbContext db, IConfiguration config) : ControllerBase
{
    private readonly PasswordHasher<AppUser> _hasher = new();

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthRequest req)
    {
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.Username == req.Username);
        if (user is null)
            return Unauthorized(new { message = "Invalid credentials" });

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "Invalid credentials" });

        return Ok(new { token = GenerateToken(user), role = user.Role, username = user.Username });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AuthRequest req)
    {
        if (await db.AppUsers.AnyAsync(u => u.Username == req.Username))
            return Conflict(new { message = "Username already taken" });

        var user = new AppUser { Username = req.Username, Role = "User" };
        user.PasswordHash = _hasher.HashPassword(user, req.Password);

        db.AppUsers.Add(user);
        await db.SaveChangesAsync();

        return Ok(new { token = GenerateToken(user), role = user.Role, username = user.Username });
    }

    private string GenerateToken(AppUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
        };
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public record AuthRequest(string Username, string Password);
