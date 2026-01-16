from setuptools import setup


setup(
    name="opencv-contrib-python",
    version="4.10.0.84",
    description="Shim package that installs headless OpenCV contrib.",
    install_requires=["opencv-contrib-python-headless==4.10.0.84"],
)
