<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * SQLite: users.role was created with CHECK (role in ('customer','artist','admin')) so
 * super_admin / venue_owner / manager_organization inserts fail. MySQL uses ENUM migrations
 * only; this aligns SQLite with the full role set (plain varchar, no CHECK).
 *
 * DDL is built from PRAGMA table_info so this runs correctly no matter how many user-column
 * migrations have already been applied (avoids INSERT column count mismatch).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            return;
        }

        $row = DB::selectOne("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'");
        $ddl = is_object($row) && isset($row->sql) ? (string) $row->sql : '';
        if ($ddl === '' || ! str_contains(strtolower($ddl), 'check ("role"')) {
            return;
        }

        DB::statement('PRAGMA foreign_keys=OFF');

        Schema::rename('users', 'users_role_sqlite_fix_old');

        $createSql = $this->sqliteCreateUsersDdlFromPragma('users_role_sqlite_fix_old');
        DB::statement($createSql);

        DB::statement('INSERT INTO "users" SELECT * FROM "users_role_sqlite_fix_old"');
        Schema::drop('users_role_sqlite_fix_old');

        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" on "users" ("email")');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_unique" on "users" ("google_id")');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "users_instagram_id_unique" on "users" ("instagram_id")');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "users_organization_public_slug_unique" on "users" ("organization_public_slug")');

        DB::statement('PRAGMA foreign_keys=ON');
    }

    /**
     * @return non-empty-string
     */
    private function sqliteCreateUsersDdlFromPragma(string $sourceTable): string
    {
        /** @var list<object{cid:int,name:string,type:string,notnull:int,dflt_value:mixed,pk:int}> $rows */
        $rows = DB::select('PRAGMA table_info('.$sourceTable.')');
        $parts = [];
        foreach ($rows as $r) {
            $name = $r->name;
            if ($name === 'role') {
                $parts[] = '"role" varchar not null default \'customer\'';

                continue;
            }
            if ((int) $r->pk === 1 && $name === 'id') {
                $parts[] = '"id" integer primary key autoincrement not null';

                continue;
            }
            $type = $r->type !== '' ? $r->type : 'varchar';
            $line = '"'.$name.'" '.$type;
            if ((int) $r->notnull === 1) {
                $line .= ' not null';
            }
            if ($r->dflt_value !== null) {
                $line .= ' default '.$r->dflt_value;
            }
            $parts[] = $line;
        }

        return 'CREATE TABLE "users" ('.implode(', ', $parts).')';
    }

    public function down(): void
    {
        // Reverting would re-impose a stale CHECK; migrate:fresh is the practical rollback.
    }
};
