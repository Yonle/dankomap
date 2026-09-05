
# DankomaP

A desktop video player with Bilibili-style danmaku support, powered by Dankoma.js.

## Requirements

- Node.js
- npm
- Git
- NW.js build environment
- Git submodules initialized

## Setup

Clone the repository with submodules:

```bash
git clone --recurse-submodules https://github.com/Yonle/dankomap.git
cd dankomap
````

If the repository was already cloned:

```bash
git submodule update --init --recursive
```

Install the dependencies:

```bash
npm run prepare-cdebug
npm run prepare-conv
```

This also installs the dependencies of `modules/dankomaconv.js`, including `protobufjs`.

You can also run it manually:

```bash
npm --prefix modules/dankomaconv.js install --include=dev
```

## Build

The build uses NW.js `0.114.1`, x64, and the FFmpeg build with proprietary codec support.

Set `PLATFORM` to the target platform:

```bash
PLATFORM=linux npm run build
```

```bash
PLATFORM=win npm run build
```

```bash
PLATFORM=osx npm run build
```

The build script is:

```json
"build": "nwbuild --version 0.114.1 --platform $PLATFORM --arch x64 --outDir=out-$PLATFORM --mode=build --glob true --zip true --shaSum true --ffmpeg true --logLevel debug \"{package.json,dankoma-loader/**,modules/**,!dankoma-loader/.git/**,!modules/**/.git/**}\""
```

The source glob includes only:

```text
package.json
dankoma-loader/
modules/
```

and excludes Git metadata inside those directories.

## Build output

`--zip true` packages the application and removes the temporary unpacked output directory.

For example:

```bash
PLATFORM=linux npm run build
```

produces:

```text
out-linux.zip
```

Likewise:

```text
out-win.zip
out-osx.zip
```

The corresponding checksum files are also generated because `--shaSum true` is enabled.

The temporary `out-$PLATFORM/` directory is not intended to be kept as the final build artifact.

## Build dependencies

The root project requires `nw-builder` as a development dependency.

The `dankomaconv.js` submodule has its own dependencies and must have them installed before building:

```bash
npm run prepare-conv
```

In particular, `protobufjs` is required by `dankomaconv.js`.

## NW.js version

DankomaP is built with NW.js `0.114.1`.

The runtime version is specified by the build script:

```text
--version 0.114.1
```

Keep the NW.js version and the bundled FFmpeg build compatible when changing the runtime version.