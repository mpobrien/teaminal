from flask import Flask, render_template, request
import pymongo
import sys
import os

def create_app(configname):
    app = Flask(__name__)
    app.config.from_object(configname)
    return app

if len(sys.argv) >= 2:
    app = create_app(sys.argv[1])
else:
    app = create_app('dev')

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/sessions/<session>")
def index(session):
    #TODO verify session id
    debugmode = "debug" in request.args
    return render_template("index.html", session=session, debug=debugmode);

@app.route("/dev")
def dev():
    directory = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static', 'testfiles'))
    files = os.listdir(directory)
    return render_template("test.html", files=files);

if __name__ == "__main__":
    app.run(port=5000, host='0.0.0.0')
