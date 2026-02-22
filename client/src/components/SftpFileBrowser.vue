<template>
  <div class="flex flex-col h-full bg-slate-800 text-slate-100 dark:bg-slate-900 border-l border-slate-700/50">
    <!-- Header with Connection Controls -->
    <div class="flex-shrink-0 p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
      <div class="text-white">
        <h3 class="text-sm font-medium">{{ $t('message.sftp_file_browser') }}</h3>
        <p v-if="terminalStore.activeSession" class="text-xs text-slate-300">
          {{ terminalStore.activeSession.username }}@{{ terminalStore.activeSession.hostname }}
        </p>
      </div>
      
      <div class="flex items-center space-x-2">
        <button 
          v-if="!terminalStore.hasSftpConnection && !terminalStore.sftpConnectingStatus"
          @click="connectSftp" 
          class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-md shadow-sm transition-colors"
        >
          {{ $t('message.connect') }}
        </button>
        
        <button 
          v-if="terminalStore.sftpConnectingStatus"
          disabled
          class="px-3 py-1 bg-slate-600 text-white text-xs rounded-md shadow-sm opacity-70 cursor-not-allowed"
        >
          {{ $t('message.connecting') }}
        </button>
        
        <button 
          v-if="terminalStore.hasSftpConnection"
          @click="disconnectSftp" 
          class="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-xs rounded-md shadow-sm transition-colors"
        >
          {{ $t('message.sftp_disconnected') }}
        </button>
      </div>
    </div>
    
    <!-- Error Display -->
    <div v-if="terminalStore.sftpError" class="bg-red-500/10 m-3 p-3 rounded-md border border-red-500/30 text-red-400 text-sm">
      <div class="flex items-start">
        <div class="flex-shrink-0 pt-0.5">
          <svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div class="ml-3">
          <p>{{ terminalStore.sftpError }}</p>
          <button @click="terminalStore.clearSftpError" class="text-xs text-red-400 hover:text-red-300 mt-1 underline">
            {{ $t('message.dismiss') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Not Connected State -->
    <div v-if="!terminalStore.hasSftpConnection && !terminalStore.sftpConnectingStatus" class="flex-1 flex items-center justify-center p-6">
      <div class="text-center">
        <div class="bg-slate-700/50 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <svg class="h-8 w-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-white mb-2">{{ $t('message.no_sftp_connection') }}</h3>
        <p class="text-slate-400 mb-4">
          {{ $t('message.connect_browse_files') }}
        </p>
        <button
          @click="connectSftp"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm transition-colors"
          :disabled="!terminalStore.hasActiveSession"
        >
          {{ $t('message.connect_to_sftp') }}
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="terminalStore.sftpConnectingStatus" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="spinner mx-auto mb-4 text-indigo-500 h-8 w-8 border-2"></div>
        <p class="text-white">{{ $t('message.connecting_to_sftp') }}</p>
      </div>
    </div>
    
    <!-- Connected State with File Browser -->
    <div v-if="terminalStore.hasSftpConnection" class="flex-1 flex flex-col overflow-hidden">
      <!-- Path Navigation -->
      <div class="flex items-center space-x-1 p-2 bg-slate-700/50 border-b border-slate-700">
        <button 
          @click="navigateToParentDirectory"
          class="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md"
          :disabled="loading"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button 
          @click="refreshDirectory"
          class="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md"
          :disabled="loading"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        
        <div class="flex-1 bg-slate-800 text-white px-2 py-1 text-sm rounded overflow-x-auto whitespace-nowrap">
          {{ terminalStore.currentDirectory || '/' }}
        </div>
      </div>
      
      <!-- Loading overlay -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
        <div class="spinner text-indigo-500 h-8 w-8 border-2"></div>
      </div>
      
      <!-- File Operations Toolbar -->
      <div class="p-2 bg-slate-800 border-b border-slate-700 flex flex-wrap gap-2">
        <label 
          class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors flex items-center cursor-pointer"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {{ $t('message.upload_file') }}
          <input 
            type="file" 
            class="hidden" 
            @change="handleFileUpload"
          />
        </label>
        
        <label 
          class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors flex items-center cursor-pointer"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {{ $t('message.upload_folder') }}
          <input 
            type="file" 
            class="hidden" 
            @change="handleFolderUpload" 
            webkitdirectory 
            directory 
            multiple
          />
        </label>
        
        <button 
          @click="showCreateDirectoryDialog = true"
          class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors flex items-center"
          :title="$t('message.new_folder')"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          {{ $t('message.new_folder') }}
        </button>

        <div class="w-px bg-slate-600 mx-1"></div>

        <button 
          @click="openRenameDialog"
          :disabled="!canRename"
          :class="{'opacity-50 cursor-not-allowed': !canRename, 'hover:bg-slate-600': canRename}"
          class="px-2 py-1 bg-slate-700 text-white text-xs rounded transition-colors flex items-center"
          :title="$t('message.rename')"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {{ $t('message.rename') }}
        </button>

        <button 
          @click="openCopyDialog"
          :disabled="!hasSelection"
          :class="{'opacity-50 cursor-not-allowed': !hasSelection, 'hover:bg-slate-600': hasSelection}"
          class="px-2 py-1 bg-slate-700 text-white text-xs rounded transition-colors flex items-center"
          :title="$t('message.copy')"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {{ $t('message.copy') }}
        </button>

        <button 
          @click="openMoveDialog"
          :disabled="!hasSelection"
          :class="{'opacity-50 cursor-not-allowed': !hasSelection, 'hover:bg-slate-600': hasSelection}"
          class="px-2 py-1 bg-slate-700 text-white text-xs rounded transition-colors flex items-center"
          :title="$t('message.move')"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          {{ $t('message.move') }}
        </button>

        <button 
          @click="openArchiveDialog"
          :disabled="!hasSelection"
          :class="{'opacity-50 cursor-not-allowed': !hasSelection, 'hover:bg-slate-600': hasSelection}"
          class="px-2 py-1 bg-slate-700 text-white text-xs rounded transition-colors flex items-center"
          :title="$t('message.archive')"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          {{ $t('message.archive') }}
        </button>

        <button 
          @click="openExtractDialog"
          :disabled="!canExtract"
          :class="{'opacity-50 cursor-not-allowed': !canExtract, 'hover:bg-slate-600': canExtract}"
          class="px-2 py-1 bg-slate-700 text-white text-xs rounded transition-colors flex items-center"
          :title="$t('message.extract')"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {{ $t('message.extract') }}
        </button>

        <div class="w-px bg-slate-600 mx-1"></div>

        <button 
          @click="downloadSelectedItem"
          :disabled="!canDownload"
          :class="{'opacity-50 cursor-not-allowed': !canDownload, 'hover:bg-slate-600': canDownload}"
          class="px-2 py-1 bg-slate-700 text-white text-xs rounded transition-colors flex items-center"
          :title="$t('message.download')"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ $t('message.download') }}
        </button>

        <button 
          @click="openDeleteDialog"
          :disabled="!hasSelection"
          :class="{'opacity-50 cursor-not-allowed': !hasSelection, 'hover:bg-red-900/50': hasSelection}"
          class="px-2 py-1 bg-slate-700 text-red-300 text-xs rounded transition-colors flex items-center"
          :title="$t('message.delete')"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {{ $t('message.delete') }}
        </button>
      </div>
      
      <!-- File List -->
      <div class="flex-1 overflow-auto">
        <table class="min-w-full divide-y divide-slate-700">
          <thead class="bg-slate-800 sticky top-0 z-10">
            <tr>
              <th scope="col" class="py-2 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-8">
                <input 
                  type="checkbox" 
                  :checked="isAllSelected" 
                  @change="toggleAllSelection($event)" 
                  class="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                />
              </th>
              <th scope="col" class="py-2 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                {{ $t('message.name_table') }}
              </th>
              <th class="py-2 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{{ $t('message.size_table') }}</th>
              <th class="py-2 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{{ $t('message.modified_table') }}</th>
              <th class="py-2 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{{ $t('message.type_table') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700 bg-slate-800/50">
            <tr 
              v-for="item in sortedDirectoryContents" 
              :key="item.filename"
              @click="toggleSelection(item, $event)"
              @dblclick="handleItemDoubleClick(item)"
              @contextmenu="handleContextMenu($event, item)"
              class="border-b border-slate-700/50 hover:bg-slate-600/50 cursor-pointer transition-colors"
              :class="{'bg-indigo-900/40 hover:bg-indigo-900/50': isSelected(item)}"
            >
              <td class="py-2 px-3 whitespace-nowrap w-8" @click.stop>
                <input 
                  type="checkbox" 
                  :checked="isSelected(item)" 
                  @change="toggleSelection(item, $event)" 
                  class="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 pointer-events-auto"
                />
              </td>
              <td class="py-2 px-3 whitespace-nowrap border-l border-transparent">
                <div class="flex items-center text-sm font-medium text-white">
                  <svg v-if="item.attrs.isDirectory" class="h-4 w-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <svg v-else-if="item.attrs.isSymlink" class="h-4 w-4 mr-2 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.102 1.101" />
                  </svg>
                  <svg v-else class="h-4 w-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span class="text-white text-sm">{{ item.filename }}</span>
                </div>
              </td>
              <td class="py-2 px-3 whitespace-nowrap text-sm text-slate-300">
                {{ item.attrs.isDirectory ? '-' : formatFileSize(item.attrs.size) }}
              </td>
              <td class="py-2 px-3 whitespace-nowrap text-sm text-slate-300">
                {{ formatDate(item.attrs.mtime * 1000) }}
              </td>
              <td class="py-2 px-3 whitespace-nowrap text-sm text-slate-300">
                {{ getItemType(item) }}
              </td>
            </tr>
            <tr v-if="terminalStore.directoryContents.length === 0">
              <td colspan="4" class="py-4 text-center text-slate-400">
                {{ $t('message.directory_empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Active Transfers -->
      <div v-if="hasActiveTransfers" class="flex-shrink-0 border-t border-slate-700 bg-slate-800 p-2">
        <div class="text-xs font-medium text-slate-300 mb-2">{{ $t('message.active_transfers') }}</div>
        <div class="space-y-2 max-h-32 overflow-y-auto">
          <div 
            v-for="transfer in terminalStore.activeTransfers.filter(t => t.status !== 'complete')" 
            :key="transfer.id"
            class="bg-slate-700 rounded-md p-2"
          >
            <div class="flex justify-between mb-1">
              <span class="text-xs text-white truncate max-w-[200px]">
                {{ transfer.type === 'upload' ? $t('message.uploading') : $t('message.downloading') }}
                {{ transfer.type === 'upload' ? 
                  transfer.localPath.split('/').pop() : 
                  transfer.remotePath.split('/').pop() 
                }}
              </span>
              <span class="text-xs text-slate-300">{{ transfer.progress }}%</span>
            </div>
            <div class="h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div 
                class="h-full bg-indigo-500" 
                :class="{'bg-red-500': transfer.status === 'error'}"
                :style="{width: `${transfer.progress}%`}"
              ></div>
            </div>
            <div v-if="transfer.error" class="mt-1 text-xs text-red-400">
              {{ transfer.error }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Upload File Dialog -->
    <div v-if="showUploadFileDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">{{ $t('message.upload_file') }}</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.current_directory') }}</label>
          <div class="bg-slate-700 text-white px-3 py-2 rounded-md text-sm">
            {{ terminalStore.currentDirectory || '/' }}
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.local_file_path') }}</label>
          <input 
            v-model="uploadLocalPath" 
            type="text" 
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm"
            :placeholder="$t('message.local_file_path_placeholder')"
          />
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showUploadFileDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.cancel') }}
          </button>
          <button 
            @click="uploadFile"
            :disabled="!uploadLocalPath"
            :class="[
              'px-3 py-1.5 text-white text-sm rounded transition-colors', 
              uploadLocalPath ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-700 opacity-50 cursor-not-allowed'
            ]"
          >
            {{ $t('message.upload') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Create Directory Dialog -->
    <div v-if="showCreateDirectoryDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">{{ $t('message.create_new_folder') }}</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.current_directory') }}</label>
          <div class="bg-slate-700 text-white px-3 py-2 rounded-md text-sm">
            {{ terminalStore.currentDirectory || '/' }}
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.folder_name') }}</label>
          <input 
            v-model="newDirectoryName" 
            type="text" 
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm"
            :placeholder="$t('message.new_folder_placeholder')"
          />
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showCreateDirectoryDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.cancel') }}
          </button>
          <button 
            @click="createDirectory"
            :disabled="!newDirectoryName"
            :class="[
              'px-3 py-1.5 text-white text-sm rounded transition-colors', 
              newDirectoryName ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-700 opacity-50 cursor-not-allowed'
            ]"
          >
            {{ $t('message.create') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">{{ $t('message.confirm_delete') }}</h3>
        <p class="text-slate-300 mb-4">
          {{ $t('message.confirm_delete_item') }}
          <span class="font-medium text-white" v-if="selectedItems.length === 1">{{ selectedItems[0].filename }}</span>
          <span class="font-medium text-white" v-else>{{ selectedItems.length }} {{ $t('message.items') }}</span>?
          <br>
          <span class="text-red-400 text-sm">{{ $t('message.action_cannot_be_undone') }}</span>
        </p>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showDeleteDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.cancel') }}
          </button>
          <button 
            @click="deleteItem"
            class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.delete') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Download Dialog -->
    <div v-if="showDownloadDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">{{ $t('message.download_file') }}</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.remote_file') }}</label>
          <div class="bg-slate-700 text-white px-3 py-2 rounded-md text-sm">
            <span v-if="selectedItems.length === 1">{{ getFullPath(selectedItems[0].filename) }}</span>
            <span v-else>{{ selectedItems.length }} {{ $t('message.files') }} {{ $t('message.selected') }}</span>
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.local_destination_path') }}</label>
          <input 
            v-model="downloadLocalPath" 
            type="text" 
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm"
            :placeholder="$t('message.local_destination_path_placeholder')"
          />
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showDownloadDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.cancel') }}
          </button>
          <button 
            @click="downloadFile"
            :disabled="!downloadLocalPath"
            :class="[
              'px-3 py-1.5 text-white text-sm rounded transition-colors', 
              downloadLocalPath ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-700 opacity-50 cursor-not-allowed'
            ]"
          >
            {{ $t('message.download') }}
          </button>
        </div>
      </div>
    </div>
    <!-- Context Menu -->
    <div 
      v-if="contextMenuVisible" 
      class="fixed bg-slate-800 border border-slate-600 rounded shadow-xl z-50 py-1 min-w-[150px]"
      :style="{ top: `${contextMenuPosition.y}px`, left: `${contextMenuPosition.x}px` }"
      @click.stop
    >
      <div 
        @click="openRenameDialog(); closeContextMenu()" 
        class="px-4 py-2 hover:bg-slate-700 text-white text-sm cursor-pointer"
      >
        {{ $t('message.rename') }}
      </div>
      <div 
        @click="openCopyDialog(); closeContextMenu()" 
        class="px-4 py-2 hover:bg-slate-700 text-white text-sm cursor-pointer"
      >
        {{ $t('message.copy') }}
      </div>
      <div 
        @click="openMoveDialog(); closeContextMenu()" 
        class="px-4 py-2 hover:bg-slate-700 text-white text-sm cursor-pointer"
      >
        {{ $t('message.move') }}
      </div>
      <div 
        v-if="canExtract"
        @click="performExtract(); closeContextMenu()" 
        class="px-4 py-2 hover:bg-slate-700 text-white text-sm cursor-pointer"
      >
        {{ $t('message.extract') }}
      </div>
      <div 
        @click="openArchiveDialog(); closeContextMenu()" 
        class="px-4 py-2 hover:bg-slate-700 text-white text-sm cursor-pointer"
      >
        {{ $t('message.archive') }}
      </div>
      <div class="border-t border-slate-700 my-1"></div>
      <div 
        @click="downloadSelectedItem(); closeContextMenu()" 
        class="px-4 py-2 hover:bg-slate-700 text-white text-sm cursor-pointer"
        v-if="canDownload"
      >
        {{ $t('message.download') }}
      </div>
      <div 
        @click="openDeleteDialog(); closeContextMenu()" 
        class="px-4 py-2 hover:bg-red-900/50 text-red-300 text-sm cursor-pointer"
      >
        {{ $t('message.delete') }}
      </div>
    </div>

    <!-- Rename Dialog -->
    <div v-if="showRenameDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">{{ $t('message.rename') }}</h3>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.new_name') }}</label>
          <input 
            v-model="newName" 
            type="text" 
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm"
            @keyup.enter="performRename"
          />
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showRenameDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.cancel') }}
          </button>
          <button 
            @click="performRename"
            class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.rename') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Copy/Move Dialog -->
    <div v-if="showCopyMoveDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">
           {{ isMoveOperation ? $t('message.move_item') : $t('message.copy_item') }}
        </h3>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.destination_path') }}</label>
          <input 
            v-model="copyMoveDestPath" 
            type="text" 
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm"
            @keyup.enter="performCopyMove"
          />
          <p class="text-xs text-slate-400 mt-1">{{ $t('message.destination_path_hint') }}</p>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showCopyMoveDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.cancel') }}
          </button>
          <button 
            @click="performCopyMove"
            class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
          >
            {{ isMoveOperation ? $t('message.move') : $t('message.copy') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Archive Dialog -->
    <div v-if="showArchiveDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">{{ $t('message.archive_item') }}</h3>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.archive_name') }}</label>
          <input 
            v-model="archiveName" 
            type="text" 
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.archive_type') }}</label>
          <select 
            v-model="archiveType"
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm"
          >
            <option value="zip">ZIP</option>
            <option value="tar">TAR.GZ</option>
          </select>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showArchiveDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.cancel') }}
          </button>
          <button 
            @click="performArchive"
            class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.archive') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Extract Dialog -->
    <div v-if="showExtractDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">{{ $t('message.extract') }}</h3>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">{{ $t('message.extract_to') }}</label>
          <input 
            v-model="extractDestPath" 
            type="text" 
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md font-mono text-sm border-none focus:ring-1 focus:ring-indigo-500"
            @keyup.enter="performExtract"
          />
          <p class="text-xs text-slate-400 mt-1">{{ $t('message.extract_dest_path_hint') }}</p>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showExtractDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.cancel') }}
          </button>
          <button 
            @click="performExtract"
            class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
          >
            {{ $t('message.extract') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useTerminalStore } from '@/stores/terminalStore'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from 'vue-i18n'

const terminalStore = useTerminalStore()
const { t } = useI18n()

// State
const loading = ref(false)
const selectedItems = ref([])
const showUploadFileDialog = ref(false)
const showCreateDirectoryDialog = ref(false)
const showDeleteDialog = ref(false)
const showDownloadDialog = ref(false)
const showRenameDialog = ref(false)
const showCopyMoveDialog = ref(false)
const showArchiveDialog = ref(false)
const showExtractDialog = ref(false)
const uploadLocalPath = ref('')
const downloadLocalPath = ref('')
const newDirectoryName = ref('')
const newName = ref('')
const copyMoveDestPath = ref('')
const extractDestPath = ref('')
const isMoveOperation = ref(false)
const archiveName = ref('')
const archiveType = ref('zip')

// Context Menu State
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })

// Computed properties
const sortedDirectoryContents = computed(() => {
  if (!terminalStore.directoryContents.length) return []
  
  // First sort by type (directories first), then by name
  return [...terminalStore.directoryContents].sort((a, b) => {
    // Sort directories first
    if (a.attrs.isDirectory && !b.attrs.isDirectory) return -1
    if (!a.attrs.isDirectory && b.attrs.isDirectory) return 1
    
    // Then sort by name
    return a.filename.localeCompare(b.filename)
  })
})

const hasActiveTransfers = computed(() => {
  return terminalStore.activeTransfers && terminalStore.activeTransfers.length > 0
})

const hasSelection = computed(() => selectedItems.value.length > 0)
const canRename = computed(() => selectedItems.value.length === 1)

const isAllSelected = computed(() => {
  return terminalStore.directoryContents.length > 0 && 
         selectedItems.value.length === terminalStore.directoryContents.length
})

const canDownload = computed(() => {
  return selectedItems.value.length > 0 && selectedItems.value.every(item => item.attrs.isFile)
})

const canExtract = computed(() => {
  if (selectedItems.value.length === 0) return false
  return selectedItems.value.every(item => {
    if (!item.attrs.isFile) return false
    const name = item.filename.toLowerCase()
    return name.endsWith('.zip') || name.endsWith('.tar.gz') || name.endsWith('.tgz') || name.endsWith('.tar')
  })
})

// Methods
// Context Menu Handler
const handleContextMenu = (event, item) => {
  event.preventDefault()
  if (!isSelected(item)) {
    selectItem(item)
  }
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuVisible.value = true
}

// Close context menu on click outside
const closeContextMenu = () => {
  contextMenuVisible.value = false
}

// Register click listener to close context menu
onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})

// Dialog Openers
const openRenameDialog = () => {
  if (selectedItems.value.length !== 1) return
  newName.value = selectedItems.value[0].filename
  showRenameDialog.value = true
}

const openCopyDialog = () => {
  isMoveOperation.value = false
  copyMoveDestPath.value = terminalStore.currentDirectory
  showCopyMoveDialog.value = true
}

const openMoveDialog = () => {
  isMoveOperation.value = true
  copyMoveDestPath.value = terminalStore.currentDirectory
  showCopyMoveDialog.value = true
}

const openArchiveDialog = () => {
  if (selectedItems.value.length === 1) {
    archiveName.value = `${selectedItems.value[0].filename}.zip`
  } else {
    archiveName.value = `archive_${Date.now()}.zip`
  }
  archiveType.value = 'zip'
  showArchiveDialog.value = true
}

const openExtractDialog = () => {
  extractDestPath.value = terminalStore.currentDirectory
  showExtractDialog.value = true
}

const openDeleteDialog = () => {
    showDeleteDialog.value = true
}
const connectSftp = async () => {
  if (!terminalStore.hasActiveSession) {
    terminalStore.sftpConnectionError = t('message.no_active_terminal_session')
    return
  }
  
  try {
    loading.value = true
    await terminalStore.connectToSftp(terminalStore.activeSession.id)
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to connect to SFTP:', error)
  } finally {
    loading.value = false
  }
}

const disconnectSftp = () => {
  terminalStore.disconnectSftp()
  selectedItems.value = []
}

const listCurrentDirectory = async () => {
  try {
    loading.value = true
    await terminalStore.listDirectory(terminalStore.currentDirectory)
  } catch (error) {
    console.error('Failed to list directory:', error)
  } finally {
    loading.value = false
  }
}

const refreshDirectory = () => {
  listCurrentDirectory()
}

const navigateToDirectory = async (path) => {
  try {
    loading.value = true
    await terminalStore.listDirectory(path)
    selectedItems.value = []
  } catch (error) {
    console.error('Failed to navigate to directory:', error)
  } finally {
    loading.value = false
  }
}

const navigateToParentDirectory = () => {
  const currentPath = terminalStore.currentDirectory
  
  console.log('SFTP: Current directory before navigation:', currentPath)
  
  // Already at root, nothing to do
  if (currentPath === '/') {
    console.log('SFTP: Already at root directory, not navigating')
    return
  }
  
  // If path is just ".", navigate to root
  if (currentPath === '.') {
    console.log('SFTP: Navigating from "." to root directory')
    return navigateToDirectory('/')
  }
  
  // Get parent directory path
  let parentPath
  
  // Handle paths with trailing slash
  const normalizedPath = currentPath.endsWith('/') && currentPath.length > 1 
    ? currentPath.slice(0, -1) 
    : currentPath
  
  // Check if we're in a top-level directory under root
  if (normalizedPath.lastIndexOf('/') === 0) {
    parentPath = '/'
  } else {
    // Get everything up to the last slash
    parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
    
    // If empty string, we need to go to root
    if (!parentPath) {
      parentPath = '/'
    }
  }
  
  console.log('SFTP: Navigating to parent directory:', parentPath)
  navigateToDirectory(parentPath)
}

const isSelected = (item) => {
  return selectedItems.value.some(i => i.filename === item.filename)
}

const toggleSelection = (item, event) => {
  const index = selectedItems.value.findIndex(i => i.filename === item.filename)
  if (index >= 0) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push(item)
  }
}

const toggleAllSelection = (event) => {
  if (event.target.checked) {
    selectedItems.value = [...sortedDirectoryContents.value]
  } else {
    selectedItems.value = []
  }
}

const selectItem = (item) => {
  selectedItems.value = [item]
}

const handleItemDoubleClick = (item) => {
  if (item.attrs.isDirectory) {
    // Get the path to navigate to
    const newPath = getFullPath(item.filename)
    navigateToDirectory(newPath)
  } else if (item.attrs.isFile) {
    // For files, select only this one and show download dialog
    selectedItems.value = [item]
    downloadSelectedItem()
  }
}

const getFullPath = (filename) => {
  const currentPath = terminalStore.currentDirectory
  
  if (currentPath === '/') {
    return `/${filename}`
  } else {
    return `${currentPath}/${filename}`
  }
}

const performRename = async () => {
  if (selectedItems.value.length !== 1) return;
  try {
    loading.value = true
    const oldPath = getFullPath(selectedItems.value[0].filename)
    
    // Calculate new path based on whether parent dir is changed or just filename
    // For simple rename, we assume same directory.
    let newPath
    if (newName.value.startsWith('/')) {
        newPath = newName.value
    } else {
        const currentPath = terminalStore.currentDirectory
        newPath = currentPath === '/' ? `/${newName.value}` : `${currentPath}/${newName.value}`
    }

    await terminalStore.renameFile(oldPath, newPath)
    showRenameDialog.value = false
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to rename:', error)
    alert(`Rename failed: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const performCopyMove = async () => {
  if (!selectedItems.value.length) return;
  try {
    loading.value = true
    
    // Process all selected items
    const operations = selectedItems.value.map(async (item) => {
      const sourcePath = getFullPath(item.filename)
      let targetPath = copyMoveDestPath.value
      if (!targetPath.endsWith('/')) {
          targetPath += '/'
      }
      targetPath += item.filename

      if (isMoveOperation.value) {
          return await terminalStore.moveItem(sourcePath, targetPath)
      } else {
          return await terminalStore.copyItem(sourcePath, targetPath)
      }
    });

    await Promise.allSettled(operations);
    
    showCopyMoveDialog.value = false
    selectedItems.value = []
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to copy/move:', error)
    alert(`Operation failed: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const performArchive = async () => {
  if (!selectedItems.value.length) return;
  try {
    loading.value = true
    const sourcePaths = selectedItems.value.map(item => getFullPath(item.filename));
    
    await terminalStore.archiveItem(sourcePaths, archiveName.value, archiveType.value)
    
    showArchiveDialog.value = false
    selectedItems.value = []
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to archive:', error)
    alert(`Archive failed: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const performExtract = async () => {
    if (!canExtract.value) return

    try {
        loading.value = true
        
        let targetPath = extractDestPath.value
        if (!targetPath) {
            targetPath = terminalStore.currentDirectory
        }

        const operations = selectedItems.value.map(async (item) => {
            if (!item.attrs.isFile) return;
            const name = item.filename.toLowerCase();
            if (!(name.endsWith('.zip') || name.endsWith('.tar.gz') || name.endsWith('.tgz') || name.endsWith('.tar'))) return;
            
            const sourcePath = getFullPath(item.filename)
            // Determine type from extension
            const type = name.endsWith('.zip') ? 'zip' : 'tar'
            return await terminalStore.extractItem(sourcePath, targetPath, type)
        });

        await Promise.allSettled(operations);
        
        showExtractDialog.value = false
        selectedItems.value = []
        await listCurrentDirectory()
        alert('Extraction complete')
    } catch (error) {
        console.error('Failed to extract:', error)
        alert(`Extraction failed: ${error.message}`)
    } finally {
        loading.value = false
    }
}

const uploadFile = async () => {
  try {
    loading.value = true
    
    // Get the remote path
    const remotePath = getFullPath(uploadLocalPath.value.split('/').pop())
    
    // Start upload
    await terminalStore.uploadFile(uploadLocalPath.value, remotePath)
    
    // Close dialog and refresh directory
    showUploadFileDialog.value = false
    uploadLocalPath.value = ''
    
    // Refresh to show the new file
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to upload file:', error)
  } finally {
    loading.value = false
  }
}

const downloadSelectedItem = async () => {
  if (!canDownload.value) return;
  
  try {
    loading.value = true
    
    // Get auth token
    const authStore = useAuthStore()
    
    for (const item of selectedItems.value) {
      if (!item.attrs.isFile) continue;
      
      const remotePath = getFullPath(item.filename)
      
      // Use the API to download the file
      const downloadResponse = await fetch('/api/files/sftp-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          remotePath: remotePath,
          connectionId: terminalStore.sftpConnectionId
        })
      })
      
      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json()
        throw new Error(errorData.error || `Failed to download file ${item.filename}`)
      }
      
      const downloadResult = await downloadResponse.json()
      
      // Create a download link and click it
      const downloadLink = document.createElement('a')
      downloadLink.href = downloadResult.downloadUrl + `?name=${encodeURIComponent(item.filename)}`
      downloadLink.download = item.filename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      // Slight delay for multiple downloads to prevent browser blocking
      await new Promise(r => setTimeout(r, 500));
    }
    
    selectedItems.value = []
    
  } catch (error) {
    console.error('Failed to download file:', error)
    alert(`Download failed: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// Keep this method for legacy/manual path downloads
const downloadFile = async () => {
  try {
    loading.value = true
    
    // Get the remote path
    const remotePath = getFullPath(selectedItem.value.filename)
    
    // Start download
    await terminalStore.downloadFile(remotePath, downloadLocalPath.value)
    
    // Close dialog
    showDownloadDialog.value = false
    downloadLocalPath.value = ''
  } catch (error) {
    console.error('Failed to download file:', error)
  } finally {
    loading.value = false
  }
}

const createDirectory = async () => {
  try {
    loading.value = true
    
    // Get the full path for the new directory
    const newDirPath = getFullPath(newDirectoryName.value)
    
    // Create the directory
    await terminalStore.createDirectory(newDirPath)
    
    // Close dialog and refresh directory
    showCreateDirectoryDialog.value = false
    newDirectoryName.value = ''
    
    // Refresh to show the new directory
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to create directory:', error)
  } finally {
    loading.value = false
  }
}

const deleteItem = async () => {
  if (!selectedItems.value.length) return;
  try {
    loading.value = true
    
    const operations = selectedItems.value.map(async (item) => {
      const itemPath = getFullPath(item.filename)
      if (item.attrs.isDirectory) {
        return await terminalStore.deleteDirectory(itemPath)
      } else {
        return await terminalStore.deleteFile(itemPath)
      }
    });

    await Promise.allSettled(operations);
    
    // Close dialog and refresh directory
    showDeleteDialog.value = false
    selectedItems.value = []
    
    // Refresh to update the file list
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to delete item:', error)
  } finally {
    loading.value = false
  }
}

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format date for display
const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

// Get item type for display
// Handle file upload from browser file dialog
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    loading.value = true
    
    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append('file', file)
    
    // Get the remote path where the file should be uploaded
    const remotePath = getFullPath(file.name)
    
    // 1. Upload the file to the server
    const authStore = useAuthStore()
    const uploadResponse = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      },
      body: formData
    })
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json()
      throw new Error(errorData.error || 'Failed to upload file to server')
    }
    
    const uploadResult = await uploadResponse.json()
    
    // 2. Initiate the SFTP upload from server to remote
    const sftpUploadResponse = await fetch('/api/files/sftp-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        localPath: uploadResult.localPath,
        remotePath: remotePath,
        connectionId: terminalStore.sftpConnectionId
      })
    })
    
    if (!sftpUploadResponse.ok) {
      const errorData = await sftpUploadResponse.json()
      throw new Error(errorData.error || 'Failed to upload file to SFTP server')
    }
    
    // Success, refresh the directory
    await listCurrentDirectory()
    
    // Show success message
    alert(t('message.file_uploaded_successfully', { fileName: file.name, remotePath: remotePath }))
    
  } catch (error) {
    console.error('Failed to process file upload:', error)
    alert(t('message.upload_failed') + error.message)
  } finally {
    loading.value = false
    // Reset the file input
    event.target.value = ''
  }
}

// Handle folder upload from browser file dialog
const handleFolderUpload = async (event) => {
  const files = event.target.files
  if (!files || files.length === 0) return
  
  try {
    loading.value = true
    
    // Group files by their relative path/folder structure
    const filesByFolder = {}
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const relativePath = file.webkitRelativePath
      const folderPath = relativePath.split('/')[0] // Get the top-level folder name
      
      if (!filesByFolder[folderPath]) {
        filesByFolder[folderPath] = []
      }
      
      filesByFolder[folderPath].push(file)
    }
    
    // For each folder, we would upload its files to the correct remote paths
    const folderNames = Object.keys(filesByFolder)
    
    if (folderNames.length > 0) {
      const mainFolder = folderNames[0]
      const remoteFolderPath = getFullPath(mainFolder)
      
      // Create the main remote folder
      await terminalStore.createDirectory(remoteFolderPath)
      
      // In a real implementation, you would:
      // 1. Upload each file to the server
      // 2. Process the folder structure on the server
      // 3. Use SFTP to recreate the structure on the remote server
      
      console.log(`Would upload folder ${mainFolder} with ${filesByFolder[mainFolder].length} files to ${remoteFolderPath}`)
      
      // Notify user
      alert(t('message.folder_upload_note', { mainFolder: mainFolder, fileCount: filesByFolder[mainFolder].length, remotePath: remoteFolderPath }))
      
      // Refresh to show at least the created directory
      await listCurrentDirectory()
    }
    
  } catch (error) {
    console.error(t('message.failed_to_process_folder_upload'), error)
  } finally {
    loading.value = false
    // Reset the file input
    event.target.value = ''
  }
}

const getItemType = (item) => {
  if (item.attrs.isDirectory) return t('message.directory')
  if (item.attrs.isSymlink) return t('message.symlink')
  
  // Try to determine file type from extension
  const ext = item.filename.split('.').pop().toLowerCase()
  
  switch (ext) {
    case 'txt': return t('message.text_file')
    case 'pdf': return t('message.pdf_document')
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return t('message.image')
    case 'mp3':
    case 'wav': return t('message.audio')
    case 'mp4':
    case 'avi':
    case 'mov': return t('message.video')
    case 'js': return t('message.javascript')
    case 'ts': return t('message.typescript')
    case 'html': return t('message.html')
    case 'css': return t('message.css')
    case 'json': return t('message.json')
    case 'md': return t('message.markdown')
    case 'py': return t('message.python')
    case 'java': return t('message.java')
    case 'c':
    case 'cpp': return t('message.c_cpp')
    case 'php': return t('message.php')
    case 'sh': return t('message.shell_script')
    case 'zip':
    case 'tar':
    case 'gz': return t('message.archive')
    default: return t('message.file')
  }
}

// Lifecycle hooks
onMounted(() => {
  // Set up SFTP listeners
  terminalStore.setupSftpListeners()
})

// Watch for SSH session changes to handle disconnections
watch(() => terminalStore.hasActiveSession, (hasSession) => {
  if (!hasSession && terminalStore.hasSftpConnection) {
    // Disconnect SFTP if SSH session is disconnected
    terminalStore.disconnectSftp()
    selectedItems.value = []
  }
})
</script>
