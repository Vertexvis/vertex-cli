# vertex-cli

The Vertex platform command-line interface (CLI).

[![Version](https://img.shields.io/npm/v/@vertexvis/vertex-cli.svg)](https://www.npmjs.com/package/@vertexvis/vertex-cli)
[![License](https://img.shields.io/npm/l/@vertexvis/vertex-cli.svg)](https://github.com/Vertexvis/vertex-cli/blob/master/LICENSE)

<!-- toc -->
* [vertex-cli](#vertex-cli)
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
@vertexvis/vertex-cli/0.0.11 darwin-x64 node-v14.12.0
$ vertex --help [COMMAND]
USAGE
  $ vertex COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`vertex create-parts [PATH]`](#vertex-create-parts-path)
* [`vertex create-scene [PATH]`](#vertex-create-scene-path)
* [`vertex create-stream-key [ID]`](#vertex-create-stream-key-id)
* [`vertex create-template [PATH]`](#vertex-create-template-path)
* [`vertex help [COMMAND]`](#vertex-help-command)
* [`vertex render-image [ID]`](#vertex-render-image-id)

## `vertex create-parts [PATH]`

Given JSON file in Vertex's scene template format, upload geometry files and create parts in Vertex Part Library.

```
USAGE
  $ vertex create-parts [PATH]

OPTIONS
  -b, --basePath=basePath        [default: https://platform.vertexvis.com] Vertex API base path.
  -d, --directory=directory      (required) Directory containing geometry files.
  -h, --help                     show CLI help
  -p, --parallelism=parallelism  [default: 20] Number of files and parts to create in parallel.
  -v, --verbose

EXAMPLE
  $ vertex create-parts -d path/to/geometry/directory path/to/file
  Found 5 part(s) with geometry.
  Uploading file(s) and creating part(s)... done
```

_See code: [src/commands/create-parts.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.0.11/src/commands/create-parts.ts)_

## `vertex create-scene [PATH]`

Given JSON file in Vertex's scene template format, create scene in Vertex.

```
USAGE
  $ vertex create-scene [PATH]

OPTIONS
  -b, --basePath=basePath                      [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --help                                   show CLI help
  -i, --templateSuppliedId=templateSuppliedId  (required) Scene template supplied ID.
  -p, --parallelism=parallelism                [default: 20] Number of scene-items to create in parallel.
  -t, --template=template                      (required) Path to scene template.
  -v, --verbose
  --experimental                               Create scene with scene-items.

EXAMPLE
  $ vertex create-scene -i scene-template-supplied-id -t path/to/template/file
  Creating scene... done
  Created scene f79d4760-0b71-44e4-ad0b-22743fdd4ca3.
```

_See code: [src/commands/create-scene.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.0.11/src/commands/create-scene.ts)_

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

_See code: [src/commands/create-stream-key.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.0.11/src/commands/create-stream-key.ts)_

## `vertex create-template [PATH]`

Calculate path IDs and transforms for each instance in file and output new file in Vertex's scene template format.

```
USAGE
  $ vertex create-template [PATH]

OPTIONS
  -b, --basePath=basePath                  [default: https://platform.vertexvis.com] Vertex API base path.
  -f, --format=pvs                         (required) File format.
  -h, --help                               show CLI help
  -o, --output=output                      [default: template.json] Path to output file.

  -r, --revisionProperty=revisionProperty  Assuming the file format includes metadata properties, the property name to
                                           use for the part-revision's supplied ID. If not provided, the supplied ID
                                           defaults to '1'.

  -v, --verbose

  --root=root                              Part/assembly to use as root in file.

EXAMPLE
  $ vertex create-template -f pvs path/to/file
  Wrote 5 pvs item(s) from 'path/to/file' to 'template.json'.
```

_See code: [src/commands/create-template.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.0.11/src/commands/create-template.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.0/src/commands/help.ts)_

## `vertex render-image [ID]`

Render an image of either a scene or scene-view.

```
USAGE
  $ vertex render-image [ID]

OPTIONS
  -b, --basePath=basePath          [default: https://platform.vertexvis.com] Vertex API base path.
  -h, --height=height              [default: 100] Image height.
  -h, --help                       show CLI help
  -o, --output=output              Path to output file.
  -r, --resource=scene|scene-view  [default: scene] Resource type of ID provided.
  -v, --verbose
  -w, --width=width                [default: 100] Image width.

EXAMPLE
  $ vertex render-image f79d4760-0b71-44e4-ad0b-22743fdd4ca3
  Image written to 'f79d4760-0b71-44e4-ad0b-22743fdd4ca3.jpeg'.
```

_See code: [src/commands/render-image.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.0.11/src/commands/render-image.ts)_
<!-- commandsstop -->
