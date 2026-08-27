from setuptools import setup, find_packages

# Cython extension removed — using pure Python processor.py instead
setup(
    name="indictranstoolkit",
    include_package_data=True,
    packages=find_packages(),
)
