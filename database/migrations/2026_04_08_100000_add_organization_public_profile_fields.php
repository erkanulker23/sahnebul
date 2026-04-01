<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('organization_public_slug', 120)->nullable()->unique()->after('organization_tax_number');
            $table->longText('organization_about')->nullable()->after('organization_public_slug');
            $table->string('organization_cover_image')->nullable()->after('organization_about');
            $table->string('organization_website')->nullable()->after('organization_cover_image');
            $table->json('organization_social_links')->nullable()->after('organization_website');
            $table->string('organization_meta_description', 512)->nullable()->after('organization_social_links');
            $table->boolean('organization_profile_published')->default(false)->after('organization_meta_description');
            $table->unsignedBigInteger('organization_profile_view_count')->default(0)->after('organization_profile_published');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'organization_public_slug',
                'organization_about',
                'organization_cover_image',
                'organization_website',
                'organization_social_links',
                'organization_meta_description',
                'organization_profile_published',
                'organization_profile_view_count',
            ]);
        });
    }
};
