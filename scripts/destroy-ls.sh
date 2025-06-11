#!/bin/bash

set -e

docker-compose down

cd localstack-data

sudo rm -rf cache lib logs state tmp
