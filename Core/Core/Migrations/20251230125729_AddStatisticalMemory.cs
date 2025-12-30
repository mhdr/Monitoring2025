using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddStatisticalMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "statistical_memory",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: true),
                    input_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    interval = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    window_size = table.Column<int>(type: "integer", nullable: false, defaultValue: 100),
                    window_type = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    min_samples = table.Column<int>(type: "integer", nullable: false, defaultValue: 2),
                    output_min_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    output_max_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    output_avg_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    output_stddev_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    output_range_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    output_median_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    output_cv_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    percentiles_config = table.Column<string>(type: "text", nullable: false),
                    current_batch_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    last_reset_time = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_statistical_memory", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "statistical_memory_sample",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    statistical_memory_id = table.Column<Guid>(type: "uuid", nullable: false),
                    timestamp = table.Column<long>(type: "bigint", nullable: false),
                    value = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_statistical_memory_sample", x => x.id);
                    table.ForeignKey(
                        name: "FK_statistical_memory_sample_statistical_memory_statistical_me~",
                        column: x => x.statistical_memory_id,
                        principalTable: "statistical_memory",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_statistical_memory_sample_statistical_memory_id_timestamp",
                table: "statistical_memory_sample",
                columns: new[] { "statistical_memory_id", "timestamp" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "statistical_memory_sample");

            migrationBuilder.DropTable(
                name: "statistical_memory");
        }
    }
}
