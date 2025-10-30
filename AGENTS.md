# Agent Guidelines for sir-hires

## Project Overview
Job search assistant built with n8n as the backend. Early-stage project.

**Architecture:**
- Backend: n8n workflows (running on VPS)
- Data storage: Google Sheets (MVP), migrate to PostgreSQL/Supabase later
- Job data: Adzuna API (legal, stable), add other APIs as needed
- Frontend: React + TypeScript + shadcn/ui (planned)

## Build/Test Commands
- **n8n workflows**: Export workflows as JSON files to `/workflows/` directory
- **Testing**: Document API endpoints and test manually via n8n UI or curl
- **Single test**: Not applicable (n8n workflows tested individually in UI)

## n8n Workflow Management Scripts

**Available Scripts:** Agents can use these scripts to manage n8n workflows programmatically.

### Pull Workflow from n8n
```bash
./workflows/copy-from-n8n.sh <workflow_id>
```
- Exports a workflow from the remote n8n instance
- Saves as `<workflow_id>.json` in current directory
- Use this to pull changes made in the n8n UI back to version control
- Example: `./workflows/copy-from-n8n.sh fetch-full-description`

### Push Workflow to n8n
```bash
./workflows/send-to-n8n.sh <workflow.json>
```
- Uploads and imports a workflow JSON file to the remote n8n instance
- Use this to deploy local workflow changes to n8n
- Example: `./workflows/send-to-n8n.sh fetch-full-description.json`

**Prerequisites:**
- SSH config with "DigitalOcean" host alias configured
- n8n running via docker-compose on the remote server

**Agent Workflow:**
1. Make changes in n8n UI and test
2. Use `copy-from-n8n.sh` to pull the tested workflow
3. Review and commit the changes
4. To deploy local changes, use `send-to-n8n.sh` to push to n8n

## Code Style Guidelines
- **Files**: Store n8n workflow exports as `.json` in `/workflows/` with descriptive names
- **Documentation**: Add clear comments in workflow descriptions and node notes
- **Configuration**: Store credentials separately, use environment variables for secrets
- **Naming**: Use kebab-case for workflow files (e.g., `job-search-assistant.json`)
- **Structure**: Organize workflows logically; one workflow per major feature
- **Error Handling**: Include error workflows and fallback paths in n8n nodes
- **Version Control**: Commit workflow JSON exports after significant changes

## Development Workflow
- Test workflows in n8n UI before exporting
- Use `copy-from-n8n.sh` to pull tested workflows from n8n to version control
- Use `send-to-n8n.sh` to deploy local workflow changes to n8n
- Document workflow inputs/outputs in README or workflow descriptions
- Keep sensitive data out of version control
