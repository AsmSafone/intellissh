<template>
  <div id="app" :class="['min-h-screen', isTerminalView ? 'overflow-hidden' : '']">
    <!-- Navigation Bar - Hide on Terminal View -->
    <nav v-if="isAuthenticated && !isTerminalView" class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-200 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Logo and Navigation -->
          <div class="flex items-center">
            <router-link to="/" class="flex items-center space-x-2">
              <div class="flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="flex items-center">
                <h1 class="text-xl font-bold text-slate-900 dark:text-white">IntelliSSH</h1>
                <span class="ml-2 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-1.5 py-0.5 rounded">v{{ appVersion }}</span>
              </div>
            </router-link>
            
            <div class="hidden sm:ml-8 sm:flex sm:space-x-8">
              <router-link
                to="/"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                :class="$route.name === 'home' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'"
              >
                {{ $t('message.ssh_sessions') }}
              </router-link>
              <router-link
                to="/credentials"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                :class="$route.name === 'credentials' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'"
              >
                {{ $t('message.credential_management') }}
              </router-link>
              <router-link
                to="/settings"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                :class="$route.name === 'settings' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'"
              >
                {{ $t('message.settings') }}
              </router-link>
              <router-link
                to="/profile"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                :class="$route.name === 'profile' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'"
              >
                {{ $t('message.user_profile') }}
              </router-link>
            </div>
          </div>

          <!-- User Menu and Actions -->
          <div class="flex items-center space-x-5">
            <!-- Connection Status -->
            <div v-if="terminalStore.socketConnected" class="hidden sm:flex items-center text-sm text-slate-500 dark:text-slate-400">
              <div class="status-indicator status-connected mr-2"></div>
              {{ $t('message.connected') }}
            </div>
            <div v-else-if="terminalStore.connecting" class="hidden sm:flex items-center text-sm text-slate-500 dark:text-slate-400">
              <div class="status-indicator status-connecting mr-2"></div>
              {{ $t('message.connecting') }}
            </div>
            <div v-else class="hidden sm:flex items-center text-sm text-slate-500 dark:text-slate-400">
              <div class="status-indicator status-disconnected mr-2"></div>
              {{ $t('message.disconnected') }}
            </div>

            <!-- Dark Mode Toggle -->
            <div class="hidden sm:block">
              <DarkModeToggle />
            </div>

            <!-- Language Switcher -->
            <div class="hidden sm:block">
              <LanguageSwitcher />
            </div>

            <!-- User Info (Desktop) -->
            <div class="hidden sm:flex items-center pl-4 border-l border-slate-200 dark:border-slate-700">
              <div class="flex-shrink-0">
                <div class="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold shadow-sm">
                  {{ authStore.currentUser?.username?.charAt(0).toUpperCase() }}
                </div>
              </div>
              <div class="ml-3 mr-4">
                <div class="text-sm font-medium text-slate-800 dark:text-white leading-none">{{ authStore.currentUser?.username }}</div>
                <div class="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-none">{{ authStore.currentUser?.isAdmin ? 'Admin' : 'User' }}</div>
              </div>
              <button
                @click="handleLogout"
                class="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                :title="$t('message.logout')"
              >
                <span class="sr-only">{{ $t('message.logout') }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
            <!-- Mobile menu button -->
            <div class="flex sm:hidden items-center ml-4">
              <button
                @click="showMobileMenu = !showMobileMenu"
                class="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-expanded="false"
              >
                <span class="sr-only">Open main menu</span>
                <svg
                  v-if="!showMobileMenu"
                  class="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <svg
                  v-else
                  class="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div v-if="showMobileMenu" class="sm:hidden absolute inset-x-0 top-16 bg-white dark:bg-slate-800 shadow-lg border-b border-slate-200 dark:border-slate-700 z-50 animate-fade-in-down">
          <div class="pt-2 pb-3 space-y-1">
            <router-link
              to="/"
              class="block px-3 py-2 text-base font-medium border-l-4 transition-colors"
              :class="$route.name === 'home' 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'"
              @click="showMobileMenu = false"
            >
              {{ $t('message.ssh_sessions') }}
            </router-link>
            <router-link
              to="/credentials"
              class="block px-3 py-2 text-base font-medium border-l-4 transition-colors"
              :class="$route.name === 'credentials' 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'"
              @click="showMobileMenu = false"
            >
              {{ $t('message.credential_management') }}
            </router-link>
            <router-link
              to="/settings"
              class="block px-3 py-2 text-base font-medium border-l-4 transition-colors"
              :class="$route.name === 'settings' 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'"
              @click="showMobileMenu = false"
            >
              {{ $t('message.settings') }}
            </router-link>
            <router-link
              to="/profile"
              class="block px-3 py-2 text-base font-medium border-l-4 transition-colors"
              :class="$route.name === 'profile' 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'"
              @click="showMobileMenu = false"
            >
              {{ $t('message.user_profile') }}
            </router-link>
          </div>
          <div class="pt-4 pb-4 border-t border-slate-200 dark:border-slate-700">
            <div class="flex items-center px-4">
              <div class="flex-shrink-0">
                <div class="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold">
                  {{ authStore.currentUser?.username?.charAt(0).toUpperCase() }}
                </div>
              </div>
              <div class="ml-3">
                <div class="text-base font-medium text-slate-800 dark:text-white">{{ authStore.currentUser?.username }}</div>
                <div class="text-sm font-medium text-slate-500 dark:text-slate-400">User</div>
              </div>
              <button
                @click="handleLogout"
                class="ml-auto flex-shrink-0 bg-white dark:bg-slate-800 p-1 rounded-full text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span class="sr-only">{{ $t('message.logout') }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
            
            <div class="mt-3 px-2 space-y-1">
              <!-- Mobile Language Switcher -->
               <div class="px-3 py-2">
                 <LanguageSwitcher />
               </div>
               
               <!-- Mobile Dark Mode Toggle -->
               <div class="px-3 py-2 flex items-center justify-between text-slate-600 dark:text-slate-400">
                 <span>Appearance</span>
                 <DarkModeToggle />
               </div>
            </div>
          </div>
        </div>

    </nav>

    <!-- Main Content - Special handling for Terminal View -->
    <main :class="['flex-1', isTerminalView ? 'overflow-hidden' : '']">
      <router-view />
    </main>

    <!-- Global Loading Overlay -->
    <div v-if="showGlobalLoading" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-200">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-soft animate-fade-in">
        <div class="flex items-center">
          <div class="spinner mr-3"></div>
          <div class="text-sm text-slate-600 dark:text-slate-300">{{ loadingMessage }}</div>
        </div>
      </div>
    </div>

    <!-- Global Error Toast -->
    <div
      v-if="globalError"
      class="fixed top-4 right-4 bg-red-500 dark:bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md animate-fade-in"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="text-sm">{{ globalError }}</span>
        </div>
        <button @click="clearGlobalError" class="ml-4 text-white hover:text-gray-200 transition-colors">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { APP_VERSION } from '@/utils/constants'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useTerminalStore } from '@/stores/terminalStore'
import DarkModeToggle from '@/components/DarkModeToggle.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { useI18n } from 'vue-i18n'

// Stores and router
const authStore = useAuthStore()
const terminalStore = useTerminalStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

// State
const showGlobalLoading = ref(false)
const loadingMessage = ref('')
const globalError = ref('')
const appVersion = ref(APP_VERSION)
const showMobileMenu = ref(false)

// Computed
const translatedHello = computed(() => t('message.hello'))
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isTerminalView = computed(() => {
  return route.name === 'terminal' || 
         route.name === 'terminal-new' || 
         route.path.includes('/terminal') ||
         route.path.startsWith('/terminal/')
})

// Methods
const handleLogout = async () => {
  showGlobalLoading.value = true
  loadingMessage.value = t('message.logging_out')
  
  try {
    // Disconnect terminal
    terminalStore.disconnectSession()
    
    // Logout user
    await authStore.logout()
    
    // Redirect to login
    router.push('/login')
  } catch (error) {
    globalError.value = t('message.logout_failed')
  } finally {
    showGlobalLoading.value = false
  }
}

const clearGlobalError = () => {
  globalError.value = ''
}

const initializeApp = async () => {
  // Initialize auth store
  await authStore.init()
  
  // If authenticated, initialize terminal connection
  if (authStore.isAuthenticated) {
    try {
      await terminalStore.init()
    } catch (error) {
      console.error(t('message.failed_init_terminal'), error)
      // Don't show error immediately, let user try to connect manually
    }
  }
}

// Watch for auth errors
watch(() => authStore.authError, (error) => {
  if (error) {
    globalError.value = error
  }
})

// Watch for terminal errors
watch(() => terminalStore.error, (error) => {
  if (error) {
    globalError.value = error
  }
})

// Auto-clear errors after 5 seconds
watch(() => globalError.value, (error) => {
  if (error) {
    setTimeout(() => {
      if (globalError.value === error) {
        globalError.value = ''
      }
    }, 5000)
  }
})

// Lifecycle
onMounted(() => {
  initializeApp()
  
  // Set up periodic token refresh (every 20 minutes)
  const refreshInterval = setInterval(async () => {
    if (authStore.isAuthenticated) {
      await authStore.refreshToken()
    }
  }, 20 * 60 * 1000)
  
  // Clean up on unmount
  onUnmounted(() => {
    clearInterval(refreshInterval)
    terminalStore.disconnect()
  })
})

// Handle browser tab visibility change
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && authStore.isAuthenticated) {
    // When tab becomes visible, verify token is still valid
    authStore.verifyToken()
  }
})

// Handle browser beforeunload
window.addEventListener('beforeunload', () => {
  terminalStore.disconnect()
})
</script>
