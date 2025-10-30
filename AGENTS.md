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
- Document workflow inputs/outputs in README or workflow descriptions
- Keep sensitive data out of version control
