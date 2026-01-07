using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0070 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "input_item_id",
                table: "totalizer_memory");

            migrationBuilder.DropColumn(
                name: "output_item_id",
                table: "totalizer_memory");

            migrationBuilder.AddColumn<string>(
                name: "input_reference",
                table: "totalizer_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "input_type",
                table: "totalizer_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "output_reference",
                table: "totalizer_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "output_type",
                table: "totalizer_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "input_reference",
                table: "totalizer_memory");

            migrationBuilder.DropColumn(
                name: "input_type",
                table: "totalizer_memory");

            migrationBuilder.DropColumn(
                name: "output_reference",
                table: "totalizer_memory");

            migrationBuilder.DropColumn(
                name: "output_type",
                table: "totalizer_memory");

            migrationBuilder.AddColumn<Guid>(
                name: "input_item_id",
                table: "totalizer_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "output_item_id",
                table: "totalizer_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }
    }
}
