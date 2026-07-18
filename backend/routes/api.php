<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Operator\BusController;
use App\Http\Controllers\Api\Operator\DashboardController;
use App\Http\Controllers\Api\Operator\DiscountConfigController;
use App\Http\Controllers\Api\Operator\InvoiceController;
use App\Http\Controllers\Api\Operator\PaymentController;
use App\Http\Controllers\Api\Operator\ProfileController;
use App\Http\Controllers\Api\Operator\RouteController;
use App\Http\Controllers\Api\Operator\StaffController;
use App\Http\Controllers\Api\Operator\StudentController;
use App\Http\Controllers\Api\ParentPortal\InvoiceController as ParentInvoiceController;
use App\Http\Controllers\Api\ParentPortal\QuoteController;
use App\Http\Controllers\Api\ParentPortal\RouteController as ParentRouteController;
use App\Http\Controllers\Api\ParentPortal\StudentController as ParentStudentController;
use App\Http\Controllers\Api\Public\OperatorRegistrationController;
use App\Http\Controllers\Api\Public\RegistrationController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::post('/register-operator', [OperatorRegistrationController::class, 'store']);

Route::get('/register/{operatorCode}', [RegistrationController::class, 'show']);
Route::post('/register/{operatorCode}', [RegistrationController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('tenant')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);

        Route::middleware('role:operator_admin|operator_staff')->prefix('operator')->group(function () {
            Route::apiResource('buses', BusController::class)->except(['store', 'update', 'destroy']);
            Route::apiResource('staff', StaffController::class)->except(['store', 'update', 'destroy']);
            Route::apiResource('routes', RouteController::class)->except(['store', 'update', 'destroy']);
            Route::get('discount-config', [DiscountConfigController::class, 'show']);
            Route::get('invoices', [InvoiceController::class, 'index']);
            Route::get('invoices/export', [InvoiceController::class, 'export']);
            Route::get('dashboard/summary', [DashboardController::class, 'summary']);
            Route::get('students', [StudentController::class, 'index']);

            Route::middleware('role:operator_admin')->group(function () {
                Route::apiResource('buses', BusController::class)->only(['store', 'update', 'destroy']);
                Route::apiResource('staff', StaffController::class)->only(['store', 'update', 'destroy']);
                Route::apiResource('routes', RouteController::class)->only(['store', 'update', 'destroy']);
                Route::put('discount-config', [DiscountConfigController::class, 'update']);
                Route::post('invoices/{invoice}/payments', [PaymentController::class, 'store']);
                Route::put('profile', [ProfileController::class, 'update']);
                Route::post('profile/logo', [ProfileController::class, 'updateLogo']);
            });
        });

        Route::middleware('role:parent')->prefix('parent')->group(function () {
            Route::get('routes', [ParentRouteController::class, 'index']);
            Route::get('students', [ParentStudentController::class, 'index']);
            Route::post('students', [ParentStudentController::class, 'store']);
            Route::post('quote', [QuoteController::class, 'store']);
            Route::get('invoices', [ParentInvoiceController::class, 'index']);
        });
    });
});
