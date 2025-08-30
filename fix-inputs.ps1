# PowerShell script to fix autofill and scroll issues in all input elements

$files = @(
    "src\App.tsx"
    "src\components\admin\VendorIntegrityManager.tsx"
    "src\components\auth\LoginForm.tsx"
    "src\components\auth\PasswordChangeForm.tsx"
    "src\components\auth\PasswordResetForm.tsx"
    "src\components\auth\UserProfile.tsx"
    "src\components\backup\BackupConfigSetup.tsx"
    "src\components\backup\BackupDashboard.tsx"
    "src\components\backup\BackupSettingsPage.tsx"
    "src\components\billing\InvoiceDetails.tsx"
    "src\components\billing\InvoiceForm.tsx"
    "src\components\billing\InvoiceList.tsx"
    "src\components\billing\TIronCalculator.tsx"
    "src\components\common\Checkbox.tsx"
    "src\components\common\EnhancedBreadcrumbs.tsx"
    "src\components\common\SearchBar.tsx"
    "src\components\customers\CustomerForm.tsx"
    "src\components\customers\CustomerList.tsx"
    "src\components\debug\TIronDebug.tsx"
    "src\components\finance\BusinessFinanceDashboard.tsx"
    "src\components\payment\PaymentChannelManagementPermanent.tsx"
    "src\components\payment\PaymentChannelManagementSimple.tsx"
    "src\components\payments\FIFOPaymentForm.tsx"
    "src\components\products\ProductForm.tsx"
    "src\components\products\ProductFormEnhanced.tsx"
    "src\components\products\ProductList.tsx"
    "src\components\products\StockAdjustment.tsx"
    "src\components\reports\CustomerLedger.tsx"
    "src\components\reports\DailyLedger.tsx"
    "src\components\reports\StockHistory.tsx"
    "src\components\reports\StockReport.tsx"
    "src\components\returns\ReturnForm.tsx"
    "src\components\returns\Returns.tsx"
    "src\components\staff\SalaryHistory.tsx"
    "src\components\staff\StaffManagement.tsx"
    "src\components\staff\StaffManagementIntegrated.tsx"
    "src\components\staff\StaffManagementPermanent.tsx"
    "src\components\staff\StaffManagementSimple.tsx"
    "src\components\staff\StaffSalaryManagementPermanent.tsx"
    "src\components\staff\StaffSalaryManagementSimple.tsx"
    "src\components\stock\StockReceivingList.tsx"
    "src\components\stock\StockReceivingNew.tsx"
    "src\components\stock\StockReceivingPayment.tsx"
    "src\components\ui\Input.tsx"
    "src\components\vendor\VendorDetail.tsx"
    "src\components\vendor\VendorManagement.tsx"
)

Write-Host "Starting comprehensive input autofill and scroll fix..." -ForegroundColor Green

foreach ($file in $files) {
    Write-Host "Processing: $file" -ForegroundColor Cyan
    
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $originalContent = $content
        
        # Fix 1: Add autoComplete="off" to forms that don't have it
        $content = $content -replace '(<form[^>]*?)(\s+>)', '$1 autoComplete="off"$2'
        $content = $content -replace '(<form[^>]*?)autoComplete="off"([^>]*?)autoComplete="off"([^>]*?>)', '$1autoComplete="off"$2$3'
        
        # Fix 2: Add autoComplete="off" to input elements that don't have it
        $content = $content -replace '(<input[^>]*?)(\s+/>)', '$1 autoComplete="off"$2'
        $content = $content -replace '(<input[^>]*?)(\s+>)', '$1 autoComplete="off"$2'
        
        # Clean up duplicate autoComplete attributes
        $content = $content -replace 'autoComplete="off"([^>]*?)autoComplete="off"', 'autoComplete="off"$1'
        
        # Fix 3: Add wheel event handler to number inputs
        $content = $content -replace '(<input[^>]*?type="number"[^>]*?)(\s+autoComplete="off")([^>]*?)(\s*/>)', '$1$2 onWheel={(e) => e.currentTarget.blur()}$3$4'
        $content = $content -replace '(<input[^>]*?type="number"[^>]*?)(\s*/>)', '$1 onWheel={(e) => e.currentTarget.blur()}$2'
        
        # Fix any inputs that already have onWheel but need autoComplete
        $content = $content -replace '(<input[^>]*?)onWheel=\{[^}]*\}([^>]*?)(\s*/>)', '$1autoComplete="off" onWheel={(e) => e.currentTarget.blur()}$2$3'
        
        # Clean up duplicate onWheel attributes
        $content = $content -replace 'onWheel=\{[^}]*\}([^>]*?)onWheel=\{[^}]*\}', 'onWheel={(e) => e.currentTarget.blur()}$1'
        
        if ($content -ne $originalContent) {
            Set-Content $file -Value $content -NoNewline
            Write-Host "  Fixed successfully" -ForegroundColor Green
        }
        else {
            Write-Host "  No changes needed" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  File not found" -ForegroundColor Red
    }
}

Write-Host "All input fixes completed!" -ForegroundColor Green
