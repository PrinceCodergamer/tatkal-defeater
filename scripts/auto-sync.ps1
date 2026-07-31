param(
    [string]$RepoPath = "D:\Pm987\projects\tatkal-defeater",
    [int]$DebounceSeconds = 10
)

$logFile = Join-Path $RepoPath ".git\auto-sync.log"
$lockFile = Join-Path $RepoPath ".git\auto-sync.lock"

function Log([string]$msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Log "auto-sync watcher starting on $RepoPath (debounce: ${DebounceSeconds}s)"

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $RepoPath
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::DirectoryName -bor [System.IO.NotifyFilters]::Size
$watcher.EnableRaisingEvents = $true

$timer = $null
$syncLock = [System.Threading.Mutex]::new($false, "Global\TatkalAutoSync")

function Start-Debounce {
    if ($timer) { $timer.Dispose() }
    $timer = New-Object System.Threading.Timer({
        param($state)
        $syncLock.WaitOne() | Out-Null
        try { Sync-Pending }
        finally { $syncLock.ReleaseMutex() }
    }, $null, $DebounceSeconds * 1000, [System.Threading.Timeout]::Infinite)
}

function Sync-Pending {
    $env:GIT_TERMINAL_PROMPT = "0"
    $env:GIT_ASKPASS = "echo"
    $git = "git"

    if (-not (Test-Path (Join-Path $RepoPath ".git"))) {
        Log "no .git directory, skipping"
        return
    }

    Push-Location $RepoPath
    try {
        & $git add -A 2>&1 | Out-Null
        $staged = (& $git diff --cached --name-only 2>$null)
        if (-not $staged) {
            Log "no changes to commit"
            return
        }

        $hash = (& $git log -1 --format=%h 2>$null)
        $msg = "auto-sync: $((Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) [after $hash]"
        & $git commit -m $msg 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Log "commit failed (exit $LASTEXITCODE)"
            return
        }

        $fetch = (& $git fetch origin master 2>&1)
        $behind = (& $git rev-list --count HEAD..origin/master 2>$null)
        if ([int]$behind -gt 0) {
            Log "remote ahead by $behind commit(s), pulling with rebase"
            & $git pull --rebase origin master 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Log "rebase failed, aborting auto-push"
                & $git rebase --abort 2>&1 | Out-Null
                return
            }
        }

        & $git push origin master 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Log "pushed to origin/master"
        } else {
            Log "push failed (exit $LASTEXITCODE)"
        }
    }
    finally {
        Pop-Location
    }
}

$action = {
    $path = $Event.SourceEventArgs.FullPath
    if ($path -match '\\.git[\\/]' -or $path -match '\\node_modules[\\/]' -or $path -match '\\.next[\\/]' -or $path -match '\\.turbo[\\/]' -or $path -match '\\dist[\\/]') {
        return
    }
    Start-Debounce
}

Register-ObjectEvent $watcher "Changed" -Action $action | Out-Null
Register-ObjectEvent $watcher "Created" -Action $action | Out-Null
Register-ObjectEvent $watcher "Deleted" -Action $action | Out-Null
Register-ObjectEvent $watcher "Renamed" -Action $action | Out-Null

Log "watcher armed, waiting for file changes..."
while ($true) {
    Start-Sleep -Seconds 5
}
