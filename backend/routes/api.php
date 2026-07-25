<?php

use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\OperatorController as AdminOperatorController;
use App\Http\Controllers\Api\Admin\TransactionController as AdminTransactionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Operator\BusController;
use App\Http\Controllers\Api\Operator\DashboardController;
use App\Http\Controllers\Api\Operator\DiscountConfigController;
use App\Http\Controllers\Api\Operator\InvoiceController;
use App\Http\Controllers\Api\Operator\PaymentController;
use App\Http\Controllers\Api\Operator\ProfileController;
use App\Http\Controllers\Api\Operator\RouteController;
use App\Http\Controllers\Api\Operator\StaffController;
use App\Http\Controllers\Api\Operator\StudentApplicationController;
use App\Http\Controllers\Api\Operator\StudentController;
use App\Http\Controllers\Api\ParentPortal\InvoiceController as ParentInvoiceController;
use App\Http\Controllers\Api\ParentPortal\ProfileController as ParentProfileController;
use App\Http\Controllers\Api\ParentPortal\QuoteController;
use App\Http\Controllers\Api\ParentPortal\RouteController as ParentRouteController;
use App\Http\Controllers\Api\ParentPortal\StudentApplicationController as ParentStudentApplicationController;
use App\Http\Controllers\Api\ParentPortal\StudentController as ParentStudentController;
use App\Http\Controllers\Api\Public\ContactController;
use App\Http\Controllers\Api\Public\OperatorRegistrationController;
use App\Http\Controllers\Api\Public\PasswordResetController;
use App\Http\Controllers\Api\Public\RegistrationController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
Route::post('/reset-password', [PasswordResetController::class, 'reset']);

Route::post('/register-operator', [OperatorRegistrationController::class, 'store']);

Route::post('/contact', [ContactController::class, 'store']);

Route::get('/register/{operatorCode}', [RegistrationController::class, 'show']);
Route::post('/register/{operatorCode}', [RegistrationController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::middleware('role:saas_admin')->prefix('admin')->group(function () {
        Route::get('dashboard/summary', [AdminDashboardController::class, 'summary']);
        Route::get('operators', [AdminOperatorController::class, 'index']);
        Route::get('operators/{operator}', [AdminOperatorController::class, 'show']);
        Route::get('transactions', [AdminTransactionController::class, 'index']);
    });

    Route::middleware('tenant')->group(function () {
        Route::middleware('role:operator_admin|operator_staff')->prefix('operator')->group(function () {
            Route::apiResource('buses', BusController::class)->except(['store', 'update', 'destroy']);
            Route::apiResource('staff', StaffController::class)->except(['store', 'update', 'destroy']);
            Route::apiResource('routes', RouteController::class)->except(['store', 'update', 'destroy']);
            Route::get('discount-config', [DiscountConfigController::class, 'show']);
            Route::get('invoices', [InvoiceController::class, 'index']);
            Route::get('invoices/export', [InvoiceController::class, 'export']);
            Route::get('invoices/{invoice}/receipt', [InvoiceController::class, 'receipt']);
            Route::get('dashboard/summary', [DashboardController::class, 'summary']);
            Route::get('students', [StudentController::class, 'index']);
            Route::get('student-applications', [StudentApplicationController::class, 'index']);
            Route::get('student-applications/{studentApplication}', [StudentApplicationController::class, 'show']);

            Route::middleware('role:operator_admin')->group(function () {
                Route::apiResource('buses', BusController::class)->only(['store', 'update', 'destroy']);
                Route::apiResource('staff', StaffController::class)->only(['store', 'update', 'destroy']);
                Route::apiResource('routes', RouteController::class)->only(['store', 'update', 'destroy']);
                Route::put('discount-config', [DiscountConfigController::class, 'update']);
                Route::post('invoices/{invoice}/payments', [PaymentController::class, 'store']);
                Route::put('profile', [ProfileController::class, 'update']);
                Route::post('profile/logo', [ProfileController::class, 'updateLogo']);
                Route::post('buses/{bus}/avatar', [BusController::class, 'uploadAvatar']);
                Route::post('staff/{staff}/avatar', [StaffController::class, 'uploadAvatar']);
                Route::post('student-applications/{studentApplication}/approve', [StudentApplicationController::class, 'approve']);
                Route::post('student-applications/{studentApplication}/reject', [StudentApplicationController::class, 'reject']);
            });
        });

        Route::middleware('role:parent')->prefix('parent')->group(function () {
            Route::get('routes', [ParentRouteController::class, 'index']);
            Route::get('students', [ParentStudentController::class, 'index']);
            Route::get('student-applications', [ParentStudentApplicationController::class, 'index']);
            Route::post('student-applications', [ParentStudentApplicationController::class, 'store']);
            Route::post('quote', [QuoteController::class, 'store']);
            Route::get('invoices', [ParentInvoiceController::class, 'index']);
            Route::get('invoices/{invoice}/receipt', [ParentInvoiceController::class, 'receipt']);
            Route::put('profile', [ParentProfileController::class, 'update']);
            Route::post('profile/avatar', [ParentProfileController::class, 'uploadAvatar']);
        });
    });
});
