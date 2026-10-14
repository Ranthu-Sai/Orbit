# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Chaquopy ProGuard Rules (Required for Python on Android)

# Don't obfuscate the Python initialization classes
-keep class com.chaquo.python.** { *; }
-keep class com.chaquo.python.android.** { *; }

# Required for Python bytecode loading
-keep class com.chaquo.python.Python {
    public static com.chaquo.python.Python getInstance();
    public void start(com.chaquo.python.android.AndroidPlatform);
}

# Keep members required for reflection
-keepattributes InnerClasses, Signature, Exceptions, LineNumberTable, SourceFile, Deprecated

# Required for Python imports and dynamic loading
-keepattributes InnerClasses, Signature, Exceptions, LineNumberTable, SourceFile

# Keep Python module classes and their methods
-keep class * extends com.chaquo.python.Python {
    *;
}

# Keep all Python-related classes from ProGuard obfuscation
-keep class com.chaquo.python.** { *; }

# Required for Android platform initialization
-keep class com.chaquo.python.android.AndroidPlatform {
    *;
}

# Keep all methods and fields required for Java-Python interop
-keepmethods give-all {
    <init>();
    callAttr(...);
    getModule(...);
    toJava(...);
}

# Don't remove or rename the native Python bridge methods
-keep class com.orbit.app.PythonBridgeModule {
    <methods>;
}

-keep class com.orbit.app.PythonPackage {
    <methods>;
}

# --- React Native / Jellyfish reflectively-accessed classes ---
# Keep React Native core (reflection-based view managers & native modules)
-keep class com.facebook.react.** { *; }

# react-native-track-player: native modules and service looked up by name
-keep class com.doublesymmetry.trackplayer.** { *; }

# react-native-config: reads build config fields reflectively
-keep class com.lugg.ReactNativeConfig.** { *; }

# react-native-device-info: reflection over package manager
-keep class com.learnium.RNDeviceInfo.** { *; }

# react-native-keychain: native module pair for encrypted storage
-keep class com.oblador.keychain.** { *; }

# Firebase: reflection-based initializer
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }

# Kotlin serialization (used by Innertube models)
-keepclassmembers class * implements kotlinx.serialization.KSerializer { *; }
-keep,includedescriptorclasses class com.orbit.app.**$$serializer { *; }
-keepclassmembers class com.orbit.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.orbit.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}
