using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddHysteresisControlToPIDMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "digital_output_item_id",
                table: "pid_memory",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "hysteresis_high_threshold",
                table: "pid_memory",
                type: "double precision",
                nullable: false,
                defaultValue: 75.0);

            migrationBuilder.AddColumn<double>(
                name: "hysteresis_low_threshold",
                table: "pid_memory",
                type: "double precision",
                nullable: false,
                defaultValue: 25.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "digital_output_item_id",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "hysteresis_high_threshold",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "hysteresis_low_threshold",
                table: "pid_memory");
        }
    }
}
