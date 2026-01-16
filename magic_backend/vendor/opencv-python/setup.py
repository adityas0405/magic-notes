from setuptools import setup


setup(
    name="opencv-python",
    version="4.10.0.84",
    description="Shim package that installs headless OpenCV.",
    install_requires=["opencv-python-headless==4.10.0.84"],
)
