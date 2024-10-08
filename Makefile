# Define the list of all directories containing the compose files
ALL_DIRS=webserver monitoring authentik rabbitmq parser user-ingest spectator/server

# If specific directories are passed as arguments, use them; otherwise, use ALL_DIRS
DIRS=$(if $(filter $(ALL_DIRS), $(MAKECMDGOALS)), $(filter $(ALL_DIRS), $(MAKECMDGOALS)), $(ALL_DIRS))

.PHONY: pull build up down $(ALL_DIRS)

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
$(ALL_DIRS):
	@:

format:
	pre-commit install
	pre-commit run --all-files

check:
	pre-commit install
	pre-commit run --all-files --show-diff-on-failure
