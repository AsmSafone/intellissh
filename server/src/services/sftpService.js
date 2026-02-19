const { Client } = require('ssh2');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class SFTPService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
  }

  async connect(sessionData, socket = null) {
    const { id, hostname, port, username, password, privateKey, keyPassphrase } = sessionData;
    const connectionId = socket ? `${socket.id}_${id}` : `direct_${id}_${Date.now()}`;

    try {
      console.log(`Attempting SFTP connection to ${username}@${hostname}:${port}`);

      const conn = new Client();

      return new Promise((resolve, reject) => {
        let connectionTimeout = setTimeout(() => {
          conn.end();
          reject(new Error('Connection timeout'));
        }, 30000);

        conn.on('ready', () => {
          clearTimeout(connectionTimeout);
          console.log(`SSH connection established for SFTP: ${connectionId}`);

          // Request SFTP subsystem
          conn.sftp((err, sftp) => {
            if (err) {
              conn.end();
              reject(err);
              return;
            }

            console.log(`SFTP subsystem ready: ${connectionId}`);

            // Store connection and SFTP client
            this.connections.set(connectionId, {
              client: conn,
              sftp: sftp,
              socket: socket,
              sessionData: sessionData,
              connected: true,
              lastActivity: Date.now(),
              activeTransfers: new Map() // Track ongoing transfers
            });

            // Set up connection event handlers
            this.setupConnectionHandlers(connectionId, conn, sftp, socket);

            resolve({
              connectionId,
              success: true,
              message: 'SFTP connection established'
            });
          });
        });

        conn.on('error', (err) => {
          clearTimeout(connectionTimeout);
          console.error(`SFTP connection error for ${connectionId}:`, err.message);
          this.cleanup(connectionId);
          reject(err);
        });

        conn.on('end', () => {
          console.log(`SFTP connection ended: ${connectionId}`);
          this.cleanup(connectionId);
        });

        conn.on('close', () => {
          console.log(`SFTP connection closed: ${connectionId}`);
          this.cleanup(connectionId);
        });

        // Prepare connection options
        const connectOptions = {
          host: hostname,
          port: port || 22,
          username: username,
          readyTimeout: 20000,
          keepaliveInterval: 60000
        };

        // Add authentication method
        if (privateKey) {
          connectOptions.privateKey = privateKey;
          if (keyPassphrase) {
            connectOptions.passphrase = keyPassphrase;
          }
        } else if (password) {
          connectOptions.password = password;
        } else {
          connectOptions.agent = process.env.SSH_AUTH_SOCK;
        }

        conn.connect(connectOptions);
      });
    } catch (error) {
      console.error(`SFTP service error for ${connectionId}:`, error.message);
      this.cleanup(connectionId);
      throw error;
    }
  }

  setupConnectionHandlers(connectionId, conn, sftp, socket) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Handle connection events
    conn.on('end', () => {
      if (socket) socket.emit('sftp-disconnected');
      this.cleanup(connectionId);
    });

    conn.on('close', () => {
      if (socket) socket.emit('sftp-disconnected');
      this.cleanup(connectionId);
    });

    conn.on('error', (err) => {
      console.error(`SFTP connection error for ${connectionId}:`, err.message);
      if (socket) socket.emit('sftp-error', { message: err.message });
      this.cleanup(connectionId);
    });

    // Socket event handlers (if socket provided)
    if (socket) {
      socket.on('sftp-list-directory', async (data) => {
        try {
          const { path: remotePath } = data;
          const result = await this.listDirectory(connectionId, remotePath);
          socket.emit('sftp-directory-listed', result);
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });

      socket.on('sftp-upload-file', async (data) => {
        try {
          const { localPath, remotePath, options } = data;
          await this.uploadFile(connectionId, localPath, remotePath, options);
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });

      socket.on('sftp-download-file', async (data) => {
        try {
          const { remotePath, localPath, options } = data;
          await this.downloadFile(connectionId, remotePath, localPath, options);
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });

      socket.on('sftp-delete-file', async (data) => {
        try {
          const { remotePath } = data;
          await this.deleteFile(connectionId, remotePath);
          socket.emit('sftp-file-deleted', { remotePath });
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });

      socket.on('sftp-create-directory', async (data) => {
        try {
          const { remotePath } = data;
          await this.createDirectory(connectionId, remotePath);
          socket.emit('sftp-directory-created', { remotePath });
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });

      socket.on('sftp-delete-directory', async (data) => {
        try {
          const { remotePath } = data;
          await this.deleteDirectory(connectionId, remotePath);
          socket.emit('sftp-directory-deleted', { remotePath });
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });

      socket.on('sftp-rename-file', async (data) => {
        try {
          const { oldPath, newPath } = data;
          await this.renameFile(connectionId, oldPath, newPath);
          socket.emit('sftp-file-renamed', { oldPath, newPath });
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });

      socket.on('sftp-move-item', async (data) => {
        try {
          const { sourcePath, destPath } = data;
          await this.moveItem(connectionId, sourcePath, destPath);
          socket.emit('sftp-item-moved', { sourcePath, destPath });
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });

      socket.on('sftp-copy-item', async (data) => {
        try {
          const { sourcePath, destPath } = data;
          await this.copyItem(connectionId, sourcePath, destPath);
          socket.emit('sftp-item-copied', { sourcePath, destPath });
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });

      socket.on('sftp-archive-item', async (data) => {
        try {
          const { sourcePath, archiveName, type } = data;
          await this.archiveItem(connectionId, sourcePath, archiveName, type);
          socket.emit('sftp-item-archived', { sourcePath, archiveName });
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });

      socket.on('sftp-extract-item', async (data) => {
        try {
          const { sourcePath, type } = data;
          await this.extractItem(connectionId, sourcePath, type);
          socket.emit('sftp-item-extracted', { sourcePath });
        } catch (error) {
          socket.emit('sftp-error', { message: error.message });
        }
      });
    }
  }

  async listDirectory(connectionId, remotePath = '.') {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      throw new Error('SFTP connection not available');
    }

    return new Promise((resolve, reject) => {
      connection.sftp.readdir(remotePath, (err, list) => {
        if (err) {
          reject(new Error(`Failed to list directory: ${err.message}`));
          return;
        }

        const formattedList = list.map(item => ({
          filename: item.filename,
          longname: item.longname,
          attrs: {
            mode: item.attrs.mode,
            size: item.attrs.size,
            uid: item.attrs.uid,
            gid: item.attrs.gid,
            atime: item.attrs.atime,
            mtime: item.attrs.mtime,
            isDirectory: (item.attrs.mode & 0o170000) === 0o040000,
            isFile: (item.attrs.mode & 0o170000) === 0o100000,
            isSymlink: (item.attrs.mode & 0o170000) === 0o120000
          }
        }));

        connection.lastActivity = Date.now();
        resolve({
          path: remotePath,
          files: formattedList
        });
      });
    });
  }

  async uploadFile(connectionId, localPath, remotePath, options = {}) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      throw new Error('SFTP connection not available');
    }

    try {
      // Check if local file exists
      const stats = await fs.stat(localPath);
      const fileSize = stats.size;
      const transferId = `upload_${Date.now()}_${path.basename(localPath)}`;

      // Add to active transfers
      connection.activeTransfers.set(transferId, {
        type: 'upload',
        localPath,
        remotePath,
        fileSize,
        transferred: 0,
        startTime: Date.now()
      });

      return new Promise((resolve, reject) => {
        const readStream = require('fs').createReadStream(localPath);
        const writeStream = connection.sftp.createWriteStream(remotePath);

        let transferred = 0;
        const startTime = Date.now();

        readStream.on('data', (chunk) => {
          transferred += chunk.length;
          const progress = {
            transferId,
            filename: path.basename(localPath),
            transferred,
            total: fileSize,
            percentage: Math.round((transferred / fileSize) * 100),
            speed: this.calculateSpeed(transferred, Date.now() - startTime)
          };

          // Update active transfer
          const transfer = connection.activeTransfers.get(transferId);
          if (transfer) {
            transfer.transferred = transferred;
          }

          // Emit progress if socket available
          if (connection.socket) {
            connection.socket.emit('sftp-upload-progress', progress);
          }

          // Emit to EventEmitter for programmatic usage
          this.emit('upload-progress', connectionId, progress);
        });

        writeStream.on('close', () => {
          connection.activeTransfers.delete(transferId);
          connection.lastActivity = Date.now();

          const result = {
            success: true,
            localPath,
            remotePath,
            fileSize,
            transferred,
            duration: Date.now() - startTime
          };

          if (connection.socket) {
            connection.socket.emit('sftp-upload-complete', result);
          }

          this.emit('upload-complete', connectionId, result);
          resolve(result);
        });

        writeStream.on('error', (err) => {
          connection.activeTransfers.delete(transferId);
          const error = new Error(`Upload failed: ${err.message}`);

          if (connection.socket) {
            connection.socket.emit('sftp-upload-error', {
              transferId,
              message: error.message
            });
          }

          this.emit('upload-error', connectionId, error);
          reject(error);
        });

        readStream.on('error', (err) => {
          connection.activeTransfers.delete(transferId);
          const error = new Error(`Read failed: ${err.message}`);

          if (connection.socket) {
            connection.socket.emit('sftp-upload-error', {
              transferId,
              message: error.message
            });
          }

          this.emit('upload-error', connectionId, error);
          reject(error);
        });

        readStream.pipe(writeStream);
      });
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async downloadFile(connectionId, remotePath, localPath, options = {}) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      throw new Error('SFTP connection not available');
    }

    return new Promise((resolve, reject) => {
      // First get file stats to know the size
      connection.sftp.stat(remotePath, (err, stats) => {
        if (err) {
          reject(new Error(`Failed to get file stats: ${err.message}`));
          return;
        }

        const fileSize = stats.size;
        const transferId = `download_${Date.now()}_${path.basename(remotePath)}`;

        connection.activeTransfers.set(transferId, {
          type: 'download',
          remotePath,
          localPath,
          fileSize,
          transferred: 0,
          startTime: Date.now()
        });

        const readStream = connection.sftp.createReadStream(remotePath);
        const writeStream = require('fs').createWriteStream(localPath);

        let transferred = 0;
        const startTime = Date.now();

        readStream.on('data', (chunk) => {
          transferred += chunk.length;
          const progress = {
            transferId,
            filename: path.basename(remotePath),
            transferred,
            total: fileSize,
            percentage: Math.round((transferred / fileSize) * 100),
            speed: this.calculateSpeed(transferred, Date.now() - startTime)
          };

          const transfer = connection.activeTransfers.get(transferId);
          if (transfer) {
            transfer.transferred = transferred;
          }

          if (connection.socket) {
            connection.socket.emit('sftp-download-progress', progress);
          }

          this.emit('download-progress', connectionId, progress);
        });

        writeStream.on('close', () => {
          connection.activeTransfers.delete(transferId);
          connection.lastActivity = Date.now();

          const result = {
            success: true,
            remotePath,
            localPath,
            fileSize,
            transferred,
            duration: Date.now() - startTime
          };

          if (connection.socket) {
            connection.socket.emit('sftp-download-complete', result);
          }

          this.emit('download-complete', connectionId, result);
          resolve(result);
        });

        readStream.on('error', (err) => {
          connection.activeTransfers.delete(transferId);
          const error = new Error(`Download failed: ${err.message}`);

          if (connection.socket) {
            connection.socket.emit('sftp-download-error', {
              transferId,
              message: error.message
            });
          }

          this.emit('download-error', connectionId, error);
          reject(error);
        });

        writeStream.on('error', (err) => {
          connection.activeTransfers.delete(transferId);
          const error = new Error(`Write failed: ${err.message}`);

          if (connection.socket) {
            connection.socket.emit('sftp-download-error', {
              transferId,
              message: error.message
            });
          }

          this.emit('download-error', connectionId, error);
          reject(error);
        });

        readStream.pipe(writeStream);
      });
    });
  }

  async deleteFile(connectionId, remotePath) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      throw new Error('SFTP connection not available');
    }

    return new Promise((resolve, reject) => {
      connection.sftp.unlink(remotePath, (err) => {
        if (err) {
          reject(new Error(`Failed to delete file: ${err.message}`));
          return;
        }

        connection.lastActivity = Date.now();
        resolve({ success: true, remotePath });
      });
    });
  }

  async deleteDirectory(connectionId, remotePath) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      throw new Error('SFTP connection not available');
    }

    return new Promise((resolve, reject) => {
      connection.sftp.rmdir(remotePath, (err) => {
        if (err) {
          reject(new Error(`Failed to delete directory: ${err.message}`));
          return;
        }

        connection.lastActivity = Date.now();
        resolve({ success: true, remotePath });
      });
    });
  }

  async createDirectory(connectionId, remotePath) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      throw new Error('SFTP connection not available');
    }

    return new Promise((resolve, reject) => {
      connection.sftp.mkdir(remotePath, (err) => {
        if (err && err.code !== 4) { // 4 = SSH_FX_FAILURE (might be dir exists)
          reject(new Error(`Failed to create directory: ${err.message}`));
          return;
        }

        connection.lastActivity = Date.now();
        resolve({ success: true, remotePath });
      });
    });
  }

  async renameFile(connectionId, oldPath, newPath) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      throw new Error('SFTP connection not available');
    }

    return new Promise((resolve, reject) => {
      connection.sftp.rename(oldPath, newPath, (err) => {
        if (err) {
          reject(new Error(`Failed to rename: ${err.message}`));
          return;
        }

        connection.lastActivity = Date.now();
        resolve({ success: true, oldPath, newPath });
      });
    });
  }

  async getFileStats(connectionId, remotePath) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      throw new Error('SFTP connection not available');
    }

    return new Promise((resolve, reject) => {
      connection.sftp.stat(remotePath, (err, stats) => {
        if (err) {
          reject(new Error(`Failed to get file stats: ${err.message}`));
          return;
        }

        connection.lastActivity = Date.now();
        resolve({
          path: remotePath,
          mode: stats.mode,
          size: stats.size,
          uid: stats.uid,
          gid: stats.gid,
          atime: stats.atime,
          mtime: stats.mtime,
          isDirectory: (stats.mode & 0o170000) === 0o040000,
          isFile: (stats.mode & 0o170000) === 0o100000,
          isSymlink: (stats.mode & 0o170000) === 0o120000
        });
      });
    });
  }

  calculateSpeed(bytes, milliseconds) {
    if (milliseconds === 0) return 0;
    const bytesPerSecond = (bytes * 1000) / milliseconds;

    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    if (bytesPerSecond < 1024 * 1024 * 1024) return `${Math.round(bytesPerSecond / (1024 * 1024))} MB/s`;
    return `${Math.round(bytesPerSecond / (1024 * 1024 * 1024))} GB/s`;
  }

  // Execute a command on the remote server using the existing connection
  async executeCommand(connectionId, command) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      throw new Error('SFTP connection not available');
    }

    return new Promise((resolve, reject) => {
      connection.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        let errorOutput = '';

        stream.on('close', (code, signal) => {
          connection.lastActivity = Date.now();
          if (code === 0) {
            resolve({ success: true, output });
          } else {
            reject(new Error(`Command failed with code ${code}: ${errorOutput || output}`));
          }
        }).on('data', (data) => {
          output += data;
        }).stderr.on('data', (data) => {
          errorOutput += data;
        });
      });
    });
  }

  async moveItem(connectionId, sourcePath, destPath) {
    const escapedSource = sourcePath.replace(/"/g, '\\"');
    const escapedDest = destPath.replace(/"/g, '\\"');
    const command = `mv "${escapedSource}" "${escapedDest}"`;
    return this.executeCommand(connectionId, command);
  }

  async copyItem(connectionId, sourcePath, destPath) {
    const escapedSource = sourcePath.replace(/"/g, '\\"');
    const escapedDest = destPath.replace(/"/g, '\\"');

    const command = `cp -r "${escapedSource}" "${escapedDest}"`;

    return this.executeCommand(connectionId, command);
  }

  async archiveItem(connectionId, sourcePath, archiveName, type) {
    const escapedSource = sourcePath.replace(/"/g, '\\"');
    const escapedArchiveName = archiveName.replace(/"/g, '\\"');
    const parentDir = path.dirname(sourcePath);
    const sourceBasename = path.basename(sourcePath);

    let command;
    // Execute within the parent directory to avoid full paths in the archive
    if (type === 'zip') {
      // Check for zip availability first? Assuming standard Linux tools
      command = `cd "${path.dirname(sourcePath)}" && zip -r "${escapedArchiveName}" "${sourceBasename}"`;
    } else { // tar.gz
      command = `cd "${path.dirname(sourcePath)}" && tar -czf "${escapedArchiveName}" "${sourceBasename}"`;
    }

    return this.executeCommand(connectionId, command);
  }

  async extractItem(connectionId, sourcePath, type) {
    const escapedSource = sourcePath.replace(/"/g, '\\"');
    const parentDir = path.dirname(sourcePath);

    let command;
    if (type === 'zip' || sourcePath.endsWith('.zip')) {
      command = `cd "${parentDir}" && unzip -o "${escapedSource}"`;
    } else {
      // Handle .tar.gz, .tgz, .tar
      let flags = '-xf';
      if (sourcePath.endsWith('.gz') || sourcePath.endsWith('.tgz')) {
        flags = '-xzf';
      }
      command = `cd "${parentDir}" && tar ${flags} "${escapedSource}"`;
    }

    return this.executeCommand(connectionId, command);
  }

  disconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    try {
      console.log(`Disconnecting SFTP connection: ${connectionId}`);

      // Cancel active transfers
      for (const [transferId, transfer] of connection.activeTransfers) {
        console.log(`Cancelling transfer: ${transferId}`);
        connection.activeTransfers.delete(transferId);
      }

      if (connection.sftp) {
        connection.sftp.end();
      }

      if (connection.client) {
        connection.client.end();
      }

      this.cleanup(connectionId);
      return true;
    } catch (error) {
      console.error(`Error disconnecting ${connectionId}:`, error.message);
      this.cleanup(connectionId);
      return false;
    }
  }

  cleanup(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.connected = false;

      try {
        if (connection.socket) {
          connection.socket.emit('sftp-disconnected');
        }
      } catch (error) {
        // Socket might already be disconnected
      }

      this.connections.delete(connectionId);
      console.log(`Cleaned up SFTP connection: ${connectionId}`);
    }
  }

  getConnection(connectionId) {
    return this.connections.get(connectionId);
  }

  getAllConnections() {
    const connections = [];
    for (const [id, conn] of this.connections) {
      connections.push({
        id,
        sessionId: conn.sessionData.id,
        hostname: conn.sessionData.hostname,
        username: conn.sessionData.username,
        connected: conn.connected,
        lastActivity: conn.lastActivity,
        activeTransfers: Array.from(conn.activeTransfers.keys())
      });
    }
    return connections;
  }

  getActiveTransfers(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return [];

    return Array.from(connection.activeTransfers.values());
  }

  // Test SFTP connection without establishing a persistent connection
  async testConnection(sessionData) {
    const { hostname, port, username, password, privateKey, keyPassphrase } = sessionData;

    return new Promise((resolve, reject) => {
      const conn = new Client();
      let connectionTimeout = setTimeout(() => {
        conn.end();
        reject(new Error('Connection timeout'));
      }, 15000);

      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          clearTimeout(connectionTimeout);

          if (err) {
            conn.end();
            reject(new Error(`SFTP subsystem failed: ${err.message}`));
            return;
          }

          sftp.end();
          conn.end();
          resolve({ success: true, message: 'SFTP connection successful' });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(connectionTimeout);
        reject(err);
      });

      const connectOptions = {
        host: hostname,
        port: port || 22,
        username: username,
        readyTimeout: 10000
      };

      if (privateKey) {
        connectOptions.privateKey = privateKey;
        if (keyPassphrase) {
          connectOptions.passphrase = keyPassphrase;
        }
      } else if (password) {
        connectOptions.password = password;
      } else {
        connectOptions.agent = process.env.SSH_AUTH_SOCK;
      }

      conn.connect(connectOptions);
    });
  }

  cleanupStaleConnections(maxIdleTime = 3600000) { // 1 hour default
    const now = Date.now();
    const staleConnections = [];

    for (const [connectionId, connection] of this.connections) {
      if (now - connection.lastActivity > maxIdleTime) {
        staleConnections.push(connectionId);
      }
    }

    staleConnections.forEach(connectionId => {
      console.log(`Cleaning up stale SFTP connection: ${connectionId}`);
      this.disconnect(connectionId);
    });

    return staleConnections.length;
  }

  getStats() {
    const stats = {
      totalConnections: this.connections.size,
      connections: this.getAllConnections(),
      totalActiveTransfers: 0
    };

    for (const connection of this.connections.values()) {
      stats.totalActiveTransfers += connection.activeTransfers.size;
    }

    return stats;
  }
}

module.exports = new SFTPService();
