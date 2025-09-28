using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DB.User.Migrations
{
    /// <inheritdoc />
    public partial class db0002 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FirstNameFa",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastNameFa",
                table: "AspNetUsers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FirstNameFa",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "LastNameFa",
                table: "AspNetUsers");
        }
    }
}
