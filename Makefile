VENV = .venv
VENV_ACTIVATE = . $(VENV)/bin/activate
PIP_INSTALL = $(VENV_ACTIVATE); pip install -U
PYTHON = $(VENV_ACTIVATE); python

venv: $(VENV)

$(VENV):
	virtualenv $@
	$(PIP_INSTALL) pip
	$(PIP_INSTALL) jsmin

minify: $(VENV)
	$(PYTHON) minify.py

clean:
	rm -rf $(VENV)
