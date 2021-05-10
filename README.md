# Vertex CLI

[![Version](https://img.shields.io/npm/v/@vertexvis/cli.svg)](https://www.npmjs.com/package/@vertexvis/cli)
[![License](https://img.shields.io/npm/l/@vertexvis/cli.svg)](https://github.com/Vertexvis/vertex-cli/blob/master/LICENSE)

[TypeDoc Documentation](https://vertexvis.github.io/vertex-cli/)

The Vertex command-line interface (CLI) makes Vertex API calls on your behalf, simplifying common operations into single commands.

To get started with the CLI, [check out our guide](https://developer.vertexvis.com/docs/guides/import-data). Below, find installation and configuration instructions along with a full list of commands and their options. 

Install the CLI, `npm install -g @vertexvis/cli`. Next, run `vertex configure` with the optional `--basePath` option to configure your Vertex client ID and secret. This creates `~/.config/@vertexvis/cli/config.json` on macOs/Linux and `%LOCALAPPDATA%\@vertexvis/cli/config.json` on Windows with your credentials. Then, run the other commands with the same `--basePath` option and the CLI will use the proper credentials to communicate with Vertex's API.

## Local development

The CLI uses [`oclif`](https://oclif.io/) framework. It's a thin layer on top of [`@vertexvis/api-client-node`](https://github.com/Vertexvis/vertex-api-client-node). This means that for most changes, you'll be making modifications to both libraries. To link them, clone both repositories, then,

1. In `vertex-api-client-node`,
  1. Install dependencies, `yarn install`
  1. Build the project, `yarn clean-build`
  1. Link it, `yarn link`
1. In `vertex-cli`,
  1. Reference the linked client, `yarn link @vertexvis/api-client-node`
  1. Run the local version of the CLI, `./bin/run --help`

When you're ready to publish a new version, commit your changes and then run `yarn version [--patch | --minor | --major]`. `oclif` takes care of updating the version numbers and updating the `README`.

<!-- toc -->
* [Vertex CLI](#vertex-cli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @vertexvis/cli
$ vertex COMMAND
running command...
$ vertex (-v|--version|version)
@vertexvis/cli/0.12.4 darwin-x64 node-v14.16.1
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
* [`vertex files:delete [ID]`](#vertex-filesdelete-id)
* [`vertex files:get [ID]`](#vertex-filesget-id)
* [`vertex files:list`](#vertex-fileslist)
* [`vertex help [COMMAND]`](#vertex-help-command)
* [`vertex part-revisions:render [ID]`](#vertex-part-revisionsrender-id)
* [`vertex parts:delete [ID]`](#vertex-partsdelete-id)
* [`vertex parts:get [ID]`](#vertex-partsget-id)
* [`vertex parts:list`](#vertex-partslist)
* [`vertex scene-views:render [ID]`](#vertex-scene-viewsrender-id)
* [`vertex scenes:delete [ID]`](#vertex-scenesdelete-id)
* [`vertex scenes:get [ID]`](#vertex-scenesget-id)
* [`vertex scenes:list`](#vertex-sceneslist)
* [`vertex scenes:render [ID]`](#vertex-scenesrender-id)
* [`vertex stream-keys:create`](#vertex-stream-keyscreate)

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
  Saved 'https://platform.vertexvis.com' configuration to '~/.config/@vertexvis/cli/config.json'.
```

_See code: [src/commands/configure.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/configure.ts)_

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
  $ vertex create-items --format pvs [YOUR_PATH_TO_XML_FILE]
  Wrote 5 pvs item(s) from '[YOUR_PATH_TO_XML_FILE]' to 'items.json'.
```

_See code: [src/commands/create-items.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/create-items.ts)_

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
  $ vertex create-parts --directory [YOUR_PATH_TO_GEOMETRY_DIRECTORY] [YOUR_PATH_TO_JSON_FILE]
     ████████████████████████████████████████ 100% | 10/10
```

_See code: [src/commands/create-parts.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/create-parts.ts)_

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
  --name=name                    Name of scene.
  --noFailFast                   Whether or not to fail if any scene item fails initial validation.
  --suppliedId=suppliedId        SuppliedId of scene.
  --treeEnabled                  Whether or not scene trees can be viewed for this scene.

EXAMPLE
  $ vertex create-scene --name my-scene [YOUR_PATH_TO_JSON_FILE]
     ████████████████████████████████████████ 100% | 10/10
  f79d4760-0b71-44e4-ad0b-22743fdd4ca3
```

_See code: [src/commands/create-scene.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/create-scene.ts)_

## `vertex files:delete [ID]`

Delete files.

```
USAGE
  $ vertex files:delete [ID]

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -v, --verbose
  --all                    Delete all resources.

EXAMPLE
  $ vertex files:delete 54964c61-05d8-4f37-9638-18f7c4960c80
  Deleted file 54964c61-05d8-4f37-9638-18f7c4960c80.
  Deleting file(s)...... done
```

_See code: [src/commands/files/delete.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/files/delete.ts)_

## `vertex files:get [ID]`

Get a file.

```
USAGE
  $ vertex files:get [ID]

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -v, --verbose
  --extended               Display extended output.

EXAMPLE
  $ vertex files:get 54964c61-05d8-4f37-9638-18f7c4960c80
  Id                                   Name
  54964c61-05d8-4f37-9638-18f7c4960c80 my-file
```

_See code: [src/commands/files/get.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/files/get.ts)_

## `vertex files:list`

Get files.

```
USAGE
  $ vertex files:list

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -v, --verbose
  --cursor=cursor          Cursor for next page of items.
  --extended               Display extended output.

EXAMPLE
  $ vertex files:list
  Id                                   Name
  54964c61-05d8-4f37-9638-18f7c4960c80 my-file-1
  a8070713-e48e-466b-b4bb-b3132895d5ce my-file-2
```

_See code: [src/commands/files/list.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/files/list.ts)_

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

## `vertex part-revisions:render [ID]`

Render a part revision.

```
USAGE
  $ vertex part-revisions:render [ID]

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --height=height      [default: 100] Image height.
  -h, --help               show CLI help
  -o, --output=output      Path to output file.
  -v, --verbose
  -w, --width=width        [default: 100] Image width.

EXAMPLE
  $ vertex part-revisions:render 54964c61-05d8-4f37-9638-18f7c4960c80
  54964c61-05d8-4f37-9638-18f7c4960c80.jpg
```

_See code: [src/commands/part-revisions/render.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/part-revisions/render.ts)_

## `vertex parts:delete [ID]`

Delete parts.

```
USAGE
  $ vertex parts:delete [ID]

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -v, --verbose
  --all                    Delete all resources.

EXAMPLE
  $ vertex parts:delete 54964c61-05d8-4f37-9638-18f7c4960c80
  Deleted part 54964c61-05d8-4f37-9638-18f7c4960c80.
  Deleting part(s)...... done
```

_See code: [src/commands/parts/delete.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/parts/delete.ts)_

## `vertex parts:get [ID]`

Get a part.

```
USAGE
  $ vertex parts:get [ID]

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -v, --verbose
  --extended               Display extended output.

EXAMPLE
  $ vertex parts:get 54964c61-05d8-4f37-9638-18f7c4960c80
  Id                                   Name
  54964c61-05d8-4f37-9638-18f7c4960c80 my-part
```

_See code: [src/commands/parts/get.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/parts/get.ts)_

## `vertex parts:list`

Get parts.

```
USAGE
  $ vertex parts:list

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -v, --verbose
  --cursor=cursor          Cursor for next page of items.
  --extended               Display extended output.

EXAMPLE
  $ vertex parts:list
  Id                                   Name
  54964c61-05d8-4f37-9638-18f7c4960c80 my-part-1
  a8070713-e48e-466b-b4bb-b3132895d5ce my-part-2
```

_See code: [src/commands/parts/list.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/parts/list.ts)_

## `vertex scene-views:render [ID]`

Render a scene view.

```
USAGE
  $ vertex scene-views:render [ID]

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --height=height      [default: 100] Image height.
  -h, --help               show CLI help
  -o, --output=output      Path to output file.
  -v, --verbose
  -w, --width=width        [default: 100] Image width.

EXAMPLE
  $ vertex scene-views:render 54964c61-05d8-4f37-9638-18f7c4960c80
  54964c61-05d8-4f37-9638-18f7c4960c80.jpg
```

_See code: [src/commands/scene-views/render.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/scene-views/render.ts)_

## `vertex scenes:delete [ID]`

Delete scenes.

```
USAGE
  $ vertex scenes:delete [ID]

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -v, --verbose
  --all                    Delete all resources.

EXAMPLE
  $ vertex scenes:delete 54964c61-05d8-4f37-9638-18f7c4960c80
  Deleted scene 54964c61-05d8-4f37-9638-18f7c4960c80.
  Deleting scene(s)...... done
```

_See code: [src/commands/scenes/delete.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/scenes/delete.ts)_

## `vertex scenes:get [ID]`

Get a scene.

```
USAGE
  $ vertex scenes:get [ID]

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -v, --verbose
  --extended               Display extended output.

EXAMPLE
  $ vertex scenes:get 54964c61-05d8-4f37-9638-18f7c4960c80
  Id                                   Name
  54964c61-05d8-4f37-9638-18f7c4960c80 my-scene
```

_See code: [src/commands/scenes/get.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/scenes/get.ts)_

## `vertex scenes:list`

Get scenes.

```
USAGE
  $ vertex scenes:list

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -v, --verbose
  --cursor=cursor          Cursor for next page of items.
  --extended               Display extended output.

EXAMPLE
  $ vertex scenes:list
  Id                                   Name
  54964c61-05d8-4f37-9638-18f7c4960c80 my-scene-1
  a8070713-e48e-466b-b4bb-b3132895d5ce my-scene-2
```

_See code: [src/commands/scenes/list.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/scenes/list.ts)_

## `vertex scenes:render [ID]`

Render a scene.

```
USAGE
  $ vertex scenes:render [ID]

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --height=height      [default: 100] Image height.
  -h, --help               show CLI help
  -o, --output=output      Path to output file.
  -v, --verbose
  -w, --width=width        [default: 100] Image width.
  --viewer                 Create Web SDK Viewer HTML instead of jpg image.

EXAMPLE
  $ vertex scenes:render 54964c61-05d8-4f37-9638-18f7c4960c80
  54964c61-05d8-4f37-9638-18f7c4960c80.jpg
```

_See code: [src/commands/scenes/render.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/scenes/render.ts)_

## `vertex stream-keys:create`

Create a stream key for a scene.

```
USAGE
  $ vertex stream-keys:create

OPTIONS
  -b, --basePath=basePath  [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help               show CLI help
  -k, --expiry=expiry      [default: 600] Expiry in seconds to set on stream-key.
  -v, --verbose
  --sceneId=sceneId        (required) Scene to access with stream key.

EXAMPLE
  $ vertex stream-keys:create --sceneId f79d4760-0b71-44e4-ad0b-22743fdd4ca3
  hBXAoQdnsHVhgDZkxeLEPQVxPJ600QwDMdgq
```

_See code: [src/commands/stream-keys/create.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.12.4/src/commands/stream-keys/create.ts)_
<!-- commandsstop -->
