"""Build the offline Android test APK with JDK 17 and Android SDK 35, without Gradle."""
import hashlib
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".build"
SDK = Path(os.environ.get("ANDROID_HOME", CACHE))
TOOLS = Path(os.environ.get("OBSIDIAN_BUILD_TOOLS", SDK / "build-tools" / "35.0.0"))
if not (TOOLS / "aapt2.exe").exists():
    TOOLS = CACHE / "tools" / "android-15"
PLATFORM = SDK / "platforms" / "android-35" / "android.jar"
if not PLATFORM.exists():
    PLATFORM = CACHE / "platform" / "android-35" / "android.jar"
JDK = Path(os.environ.get("JAVA_HOME", r"C:\Program Files\Java\jdk-17"))
JAVA = JDK / "bin" / "java.exe"

def run(*args, **kwargs):
    subprocess.run([str(item) for item in args], check=True, **kwargs)

def main():
    CACHE.mkdir(exist_ok=True)
    if not PLATFORM.is_file() or not JAVA.is_file() or not (TOOLS / "aapt2.exe").is_file():
        raise SystemExit("Set JAVA_HOME to JDK 17 and ANDROID_HOME to SDK with platform 35 and build-tools 35.0.0.")
    run("node", ROOT / "tools" / "prepare-apk.mjs")
    out = ROOT / "dist"
    out.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=CACHE) as folder:
        stage = Path(folder)
        res = stage / "res" / "drawable-nodpi"
        res.mkdir(parents=True)
        shutil.copyfile(ROOT / "icons/icon-192.png", res / "launcher.png")
        run(TOOLS / "aapt2.exe", "compile", "--dir", res.parent, "-o", stage / "res.zip")
        run(TOOLS / "aapt2.exe", "link", "-I", PLATFORM, "--manifest", ROOT / "android-offline/AndroidManifest.xml",
            "-o", stage / "raw.apk", stage / "res.zip")
        classes = stage / "classes"
        classes.mkdir()
        run(JDK / "bin/javac.exe", "-encoding", "UTF-8", "--release", "8", "-classpath", PLATFORM,
            "-d", classes, ROOT / "android-offline/GameActivity.java")
        dex = stage / "dex"
        dex.mkdir()
        run(JAVA, "-cp", TOOLS / "lib/d8.jar", "com.android.tools.r8.D8", "--release", "--min-api", "26",
            "--lib", PLATFORM, "--output", dex, *classes.rglob("*.class"))
        with zipfile.ZipFile(stage / "raw.apk", "a", zipfile.ZIP_DEFLATED) as apk:
            apk.write(dex / "classes.dex", "classes.dex")
            for asset in sorted((ROOT / "www").rglob("*")):
                if asset.is_file():
                    apk.write(asset, "assets/www/" + asset.relative_to(ROOT / "www").as_posix())
        run(TOOLS / "zipalign.exe", "-p", "4", stage / "raw.apk", stage / "aligned.apk")
        # Keep the local test identity for subsequent update installs. Never ship the private key.
        key, password = CACHE / "phone-test.p12", CACHE / "phone-test.password"
        if key.exists() and not password.exists():
            raise SystemExit("The existing local signing key password is missing.")
        if not password.exists():
            password.write_text(secrets.token_urlsafe(32), encoding="ascii")
        env = dict(os.environ, OBSIDIAN_SIGN_PASSWORD=password.read_text(encoding="ascii").strip())
        if not key.exists():
            run(JDK / "bin/keytool.exe", "-genkeypair", "-keystore", key, "-storetype", "PKCS12",
                "-alias", "phone-test", "-storepass:env", "OBSIDIAN_SIGN_PASSWORD", "-keyalg", "RSA",
                "-keysize", "3072", "-validity", "9000", "-dname", "CN=Obsidian Protocol Local Test", env=env)
        signer = TOOLS / "lib/apksigner.jar"
        signed = stage / "signed.apk"
        run(JAVA, "-jar", signer, "sign", "--ks", key, "--ks-key-alias", "phone-test",
            "--ks-pass", "env:OBSIDIAN_SIGN_PASSWORD", "--out", signed, stage / "aligned.apk", env=env)
        run(JAVA, "-jar", signer, "verify", "--verbose", signed)
        run(TOOLS / "zipalign.exe", "-c", "4", signed)
        with zipfile.ZipFile(signed) as apk:
            assert apk.testzip() is None
            for p in (ROOT / "www").rglob("*"):
                if p.is_file():
                    assert apk.read("assets/www/" + p.relative_to(ROOT / "www").as_posix()) == p.read_bytes()
        target = out / "Obsidian-Protocol-4.7.0-Android.apk"
        shutil.copyfile(signed, target)
        print(target, target.stat().st_size, "bytes", hashlib.sha256(target.read_bytes()).hexdigest())

if __name__ == "__main__":
    main()
