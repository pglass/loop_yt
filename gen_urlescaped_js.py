import os
import sys
import urllib
from jsmin import jsmin

filename = "loop_yt.js"
out_file = "loop_yt.js.min.urlescaped"

if not os.path.exists(filename):
	raise Exception(filename)

code = jsmin(open(filename, 'r').read())
code = urllib.quote(code)

open("loop_yt.js.min.urlescaped", 'w').write(code)