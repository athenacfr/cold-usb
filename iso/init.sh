#!/bin/sh
set -e

# mount required pseudo filesystems
mount -t proc proc /proc
mount -t sysfs sys /sys
mount -t devtmpfs dev /dev

# optional: enable pts for programs that expect it
mkdir -p /dev/pts
mount -t devpts devpts /dev/pts

# ensure the wallet binary is executable
chmod +x /app/wallet

# replace init (pid 1) with the wallet process
# fallback to shell only if the app crashes
exec /app/wallet || exec sh
