import array
import fcntl
import os
import pty
import select
import signal
import sys
import termios
import tty

class Interceptor(object):

    def __init__(self):
        self.master_fd = None

    def handle_child_data(self, data):
        pass

    def handle_stdin_data(self, data):
        pass

    def spawn(self, argv=None):
        '''
        Create a spawned process.
        Based on the code for pty.spawn().
        '''
        assert self.master_fd is None
        if not argv:
            argv = [os.environ['SHELL']]

        pid, master_fd = pty.fork()
        self.master_fd = master_fd
        if pid == pty.CHILD:
            os.execlp(argv[0], *argv)

        old_handler = signal.signal(signal.SIGWINCH, self._signal_winch)
        try:
            mode = tty.tcgetattr(pty.STDIN_FILENO)
            tty.setraw(pty.STDIN_FILENO)
            restore = 1
        except tty.error:    # This is the same as termios.error
            restore = 0
        self._init_fd()
        try:
            self._copy()
        except (IOError, OSError):
            if restore:
                tty.tcsetattr(pty.STDIN_FILENO, tty.TCSAFLUSH, mode)

        os.close(master_fd)
        self.master_fd = None
        signal.signal(signal.SIGWINCH, old_handler)

    def _init_fd(self):
        '''
        Called once when the pty is first set up.
        '''
        self._set_pty_size()

    def _signal_winch(self, signum, frame):
        '''
        Signal handler for SIGWINCH - window size has changed.
        '''
        self._set_pty_size()

    def get_size(self):
        buf = array.array('h', [0, 0, 0, 0])
        fcntl.ioctl(pty.STDOUT_FILENO, termios.TIOCGWINSZ, buf, True)
        return buf

    def _set_pty_size(self):
        '''
        Sets the window size of the child pty based on the window size of
               our own controlling terminal.
        '''
        #assert self.master_fd is not None

        # Get the terminal size of the real terminal, set it on the pseudoterminal.
        buf = self.get_size()
        fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, buf)

    def _copy(self):
        '''
        Main select loop. Passes all data to self.master_read() or
               self.stdin_read().
        '''
        assert self.master_fd is not None
        master_fd = self.master_fd
        while 1:
            try:
                #fcntl.fcntl(pty.STDIN_FILENO, fcntl.F_SETFL, os.O_NONBLOCK)
                rfds, wfds, xfds = select.select([master_fd,
                       pty.STDIN_FILENO], [], [])
            except select.error, e:
                if e[0] == 4:   # Interrupted system call.
                    continue

            if master_fd in rfds:
                data = os.read(self.master_fd, 1024)
                self.handle_child_data(data)
                #self.master_read(data)
            if pty.STDIN_FILENO in rfds:
                data = os.read(pty.STDIN_FILENO, 1024)
                self.handle_stdin_data(data)
                #self.write_master(data)
                #self.stdin_read(data)

    def write_stdout(self, data):
        '''
        Writes to stdout as if the child process had written the data.
        '''
        os.write(pty.STDOUT_FILENO, data)

    def write_master(self, data):
        '''
        Writes to the child process from its controlling terminal.
        '''
        master_fd = self.master_fd
        assert master_fd is not None
        while data != '':
            n = os.write(master_fd, data)
            data = data[n:]

    def master_read(self, data):
        '''
        Called when there is data to be sent from the child process back to
               the user.
        '''
        flag = findlast(data, ALTERNATE_MODE_FLAGS)
        if flag is not None:
            if flag in START_ALTERNATE_MODE:
                # This code is executed when the child process switches the
                       #terminal into alternate mode. The line below
                       #assumes that the user has opened vim, and writes a
                       #message.
                self.write_master('IEntering special mode.\x1b')
            elif flag in END_ALTERNATE_MODE:
                # This code is executed when the child process switches the
                       #terminal back out of alternate mode. The line below
                       #assumes that the user has returned to the command
                       #prompt.
                self.write_master('echo "Leaving special mode."\r')
        self.write_stdout(data)

    def stdin_read(self, data):
        '''
        Called when there is data to be sent from the user/controlling
               terminal down to the child process.
        '''
        self.write_master(data)

