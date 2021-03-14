# Vertex CLI

[![Version](https://img.shields.io/npm/v/@vertexvis/vertex-cli.svg)](https://www.npmjs.com/package/@vertexvis/vertex-cli)
[![License](https://img.shields.io/npm/l/@vertexvis/vertex-cli.svg)](https://github.com/Vertexvis/vertex-cli/blob/master/LICENSE) [TypeDoc Documentation](https://vertexvis.github.io/vertex-cli/)

The Vertex command-line interface (CLI) makes Vertex API calls on your behalf, simplifying common operations into single commands.

To get started with the CLI, [check out our guide](https://developer.vertexvis.com/docs/guides/import-data). Below, find installation and configuration instructions along with a full list of commands and their options. 

Install the CLI, `npm install -g @vertexvis/vertex-cli`. Next, run `vertex configure` with the optional `--basePath` option to configure your Vertex client ID and secret. This creates `~/.config/@vertexvis/vertex-cli/config.json` on macOs/Linux and `%LOCALAPPDATA%\@vertexvis/vertex-cli/config.json` on Windows with your credentials. Then, run the other commands with the same `--basePath` option and the CLI will use the proper credentials to communicate with Vertex's API.

<!-- toc -->
* [Vertex CLI](#vertex-cli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @vertexvis/vertex-cli
$ vertex COMMAND
running command...
$ vertex (-v|--version|version)
@vertexvis/vertex-cli/0.6.1 darwin-x64 node-v14.16.0
$ vertex --help [COMMAND]
USAGE
  $ vertex COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`vertex configure`](#vertex-configure)
* [`vertex create-items [PATH]`](#vertex-create-items-path)
* [`vertex create-parts [PATH]`](#vertex-create-parts-path)
* [`vertex create-scene [PATH]`](#vertex-create-scene-path)
* [`vertex create-stream-key [ID]`](#vertex-create-stream-key-id)
* [`vertex delete [ID]`](#vertex-delete-id)
* [`vertex help [COMMAND]`](#vertex-help-command)
* [`vertex render-image [ID]`](#vertex-render-image-id)

## `vertex configure`

Configure Vertex credentials.

```
USAGE
  $ vertex configure

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -v, --verbose

EXAMPLE
  $ vertex configure
  Saved 'https://platform.vertexvis.com' configuration to '~/.config/@vertexvis/vertex-cli/config.json'.
```

_See code: [src/commands/configure.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.6.1/src/commands/configure.ts)_

## `vertex create-items [PATH]`

Calculate path IDs and transforms for each instance in file and output JSON file containing SceneItems (as defined in src/create-items/index.d.ts).

```
USAGE
  $ vertex create-items [PATH]

OPTIONS
  -b, --basePath=basePath                  [default: https://platform.vertexvis.com] Vertex API base path.
  -f, --format=pvs                         (required) File format.
  -h, --help                               show CLI help
  -o, --output=output                      [default: items.json] Path to output file.

  -r, --revisionProperty=revisionProperty  Assuming the file format includes metadata properties, the property name to
                                           use for the part-revision's supplied ID. If not provided, the supplied ID
                                           defaults to '1'.

  -v, --verbose

  --root=root                              Part/assembly to use as root in file.

EXAMPLE
  $ vertex create-items -f pvs path/to/file
  Wrote 5 pvs item(s) from 'path/to/file' to 'items.json'.
```

_See code: [src/commands/create-items.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.6.1/src/commands/create-items.ts)_

## `vertex create-parts [PATH]`

Given JSON file containing SceneItems (as defined in src/create-items/index.d.ts), upload geometry files and create parts in Vertex Part Library.

```
USAGE
  $ vertex create-parts [PATH]

OPTIONS
  -b, --basePath=basePath        [default: https://platform.vertexvis.com] Vertex API base path.
  -d, --directory=directory      Directory containing geometry files.
  -h, --help                     show CLI help
  -p, --parallelism=parallelism  [default: 20] Number of files and parts to create in parallel.
  -v, --verbose

EXAMPLE
  $ vertex create-parts -d path/to/geometry/directory path/to/file
  Found 5 part(s) with geometry.
  Uploading file(s) and creating part(s)... done
```

_See code: [src/commands/create-parts.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.6.1/src/commands/create-parts.ts)_

## `vertex create-scene [PATH]`

Given JSON file containing SceneItems (as defined in src/create-items/index.d.ts), create scene in Vertex.

```
USAGE
  $ vertex create-scene [PATH]

OPTIONS
  -b, --basePath=basePath        [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help                     show CLI help
  -p, --parallelism=parallelism  [default: 20] Number of scene-items to create in parallel.
  -v, --verbose

EXAMPLE
  $ vertex create-scene -i path/to/items/file
  Creating scene... done
  Created scene f79d4760-0b71-44e4-ad0b-22743fdd4ca3.
```

_See code: [src/commands/create-scene.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.6.1/src/commands/create-scene.ts)_

## `vertex create-stream-key [ID]`

Generate a stream-key for a scene.

```
USAGE
  $ vertex create-stream-key [ID]

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -k, --expiry=expiry      [default: 600] Expiry in seconds to set on stream-key.
  -v, --verbose

EXAMPLE
  $ vertex create-stream-key f79d4760-0b71-44e4-ad0b-22743fdd4ca3
  Created stream-key 'hBXAoQdnsHVhgDZkxeLEPQVxPJ600QwDMdgq' expiring in 600 seconds.
```

_See code: [src/commands/create-stream-key.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.6.1/src/commands/create-stream-key.ts)_

## `vertex delete [ID]`

Delete resources.

```
USAGE
  $ vertex delete [ID]

OPTIONS
  -b, --basePath=basePath         [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help                      show CLI help
  -r, --resource=file|part|scene  (required) Resource type of ID provided.
  -v, --verbose
  --all                           Delete all of specified resources.

EXAMPLE
  $ vertex delete --resource scene f79d4760-0b71-44e4-ad0b-22743fdd4ca3
  Delete scene(s) f79d4760-0b71-44e4-ad0b-22743fdd4ca3.
```

_See code: [src/commands/delete.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.6.1/src/commands/delete.ts)_

## `vertex help [COMMAND]`

display help for vertex

```
USAGE
  $ vertex help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## `vertex render-image [ID]`

Render an image for a scene, scene-view, or part-revision.

```
USAGE
  $ vertex render-image [ID]

OPTIONS
  -b, --basePath=basePath                        [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --height=height                            [default: 100] Image height.
  -h, --help                                     show CLI help
  -o, --output=output                            Path to output file.
  -r, --resource=scene|scene-view|part-revision  [default: scene] Resource type of ID provided.
  -v, --verbose
  -w, --width=width                              [default: 100] Image width.
  --viewer                                       Create Web SDK Viewer HTML instead of jpg image.

EXAMPLE
  $ vertex render-image f79d4760-0b71-44e4-ad0b-22743fdd4ca3
  Image written to 'f79d4760-0b71-44e4-ad0b-22743fdd4ca3.jpg'.
```

_See code: [src/commands/render-image.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.6.1/src/commands/render-image.ts)_
<!-- commandsstop -->

## Local development

The CLI uses [`oclif`](https://oclif.io/) framework. It's a thin layer on top of [`@vertexvis/vertex-api-client`](https://github.com/Vertexvis/vertex-api-client-ts). This means that for most changes, you'll be making modifications to both libraries. To link them, clone both repositories, then,

1. In `vertex-api-client-ts`,
  1. Install dependencies, `yarn install`
  1. Build the project, `yarn clean-build`
  1. Link it, `yarn link`
1. In `vertex-cli`,
  1. Reference the linked client, `yarn link @vertexvis/vertex-api-client`
  1. Run the local version of the CLI, `./bin/run --help`

When you're ready to publish a new version, commit your changes and then run `yarn version [--patch | --minor | --major]`. `oclif` takes care of updating the version numbers and updating the `README`.
