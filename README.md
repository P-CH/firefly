# Firefly - File System Webserver

I know that there are a bunch of webservers to host your file system out there, however, I was not really happy with the design of any of them.
In addition to that, I thought it'd be a nice lil project to get my hands on.
<hr>

I included file highlighting for different types/groups of files. Feel free to hit me up if I missed any important ones in the ``ftypes`` object...

<hr>

**Usage:**

``node firefly.js [options]`` - sets the root in the working directory and hosts on port 80 (http)

<u>options:</u>

``-h`` - displays the help menu

``-r <path>`` - sets the root to ``path``

``-p <port>`` - uses ``port`` for the webserver

``-n <netAddr>`` - supply this if your network address does not start with ``192.168`` (format should be ``xxx.xx?x?``)

``-i <interface>`` - changes the interface to be used to ``interface``, otherwise it'll use the one with the configured IP address

``-d`` - enables debug mode (prints all important information about requests)

<hr>

![PoC](https://cdn.discordapp.com/attachments/911361965547483186/1009941796169724018/unknown.png)

![PoC](https://cdn.discordapp.com/attachments/911361965547483186/1009942340158369902/unknown.png)

By right-clicking on a list item which is a file, you'll get the file contents displayed on the right. There can be exceptions, e.g. if node does'nt have read permissions.