import sys
import atexit
import pty
import select
import os
import curses
import socket
from ptyintercept import Interceptor
from cStringIO import StringIO
import struct
import termios
import fcntl

import socket, ssl, pprint
import sys
import time
import struct
from subprocess import call


class BasicInterceptor(Interceptor):
    def __init__(self, fd):
        Interceptor.__init__(self)
        self.fd = fd

    def handle_child_data(self, data):
        self.write_stdout(data)
        self.fd.write(data)

    def handle_stdin_data(self, data):
        self.write_master(data)


def main(args):
    outfile = open('/tmp/outfiiiiile.txt','w')
    terminalchild = BasicInterceptor(outfile)
    terminalchild.spawn()

if __name__ == '__main__':
    main(sys.argv[1:])
