using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class RemoveScheduleMemoryOverrideFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "last_active_block_id",
                table: "schedule_memory");

            migrationBuilder.DropColumn(
                name: "manual_override_active",
                table: "schedule_memory");

            migrationBuilder.DropColumn(
                name: "manual_override_analog_value",
                table: "schedule_memory");

            migrationBuilder.DropColumn(
                name: "manual_override_digital_value",
                table: "schedule_memory");

            migrationBuilder.DropColumn(
                name: "override_activation_time",
                table: "schedule_memory");

            migrationBuilder.DropColumn(
                name: "override_duration_minutes",
                table: "schedule_memory");

            migrationBuilder.DropColumn(
                name: "override_expiration_mode",
                table: "schedule_memory");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "last_active_block_id",
                table: "schedule_memory",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "manual_override_active",
                table: "schedule_memory",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "manual_override_analog_value",
                table: "schedule_memory",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "manual_override_digital_value",
                table: "schedule_memory",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "override_activation_time",
                table: "schedule_memory",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "override_duration_minutes",
                table: "schedule_memory",
                type: "integer",
                nullable: false,
                defaultValue: 60);

            migrationBuilder.AddColumn<int>(
                name: "override_expiration_mode",
                table: "schedule_memory",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }
    }
}
