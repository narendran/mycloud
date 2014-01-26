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
    
class NoSuchRowError(Exception):
  def __str__(self):
    return 'Query produced 0 result rows'

class NoUniqueValueError(Exception):
  def __str__(self):
    return 'Query generated more than 1 result row'
    

class MyCloudOperations(llfuse.Operations):
  def __init__(self):
    super(MyCloudOperations, self).__init__()
    self.gdl = GoogleDriveLogin()
    self.gdl.get_user_id()
    self.db = sqlite3.connect(':memory:')
    self.db.text_factory = str
    self.db.row_factory = sqlite3.Row
    self.inode_open_count = defaultdict(int)
    self.init_tables()
    self.fetch_indices()

  def fetch_indices(self):
    url = GoogleDriveLogin.CONTROLLER_BASE_URL + '/list/all'
    authorized_url = self.gdl.fake_login(url)
    children_to_be_triaged = json.loads(urllib.urlopen(authorized_url).read())
    parent_ids_seen_so_far = {}
    next_id = 2
    since_last_update = 0

    while len(children_to_be_triaged) > 0 and since_last_update <= len(children_to_be_triaged):
      row = children_to_be_triaged[0]
      children_to_be_triaged.remove(row)
      since_last_update += 1
      if 'isTopLevelChild' in row:
        if row['isTopLevelChild'] or row['parentId'] is None or row['parentId'] in parent_ids_seen_so_far:
          print row

          since_last_update -= 1
          permissions = stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH

          if row['isDirectory']:
            permissions = permissions | stat.S_IFDIR | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH

          parent_ids_seen_so_far[row['id']] = next_id
          fsize = 0
          if 'size' in row:
            fsize = row['size']
          self.db.cursor().execute("INSERT INTO inodes (id,mode,uid,gid,mtime,atime,ctime,size) "
              "VALUES (?,?,?,?,?,?,?,?)",
              (next_id, permissions, os.getuid(), os.getgid(),
               time(), time(), time(), fsize))

          if row['isTopLevelChild'] or row['parentId'] is None:
            parentInode = llfuse.ROOT_INODE
          else:
            parentInode = parent_ids_seen_so_far[row['parentId']]

          self.db.cursor().execute("INSERT INTO contents (name, parent_inode, inode) "
              "VALUES (?,?,?)",
              (row['filename'], parentInode, next_id))

          next_id += 1
        else:
          children_to_be_triaged.append(row)
      else:
        pass
              
  def get_row(self, *a, **kw):
    crsr = self.db.cursor()
    crsr.execute(*a, **kw) 
    try:
        row = crsr.next()
    except StopIteration:
        raise NoSuchRowError()
    try:
        crsr.next()
    except StopIteration:
        pass
    else:
        raise NoUniqueValueError()

    return row

  def init_tables(self):
      '''Initialize file system tables'''
      
      self.db.cursor().execute("""
      CREATE TABLE inodes (
          id        INTEGER PRIMARY KEY,
          uid       INT NOT NULL,
          gid       INT NOT NULL,
          mode      INT NOT NULL,
          mtime     REAL NOT NULL,
          atime     REAL NOT NULL,
          ctime     REAL NOT NULL,
          target    BLOB(256) ,
          size      INT NOT NULL DEFAULT 0,
          rdev      INT NOT NULL DEFAULT 0
      )
      """)
  
      self.db.cursor().execute("""
      CREATE TABLE contents (
          rowid     INTEGER PRIMARY KEY AUTOINCREMENT,
          name      BLOB(256) NOT NULL,
          inode     INT NOT NULL REFERENCES inodes(id),
          parent_inode INT NOT NULL REFERENCES inodes(id),
          
          UNIQUE (name, inode, parent_inode)
      )""")
      
      # Insert root directory
      self.db.cursor().execute("INSERT INTO inodes (id,mode,uid,gid,mtime,atime,ctime) "
                          "VALUES (?,?,?,?,?,?,?)",
                          (llfuse.ROOT_INODE, stat.S_IFDIR | stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH, os.getuid(), os.getgid(), time(), time(), time()))
      self.db.cursor().execute("INSERT INTO contents (name, parent_inode, inode) VALUES (?,?,?)",
                          (b'..', llfuse.ROOT_INODE, llfuse.ROOT_INODE))

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
    if name == '.':
      inode = parent_inode
    elif name == '..':
      inode = self.get_row("SELECT * FROM contents WHERE inode=?",
                           (parent_inode,))['parent_inode']
    else:
      try:
        inode = self.get_row("SELECT * FROM contents WHERE name=? AND parent_inode=?",
                             (name, parent_inode))['inode']
      except NoSuchRowError:
        raise(llfuse.FUSEError(errno.ENOENT))
    
    return self.getattr(inode)

  def opendir(self, inode):
    return inode

  def read(self, fh, offset, length):
    print 'Reading file %d of length %d at offset %d' % (fh, length, offset)
    return 'Test'

  def readdir(self, inode, off):
    print 'Readdir of inode %d at offset %d' % (inode, off)
    cursor2 = self.db.cursor()
    cursor2.execute("SELECT * FROM contents WHERE parent_inode=? "
                    'AND rowid > ? ORDER BY rowid', (inode, off))
    
    for row in cursor2:
      yield (row['name'], self.getattr(row['inode']), row['rowid'])

  def getattr(self, inode):
    row = self.get_row('SELECT * FROM inodes WHERE id=?', (inode,))
    print 'Calling getattr on inode %d with row %s' % (inode, row)
    
    entry = llfuse.EntryAttributes()
    entry.st_ino = inode
    entry.generation = 0
    entry.entry_timeout = 300
    entry.attr_timeout = 300
    entry.st_mode = row['mode']
    entry.st_nlink = self.get_row("SELECT COUNT(inode) FROM contents WHERE inode=?",
                                 (inode,))[0]
    entry.st_uid = row['uid']
    entry.st_gid = row['gid']
    entry.st_rdev = row['rdev']
    entry.st_size = row['size']
    
    entry.st_blksize = 512
    entry.st_blocks = 1
    entry.st_atime = row['atime']                          
    entry.st_mtime = row['mtime']
    entry.st_ctime = row['ctime']
    
    return entry

  def open(self, inode, flags):
    print 'Opening file %d with flags %s' % (inode, flags)
    # Yeah, unused arguments
    #pylint: disable=W0613
    self.inode_open_count[inode] += 1

    # Use inodes as a file handles
    return inode

  def access(self, inode, mode, ctx):
    # Yeah, could be a function and has unused arguments
    #pylint: disable=R0201,W0613
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
