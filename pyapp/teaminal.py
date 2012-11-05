from flask import Flask, render_template
import sys


def create_app(configname):
    app = Flask(__name__)
    app.config.from_object(configname)
    if app.debug:
        from flaskext.lesscss import lesscss
        lesscss(app)
    return app

if len(sys.argv) >= 2:
    app = create_app(sys.argv[1])
else:
    app = create_app('dev')


@app.route("/")
def index():
    return render_template("index.html");


if __name__ == "__main__":
    app.run(port=5000, host='0.0.0.0')
