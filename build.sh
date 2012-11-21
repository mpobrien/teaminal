HERE="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NODEBUG=0

while getopts d opt
do
   case "$opt" in
      d) NODEBUG=1;;
   esac
done

echo "$NODEBUG"

for file in $HERE/lib/screen.js $HERE/lib/termstream.js $HERE/lib/browserscreen.js $HERE/lib/b64binary.js
do
    justfile=$(basename $file)
    if [ $NODEBUG -eq 1 ]
        then
            sed '/\@debug/d' $file > $HERE/build/$justfile
            echo "sedding"
        else
            cp $file $HERE/build/$justfile
            echo "copying"
    fi
done

for file in $HERE/testing/testfiles/*
do
    justfile=$(basename $file)
    node $HERE/b64converter.js --file=$file > $HERE/pyapp/static/testfiles/$justfile
done

browserify $HERE/build/screen.js $HERE/build/termstream.js $HERE/build/browserscreen.js $HERE/build/b64binary.js > $HERE/build/teaminal.js 
cp $HERE/build/teaminal.js $HERE/pyapp/static/teaminal.js
lessc -x --yui-compress $HERE/pyapp/static/bootstrap/less/bootstrap.less $HERE/pyapp/static/bootstrap/css/bootstrap.css
lessc -x --yui-compress $HERE/pyapp/static/main.less $HERE/pyapp/static/main.css

