# Define the list of all directories containing the compose files
COMMON_DIRS=monitoring clickhouse authentik rabbitmq db-ingest user-ingest spectator/server
DEV_DIRS=webserver-local
PROD_DIRS=webserver

# If specific directories are passed as arguments, use them; otherwise, use ALL_DIRS
USER_DIRS=$(if $(filter $(COMMON_DIRS), $(MAKECMDGOALS)), $(filter $(COMMON_DIRS), $(MAKECMDGOALS)), $(COMMON_DIRS))
DIRS=$(if $(filter $(COMMON_DIRS), "prod"), $(PROD_DIRS) $(USER_DIRS), $(DEV_DIRS) $(USER_DIRS))

.PHONY: pull build up down $(COMMON_DIRS) $(DEV_DIRS) $(PROD_DIRS)

pull: $(DIRS)
	@echo "Pulling images for: $(DIRS)..."
	@$(foreach dir, $(DIRS), \
		(cd $(dir) && docker compose pull) || exit;)

build: $(DIRS)
	@echo "Building images for: $(DIRS)..."
	@$(foreach dir, $(DIRS), \
		(cd $(dir) && docker compose build) || exit;)

up: $(DIRS)
	@echo "Starting services for: $(DIRS)..."
	@$(foreach dir, $(DIRS), \
		(cd $(dir) && docker compose up -d --wait --remove-orphans) || exit;)

down: $(DIRS)
	@echo "Stopping services for: $(DIRS)..."
	@$(foreach dir, $(DIRS), \
		(cd $(dir) && docker compose down) || continue;)

# Prevent Make from treating the directory names as commands
$(COMMON_DIRS):
	@:
$(PROD_DIRS):
	@:
$(DEV_DIRS):
	@:

format:
	pre-commit install
	pre-commit run --all-files

check:
	pre-commit install
	pre-commit run --all-files --show-diff-on-failure
