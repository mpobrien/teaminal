#!/usr/bin/env python
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

START_ALTERNATE_MODE = set('\x1b[?{0}h'.format(i) for i in ('1049', '47', '1047'))
END_ALTERNATE_MODE = set('\x1b[?{0}l'.format(i) for i in ('1049', '47', '1047'))
ALTERNATE_MODE_FLAGS = tuple(START_ALTERNATE_MODE) + tuple(END_ALTERNATE_MODE)

msg_struct = struct.Struct("hh")
changing_win = False

def reset_term():
    curses.resetty()

def findlast(s, substrs):
    '''
    Finds whichever of the given substrings occurs last in the given string
           and returns that substring, or returns None if no such strings
           occur.
    '''
    i = -1
    result = None
    for substr in substrs:
        pos = s.rfind(substr)
        if pos > i:
            i = pos
            result = substr
    return result


def packmessage(data, datatype=1):
    return msg_struct.pack(datatype, len(data)) + data

def winchange_message(rows, cols):
    rows_cols = msg_struct.pack(rows, cols)
    return packmessage(rows_cols, datatype=2)

class SocketRelayInterceptor(Interceptor):
    def __init__(self, mysocket):
        Interceptor.__init__(self)
        self.mysocket = mysocket
        self.current_msg = ''
        self.msg_bytesremaining = None

    def handle_child_data(self, data):
        #print "got ", len(data), "bytes."
        self.write_stdout(data)
        #self.mysocket.send(packmessage(data))
        #TEMPORARY: send the data raw without message metadata
        self.mysocket.send(data)


    def handle_stdin_data(self, data):
        self.write_master(data)

    def write_network(self, data):
        while data != '':
            n = self.mysocket.send(data)
            data = data[n:]

    def _signal_winch(self, signum, frame):
        global changing_win
        changing_win = True;
        Interceptor._signal_winch(self, signum, frame)
        winsize = self.get_size()
        Interceptor._signal_winch(self, signum, frame)
        rows, cols = winsize[0], winsize[1]
        #self.write_network(",".join([str(rows), "+",str(cols)]))
        #self.write_network(winchange_message(rows, cols))

    def _copy(self):
        global changing_win
        assert self.master_fd is not None
        master_fd = self.master_fd
        self.mysocket.setblocking(0)
        while 1:
            try:
                rfds, wfds, xfds = select.select([master_fd, pty.STDIN_FILENO, self.mysocket], [], [])
            except select.error, e:
                if e[0] == 4:   # Interrupted system call.
                    if changing_win:
                        changing_win = False
                        continue;
                    else:
                        print "done"
                        break;
                        #continue

            if master_fd in rfds:
                data = os.read(self.master_fd, 1024)
                self.handle_child_data(data)
                #self.master_read(data)
            if pty.STDIN_FILENO in rfds:
                data = os.read(pty.STDIN_FILENO, 1024)
                self.handle_stdin_data(data)
                #self.write_master(data)
                #self.stdin_read(data)
            if self.mysocket in rfds:
                data = self.mysocket.recv(1024)
                self.handle_stdin_data(data)

def set_winsize(fd, row, col, xpix=0, ypix=0):
    winsize = struct.pack("HHHH", row, col, xpix, ypix)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

def handlemessage(msgtype, data):
    if msgtype == 1:
        print "i got", len(data), "bytes."
        #os.write(sys.stdout.fileno(), data)
    if msgtype == 2:
        rows, cols = msg_struct.unpack(data)
        set_winsize(sys.stdin.fileno(), rows, cols)

def main(args):
    if "new" in args:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        ssl_sock = ssl.wrap_socket(s, ca_certs="/etc/ca_certs_file", cert_reqs=ssl.CERT_NONE)
        ssl_sock.connect(('dev.teaminal.net', 8000))
        ssl_sock.write("createsession");
        session_id = ssl_sock.read()
        print session_id
        #os.system("open http://localhost/session/" + session_id);
        terminalchild = SocketRelayInterceptor(ssl_sock)
        terminalchild.spawn()

    elif "join" in args:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        ssl_sock = ssl.wrap_socket(s, ca_certs="/etc/ca_certs_file", cert_reqs=ssl.CERT_NONE)
        ssl_sock.connect(('teaminal.net', 8000))
        ssl_sock.write("join " + args[1]);
        #window = curses.initscr()
        #curses.savetty()
        atexit.register(reset_term)
        #curses.noecho()
        current_bytes_remaining = None
        currentmsg = StringIO()
        bytesremaining = 0
        header = None
        while 1:

            try:
                rfds, wfds, xfds = select.select([sys.stdin.fileno(), ssl_sock], [], [])
            except select.error, e:
                if e[0] == 4: 
                    continue

            if sys.stdin.fileno() in rfds:
                data = os.read(sys.stdin.fileno(), 1024)
                ssl_sock.send(data)
                #self.handle_stdin_data(data)
            elif ssl_sock in rfds:
                data = ssl_sock.recv(1024)
                if not data: break

                #TODO, make this into a generator somehow, it would be so much cleaner.
                if bytesremaining > 0: # we are filling an existing partial message, finish it
                    if len(data) >= bytesremaining: #ok, we have a full message
                        currentmsg.write(data[0:bytesremaining])
                        handlemessage(msgtype, currentmsg.getvalue())
                        data = data[bytesremaining:]
                        bytesremaining = 0
                        currentmsg = StringIO()

                    else: # partial message, write the whole thing
                        currentmsg.write(data)
                        bytesremaining -= len(data)
                        continue

                while data:
                    if header: # partial header was constructed on a previous iteration
                        headerbytes_remaining = msg_struct.size - header.tell()
                        if len(data) >= headerbytes_remaining:
                            partial_header = data[0:headerbytes_remaining]
                            header.write(partial_header)
                            data = data[headerbytes_remaining:]
                            msgtype, msgsize = msg_struct.unpack(header.getvalue())
                            header = None
                        else:
                            header.write(data)
                            data = ''
                            continue
                    else:
                        if len(data) >= msg_struct.size: #ok, we can safely get the header
                            msgtype, msgsize = msg_struct.unpack(data[0:msg_struct.size])
                            data = data[msg_struct.size:]
                            header = None
                        else: # we only have a partial header.
                            header = StringIO()
                            header.write(data)
                            data = ''
                            continue
                    if len(data) >= msgsize: # we have a complete message
                        new_msg = data[0:msgsize] 
                        handlemessage(msgtype, new_msg)
                        data = data[msgsize:]
                    else: #incomplete message, but write w/e is available now
                        currentmsg.write(data)
                        bytesremaining = msgsize - len(data)
                        data = ''

                    if bytesremaining > 0: # we are filling an existing partial message, finish it
                        if len(data) >= bytesremaining: #ok, we have a full message
                            currentmsg.write(data[0:bytesremaining])
                            data = data[bytesremaining:]
                            bytesremaining = 0
                            currentmsg = StringIO()

                        else: # partial message, write the whole thing
                            currentmsg.write(data)
                            bytesremaining -= len(data)


        #conn.close()

if __name__ == '__main__':
    main(sys.argv[1:])
