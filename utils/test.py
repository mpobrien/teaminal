
# -*- coding: utf-8 -*-

from pyte.streams import DebugStream
from pyte import Screen
import sys

def main(args):
    stream = DebugStream()
    screen = Screen(80, 24)
    stream.attach(screen)
    #inputdata = "\x1b[0m\x1b[27m\x1b[24m"
    #inputdata2 = "\x1b[J\x1b[1m\x1b[35mscreenpals\x1b[1m\x1b[32m [web\x1b[1m\x1b[31m●\x1b[32m]\x1b[1m\x1b[35m \x1b[00m% \x1b[K"
    #inputdata3 = "\x1b]2;aaaaaaabbbbcdef\x07\x1b]1;aaaaaaabbbbcdef\x07"



    #inputdata3 = "\x1b[1m\x1b[7m%\x1b[27m\x1b[1m\x1b[0m  \r \r\x1b]2;blahbhhhh ~\x07\x1b]1;~\x07"

    #inputdata4 = "\x1b[1m\x1b[7m\x1b[27m\x1b[1m\x1b[0m                                                                                                                                                                       \r \r\x1b]2;mike@new-host: ~\x07\x1b]1;~\x07"

    inputdata = open(args[0], 'r').read()
    #inputdata = "\x1b[1m\x1b[7m%\x1b[27m\x1b[1m\x1b[0m     \r \r\x1b]2;mike@new-host: ~\x07\x1b]1;~\x07"

    #sys.stdout.write(inputdata)
    #raw_input()#

    stream.feed(inputdata)
    #stream.display()
    for idx, line in enumerate(screen.display, 1):
        print("{0:2d} {1} ¶".format(idx, line))

if __name__ == '__main__':
    main(sys.argv[1:])
