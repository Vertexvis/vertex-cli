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
@vertexvis/vertex-cli/0.0.3 darwin-x64 node-v14.12.0
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
* [`vertex create-template [PATH]`](#vertex-create-template-path)
* [`vertex help [COMMAND]`](#vertex-help-command)

## `vertex create-parts [PATH]`

Given JSON file in Vertex's scene template format, upload geometry files and create parts in Vertex Part Library.

```
USAGE
  $ vertex create-parts [PATH]

OPTIONS
  -d, --directory=directory                       (required) Directory containing geometry files.
  -e, --environment=platdev|platstaging|platprod  [default: platprod] Vertex API environment.
  -h, --help                                      show CLI help
  -v, --verbose

EXAMPLE
  $ vertex create-parts -d path/to/geometry/directory path/to/file
  Uploaded and created 5 parts.
```

_See code: [src/commands/create-parts.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.0.3/src/commands/create-parts.ts)_

## `vertex create-scene [PATH]`

Given JSON file in Vertex's scene template format, create scene in Vertex.

```
USAGE
  $ vertex create-scene [PATH]

OPTIONS
  -e, --environment=platdev|platstaging|platprod  [default: platprod] Vertex API environment.
  -h, --help                                      show CLI help
  -i, --templateSuppliedId=templateSuppliedId     (required) Scene template supplied ID.
  -t, --template=template                         (required) Path to scene template.
  -v, --verbose

EXAMPLE
  $ vertex create-scene -i scene-template-supplied-id -t path/to/template/file
  Created scene f79d4760-0b71-44e4-ad0b-22743fdd4ca3.
```

_See code: [src/commands/create-scene.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.0.3/src/commands/create-scene.ts)_

## `vertex create-template [PATH]`

Calculate path IDs and transforms for each instance in file and output new file in Vertex's scene template format.

```
USAGE
  $ vertex create-template [PATH]

OPTIONS
  -f, --format=pvs     (required) File format.
  -h, --help           show CLI help
  -o, --output=output  [default: template.json] Path to output file.
  -v, --verbose

EXAMPLE
  $ vertex template -f pvs path/to/file
  Wrote 5 pvs instances from 'path/to/file' to 'template.json'.
```

_See code: [src/commands/create-template.ts](https://github.com/Vertexvis/vertex-cli/blob/v0.0.3/src/commands/create-template.ts)_

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
<!-- commandsstop -->
