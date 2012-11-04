for file in screen.js termstream.js browserscreen.js b64binary.js
do
    sed '/\@debug/d' ./$file > ./build/$file
done

browserify ./build/screen.js ./build/termstream.js ./build/browserscreen.js ./build/b64binary.js > ./build/teaminal.js 
cp ./build/teaminal.js ./pyapp/static/teaminal.js
