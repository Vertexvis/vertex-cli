#!/bin/bash

function get_version {
  jq -r '.version' ./package.json
}
