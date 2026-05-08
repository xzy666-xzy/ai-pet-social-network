import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.wepet.app',
  appName: 'WePet',
  webDir: 'www',
  server: {
    url: 'https://wepet.asia/app',
    cleartext: false,
  },
}

export default config
