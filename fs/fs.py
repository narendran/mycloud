import llfuse

class MyCloudOperations(llfuse.Operations):
  def __init__(self):
    super(MyCloudOperations, self).__init__()

  def statfs(self):
    stat_ = llfuse.StatvfsData()

    free_bytes = 0
    total_bytes = 0

    for endpoint in EndPoint.get_all_endpoints():
      info = endpoint.get_info()
      free_bytes += info['freeBytes']
      total_bytes += info['totalBytes']

    stat_.f_bsize = 512
    stat_.f_frsize = 512

    size = total_bytes
    stat_.f_blocks = size // stat_.f_frsize
    stat_.f_bfree = free_bytes // stat_.f_frsize
    stat_.f_bavail = stat_.f_bfree

    stat_.f_favail = stat_.f_ffree = stat_.f_files = 10000

    return stat_

