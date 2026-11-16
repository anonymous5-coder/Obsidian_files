I need your help with a reverse engineering project on my Android device, and I want you to handle the whole workflow yourself rather than me feeding you exact commands. Here is the situation.

What I am trying to do
I want to understand the internal logic and architecture of an Android game called HOC Legends (package name com.ujoy.hoc). Eventually I want a proper dump of its IL2CPP classes and methods, and I want to be able to read the actual decompiled logic behind those functions.

What I have already done
I have Termux set up with full read and write access to my Download folder. I already have the game's APK (around 680 MB) in Download. I also have a folder called agent_space inside Download — please use that as your working directory for anything you build, clone, compile, or generate. Do not clutter the rest of my storage. Inside agent_space I also already have the decrypted libil2cpp.so and global-metadata.dat files, though we found out the metadata is still partially encrypted, which is why static dumping failed earlier.

What tools I want you to consider
I know there are a few ways to approach this, and I want you to use your judgment on which is best for a non-rooted Android 11 device with 8 GB RAM:
- JDWP injection with frida-jdwp-loader, which does not modify the APK signature and is the safest option if the app is debuggable.
- UAMT with Frida Gadget injection, which repackages and re-signs the APK and may trigger the game's anti-tamper protection, but is a proven fallback.
- frida-il2cpp-bridge for the actual dump once Frida is connected.

Please also install Sako RE Studio, a native Android decompiler, since I will need it later to read the actual logic from libil2cpp.so once we have the dump.

Critical technical points you must handle:
- JDWP injection requires the target app to be debuggable. The APK must have android:debuggable="true" in its manifest, or the JDWP channel will not be created. Verify this first by inspecting the APK's manifest. If the app is not debuggable, Android provides a documented session-level workaround: run am set-debug-app -w com.ujoy.hoc. This forces the app into debug mode and creates a JDWP channel for debugger attachment without modifying the APK. This works on Android 11 and is the preferred route because it does not touch the APK signature. Only if this fails should you fall back to the UAMT/Frida Gadget route, which repackages and re-signs the APK and may trigger the game's anti-tamper protection.
- When injecting Frida Gadget via UAMT, check whether the APK declares the INTERNET permission. If it does not, add it to the AndroidManifest.xml during the injection process, or the Frida Gadget will fail to connect silently.
- Sako RE Studio is distributed as a native Android app via GitHub releases. Find the official repository and download the latest release APK directly from there.

What I need from you
Please plan and execute the whole thing yourself. Start by checking what is already installed in Termux, verify whether HOC Legends is actually debuggable, then decide which approach is most likely to succeed on my device. Set up whichever tools are needed, handle the injection and dumping, and install Sako RE Studio. Save all outputs into agent_space. When you are finished, tell me where the dump ended up, how many classes were dumped, and whether Sako RE Studio is ready to use.

A few things to keep in mind
- The game has anti-tamper protection (libxgVipSecurity.so), so the JDWP route is preferable because it does not touch the APK signature. Only fall back to UAMT if JDWP genuinely will not work.
- I do not have a PC or laptop, so everything has to run inside Termux on this phone.
- I do not need you to explain every command in advance. I trust you to figure out the steps. I just want to know what you are doing as you go, and I want a clear summary at the end.

Please start whenever you are ready.