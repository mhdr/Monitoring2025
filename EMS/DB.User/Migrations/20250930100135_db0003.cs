using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DB.User.Migrations
{
    /// <inheritdoc />
    public partial class db0003 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "name_fa",
                table: "groups",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "name_fa",
                table: "groups");
        }
    }
}
