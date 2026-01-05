using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class RemovePIDMemoryStaticProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_auto",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "manual_value",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "reverse_output",
                table: "pid_memory");

            migrationBuilder.DropColumn(
                name: "set_point",
                table: "pid_memory");

            migrationBuilder.AlterColumn<Guid>(
                name: "set_point_id",
                table: "pid_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "reverse_output_id",
                table: "pid_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "manual_value_id",
                table: "pid_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "is_auto_id",
                table: "pid_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "is_disabled",
                table: "average_memory",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "set_point_id",
                table: "pid_memory",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<Guid>(
                name: "reverse_output_id",
                table: "pid_memory",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<Guid>(
                name: "manual_value_id",
                table: "pid_memory",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<Guid>(
                name: "is_auto_id",
                table: "pid_memory",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<bool>(
                name: "is_auto",
                table: "pid_memory",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<double>(
                name: "manual_value",
                table: "pid_memory",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "reverse_output",
                table: "pid_memory",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "set_point",
                table: "pid_memory",
                type: "double precision",
                nullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "is_disabled",
                table: "average_memory",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");
        }
    }
}
