# Builds a signed release APK from the web app WITHOUT Gradle,
# using only the Android SDK build-tools (aapt2, d8, zipalign, apksigner).
#
# Why no Gradle? On this machine the JDK 17 NIO selector can't open its
# AF_UNIX loopback socket ("Invalid argument: connect"), which Gradle needs.
# JDK 11 works, and these SDK tools don't need the selector -- so we drive
# them directly. See BUILD.md for the full story.
#
# Usage:   powershell -ExecutionPolicy Bypass -File build-apk.ps1

$ErrorActionPreference = 'Stop'

# --- Configure (override via environment if your paths differ) ---------------
$Sdk   = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "C:\Users\Hp Omen\AppData\Local\Android\Sdk" }
$Jdk   = if ($env:JAVA11_HOME)  { $env:JAVA11_HOME }  else { "C:\Program Files\Java\jdk-11" }
$BtVer = "36.1.0"
$Api   = "36"

$Bt        = Join-Path $Sdk "build-tools\$BtVer"
$AndroidJar = Join-Path $Sdk "platforms\android-$Api\android.jar"
$Aapt2     = Join-Path $Bt "aapt2.exe"
$D8        = Join-Path $Bt "d8.bat"
$ZipAlign  = Join-Path $Bt "zipalign.exe"
$ApkSigner = Join-Path $Bt "apksigner.bat"
$Javac     = Join-Path $Jdk "bin\javac.exe"
$Jar       = Join-Path $Jdk "bin\jar.exe"

$Proj  = $PSScriptRoot
$Repo  = Resolve-Path (Join-Path $Proj "..\..")     # D:\empty  (web app source of truth)
$Build = Join-Path $Proj "build"
$Ks    = Join-Path (Resolve-Path (Join-Path $Proj "..")) "readydev-release.jks"
$OutDir = Join-Path $Repo "builds\android"
$Out    = Join-Path $OutDir "ReadyDev.apk"

$env:JAVA_HOME = $Jdk

# --- 0) Refresh bundled web assets from the repo root ------------------------
$www = Join-Path $Proj "assets\www"
New-Item -ItemType Directory -Force -Path $www | Out-Null
Get-ChildItem $www -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
foreach ($f in @('index.html','styles.css','app.js','manifest.webmanifest','service-worker.js')) {
    Copy-Item (Join-Path $Repo $f) (Join-Path $www $f) -Force
}
Copy-Item (Join-Path $Repo 'icons') (Join-Path $www 'icons') -Recurse -Force

# --- 1..7 Build --------------------------------------------------------------
New-Item -ItemType Directory -Force -Path $Build, (Join-Path $Build 'classes'), (Join-Path $Build 'dex'), (Join-Path $Build 'gen') | Out-Null
# Clear stale build output so removed classes never linger in the APK.
Get-ChildItem (Join-Path $Build 'classes') -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem (Join-Path $Build 'dex')     -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem (Join-Path $Build 'gen')     -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Remove-Item (Join-Path $Build 'base.apk')    -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $Build 'aligned.apk') -Force -ErrorAction SilentlyContinue
Push-Location $Proj
try {
    Write-Host "1/7 aapt2 compile"
    & $Aapt2 compile --dir res -o "$Build\res.zip"; if ($LASTEXITCODE) { throw "aapt2 compile failed" }

    Write-Host "2/7 aapt2 link (--java emits R.java for the code to use)"
    & $Aapt2 link -o "$Build\base.apk" -I $AndroidJar --manifest AndroidManifest.xml `
        --min-sdk-version 24 --target-sdk-version $Api --version-code 1 --version-name "1.0" `
        --java "$Build\gen" "$Build\res.zip"
    if ($LASTEXITCODE) { throw "aapt2 link failed" }

    Write-Host "3/7 javac (all sources + generated R.java)"
    $sources = @()
    $sources += (Get-ChildItem "$Proj\src" -Recurse -Filter *.java | ForEach-Object { $_.FullName })
    $sources += (Get-ChildItem "$Build\gen" -Recurse -Filter *.java -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
    Write-Host ("      compiling {0} file(s)" -f $sources.Count)
    & $Javac -source 8 -target 8 -nowarn -bootclasspath $AndroidJar -d "$Build\classes" $sources
    if ($LASTEXITCODE) { throw "javac failed" }

    Write-Host "4/7 d8 (dex)"
    $classes = Get-ChildItem "$Build\classes" -Recurse -Filter *.class | ForEach-Object { $_.FullName }
    Write-Host ("      dexing {0} class file(s)" -f $classes.Count)
    & $D8 --lib $AndroidJar --min-api 24 --output "$Build\dex" $classes
    if (-not (Test-Path "$Build\dex\classes.dex")) { throw "d8 failed" }

    Write-Host "5/7 package assets + dex (jar => forward-slash entries)"
    & $Jar uf "$Build\base.apk" -C $Proj assets
    & $Jar uf "$Build\base.apk" -C "$Build\dex" classes.dex

    Write-Host "6/7 zipalign"
    & $ZipAlign -f 4 "$Build\base.apk" "$Build\aligned.apk"; if ($LASTEXITCODE) { throw "zipalign failed" }

    Write-Host "7/7 apksigner sign"
    & $ApkSigner sign --ks $Ks --ks-pass pass:readydev --ks-key-alias readydev --key-pass pass:readydev `
        --out "$Build\ReadyDev.apk" "$Build\aligned.apk"
    if ($LASTEXITCODE) { throw "apksigner failed" }

    & $ApkSigner verify "$Build\ReadyDev.apk" | Out-Null
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
    Copy-Item "$Build\ReadyDev.apk" $Out -Force
    Write-Host "`nDONE ->" $Out ("({0:N0} KB)" -f ((Get-Item $Out).Length/1KB))
}
finally { Pop-Location }
