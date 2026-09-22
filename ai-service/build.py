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
    # torch's default PyPI wheel pulls in several GB of NVIDIA CUDA libraries
    # for GPU support this service never uses. PyBuilder installs
    # requirements.txt into its own venvs (separate from anything installed
    # on the host), so the CPU-only index has to be given here too, not just
    # in the Dockerfile - otherwise pip resolves the CUDA build every time.
    project.set_property("install_dependencies_extra_index_url", "https://download.pytorch.org/whl/cpu")
