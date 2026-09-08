# Native icon and splash configuration

The generated Capacitor projects carry one PsiAlchemy application icon set and
launch/splash resources in their platform-native locations:

- `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- `ios/App/App/Assets.xcassets/Splash.imageset/`
- `android/app/src/main/res/mipmap-*/` and `drawable-*/splash.png`

`capacitor.config.json` sets the launch background to `#F3ECDF` and hides the
native spinner. These are provisional native assets only; no web content or
remedy images are copied into either project. A future brand-export can replace
the resource files without changing routes, content, signing or stores.
