using Microsoft.AspNetCore.Identity;

namespace DB.User.Models;

public class ApplicationUser : IdentityUser
{
    public ApplicationUser() : base()
    {
        
    }

    public ApplicationUser(string userName) : base(userName)
    {
        
    }
    
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}