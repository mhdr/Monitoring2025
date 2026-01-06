using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddGlobalVariableSupportToPIDMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "digital_output_item_id",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "input_item_id",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "is_auto_id",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "manual_value_id",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "output_item_id",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "reverse_output_id",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "set_point_id",
                table: "pid_memory");

            migrationBuilder.AddColumn<string>(
                name: "digital_output_reference",
                table: "pid_memory",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "digital_output_type",
                table: "pid_memory",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "input_reference",
                table: "pid_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "input_type",
                table: "pid_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "is_auto_reference",
                table: "pid_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "is_auto_type",
                table: "pid_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "manual_value_reference",
                table: "pid_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "manual_value_type",
                table: "pid_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "output_reference",
                table: "pid_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "output_type",
                table: "pid_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "reverse_output_reference",
                table: "pid_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "reverse_output_type",
                table: "pid_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "set_point_reference",
                table: "pid_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "set_point_type",
                table: "pid_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "digital_output_reference",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "digital_output_type",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "input_reference",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "input_type",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "is_auto_reference",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "is_auto_type",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "manual_value_reference",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "manual_value_type",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "output_reference",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "output_type",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "reverse_output_reference",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "reverse_output_type",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "set_point_reference",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "set_point_type",
                table: "pid_memory");

            migrationBuilder.AddColumn<Guid>(
                name: "digital_output_item_id",
                table: "pid_memory",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "input_item_id",
                table: "pid_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "is_auto_id",
                table: "pid_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "manual_value_id",
                table: "pid_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "output_item_id",
                table: "pid_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "reverse_output_id",
                table: "pid_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "set_point_id",
                table: "pid_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }
    }
}
