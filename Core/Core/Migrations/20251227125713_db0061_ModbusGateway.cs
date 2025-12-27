using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0061_ModbusGateway : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "modbus_gateway_config",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: false),
                    listen_ip = table.Column<string>(type: "text", nullable: false, defaultValue: "0.0.0.0"),
                    port = table.Column<int>(type: "integer", nullable: false),
                    unit_id = table.Column<byte>(type: "smallint", nullable: false, defaultValue: (byte)1),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    connected_clients = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    last_read_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_write_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_modbus_gateway_config", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "modbus_gateway_mapping",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    gateway_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modbus_address = table.Column<int>(type: "integer", nullable: false),
                    register_type = table.Column<int>(type: "integer", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    register_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    data_representation = table.Column<int>(type: "integer", nullable: false, defaultValue: 2),
                    endianness = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    scale_min = table.Column<float>(type: "real", nullable: true),
                    scale_max = table.Column<float>(type: "real", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_modbus_gateway_mapping", x => x.id);
                    table.ForeignKey(
                        name: "FK_modbus_gateway_mapping_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_modbus_gateway_mapping_modbus_gateway_config_gateway_id",
                        column: x => x.gateway_id,
                        principalTable: "modbus_gateway_config",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_modbus_gateway_config_port",
                table: "modbus_gateway_config",
                column: "port",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_modbus_gateway_mapping_gateway_id",
                table: "modbus_gateway_mapping",
                column: "gateway_id");

            migrationBuilder.CreateIndex(
                name: "IX_modbus_gateway_mapping_gateway_id_register_type_modbus_addr~",
                table: "modbus_gateway_mapping",
                columns: new[] { "gateway_id", "register_type", "modbus_address" });

            migrationBuilder.CreateIndex(
                name: "IX_modbus_gateway_mapping_item_id",
                table: "modbus_gateway_mapping",
                column: "item_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "modbus_gateway_mapping");

            migrationBuilder.DropTable(
                name: "modbus_gateway_config");
        }
    }
}
