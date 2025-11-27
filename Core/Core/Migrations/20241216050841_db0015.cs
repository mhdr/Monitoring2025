using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0015 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "alarms",
                type: "boolean",
                nullable: true,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_alarms_item_id",
                table: "alarms",
                column: "item_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_alarms_item_id",
                table: "alarms");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "alarms");
        }
    }
}
