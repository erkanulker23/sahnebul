<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class BlogRoutesTest extends TestCase
{
    public function test_admin_blog_crud_routes_exist(): void
    {
        $this->assertTrue(Route::has('admin.blog.index'));
        $this->assertTrue(Route::has('admin.blog.create'));
        $this->assertTrue(Route::has('admin.blog.edit'));
        $this->assertTrue(Route::has('admin.blog.store'));
        $this->assertTrue(Route::has('admin.blog.update'));
        $this->assertTrue(Route::has('admin.blog.destroy'));
    }
}
