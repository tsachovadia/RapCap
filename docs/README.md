# Artifex Documentation System

<!--
AGENT_INSTRUCTION_START
!!! CRITICAL AGENT INSTRUCTION !!!
This folder )(/Users/syrianhammer/Library/Mobile Documents/com~apple~CloudDocs/Documents/1 Projects/RapCap/docs) is the SINGLE SOURCE OF TRUTH (SSOT) for the project.
Before making any significant code changes or starting a new feature:
1.  **READ** the relevant specs in `product_specs/`.
2.  **UPDATE** the specs if the plan changes (Truthseeking).
3.  **NEVER** skip updating the docs. Code follows Docs, not the other way around.
AGENT_INSTRUCTION_END
-->

Welcome to the **Artifex (The Freestyle Architect)** documentation repository.
This folder is the **Single Source of Truth (SSOT)** for the project.

## Directory Structure

*   **`product_specs/`**: Functional specifications and product decisions.
    *   `00_architecture_logic.md`: Core system models (Session, Latency) and logic.
    *   `01_studio_screen.md`: Main recording interface specs.
    *   `02_library_screen.md`: Session management specs.
    *   `03_platform_strategy.md`: PWA vs Native decision and Wake Lock logic.
    *   *(Future specs will be added here)*

*   **`.meta/`**: System files, metadata, and resolve logs. **Do not edit manually.**
    *   Contains JSON metadata, resolved diffs, and other tool-generated artifacts.

## How we work

1.  **Agile Updates**: We update these documents *before* writing code. If a decision changes, it changes here first.
2.  **Context**: This folder serves as the context for the AI Agent (Antigravity).
3.  **Naming Convention**: Use numbered prefixes (`00_`, `01_`) to keep critical reading order.
