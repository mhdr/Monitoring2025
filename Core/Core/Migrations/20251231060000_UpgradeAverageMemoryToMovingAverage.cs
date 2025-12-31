using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class UpgradeAverageMemoryToMovingAverage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add new columns to average_memory table for Moving Average functionality
            migrationBuilder.AddColumn<int>(
                name: "average_type",
                table: "average_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0); // Simple = 0

            migrationBuilder.AddColumn<int>(
                name: "window_size",
                table: "average_memory",
                type: "integer",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<double>(
                name: "alpha",
                table: "average_memory",
                type: "double precision",
                nullable: false,
                defaultValue: 0.2);

            migrationBuilder.AddColumn<bool>(
                name: "use_linear_weights",
                table: "average_memory",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            // Create sample history table for moving average calculations
            migrationBuilder.CreateTable(
                name: "average_memory_sample",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    average_memory_id = table.Column<Guid>(type: "uuid", nullable: false),
                    timestamp = table.Column<long>(type: "bigint", nullable: false),
                    value = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_average_memory_sample", x => x.id);
                    table.ForeignKey(
                        name: "FK_average_memory_sample_average_memory_average_memory_id",
                        column: x => x.average_memory_id,
                        principalTable: "average_memory",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Create composite index for efficient windowed queries
            migrationBuilder.CreateIndex(
                name: "IX_average_memory_sample_average_memory_id_timestamp",
                table: "average_memory_sample",
                columns: new[] { "average_memory_id", "timestamp" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "average_memory_sample");

            migrationBuilder.DropColumn(
                name: "average_type",
                table: "average_memory");

            migrationBuilder.DropColumn(
                name: "window_size",
                table: "average_memory");

            migrationBuilder.DropColumn(
                name: "alpha",
                table: "average_memory");

            migrationBuilder.DropColumn(
                name: "use_linear_weights",
                table: "average_memory");
        }
    }
}
