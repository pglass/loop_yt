import os
import sys
import urllib
from jsmin import jsmin

FILENAME = "loop_yt.js"
OUT_FILE = "loop_yt.js.min.urlescaped"

with open(FILENAME, 'r') as f:
    code = f.read()
code = jsmin(code)
code = urllib.quote(code)

with open(OUT_FILE, 'w') as f:
    f.write(code)
