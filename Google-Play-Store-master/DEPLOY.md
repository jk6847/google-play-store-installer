# Google Play 三件套自动安装

这套脚本用于 Windows 电脑通过 USB 给 Android 手机安装：

1. Google Services Framework
2. Google Play services
3. Google Play Store

脚本会通过 ADB 自动读取手机的 Android SDK、CPU ABI 和屏幕 DPI，然后从本地 APK 目录中选择匹配的 APK、APKM、APKS 或 split APK 安装。

## 准备手机

1. 手机打开“开发者选项”。
2. 开启“USB 调试”。
3. 用 USB 连接电脑。
4. 手机弹出授权提示时选择允许。

## 放置安装包

把下载好的安装包放进这些目录：

```text
apks/
  01-google-services-framework/
  02-google-play-services/
  03-google-play-store/
```

支持的文件类型：

- `.apk`
- `.apkm`
- `.apks`
- `.zip`，里面需要包含 APK 或 split APK

如果一个目录里放了多个版本，脚本会优先选择符合手机 `minAPI`、ABI 和 DPI 的文件。建议文件名保留 APKMirror 原始命名，因为里面通常包含 `minAPI23`、`arm64-v8a`、`nodpi` 等信息。

## 一键安装

双击：

```text
install-google-play.bat
```

或在 PowerShell 里运行：

```powershell
.\install-google-play.bat
```

如果电脑没有 ADB，脚本会自动下载 Google 官方 Android platform-tools 到本目录的 `tools/platform-tools`。

## 插入手机后自动执行

保持监听模式：

```powershell
.\install-google-play.bat -Watch
```

这个模式会等待手机连接，并在检测到设备后执行安装。按 `Ctrl+C` 停止。

## 常见问题

- 如果提示设备未授权，解锁手机并确认 USB 调试授权。
- 如果 Play Store 能打开但登录异常，重启手机后再试。
- 某些国产系统、鸿蒙或深度定制 ROM 可能不允许完整 Google 服务，这种情况脚本无法绕过系统限制。
