using Core.Libs;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Core.Libs
{
    using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
}

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class MyMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

            migrationBuilder.Sql(@"CREATE EXTENSION IF NOT EXISTS ""uuid-ossp"";");

            // Drop the existing table if it exists
            migrationBuilder.DropTable(
                name: "items_history");

            migrationBuilder.DropTable(
                name: "alarm_history");


            // Create the base partitioned table
            migrationBuilder.Sql(@"CREATE TABLE public.items_history (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	""time"" int8 NOT NULL,
	item_id uuid NOT NULL,
	value text NOT NULL,
	CONSTRAINT ""PK_items_history"" PRIMARY KEY (id, ""time"")
) PARTITION BY RANGE (time);
CREATE INDEX ""IX_items_history_item_id"" ON public.items_history USING btree (item_id);
CREATE INDEX ""IX_items_history_item_id_time"" ON public.items_history USING btree (item_id, ""time"");
CREATE INDEX ""IX_items_history_time"" ON public.items_history USING btree (""time"");");

            migrationBuilder.Sql(@"CREATE TABLE public.alarm_history (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	""time"" int8 NOT NULL,
	item_id uuid NOT NULL,
	alarm_id uuid NOT NULL,
	is_active bool NOT NULL,
	alarm_log text NULL,
	CONSTRAINT ""PK_alarm_history"" PRIMARY KEY (id, ""time"")
) PARTITION BY RANGE (time);
CREATE INDEX ""IX_alarm_history_alarm_id"" ON public.alarm_history USING btree (alarm_id);
CREATE INDEX ""IX_alarm_history_item_id"" ON public.alarm_history USING btree (item_id);
CREATE INDEX ""IX_alarm_history_item_id_time"" ON public.alarm_history USING btree (item_id, ""time"");
CREATE INDEX ""IX_alarm_history_time"" ON public.alarm_history USING btree (""time"");");

            // Create partitions for each month
            for (int year = 2015; year <= 2025; year++)
            {
                for (int month = 1; month <= 12; month++)
                {
                    var startTimestamp = new DateTime(year, month, 1).ToUnixTimeSeconds();
                    var endTimestamp = new DateTime(year, month, DateTime.DaysInMonth(year, month)).AddDays(1)
                        .ToUnixTimeSeconds();

                    migrationBuilder.Sql($@"
                        CREATE TABLE IF NOT EXISTS items_history_{year}{month:D2} PARTITION OF items_history
                        FOR VALUES FROM ({startTimestamp}) TO ({endTimestamp});
                    ");

                    migrationBuilder.Sql($@"
                        CREATE TABLE IF NOT EXISTS alarm_history_{year}{month:D2} PARTITION OF alarm_history
                        FOR VALUES FROM ({startTimestamp}) TO ({endTimestamp});
                    ");
                }
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS items_history;
            ");

            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS alarm_history;
            ");

            migrationBuilder.Sql(@"
                DECLARE @sql NVARCHAR(MAX) = N'';
                SELECT @sql += 'DROP TABLE ' + QUOTENAME(TABLE_SCHEMA) + '.' + QUOTENAME(TABLE_NAME) + '; '
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME LIKE 'items_history_%';
                EXEC sp_executesql @sql;
            ");

            migrationBuilder.Sql(@"
                DECLARE @sql NVARCHAR(MAX) = N'';
                SELECT @sql += 'DROP TABLE ' + QUOTENAME(TABLE_SCHEMA) + '.' + QUOTENAME(TABLE_NAME) + '; '
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME LIKE 'alarm_history_%';
                EXEC sp_executesql @sql;
            ");

            migrationBuilder.Sql("DROP EXTENSION IF EXISTS pgcrypto;");

            migrationBuilder.Sql(@"DROP EXTENSION IF EXISTS ""uuid-ossp"";");
        }
    }
}