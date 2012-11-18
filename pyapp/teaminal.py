from flask import Flask, render_template
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
def index():
    return render_template("index.html");

@app.route("/dev")
def dev():
    directory = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static', 'testfiles'))
    files = os.listdir(directory)
    return render_template("test.html", files=files);

if __name__ == "__main__":
    app.run()
