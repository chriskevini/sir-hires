#!/bin/bash
# Usage: ./copy-from-n8n.sh <workflow_id>
# Prerequisites:
# - SSH config with "DigitalOcean" host alias configured
# - n8n running via docker-compose on the remote server

ssh DigitalOcean docker exec -u node n8n-docker-caddy-n8n-1 \
n8n export:workflow --id=$1 --pretty --output=/home/node/.n8n/$1.json && \
scp DigitalOcean:/var/lib/docker/volumes/n8n_data/_data/$1.json ./$1.json
