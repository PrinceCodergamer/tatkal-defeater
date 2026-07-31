param(
    [string]$RepoPath = "D:\Pm987\projects\tatkal-defeater",
    [int]$PollSeconds = 8
)

$logFile = Join-Path $RepoPath ".git\auto-sync.log"
$git = "git"

function Log([string]$msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

function Sync-Pending {
    $env:GIT_TERMINAL_PROMPT = "0"
    $env:GIT_ASKPASS = "echo"

    if (-not (Test-Path (Join-Path $RepoPath ".git"))) {
        Log "no .git directory, skipping"
        return
    }

    Push-Location $RepoPath
    try {
        & $git add -A 2>&1 | Out-Null
        $staged = (& $git diff --cached --name-only 2>$null)
        if (-not $staged) {
            return
        }

        $hash = (& $git log -1 --format=%h 2>$null)
        $msg = "auto-sync: $((Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) [after $hash]"
        & $git commit -m $msg 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Log "commit failed (exit $LASTEXITCODE)"
            & $git reset --soft HEAD^ 2>&1 | Out-Null
            return
        }

        & $git fetch origin master 2>&1 | Out-Null
        $behind = (& $git rev-list --count HEAD..origin/master 2>$null)
        if ($behind -and [int]$behind -gt 0) {
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
            Log "pushed ($(($staged | Measure-Object).Count) file(s))"
        } else {
            Log "push failed (exit $LASTEXITCODE)"
        }
    }
    finally {
        Pop-Location
    }
}

Log "auto-sync polling started on $RepoPath (every ${PollSeconds}s)"

while ($true) {
    try {
        Push-Location $RepoPath
        try {
            $changed = (& $git status --porcelain 2>$null)
        }
        finally {
            Pop-Location
        }
        if ($changed) {
            $isConflict = ($changed | Select-String -Pattern '^(UU|AA|DD|AU|UA|DU|UD)\s')
            if ($isConflict) {
                Log "merge conflict detected, skipping auto-commit"
            } else {
                Sync-Pending
            }
        }
    }
    catch {
        Log "error: $_"
    }
    Start-Sleep -Seconds $PollSeconds
}
