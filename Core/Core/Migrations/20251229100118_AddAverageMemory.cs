using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddAverageMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "average_memory",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: true),
                    input_item_ids = table.Column<string>(type: "text", nullable: false),
                    output_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    interval = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    weights = table.Column<string>(type: "text", nullable: true),
                    ignore_stale = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    stale_timeout = table.Column<long>(type: "bigint", nullable: false, defaultValue: 60L),
                    enable_outlier_detection = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    outlier_method = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    outlier_threshold = table.Column<double>(type: "double precision", nullable: false, defaultValue: 1.5),
                    minimum_inputs = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_average_memory", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "average_memory");
        }
    }
}
