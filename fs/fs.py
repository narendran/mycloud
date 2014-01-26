import argparse
import errno
import json
import llfuse
import os
import sqlite3
import stat
import urllib

from time import time
from collections import defaultdict

from rpc import GoogleDriveLogin
    
class Inode:
  current_id = 0
  inodes = {}

  def __init__(self):
    self.id = Inode.get_next_id()
    self.name = ''
    self.isDir = True
    self.size = 0
    self.permissions = None
    self.uid = os.getuid()
    self.gid = os.getgid()
    self.atime = self.ctime = self.mtime = time()
    self.children = []
    self.parent = None
    Inode.inodes[self.id] = self

  @classmethod
  def get_next_id(cls):
    Inode.current_id += 1
    return Inode.current_id

ROOT_INODE = Inode()
ROOT_INODE.parent = ROOT_INODE
ROOT_INODE.permissions = stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH | stat.S_IFDIR | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH

class MyCloudOperations(llfuse.Operations):

  def __init__(self):
    super(MyCloudOperations, self).__init__()
    self.gdl = GoogleDriveLogin()
    self.gdl.get_user_id()
    self.inode_open_count = defaultdict(int)
    self.tree = {}
    self.init_tree()
    self.fetch_indices()

  def init_tree(self):
    self.tree = ROOT_INODE

  def fetch_indices(self):
    url = GoogleDriveLogin.CONTROLLER_BASE_URL + '/list/all'
    authorized_url = self.gdl.fake_login(url)
    children_to_be_triaged = json.loads(urllib.urlopen(authorized_url).read())
    parent_ids_seen_so_far = {}
    since_last_update = 0

    while len(children_to_be_triaged) > 0 and since_last_update <= len(children_to_be_triaged):
      row = children_to_be_triaged[0]
      children_to_be_triaged.remove(row)
      since_last_update += 1
      if 'isTopLevelChild' in row:
        if row['isTopLevelChild'] or row['parentId'] is None or row['parentId'] in parent_ids_seen_so_far:
          print row

          since_last_update -= 1

          newNode = Inode()
          newNode.name = row['filename']
          newNode.isDir = False

          if row['isDirectory']:
            newNode.isDir = True
            newNode.permissions = 0755 | stat.S_IFDIR
          else:
            newNode.permissions = 0644 | stat.S_IFREG

          parent_ids_seen_so_far[row['id']] = newNode.id

          fsize = 0
          if 'size' in row:
            fsize = int(row['size'])

          newNode.size = fsize

          if row['isTopLevelChild'] or row['parentId'] is None:
            parentInode = ROOT_INODE
          else:
            parentInode = Inode.inodes[parent_ids_seen_so_far[row['parentId']]]

          parentInode.children.append(newNode)
          newNode.parent = parentInode
        else:
          children_to_be_triaged.append(row)
      else:
        pass
              
  def statfs(self):
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
    inode = None
    if name == '.':
      inode = parent_inode
    elif name == '..':
      inode = Inode.inodes[parent_inode].parent.id
    else:
      parent = Inode.inodes[parent_inode].parent
      for child in parent.children:
        if child.name == name:
          inode = child.id

    if inode:
      return self.getattr(inode)

    raise(llfuse.FUSEError(errno.ENOENT))

  def opendir(self, inode):
    return inode

  def read(self, fh, offset, length):
    print 'Reading file %d of length %d at offset %d' % (fh, length, offset)
    return 'Test'

  def readdir(self, inode, off):
    print 'Readdir of inode %d at offset %d' % (inode, off)
    node = Inode.inodes[inode]
    
    i = off
    for child in node.children[off:]:
      if child.name.count('/') == 0:
        i += 1
        yield (child.name.replace('/', '//'), self.getattr(child.id), i)

  def getattr(self, inode):
    node = Inode.inodes[inode]
    print 'Calling getattr on inode %d : %s' % (inode, node.name)
    
    entry = llfuse.EntryAttributes()
    entry.st_ino = inode
    entry.generation = 0
    entry.entry_timeout = 300
    entry.attr_timeout = 300
    entry.st_mode = node.permissions
    entry.st_nlink = len(node.children) + 1
    entry.st_uid = node.uid
    entry.st_gid = node.gid
    entry.st_rdev = 0
    entry.st_size = node.size
    
    entry.st_blksize = 512
    entry.st_blocks = 1
    entry.st_atime = node.atime
    entry.st_mtime = node.mtime
    entry.st_ctime = node.ctime
    
    print entry.st_nlink, entry.st_mode, entry.st_ino, entry.st_uid, entry.st_gid, entry.st_size, entry.st_atime
    return entry

  def open(self, inode, flags):
    print 'Opening file %d with flags %s' % (inode, flags)

    self.inode_open_count[inode] += 1
    return inode

  def access(self, inode, mode, ctx):
    return True

if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog='MyCloud')
    parser.add_argument('mountpoint', help='Root directory of mounted MyCloud')
    args = parser.parse_args()

    operations = MyCloudOperations()
    llfuse.init(operations, args.mountpoint, [ b'fsname=MyCloud' ])
    
    try:
      llfuse.main(single=True)
    except:
      llfuse.close(unmount=True)
      raise

    llfuse.close()
