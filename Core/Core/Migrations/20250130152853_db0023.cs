using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0023 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "dead_band",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "feed_forward",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "max_rate_of_change",
                table: "pid_memory");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "dead_band",
                table: "pid_memory",
                type: "double precision",
                nullable: false,
                defaultValue: 1.0);

            migrationBuilder.AddColumn<double>(
                name: "feed_forward",
                table: "pid_memory",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "max_rate_of_change",
                table: "pid_memory",
                type: "double precision",
                nullable: false,
                defaultValue: 10.0);
        }
    }
}
