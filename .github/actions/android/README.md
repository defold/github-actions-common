# Setup Android SDK

Composite GitHub Action that installs Android command-line tools, platform tools, a requested platform, build-tools, and NDK version. It restores and saves the SDK directory with `actions/cache` and exports Android-related environment variables for later steps.

Use the action from `.github/actions/android`:

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: actions/setup-java@v5
    with:
      distribution: temurin
      java-version: "25"

  - name: Set up Android SDK
    uses: defold/github-actions-common/.github/actions/android@<ref>

  - name: Verify tools
    run: |
      adb version
      sdkmanager --list_installed
```

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `android-api-level` | `36` | Android platform API level to install. |
| `android-build-tools` | `36.1.0` | Android build-tools version to install. |
| `android-ndk` | `25.2.9519653` | Android NDK version to install. |
| `android-sdk-root` | empty | SDK install root. If omitted, the action chooses a platform-appropriate default. |
| `cache-key-suffix` | `v1` | Manual cache-busting suffix appended to the cache key. |

## Behavior

The action exports:

- `ANDROID_HOME`
- `ANDROID_SDK_ROOT`
- `ANDROID_NDK_HOME`
- `ANDROID_NDK_ROOT`

It also adds these directories to `PATH`:

- `<sdk>/platform-tools`
- `<sdk>/cmdline-tools/latest/bin`
- `<sdk>/build-tools/<version>`

SDK root resolution:

- If `android-sdk-root` is set, that path is used.
- Otherwise, the default is `${{ runner.temp }}/android-sdk`.
- Using a runner-temp SDK avoids mixing with preinstalled runner SDK contents and reduces version-skew issues between `sdkmanager`, command-line tools, and existing package metadata.
- On self-hosted runners, this also avoids multiple runners on the same machine mutating a shared SDK directory by default.

Caching notes:

- Cache keys include runner OS, runner architecture, API level, build-tools version, NDK version, and `cache-key-suffix`.
- Separating the cache by architecture avoids sharing SDK contents between x64 and arm64 runners.

## Example

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: actions/setup-java@v5
    with:
      distribution: temurin
      java-version: "21"

  - name: Set up Android SDK
    uses: defold/github-actions-common/.github/actions/android@<ref>
    with:
      android-api-level: "36"
      android-build-tools: "36.1.0"
      android-ndk: "25.2.9519653"

  - name: Build
    run: ./gradlew assembleDebug
```
