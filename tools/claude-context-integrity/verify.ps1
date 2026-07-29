[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, ParameterSetName = "WithCapture")]
    [Parameter(Mandatory = $true, ParameterSetName = "WithoutCapture")]
    [string]$ClaimedPath,
    [Parameter(Mandatory = $true, ParameterSetName = "WithCapture")]
    [Parameter(Mandatory = $true, ParameterSetName = "WithoutCapture")]
    [string]$SourcePath,
    [Parameter(Mandatory = $true, ParameterSetName = "WithCapture")]
    [Parameter(Mandatory = $true, ParameterSetName = "WithoutCapture")]
    [ValidateSet("UserLevel", "Project", "NestedProject", "Managed")]
    [string]$SourceScope,
    [Parameter(Mandatory = $true, ParameterSetName = "WithCapture")]
    [Parameter(Mandatory = $true, ParameterSetName = "WithoutCapture")]
    [ValidateNotNullOrEmpty()]
    [string]$ContextRevision,
    [Parameter(Mandatory = $true, ParameterSetName = "WithCapture")]
    [string]$CapturedPayloadPath,
    [Parameter(Mandatory = $true, ParameterSetName = "WithoutCapture")]
    [switch]$NoCapturedPayload
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ResolvedFilePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Role
    )

    try {
        $resolved = Resolve-Path -LiteralPath $Path -ErrorAction Stop
        $item = Get-Item -LiteralPath $resolved.Path -Force -ErrorAction Stop
    }
    catch {
        throw "$Role '$Path' cannot be resolved as a local file: $($_.Exception.Message)"
    }

    if ($item.PSIsContainer) {
        throw "$Role '$Path' resolves to a directory, not a file."
    }

    return $item.PSPath.Replace("Microsoft.PowerShell.Core\FileSystem::", "")
}

function Get-Sha256 {
    param(
        [Parameter(Mandatory = $true)]
        [byte[]]$Bytes
    )

    $sha256 = [Security.Cryptography.SHA256]::Create()
    try {
        return [BitConverter]::ToString($sha256.ComputeHash($Bytes)).Replace("-", "").ToLowerInvariant()
    }
    finally {
        $sha256.Dispose()
    }
}

function Test-ByteEquality {
    param(
        [Parameter(Mandatory = $true)]
        [byte[]]$Left,
        [Parameter(Mandatory = $true)]
        [byte[]]$Right
    )

    if ($Left.Length -ne $Right.Length) {
        return $false
    }

    for ($index = 0; $index -lt $Left.Length; $index++) {
        if ($Left[$index] -ne $Right[$index]) {
            return $false
        }
    }

    return $true
}

function Write-Result {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("PASS", "UNKNOWN", "BLOCKED")]
        [string]$Status,
        [Parameter(Mandatory = $true)]
        [int]$ExitCode,
        [Parameter(Mandatory = $true)]
        [string]$Reason,
        [Parameter(Mandatory = $true)]
        [string]$ClaimedPathValue,
        [Parameter(Mandatory = $true)]
        [string]$SourcePathValue,
        [Parameter(Mandatory = $true)]
        [string]$SourceScopeValue,
        [Parameter(Mandatory = $true)]
        [string]$ContextRevisionValue,
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$SourceSha256Value,
        [Parameter(Mandatory = $true)]
        [int]$SourceByteLengthValue,
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$CapturedPayloadPathValue,
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$CapturedPayloadSha256Value,
        [Parameter(Mandatory = $true)]
        [int]$CapturedPayloadByteLengthValue
    )

    $result = [ordered]@{
        schemaVersion = "claude-context-integrity/v1"
        status = $Status
        reason = $Reason
        claimedPath = $ClaimedPathValue
        resolvedSourcePath = $SourcePathValue
        sourceScope = $SourceScopeValue
        contextRevision = $ContextRevisionValue
        sourceSha256 = $SourceSha256Value
        sourceByteLength = $SourceByteLengthValue
        capturedPayloadPath = $CapturedPayloadPathValue
        capturedPayloadSha256 = $CapturedPayloadSha256Value
        capturedPayloadByteLength = $CapturedPayloadByteLengthValue
    }

    Write-Output ($result | ConvertTo-Json -Compress)
    exit $ExitCode
}

$resolvedClaimedPath = $null
$resolvedSourcePath = $null

try {
    $resolvedClaimedPath = Get-ResolvedFilePath -Path $ClaimedPath -Role "Claimed path"
    $resolvedSourcePath = Get-ResolvedFilePath -Path $SourcePath -Role "Source path"
}
catch {
    Write-Result `
        -Status "BLOCKED" `
        -ExitCode 20 `
        -Reason $_.Exception.Message `
        -ClaimedPathValue $ClaimedPath `
        -SourcePathValue $SourcePath `
        -SourceScopeValue $SourceScope `
        -ContextRevisionValue $ContextRevision `
        -SourceSha256Value "" `
        -SourceByteLengthValue 0 `
        -CapturedPayloadPathValue "" `
        -CapturedPayloadSha256Value "" `
        -CapturedPayloadByteLengthValue 0
}

if (-not [string]::Equals($resolvedClaimedPath, $resolvedSourcePath, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Result `
        -Status "BLOCKED" `
        -ExitCode 20 `
        -Reason "The claimed path and directly read source path resolve to different files." `
        -ClaimedPathValue $resolvedClaimedPath `
        -SourcePathValue $resolvedSourcePath `
        -SourceScopeValue $SourceScope `
        -ContextRevisionValue $ContextRevision `
        -SourceSha256Value "" `
        -SourceByteLengthValue 0 `
        -CapturedPayloadPathValue "" `
        -CapturedPayloadSha256Value "" `
        -CapturedPayloadByteLengthValue 0
}

try {
    $sourceBytes = [IO.File]::ReadAllBytes($resolvedSourcePath)
}
catch {
    Write-Result `
        -Status "BLOCKED" `
        -ExitCode 20 `
        -Reason "Direct read of source path '$resolvedSourcePath' failed: $($_.Exception.Message)" `
        -ClaimedPathValue $resolvedClaimedPath `
        -SourcePathValue $resolvedSourcePath `
        -SourceScopeValue $SourceScope `
        -ContextRevisionValue $ContextRevision `
        -SourceSha256Value "" `
        -SourceByteLengthValue 0 `
        -CapturedPayloadPathValue "" `
        -CapturedPayloadSha256Value "" `
        -CapturedPayloadByteLengthValue 0
}

$sourceSha256 = Get-Sha256 -Bytes $sourceBytes

if ($PSCmdlet.ParameterSetName -eq "WithoutCapture") {
    Write-Result `
        -Status "UNKNOWN" `
        -ExitCode 10 `
        -Reason "No raw host-payload capture was supplied; the host claim remains observational only." `
        -ClaimedPathValue $resolvedClaimedPath `
        -SourcePathValue $resolvedSourcePath `
        -SourceScopeValue $SourceScope `
        -ContextRevisionValue $ContextRevision `
        -SourceSha256Value $sourceSha256 `
        -SourceByteLengthValue $sourceBytes.Length `
        -CapturedPayloadPathValue "" `
        -CapturedPayloadSha256Value "" `
        -CapturedPayloadByteLengthValue 0
}

try {
    $resolvedCapturedPayloadPath = Get-ResolvedFilePath -Path $CapturedPayloadPath -Role "Captured payload path"
    $capturedPayloadBytes = [IO.File]::ReadAllBytes($resolvedCapturedPayloadPath)
}
catch {
    Write-Result `
        -Status "BLOCKED" `
        -ExitCode 20 `
        -Reason $_.Exception.Message `
        -ClaimedPathValue $resolvedClaimedPath `
        -SourcePathValue $resolvedSourcePath `
        -SourceScopeValue $SourceScope `
        -ContextRevisionValue $ContextRevision `
        -SourceSha256Value $sourceSha256 `
        -SourceByteLengthValue $sourceBytes.Length `
        -CapturedPayloadPathValue $CapturedPayloadPath `
        -CapturedPayloadSha256Value "" `
        -CapturedPayloadByteLengthValue 0
}

$capturedPayloadSha256 = Get-Sha256 -Bytes $capturedPayloadBytes
$bytesMatch = Test-ByteEquality -Left $sourceBytes -Right $capturedPayloadBytes

if (-not $bytesMatch) {
    Write-Result `
        -Status "BLOCKED" `
        -ExitCode 20 `
        -Reason "Captured host payload differs byte-for-byte from the direct on-disk read; injected content is not authoritative." `
        -ClaimedPathValue $resolvedClaimedPath `
        -SourcePathValue $resolvedSourcePath `
        -SourceScopeValue $SourceScope `
        -ContextRevisionValue $ContextRevision `
        -SourceSha256Value $sourceSha256 `
        -SourceByteLengthValue $sourceBytes.Length `
        -CapturedPayloadPathValue $resolvedCapturedPayloadPath `
        -CapturedPayloadSha256Value $capturedPayloadSha256 `
        -CapturedPayloadByteLengthValue $capturedPayloadBytes.Length
}

Write-Result `
    -Status "PASS" `
    -ExitCode 0 `
    -Reason "Captured host payload matches the direct on-disk source byte-for-byte." `
    -ClaimedPathValue $resolvedClaimedPath `
    -SourcePathValue $resolvedSourcePath `
    -SourceScopeValue $SourceScope `
    -ContextRevisionValue $ContextRevision `
    -SourceSha256Value $sourceSha256 `
    -SourceByteLengthValue $sourceBytes.Length `
    -CapturedPayloadPathValue $resolvedCapturedPayloadPath `
    -CapturedPayloadSha256Value $capturedPayloadSha256 `
    -CapturedPayloadByteLengthValue $capturedPayloadBytes.Length
