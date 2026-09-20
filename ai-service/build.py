from pybuilder.core import init, use_plugin

use_plugin("python.core")
use_plugin("python.unittest")

name = "complaint-ai-service"
version = "0.1.0"
default_task = ["clean", "run_unit_tests"]


@init
def set_properties(project):
    project.depends_on_requirements("requirements.txt")
    project.build_depends_on("httpx2")
