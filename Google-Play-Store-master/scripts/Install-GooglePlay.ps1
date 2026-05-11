param(
    [string]$ApkRoot = (Join-Path $PSScriptRoot "..\apks"),
    [switch]$InstallAdb,
    [switch]$Watch
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Resolve-Adb {
    $localAdb = Join-Path $PSScriptRoot "..\tools\platform-tools\adb.exe"
    if (Test-Path -LiteralPath $localAdb) {
        return (Resolve-Path -LiteralPath $localAdb).Path
    }

    $pathAdb = Get-Command adb -ErrorAction SilentlyContinue
    if ($pathAdb) {
        return $pathAdb.Source
    }

    if (-not $InstallAdb) {
        throw "ADB was not found. Re-run with -InstallAdb, or install Android platform-tools and add adb.exe to PATH."
    }

    Write-Step "Downloading Android platform-tools"
    $toolsDir = Join-Path $PSScriptRoot "..\tools"
    $zipPath = Join-Path $toolsDir "platform-tools-latest-windows.zip"
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    Invoke-WebRequest `
        -Uri "https://dl.google.com/android/repository/platform-tools-latest-windows.zip" `
        -OutFile $zipPath
    Expand-Archive -LiteralPath $zipPath -DestinationPath $toolsDir -Force
    Remove-Item -LiteralPath $zipPath -Force

    if (-not (Test-Path -LiteralPath $localAdb)) {
        throw "Downloaded platform-tools, but adb.exe was not found at $localAdb."
    }
    return (Resolve-Path -LiteralPath $localAdb).Path
}

function Invoke-Adb([string[]]$Arguments) {
    & $script:Adb @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "adb $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
}

function Get-AdbText([string[]]$Arguments) {
    $output = & $script:Adb @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "adb $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
    return (($output -join "`n").Trim())
}

function Get-DeviceProfile {
    Write-Step "Waiting for an Android device"
    Invoke-Adb @("start-server")
    Invoke-Adb @("wait-for-device")

    $state = Get-AdbText @("get-state")
    if ($state -ne "device") {
        throw "Device state is '$state'. Unlock the phone, enable USB debugging, and accept the computer authorization prompt."
    }

    $sdk = [int](Get-AdbText @("shell", "getprop", "ro.build.version.sdk"))
    $release = Get-AdbText @("shell", "getprop", "ro.build.version.release")
    $abis = (Get-AdbText @("shell", "getprop", "ro.product.cpu.abilist")).Split(",", [System.StringSplitOptions]::RemoveEmptyEntries)
    if ($abis.Count -eq 0) {
        $abis = @((Get-AdbText @("shell", "getprop", "ro.product.cpu.abi")))
    }

    $densityText = Get-AdbText @("shell", "wm", "density")
    $densityMatch = [regex]::Match($densityText, "(\d+)")
    $density = if ($densityMatch.Success) { [int]$densityMatch.Groups[1].Value } else { 0 }
    if ($density -le 0) {
        $propDensity = Get-AdbText @("shell", "getprop", "ro.sf.lcd_density")
        $density = if ($propDensity -match "^\d+$") { [int]$propDensity } else { 0 }
    }

    $locale = Get-AdbText @("shell", "getprop", "persist.sys.locale")
    if (-not $locale) {
        $locale = Get-AdbText @("shell", "getprop", "ro.product.locale")
    }

    [pscustomobject]@{
        Sdk = $sdk
        Release = $release
        Abis = $abis
        Density = $density
        DensityBucket = Get-DensityBucket $density
        Locale = $locale
    }
}

function Get-DensityBucket([int]$Density) {
    if ($Density -le 0) { return "nodpi" }
    $buckets = [ordered]@{
        ldpi = 120
        mdpi = 160
        hdpi = 240
        xhdpi = 320
        xxhdpi = 480
        xxxhdpi = 640
    }

    $best = "mdpi"
    $bestDelta = [int]::MaxValue
    foreach ($item in $buckets.GetEnumerator()) {
        $delta = [Math]::Abs($Density - $item.Value)
        if ($delta -lt $bestDelta) {
            $best = $item.Key
            $bestDelta = $delta
        }
    }
    return $best
}

function Get-AbiAliases([string[]]$Abis) {
    $aliases = New-Object System.Collections.Generic.HashSet[string]
    foreach ($abi in $Abis) {
        [void]$aliases.Add($abi)
        [void]$aliases.Add($abi.Replace("-", "_"))
    }
    return $aliases
}

function Test-MinSdkCompatible([string]$Name, [int]$Sdk) {
    $match = [regex]::Match($Name, "(?i)(?:minapi|min-api|api)(\d+)")
    if (-not $match.Success) { return $true }
    return ([int]$match.Groups[1].Value -le $Sdk)
}

function Test-ArchCompatible([string]$Name, $AbiAliases) {
    $archTokens = @("arm64-v8a", "arm64_v8a", "armeabi-v7a", "armeabi_v7a", "x86_64", "x86")
    $lower = $Name.ToLowerInvariant()
    $mentioned = $archTokens | Where-Object { $lower.Contains($_) }
    if ($mentioned.Count -eq 0) { return $true }
    foreach ($token in $mentioned) {
        if ($AbiAliases.Contains($token)) { return $true }
    }
    return $false
}

function Get-FileScore([System.IO.FileInfo]$File, $Profile) {
    $score = 0
    $name = $File.Name.ToLowerInvariant()
    $abiAliases = Get-AbiAliases $Profile.Abis

    if (-not (Test-MinSdkCompatible $name $Profile.Sdk)) { return -100000 }
    if (-not (Test-ArchCompatible $name $abiAliases)) { return -100000 }

    foreach ($abi in $abiAliases) {
        if ($name.Contains($abi.ToLowerInvariant())) { $score += 100 }
    }

    if ($name.Contains($Profile.DensityBucket.ToLowerInvariant())) { $score += 20 }
    if ($name.Contains("nodpi") -or $name.Contains("universal")) { $score += 10 }
    $score += [Math]::Min(9, [int]($File.Length / 10MB))
    return $score
}

function Select-BestApkFile([System.IO.FileInfo[]]$Files, $Profile) {
    $ranked = foreach ($file in $Files) {
        [pscustomobject]@{ File = $file; Score = Get-FileScore $file $Profile }
    }
    $winner = $ranked | Where-Object { $_.Score -gt -100000 } | Sort-Object Score, @{ Expression = { $_.File.LastWriteTime }; Descending = $true } -Descending | Select-Object -First 1
    if (-not $winner) {
        throw "No compatible APK was found in $($Files[0].DirectoryName)."
    }
    return $winner.File
}

function Expand-PackageIfNeeded([System.IO.FileInfo]$PackageFile, [string]$TempRoot) {
    if ($PackageFile.Extension.ToLowerInvariant() -eq ".apk") {
        return @($PackageFile.FullName)
    }

    $extractDir = Join-Path $TempRoot ([IO.Path]::GetFileNameWithoutExtension($PackageFile.Name))
    New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
    Expand-Archive -LiteralPath $PackageFile.FullName -DestinationPath $extractDir -Force
    return @(Get-ChildItem -LiteralPath $extractDir -Recurse -Filter "*.apk" | ForEach-Object { $_.FullName })
}

function Select-SplitApks([string[]]$ApkPaths, $Profile) {
    $abiAliases = Get-AbiAliases $Profile.Abis
    $densityNames = @("ldpi", "mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi", "tvdpi")
    $selected = New-Object System.Collections.Generic.List[string]
    $densityCandidates = New-Object System.Collections.Generic.List[object]

    foreach ($path in $ApkPaths) {
        $name = [IO.Path]::GetFileName($path).ToLowerInvariant()
        if (-not (Test-MinSdkCompatible $name $Profile.Sdk)) { continue }
        if (-not (Test-ArchCompatible $name $abiAliases)) { continue }

        $isDensitySplit = $false
        foreach ($densityName in $densityNames) {
            if ($name -match "(^|[._-])$densityName([._-]|$)") {
                $isDensitySplit = $true
            }
        }
        if ($isDensitySplit -and -not $name.Contains("nodpi")) {
            $densityCandidates.Add([pscustomobject]@{ Path = $path; Score = Get-DensitySplitScore $name $Profile.DensityBucket })
            continue
        }

        $selected.Add($path)
    }

    if ($densityCandidates.Count -gt 0) {
        $bestDensity = $densityCandidates | Sort-Object Score -Descending | Select-Object -First 1
        $selected.Add($bestDensity.Path)
    }

    return @($selected | Sort-Object -Unique)
}

function Get-DensitySplitScore([string]$Name, [string]$Bucket) {
    $order = @("ldpi", "mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi")
    $target = [Array]::IndexOf($order, $Bucket)
    if ($target -lt 0) { $target = 1 }

    $bestScore = -999
    for ($i = 0; $i -lt $order.Count; $i++) {
        if ($Name -match "(^|[._-])$($order[$i])([._-]|$)") {
            $score = 100 - [Math]::Abs($i - $target)
            if ($score -gt $bestScore) { $bestScore = $score }
        }
    }
    return $bestScore
}

function Install-PackageGroup([string]$GroupPath, $Profile, [string]$TempRoot) {
    $files = @(Get-ChildItem -LiteralPath $GroupPath -File -Include "*.apk", "*.apks", "*.apkm", "*.zip" -Recurse)
    if ($files.Count -eq 0) {
        Write-Host "Skip: no APK/APKM/APKS files in $GroupPath" -ForegroundColor Yellow
        return
    }

    $container = Select-BestApkFile $files $Profile
    Write-Step "Installing $($container.Name)"
    $apkPaths = Expand-PackageIfNeeded $container $TempRoot
    $selected = Select-SplitApks $apkPaths $Profile

    if ($selected.Count -eq 0) {
        throw "No compatible split APKs were selected from $($container.FullName)."
    }

    if ($selected.Count -eq 1) {
        Invoke-Adb @("install", "-r", "-d", $selected[0])
    } else {
        Write-Host "Selected splits:" -ForegroundColor DarkGray
        $selected | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
        $installArgs = @("install-multiple", "-r", "-d") + $selected
        Invoke-Adb $installArgs
    }
}

function Install-All {
    if (-not (Test-Path -LiteralPath $ApkRoot)) {
        throw "APK directory does not exist: $ApkRoot"
    }

    $script:Adb = Resolve-Adb
    $profile = Get-DeviceProfile

    Write-Step "Detected device"
    Write-Host "Android: $($profile.Release) / SDK $($profile.Sdk)"
    Write-Host "ABI:     $($profile.Abis -join ', ')"
    Write-Host "DPI:     $($profile.Density) ($($profile.DensityBucket))"
    Write-Host "Locale:  $($profile.Locale)"

    $tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("google-play-install-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
    try {
        $groups = @(
            "01-google-services-framework",
            "02-google-play-services",
            "03-google-play-store"
        )

        foreach ($group in $groups) {
            $groupPath = Join-Path $ApkRoot $group
            if (Test-Path -LiteralPath $groupPath) {
                Install-PackageGroup $groupPath $profile $tempRoot
            } else {
                Write-Host "Skip: missing folder $groupPath" -ForegroundColor Yellow
            }
        }

        Write-Step "Done"
        Write-Host "If Play Store opens but cannot sign in yet, reboot the phone once and try again."
    } finally {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if ($Watch) {
    $script:Adb = Resolve-Adb
    Invoke-Adb @("start-server")
    Write-Host "Watching for devices. Press Ctrl+C to stop." -ForegroundColor Cyan
    while ($true) {
        try {
            Install-All
            Write-Host "Waiting for reconnect..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 10
        } catch {
            Write-Host $_.Exception.Message -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
} else {
    Install-All
}
