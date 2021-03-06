#!/usr/bin/env bash

function get_version {
  jq -r '.version' ./package.json
}
