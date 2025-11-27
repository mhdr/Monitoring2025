using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Core.Libs;
using Microsoft.EntityFrameworkCore;
using DataType = Core.Libs.DataType;

namespace Core.Models;

[Table("controller_sharp7")]
public class ControllerSharp7
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("ip_address")] public string IPAddress { get; set; } = string.Empty;
    [Column("db_address")] public int DBAddress { get; set; }
    [Column("db_start_data")] public int DBStartData { get; set; }
    [Column("db_size_data")] public int DBSizeData { get; set; }
    [Column("data_type")] public DataType DataType { get; set; }

    [DefaultValue(false)]
    [Column("is_disabled")] public bool? IsDisabled { get; set; } = false;

    [DefaultValue("")]
    [Column("username")]
    public string? Username { get; set; }

    [NotMapped]
    public string Password
    {
        get
        {
            try
            {
                if (EncryptedPassword != null) return EncryptionHelper.DecryptData(EncryptedPassword);
            }
            catch (Exception)
            {
                // ignored
            }

            return "";
        }
        set => EncryptedPassword = EncryptionHelper.EncryptData(value);
    }

    [Column("encrypted_password")] public byte[]? EncryptedPassword { get; set; }
}