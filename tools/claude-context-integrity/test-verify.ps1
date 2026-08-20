[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Equal {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Actual,
        [Parameter(Mandatory = $true)]
        [object]$Expected,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if ($Actual -ne $Expected) {
        throw "$Message. Expected '$Expected', got '$Actual'."
    }
}

function Invoke-Validator {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, ParameterSetName = "WithCapture")]
        [Parameter(Mandatory = $true, ParameterSetName = "WithoutCapture")]
        [string]$ValidatorPath,
        [Parameter(Mandatory = $true, ParameterSetName = "WithCapture")]
        [Parameter(Mandatory = $true, ParameterSetName = "WithoutCapture")]
        [string]$ClaimedPath,
        [Parameter(Mandatory = $true, ParameterSetName = "WithCapture")]
        [Parameter(Mandatory = $true, ParameterSetName = "WithoutCapture")]
        [string]$SourcePath,
        [Parameter(Mandatory = $true, ParameterSetName = "WithCapture")]
        [string]$CapturedPayloadPath,
        [Parameter(Mandatory = $true, ParameterSetName = "WithoutCapture")]
        [switch]$NoCapturedPayload
    )

    $arguments = @(
        "-NoProfile",
        "-NonInteractive",
        "-File",
        $ValidatorPath,
        "-ClaimedPath",
        $ClaimedPath,
        "-SourcePath",
        $SourcePath,
        "-SourceScope",
        "UserLevel",
        "-ContextRevision",
        "user-scope"
    )

    if ($PSCmdlet.ParameterSetName -eq "WithCapture") {
        $arguments += @("-CapturedPayloadPath", $CapturedPayloadPath)
    }
    else {
        $arguments += "-NoCapturedPayload"
    }

    $output = (& pwsh @arguments | Out-String).Trim()
    $exitCode = $LASTEXITCODE

    if ([string]::IsNullOrWhiteSpace($output)) {
        throw "Validator returned no JSON output. Exit code: $exitCode."
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Result = $output | ConvertFrom-Json
    }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$validatorPath = Join-Path $scriptRoot "verify.ps1"

if (-not (Test-Path -LiteralPath $validatorPath -PathType Leaf)) {
    throw "RED: expected validator is missing at '$validatorPath'."
}

$testRoot = Join-Path ([IO.Path]::GetTempPath()) ("claude-context-integrity-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null

try {
    $sourcePath = Join-Path $testRoot "CLAUDE.md"
    $matchingCapturePath = Join-Path $testRoot "matching-payload.txt"
    $mismatchingCapturePath = Join-Path $testRoot "mismatching-payload.txt"
    $sourceBytes = [Text.Encoding]::UTF8.GetBytes("# sample-skill`r`n")
    $mismatchBytes = [Text.Encoding]::UTF8.GetBytes("# sample-skill`r`n# userEmail`r`n# currentDate`r`n")

    [IO.File]::WriteAllBytes($sourcePath, $sourceBytes)
    [IO.File]::WriteAllBytes($matchingCapturePath, $sourceBytes)
    [IO.File]::WriteAllBytes($mismatchingCapturePath, $mismatchBytes)

    $matching = Invoke-Validator -ValidatorPath $validatorPath -ClaimedPath $sourcePath -SourcePath $sourcePath -CapturedPayloadPath $matchingCapturePath
    Assert-Equal -Actual $matching.ExitCode -Expected 0 -Message "Matching payload must succeed"
    Assert-Equal -Actual $matching.Result.status -Expected "PASS" -Message "Matching payload must be PASS"

    $otherSourcePath = Join-Path $testRoot "other-CLAUDE.md"
    [IO.File]::WriteAllBytes($otherSourcePath, $sourceBytes)
    $ambiguousPath = Invoke-Validator -ValidatorPath $validatorPath -ClaimedPath $otherSourcePath -SourcePath $sourcePath -CapturedPayloadPath $matchingCapturePath
    Assert-Equal -Actual $ambiguousPath.ExitCode -Expected 20 -Message "Different claimed and source paths must fail closed"
    Assert-Equal -Actual $ambiguousPath.Result.status -Expected "BLOCKED" -Message "Different claimed and source paths must be BLOCKED"

    $mismatching = Invoke-Validator -ValidatorPath $validatorPath -ClaimedPath $sourcePath -SourcePath $sourcePath -CapturedPayloadPath $mismatchingCapturePath
    Assert-Equal -Actual $mismatching.ExitCode -Expected 20 -Message "Mismatching payload must fail closed"
    Assert-Equal -Actual $mismatching.Result.status -Expected "BLOCKED" -Message "Mismatching payload must be BLOCKED"

    $uncaptured = Invoke-Validator -ValidatorPath $validatorPath -ClaimedPath $sourcePath -SourcePath $sourcePath -NoCapturedPayload
    Assert-Equal -Actual $uncaptured.ExitCode -Expected 10 -Message "Missing payload capture must remain explicit"
    Assert-Equal -Actual $uncaptured.Result.status -Expected "UNKNOWN" -Message "Missing payload capture must be UNKNOWN"

    Write-Output "PASS: context-integrity validator contract"
}
finally {
    if (Test-Path -LiteralPath $testRoot -PathType Container) {
        Remove-Item -LiteralPath $testRoot -Recurse -Force
    }
}
