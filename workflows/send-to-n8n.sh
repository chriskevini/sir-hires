#!/bin/bash
# Usage: ./send-to-n8n.sh <workflow.json>
# Prerequisites:
# - SSH config with "DigitalOcean" host alias configured
# - n8n running via docker-compose on the remote server

scp $1 DigitalOcean:/var/lib/docker/volumes/n8n_data/_data/workflow.json && \
ssh DigitalOcean docker exec -u node n8n-docker-caddy-n8n-1 \
  n8n import:workflow --input=/home/node/.n8n/workflow.json
