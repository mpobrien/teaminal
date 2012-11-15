HERE="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

for file in $HERE/lib/screen.js $HERE/lib/termstream.js $HERE/lib/browserscreen.js $HERE/lib/b64binary.js
do
    justfile=$(basename $file)
    sed '/\@debug/d' $file > $HERE/build/$justfile
done

browserify $HERE/build/screen.js $HERE/build/termstream.js $HERE/build/browserscreen.js $HERE/build/b64binary.js > $HERE/build/teaminal.js 
cp $HERE/build/teaminal.js $HERE/pyapp/static/teaminal.js
lessc -x --yui-compress $HERE/pyapp/static/bootstrap/less/bootstrap.less $HERE/pyapp/static/bootstrap/css/bootstrap.css
lessc -x --yui-compress $HERE/pyapp/static/main.less $HERE/pyapp/static/main.css

