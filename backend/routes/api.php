<?php

use App\Http\Controllers\Api\Admin\ActivityLogController;
use App\Http\Controllers\Api\Admin\BillplzSettingsController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\ImpersonationController;
use App\Http\Controllers\Api\Admin\OperatorController as AdminOperatorController;
use App\Http\Controllers\Api\Admin\OperatorNoteController;
use App\Http\Controllers\Api\Admin\PaymentAttemptController;
use App\Http\Controllers\Api\Admin\PlanController;
use App\Http\Controllers\Api\Admin\TeamController;
use App\Http\Controllers\Api\Admin\TransactionController as AdminTransactionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Driver\AuthController as DriverAuthController;
use App\Http\Controllers\Api\Driver\TripController as DriverTripController;
use App\Http\Controllers\Api\ParentPortal\AuthController as ParentAuthController;
use App\Http\Controllers\Api\Operator\BillingConfigController;
use App\Http\Controllers\Api\Operator\BusController;
use App\Http\Controllers\Api\Operator\DashboardController;
use App\Http\Controllers\Api\Operator\DiscountConfigController;
use App\Http\Controllers\Api\Operator\InvoiceController;
use App\Http\Controllers\Api\Operator\InvoiceItemController;
use App\Http\Controllers\Api\Operator\OutstandingController;
use App\Http\Controllers\Api\Operator\PaymentController;
use App\Http\Controllers\Api\Operator\ProfileController;
use App\Http\Controllers\Api\Operator\RouteController;
use App\Http\Controllers\Api\Operator\StaffController;
use App\Http\Controllers\Api\Operator\StudentApplicationController;
use App\Http\Controllers\Api\Operator\StudentController;
use App\Http\Controllers\Api\Operator\TransactionController;
use App\Http\Controllers\Api\ParentPortal\InvoiceController as ParentInvoiceController;
use App\Http\Controllers\Api\ParentPortal\PaymentController as ParentPaymentController;
use App\Http\Controllers\Api\ParentPortal\ProfileController as ParentProfileController;
use App\Http\Controllers\Api\ParentPortal\QuoteController;
use App\Http\Controllers\Api\ParentPortal\RouteController as ParentRouteController;
use App\Http\Controllers\Api\ParentPortal\StudentApplicationController as ParentStudentApplicationController;
use App\Http\Controllers\Api\ParentPortal\StudentController as ParentStudentController;
use App\Http\Controllers\Api\Public\ContactController;
use App\Http\Controllers\Api\Public\OperatorRegistrationController;
use App\Http\Controllers\Api\Public\PasswordResetController;
use App\Http\Controllers\Api\Public\RegistrationController;
use App\Http\Controllers\Api\Webhooks\BillplzController as BillplzWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
Route::post('/reset-password', [PasswordResetController::class, 'reset']);

Route::post('/register-operator', [OperatorRegistrationController::class, 'store']);

Route::post('/contact', [ContactController::class, 'store']);

Route::get('/register/{operatorCode}', [RegistrationController::class, 'show']);
Route::post('/register/{operatorCode}', [RegistrationController::class, 'store']);

// Billplz posts payment results here. Unauthenticated; X Signature is the auth.
Route::post('/webhooks/billplz', [BillplzWebhookController::class, 'callback'])->middleware('throttle:120,1');

Route::post('/driver/login', [DriverAuthController::class, 'login']);
Route::post('/parent/login', [ParentAuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Outside the admin group on purpose: while impersonating, the session is the operator's.
    Route::post('/impersonation/stop', [ImpersonationController::class, 'stop']);

    // Platform team: Owner (saas_admin), Finance and Support. Everyone may look;
    // what each level may change is gated per route by permission.
    Route::middleware('role:saas_admin|saas_finance|saas_support')->prefix('admin')->group(function () {
        Route::get('dashboard/summary', [AdminDashboardController::class, 'summary']);
        Route::get('dashboard/trends', [AdminDashboardController::class, 'trends']);
        Route::get('dashboard/attention', [AdminDashboardController::class, 'attention']);
        Route::get('operators', [AdminOperatorController::class, 'index']);
        Route::get('operators/options', [AdminOperatorController::class, 'options']);
        Route::get('operators/{operator}', [AdminOperatorController::class, 'show']);
        Route::get('transactions', [AdminTransactionController::class, 'index']);
        Route::get('payment-attempts', [PaymentAttemptController::class, 'index']);
        Route::get('transactions/export', [AdminTransactionController::class, 'export'])
            ->middleware('permission:transactions.export');

        Route::get('plans', [PlanController::class, 'index']);

        Route::middleware('permission:plans.manage')->group(function () {
            Route::post('plans', [PlanController::class, 'store']);
            Route::put('plans/{plan}', [PlanController::class, 'update']);
            Route::delete('plans/{plan}', [PlanController::class, 'destroy']);
            Route::put('operators/{operator}/plan', [PlanController::class, 'assign']);
        });

        Route::middleware('permission:operators.edit')->group(function () {
            Route::put('operators/{operator}', [AdminOperatorController::class, 'update']);
            Route::post('operators/{operator}/password-reset', [AdminOperatorController::class, 'sendPasswordReset']);
            Route::get('operators/{operator}/notes', [OperatorNoteController::class, 'index']);
            Route::post('operators/{operator}/notes', [OperatorNoteController::class, 'store']);
            Route::delete('operators/{operator}/notes/{note}', [OperatorNoteController::class, 'destroy']);
        });

        Route::middleware('permission:operators.suspend')->group(function () {
            Route::post('operators/{operator}/suspend', [AdminOperatorController::class, 'suspend']);
            Route::post('operators/{operator}/reactivate', [AdminOperatorController::class, 'reactivate']);
        });

        Route::post('operators/{operator}/impersonate', [ImpersonationController::class, 'start'])
            ->middleware('permission:operators.impersonate');

        Route::middleware('permission:gateway.manage')->group(function () {
            Route::put('operators/{operator}/billplz', [BillplzSettingsController::class, 'update']);
            Route::post('operators/{operator}/billplz/test', [BillplzSettingsController::class, 'test']);
            Route::delete('operators/{operator}/billplz', [BillplzSettingsController::class, 'destroy']);
        });

        Route::middleware('permission:team.manage')->group(function () {
            Route::get('team', [TeamController::class, 'index']);
            Route::post('team', [TeamController::class, 'store']);
            Route::put('team/{user}', [TeamController::class, 'update']);
            Route::post('team/{user}/deactivate', [TeamController::class, 'deactivate']);
            Route::post('team/{user}/reactivate', [TeamController::class, 'reactivate']);
            Route::get('activity', [ActivityLogController::class, 'index']);
            Route::get('activity/actions', [ActivityLogController::class, 'actions']);
        });
    });

    Route::middleware('tenant')->group(function () {
        Route::middleware('role:operator_admin|operator_staff')->prefix('operator')->group(function () {
            Route::apiResource('buses', BusController::class)->except(['store', 'update', 'destroy']);
            Route::apiResource('staff', StaffController::class)->except(['store', 'update', 'destroy']);
            Route::apiResource('routes', RouteController::class)->except(['store', 'update', 'destroy']);
            Route::get('discount-config', [DiscountConfigController::class, 'show']);
            Route::get('billing-config', [BillingConfigController::class, 'show']);
            Route::get('invoices', [InvoiceController::class, 'index']);
            Route::get('invoices/export', [InvoiceController::class, 'export']);
            Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
            Route::get('payments', [TransactionController::class, 'index']);
            Route::get('payments/export', [TransactionController::class, 'export']);
            Route::get('payments/{payment}/receipt', [TransactionController::class, 'receipt']);
            Route::get('outstanding', [OutstandingController::class, 'index']);
            Route::get('dashboard/summary', [DashboardController::class, 'summary']);
            Route::get('students', [StudentController::class, 'index']);
            Route::get('students/{student}', [StudentController::class, 'show']);
            Route::get('student-applications', [StudentApplicationController::class, 'index']);
            Route::get('student-applications/{studentApplication}', [StudentApplicationController::class, 'show']);

            Route::middleware('role:operator_admin')->group(function () {
                Route::apiResource('buses', BusController::class)->only(['store', 'update', 'destroy']);
                Route::apiResource('staff', StaffController::class)->only(['store', 'update', 'destroy']);
                Route::apiResource('routes', RouteController::class)->only(['store', 'update', 'destroy']);
                Route::put('discount-config', [DiscountConfigController::class, 'update']);
                Route::put('billing-config', [BillingConfigController::class, 'update']);
                Route::post('invoices', [InvoiceController::class, 'store']);
                Route::post('invoices/{invoice}/payments', [PaymentController::class, 'store']);
                Route::post('invoices/{invoice}/items', [InvoiceItemController::class, 'store']);
                Route::delete('invoices/{invoice}/items/{item}', [InvoiceItemController::class, 'destroy']);
                Route::post('invoices/{invoice}/void', [InvoiceController::class, 'void']);
                Route::put('students/{student}', [StudentController::class, 'update']);
                Route::put('profile', [ProfileController::class, 'update']);
                Route::post('profile/logo', [ProfileController::class, 'updateLogo']);
                Route::post('buses/{bus}/avatar', [BusController::class, 'uploadAvatar']);
                Route::post('staff/{staff}/avatar', [StaffController::class, 'uploadAvatar']);
                Route::post('staff/{staff}/login', [StaffController::class, 'provisionLogin']);
                Route::post('student-applications/{studentApplication}/approve', [StudentApplicationController::class, 'approve']);
                Route::post('student-applications/{studentApplication}/reject', [StudentApplicationController::class, 'reject']);
            });
        });

        Route::middleware('role:driver')->prefix('driver')->group(function () {
            Route::post('logout', [DriverAuthController::class, 'logout']);
            Route::get('trips/today', [DriverTripController::class, 'today']);
            Route::post('trips/{trip}/start', [DriverTripController::class, 'start']);
            Route::post('trips/{trip}/end', [DriverTripController::class, 'end']);
            Route::post('trips/{trip}/location', [DriverTripController::class, 'postLocation']);
            Route::get('trips/{trip}/roster', [DriverTripController::class, 'roster']);
            Route::post('trips/{trip}/students/{student}/board', [DriverTripController::class, 'boardStudent']);
            Route::post('trips/{trip}/students/{student}/alight', [DriverTripController::class, 'alightStudent']);
        });

        Route::middleware('role:parent')->prefix('parent')->group(function () {
            Route::post('logout', [ParentAuthController::class, 'logout']);
            Route::get('routes', [ParentRouteController::class, 'index']);
            Route::get('students', [ParentStudentController::class, 'index']);
            Route::put('students/{student}', [ParentStudentController::class, 'update']);
            Route::post('students/{student}/avatar', [ParentStudentController::class, 'uploadAvatar']);
            Route::get('student-applications', [ParentStudentApplicationController::class, 'index']);
            Route::post('student-applications', [ParentStudentApplicationController::class, 'store']);
            Route::post('quote', [QuoteController::class, 'store']);
            Route::get('invoices', [ParentInvoiceController::class, 'index']);
            Route::get('payments/{payment}/receipt', [ParentInvoiceController::class, 'paymentReceipt']);
            Route::get('payments/config', [ParentPaymentController::class, 'config']);
            Route::post('payments', [ParentPaymentController::class, 'store']);
            Route::get('payments/{attempt}', [ParentPaymentController::class, 'show']);
            Route::post('payments/{attempt}/confirm', [ParentPaymentController::class, 'confirm']);
            Route::put('profile', [ParentProfileController::class, 'update']);
            Route::post('profile/avatar', [ParentProfileController::class, 'uploadAvatar']);
            Route::put('profile/password', [ParentProfileController::class, 'updatePassword']);
        });
    });
});
