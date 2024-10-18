import json
import os

import jinja2
from dotenv import load_dotenv

load_dotenv()

loader = jinja2.FileSystemLoader(searchpath="./")
templateEnv = jinja2.Environment(loader=loader)
template = templateEnv.get_template("docker-compose.yaml.j2")

accounts = json.loads(os.getenv("SPECTATOR_STEAM_ACCOUNTS", default=""))
output = template.render(accounts=accounts)

print(output)
