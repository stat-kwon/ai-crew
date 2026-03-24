.PHONY: validate sync build registry doctor clean help test test-e2e

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

validate: ## Validate catalog items and bundles
	python3 tools/validate_catalog.py

resolve: ## Resolve a bundle (usage: make resolve BUNDLE=fullstack)
	python3 tools/resolve_bundle.py $(BUNDLE)

sync: ## Sync a bundle to plugins/ (usage: make sync BUNDLE=fullstack)
	python3 tools/sync_plugin.py $(BUNDLE) --force

sync-all: ## Sync all bundles to plugins/
	python3 tools/sync_plugin.py --all --force

registry: ## Rebuild .claude-plugin/registry.json from catalog
	python3 tools/build_registry.py

doctor: ## Run health checks
	python3 tools/doctor.py

build: ## Build TypeScript CLI
	npm run build

clean: ## Remove generated plugins
	rm -rf plugins/*/

test:           ## Run unit tests
	npm test

test-e2e:       ## Run E2E install verification
	bash src/__tests__/e2e-install.sh

all: validate registry sync-all build ## Full pipeline: validate → registry → sync → build
