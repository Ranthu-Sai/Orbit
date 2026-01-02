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
-keep class com.orbit.music.PythonBridgeModule {
    <methods>;
}

-keep class com.orbit.music.PythonPackage {
    <methods>;
}
