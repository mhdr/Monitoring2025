using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class RemoveWriteActionMemoryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "current_execution_count",
                table: "write_action_memories");

            migrationBuilder.DropColumn(
                name: "input_item_id",
                table: "write_action_memories");

            migrationBuilder.DropColumn(
                name: "interval",
                table: "write_action_memories");

            migrationBuilder.DropColumn(
                name: "max_execution_count",
                table: "write_action_memories");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "current_execution_count",
                table: "write_action_memories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "input_item_id",
                table: "write_action_memories",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<int>(
                name: "interval",
                table: "write_action_memories",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "max_execution_count",
                table: "write_action_memories",
                type: "integer",
                nullable: true);
        }
    }
}
