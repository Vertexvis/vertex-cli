#!/usr/bin/env bash

# Internal script to publish packages to NPM.

set -e

. "$(pwd)"/scripts/utils.sh

version="v$(get_version)"
sha="$(git rev-parse HEAD)"

npm publish --access public

curl -s -X POST "https://api.github.com/repos/$REPOSITORY/releases" \
-H "Authorization: token $GITHUB_TOKEN" \
-d @- <<EOF
{
  "tag_name": "$version",
  "target_commitish": "$sha",
  "name": "$version",
  "body": "Automated release for $version\n",
  "draft": false,
  "prelease": false
}
EOF

npm deprecate @vertexvis/vertex-cli "Package is deprecated. Use @vertexvis/cli instead."
