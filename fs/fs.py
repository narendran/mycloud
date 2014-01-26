import argparse
import llfuse
import os
import stat
import time

from rpc import GoogleDriveLogin

class MyCloudOperations(llfuse.Operations):
  def __init__(self):
    super(MyCloudOperations, self).__init__()
    self.gdl = GoogleDriveLogin()

  def statfs(self):
    self.gdl.get_user_id()
    stat_ = llfuse.StatvfsData()

    free_bytes = 0
    total_bytes = 0

    info = self.gdl.get_info()
    free_bytes += info['free_bytes']
    total_bytes += info['total_bytes']

    stat_.f_bsize = 512
    stat_.f_frsize = 512

    size = total_bytes
    stat_.f_blocks = size // stat_.f_frsize
    stat_.f_bfree = free_bytes // stat_.f_frsize
    stat_.f_bavail = stat_.f_bfree

    stat_.f_favail = stat_.f_ffree = stat_.f_files = 10000

    return stat_

  def lookup(self, parent_inode, name):
    raise 'Lookup not implemented'

  def getattr(self, inode):
    entry = llfuse.EntryAttributes()
    entry.st_ino = inode
    entry.generation = 0
    entry.entry_timeout = 300
    entry.attr_timeout = 300

    if inode == 1:
      entry.st_mode = stat.S_IFDIR | stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH
    else:
      entry.st_mode = stat.S_IFDIR

    entry.st_nlink = 1
    entry.st_uid = os.getuid()
    entry.st_gid = os.getgid()
    entry.st_rdev = 0
    entry.st_size = 0

    entry.st_blksize = 512
    entry.st_blocks = 1
    entry.st_atime = time.time()
    entry.st_mtime = time.time()
    entry.st_ctime = time.time()

    return entry

if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog='MyCloud')
    parser.add_argument('mountpoint', help='Root directory of mounted CloudFS')
    args = parser.parse_args()

    operations = MyCloudOperations()
    llfuse.init(operations, args.mountpoint, [ b'fsname=CloudFS' ])
    
    try:
        llfuse.main(single=False)
    except:
        llfuse.close(unmount=False)
        raise

    llfuse.close()
